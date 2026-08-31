"use server";

import { revalidatePath } from "next/cache";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { normalizeRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { runVigia } from "@/lib/vigia/runner";

async function checkAuth() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) {
    throw new Error("No autenticado en ALFA OS.");
  }
  const role = normalizeRole(profile.role);
  if (role !== "admin" && role !== "direccion") {
    throw new Error(
      "No autorizado: se requiere rol de Dirección o Administrador para operar El Vigía.",
    );
  }
  return profile;
}

export async function recognizeFindingAction(findingId: number) {
  const profile = await checkAuth();
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: finding, error: fetchError } = await supabase
    .from("vigia_findings")
    .select("id, sensor_id, fingerprint, title")
    .eq("id", findingId)
    .single();

  if (fetchError || !finding) {
    return { ok: false, error: "Hallazgo no encontrado." };
  }

  const { error: updateError } = await supabase
    .from("vigia_findings")
    .update({
      status: "reconocido",
      decided_by: profile.email || profile.full_name,
      decided_at: nowIso,
      decision_note: "Reconocido por el operador",
      updated_at: nowIso,
    })
    .eq("id", findingId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await supabase.from("vigia_audit_log").insert({
    event_type: "finding_recognized",
    actor: profile.email || "internal_user",
    sensor_id: finding.sensor_id,
    finding_id: findingId,
    payload: {
      fingerprint: finding.fingerprint,
      title: finding.title,
      decided_by: profile.email,
    },
  });

  revalidatePath("/vigia");
  return { ok: true };
}

export async function snoozeFindingAction(
  findingId: number,
  days = 7,
  note = "",
) {
  const profile = await checkAuth();
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const snoozeUntil = new Date(now.getTime() + days * 86400000).toISOString();
  const nowIso = now.toISOString();

  const { data: finding, error: fetchError } = await supabase
    .from("vigia_findings")
    .select("id, sensor_id, fingerprint, title")
    .eq("id", findingId)
    .single();

  if (fetchError || !finding) {
    return { ok: false, error: "Hallazgo no encontrado." };
  }

  const { error: updateError } = await supabase
    .from("vigia_findings")
    .update({
      status: "pospuesto",
      snooze_until: snoozeUntil,
      decided_by: profile.email || profile.full_name,
      decided_at: nowIso,
      decision_note: note ? `Motivo: ${note}` : "Pospuesto por el operador",
      updated_at: nowIso,
    })
    .eq("id", findingId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await supabase.from("vigia_audit_log").insert({
    event_type: "finding_snoozed",
    actor: profile.email || "internal_user",
    sensor_id: finding.sensor_id,
    finding_id: findingId,
    payload: {
      snooze_days: days,
      snooze_until: snoozeUntil,
      note,
      decided_by: profile.email,
    },
  });

  revalidatePath("/vigia");
  return { ok: true, snoozeUntil };
}

export async function dismissFindingAction(
  findingId: number,
  reason: string,
) {
  const profile = await checkAuth();
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  if (!reason || reason.trim().length < 4) {
    return { ok: false, error: "Debes ingresar un motivo razonado para descartar este hallazgo." };
  }

  const { data: finding, error: fetchError } = await supabase
    .from("vigia_findings")
    .select("id, sensor_id, fingerprint, title")
    .eq("id", findingId)
    .single();

  if (fetchError || !finding) {
    return { ok: false, error: "Hallazgo no encontrado." };
  }

  const { error: updateError } = await supabase
    .from("vigia_findings")
    .update({
      status: "descartado",
      decided_by: profile.email || profile.full_name,
      decided_at: nowIso,
      decision_note: reason.trim(),
      updated_at: nowIso,
    })
    .eq("id", findingId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await supabase.from("vigia_audit_log").insert({
    event_type: "finding_dismissed",
    actor: profile.email || "internal_user",
    sensor_id: finding.sensor_id,
    finding_id: findingId,
    payload: {
      reason: reason.trim(),
      fingerprint: finding.fingerprint,
      title: finding.title,
      decided_by: profile.email,
    },
  });

  revalidatePath("/vigia");
  return { ok: true };
}

export async function snoozeEntityAction(
  entityType: string,
  entityId: string,
  days = 14,
  note = "",
) {
  const profile = await checkAuth();
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const snoozeUntil = new Date(now.getTime() + days * 86400000).toISOString();
  const nowIso = now.toISOString();

  const decisionNote = note
    ? `Entidad silenciada. Motivo: ${note}`
    : "Entidad silenciada por el operador";

  const { data: findings, error: fetchError } = await supabase
    .from("vigia_findings")
    .select("id, sensor_id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("status", ["abierto", "reconocido"]);

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const ids = (findings ?? []).map((f) => f.id);
  if (ids.length > 0) {
    const { error: updateError } = await supabase
      .from("vigia_findings")
      .update({
        status: "pospuesto",
        snooze_until: snoozeUntil,
        decided_by: profile.email || profile.full_name,
        decided_at: nowIso,
        decision_note: decisionNote,
        updated_at: nowIso,
      })
      .in("id", ids);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }
  }

  await supabase.from("vigia_audit_log").insert({
    event_type: "entity_snoozed",
    actor: profile.email || "internal_user",
    payload: {
      entity_type: entityType,
      entity_id: entityId,
      findings_affected: ids.length,
      snooze_days: days,
      snooze_until: snoozeUntil,
      note,
      decided_by: profile.email,
    },
  });

  revalidatePath("/vigia");
  return { ok: true, count: ids.length, snoozeUntil };
}

export async function reactivateFindingAction(findingId: number) {
  const profile = await checkAuth();
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: finding, error: fetchError } = await supabase
    .from("vigia_findings")
    .select("id, sensor_id, fingerprint, title")
    .eq("id", findingId)
    .single();

  if (fetchError || !finding) {
    return { ok: false, error: "Hallazgo no encontrado." };
  }

  const { error: updateError } = await supabase
    .from("vigia_findings")
    .update({
      status: "abierto",
      snooze_until: null,
      decided_by: profile.email || profile.full_name,
      decided_at: nowIso,
      decision_note: "Reactivado manualmente desde la Bandeja",
      updated_at: nowIso,
    })
    .eq("id", findingId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await supabase.from("vigia_audit_log").insert({
    event_type: "finding_unsnoozed",
    actor: profile.email || "internal_user",
    sensor_id: finding.sensor_id,
    finding_id: findingId,
    payload: {
      fingerprint: finding.fingerprint,
      title: finding.title,
      reason: "reactivado_manualmente",
      decided_by: profile.email,
    },
  });

  revalidatePath("/vigia");
  return { ok: true };
}

export async function runVigiaNowAction() {
  await checkAuth();
  const supabase = createSupabaseAdminClient();

  // R5: Rate limit de 2 minutos para evitar saturacion
  const { data: lastRun } = await supabase
    .from("vigia_sensor_runs")
    .select("started_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRun?.started_at) {
    const elapsedMs = Date.now() - new Date(lastRun.started_at).getTime();
    const COOLDOWN_MS = 120000; // 2 minutos
    if (elapsedMs < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
      return {
        ok: false,
        error: `Espera ${remainingSec}s antes de solicitar otro diagnóstico manual.`,
      };
    }
  }

  try {
    const summary = await runVigia(supabase);
    revalidatePath("/vigia");
    return { ok: true, summary };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al ejecutar El Vigía";
    return { ok: false, error: message };
  }
}
