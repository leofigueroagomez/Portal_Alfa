import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkBudget, computeCostUsd } from "./budget";
import { sendInvestigationEmail } from "./email";
import { interpret } from "./interpret";
import { getPlaybook } from "./playbooks";
import type { InvestigationFinding, InvestigationOutcome } from "./types";

export type { InvestigationOutcome } from "./types";

const FINDING_COLUMNS =
  "id, sensor_id, domain, lane, severity, confidence, title, summary, evidence, impact_mxn, entity_type, entity_id, entity_label, proposed_action, status";

async function audit(
  supabase: SupabaseClient,
  eventType: string,
  findingId: number | null,
  sensorId: string | null,
  payload: Record<string, unknown>,
) {
  await supabase.from("vigia_audit_log").insert({
    event_type: eventType,
    actor: "vigia",
    sensor_id: sensorId,
    finding_id: findingId,
    payload,
  });
}

/** True si el hallazgo ya tiene una investigacion completada o corriendo. */
export async function hasInvestigation(
  supabase: SupabaseClient,
  findingId: number,
): Promise<boolean> {
  const { count } = await supabase
    .from("vigia_investigations")
    .select("id", { count: "exact", head: true })
    .eq("finding_id", findingId)
    .in("status", ["running", "completada"]);
  return Boolean(count && count > 0);
}

export async function investigateFinding(
  supabase: SupabaseClient,
  findingId: number,
  opts: { trigger: "manual" | "auto_critico"; requestedBy: string },
): Promise<InvestigationOutcome> {
  const { data: findingRow, error: findingErr } = await supabase
    .from("vigia_findings")
    .select(FINDING_COLUMNS)
    .eq("id", findingId)
    .maybeSingle();
  if (findingErr) return { ok: false, error: findingErr.message };
  if (!findingRow) return { ok: false, error: "Hallazgo no encontrado." };
  const finding = findingRow as InvestigationFinding;

  // 1. Candado de presupuesto ANTES de llamar al modelo.
  const budget = await checkBudget(supabase);
  if (!budget.ok) {
    const nowIso = new Date().toISOString();
    await supabase.from("vigia_investigations").insert({
      finding_id: findingId,
      sensor_id: finding.sensor_id,
      entity_type: finding.entity_type,
      entity_id: finding.entity_id,
      trigger: opts.trigger,
      status: "sin_presupuesto",
      requested_by: opts.requestedBy,
      error: budget.reason,
      finished_at: nowIso,
    });
    await audit(supabase, "investigation_skipped_budget", findingId, finding.sensor_id, {
      spent_usd: budget.spentUsd,
      cap_usd: budget.capUsd,
    });
    return {
      ok: false,
      status: "sin_presupuesto",
      error: budget.reason,
      budget,
    };
  }

  // 2. Fila 'running'.
  const { data: invRow, error: invErr } = await supabase
    .from("vigia_investigations")
    .insert({
      finding_id: findingId,
      sensor_id: finding.sensor_id,
      entity_type: finding.entity_type,
      entity_id: finding.entity_id,
      trigger: opts.trigger,
      status: "running",
      requested_by: opts.requestedBy,
    })
    .select("id")
    .single();
  if (invErr || !invRow) {
    return { ok: false, error: invErr?.message ?? "No se pudo abrir la investigacion." };
  }
  const investigationId = (invRow as { id: number }).id;
  await audit(supabase, "investigation_started", findingId, finding.sensor_id, {
    investigation_id: investigationId,
    trigger: opts.trigger,
    requested_by: opts.requestedBy,
  });

  try {
    const playbook = getPlaybook(finding.sensor_id);
    const dossier = await playbook.run(supabase, finding);
    const { interpretation, usage, model } = await interpret(finding, dossier);
    const costUsd = computeCostUsd(usage);
    const nowIso = new Date().toISOString();

    await supabase
      .from("vigia_investigations")
      .update({
        status: "completada",
        playbook: dossier.playbook,
        dossier,
        interpretation,
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_usd: costUsd,
        finished_at: nowIso,
      })
      .eq("id", investigationId);

    await audit(supabase, "investigation_completed", findingId, finding.sensor_id, {
      investigation_id: investigationId,
      playbook: dossier.playbook,
      cost_usd: costUsd,
      es_automatizable: interpretation.es_automatizable,
      confianza: interpretation.confianza,
    });

    let emailed = false;
    try {
      const res = await sendInvestigationEmail(supabase, finding, interpretation, {
        costUsd,
        model,
        playbook: dossier.playbook,
        investigationId,
      });
      emailed = res.sent;
    } catch (emailError) {
      await audit(supabase, "investigation_email_failed", findingId, finding.sensor_id, {
        investigation_id: investigationId,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return {
      ok: true,
      investigationId,
      status: "completada",
      causaRaiz: interpretation.causa_raiz,
      explicacion: interpretation.explicacion,
      costUsd,
      emailed,
      budget,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("vigia_investigations")
      .update({ status: "error", error: message, finished_at: new Date().toISOString() })
      .eq("id", investigationId);
    await audit(supabase, "investigation_failed", findingId, finding.sensor_id, {
      investigation_id: investigationId,
      error: message,
    });
    return { ok: false, status: "error", error: message, investigationId };
  }
}

/**
 * Corre investigaciones automaticas para los hallazgos criticos que aun no
 * tienen una. Se llama al final del cron diario. Respeta el tope por corrida
 * (VIGIA_INVESTIGATE_MAX_PER_RUN, default 3) y para en seco si se agota el
 * presupuesto del mes.
 */
export async function runAutoInvestigations(
  supabase: SupabaseClient,
): Promise<{ attempted: number; completed: number; skipped: number; results: Array<{ findingId: number; ok: boolean; status?: string }> }> {
  if (process.env.VIGIA_INVESTIGATE_AUTO === "0") {
    return { attempted: 0, completed: 0, skipped: 0, results: [] };
  }
  const maxPerRun = Math.max(
    0,
    Number(process.env.VIGIA_INVESTIGATE_MAX_PER_RUN ?? 3) || 0,
  );
  if (maxPerRun === 0) return { attempted: 0, completed: 0, skipped: 0, results: [] };

  const { data: criticos } = await supabase
    .from("vigia_findings")
    .select("id, sensor_id")
    .eq("severity", "critico")
    .in("status", ["abierto", "reconocido"])
    .order("impact_mxn", { ascending: true, nullsFirst: false });

  const results: Array<{ findingId: number; ok: boolean; status?: string }> = [];
  let completed = 0;
  let skipped = 0;

  for (const row of (criticos ?? []) as { id: number }[]) {
    if (results.length >= maxPerRun) break;
    if (await hasInvestigation(supabase, row.id)) {
      skipped += 1;
      continue;
    }
    const outcome = await investigateFinding(supabase, row.id, {
      trigger: "auto_critico",
      requestedBy: "vigia",
    });
    results.push({ findingId: row.id, ok: outcome.ok, status: outcome.status });
    if (outcome.ok) completed += 1;
    if (outcome.status === "sin_presupuesto") break;
  }

  return { attempted: results.length, completed, skipped, results };
}
