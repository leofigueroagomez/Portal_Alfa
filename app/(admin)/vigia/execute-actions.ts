"use server";

import { revalidatePath } from "next/cache";
import { normalizeRole } from "@/lib/permissions";
import { getExecutor } from "@/lib/vigia/executors";
import type { ExecFinding } from "@/lib/vigia/executors";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

async function checkAuth() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) throw new Error("No autenticado en ALFA OS.");
  const role = normalizeRole(profile.role);
  if (role !== "admin" && role !== "direccion") {
    throw new Error(
      "No autorizado: se requiere rol de Direccion o Administrador para operar El Vigia.",
    );
  }
  return profile;
}

/**
 * Autoriza y ejecuta la correccion propuesta por un hallazgo.
 * Guarda respaldo, marca el hallazgo como resuelto y audita.
 */
export async function applyFindingAction(findingId: number) {
  const profile = await checkAuth();
  const actor = profile.email || profile.full_name || "operador";
  const supabase = createSupabaseAdminClient();

  const { data: findingRow, error: fErr } = await supabase
    .from("vigia_findings")
    .select("id, sensor_id, entity_type, entity_id, title, proposed_action, status")
    .eq("id", findingId)
    .single();
  if (fErr || !findingRow) return { ok: false, error: "Hallazgo no encontrado." };
  if (findingRow.status === "resuelto") {
    return { ok: false, error: "El hallazgo ya esta resuelto." };
  }

  const finding = findingRow as ExecFinding & { status: string };
  const actionType = finding.proposed_action?.type as string | undefined;
  const executor = getExecutor(actionType);
  if (!executor) {
    return { ok: false, error: "Este hallazgo no tiene una correccion automatica." };
  }

  const pre = await executor.canApply(supabase, finding);
  if (!pre.ok) return { ok: false, error: pre.reason || "No se puede aplicar." };

  let result;
  try {
    result = await executor.apply(supabase, finding, actor);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("vigia_audit_log").insert({
      event_type: "action_failed",
      actor,
      sensor_id: finding.sensor_id,
      finding_id: findingId,
      payload: { action_type: actionType, error: message },
    });
    return { ok: false, error: message };
  }

  if (!result.ok) return { ok: false, error: result.error || "La correccion no se aplico." };

  const nowIso = new Date().toISOString();
  await supabase
    .from("vigia_findings")
    .update({
      status: "resuelto",
      resolved_at: nowIso,
      decided_by: actor,
      decided_at: nowIso,
      decision_note: `Corregido desde la Bandeja: ${result.summary ?? executor.label}`,
      updated_at: nowIso,
    })
    .eq("id", findingId);

  await supabase.from("vigia_audit_log").insert({
    event_type: "action_applied",
    actor,
    sensor_id: finding.sensor_id,
    finding_id: findingId,
    payload: {
      action_type: actionType,
      backup_id: result.backupId,
      summary: result.summary,
    },
  });

  revalidatePath("/vigia");
  return { ok: true, summary: result.summary };
}

/**
 * Revierte la ultima correccion aplicada a un hallazgo desde su respaldo.
 */
export async function revertFindingAction(findingId: number) {
  const profile = await checkAuth();
  const actor = profile.email || profile.full_name || "operador";
  const supabase = createSupabaseAdminClient();

  const { data: backupRow, error: bErr } = await supabase
    .from("vigia_action_backups")
    .select("id, action_type, snapshot")
    .eq("finding_id", findingId)
    .is("reverted_at", null)
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (bErr) return { ok: false, error: bErr.message };
  if (!backupRow) return { ok: false, error: "No hay una correccion que revertir para este hallazgo." };

  const backup = backupRow as {
    id: number;
    action_type: string;
    snapshot: Record<string, unknown>;
  };
  const executor = getExecutor(backup.action_type);
  if (!executor) return { ok: false, error: "Ejecutor desconocido para revertir." };

  let result;
  try {
    result = await executor.revert(supabase, backup.snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
  if (!result.ok) return { ok: false, error: result.error || "No se pudo revertir." };

  const nowIso = new Date().toISOString();
  await supabase
    .from("vigia_action_backups")
    .update({ reverted_at: nowIso, reverted_by: actor })
    .eq("id", backup.id);

  await supabase
    .from("vigia_findings")
    .update({
      status: "abierto",
      resolved_at: null,
      decision_note: `Correccion revertida por ${actor}`,
      updated_at: nowIso,
    })
    .eq("id", findingId);

  await supabase.from("vigia_audit_log").insert({
    event_type: "action_reverted",
    actor,
    finding_id: findingId,
    payload: { action_type: backup.action_type, backup_id: backup.id },
  });

  revalidatePath("/vigia");
  return { ok: true };
}
