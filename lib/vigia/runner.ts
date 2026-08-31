import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichFindings } from "./enrich";
import { SENSORS } from "./sensors";
import type {
  RawFinding,
  Sensor,
  SensorRunSummary,
  VigiaRunSummary,
} from "./types";

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return typeof error === "string" ? error : JSON.stringify(error);
}

async function audit(
  supabase: SupabaseClient,
  eventType: string,
  sensorId: string | null,
  findingId: number | null,
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

type ExistingFinding = {
  id: number;
  status: string;
  seen_count: number | null;
};

async function processSensor(
  supabase: SupabaseClient,
  sensor: Sensor,
): Promise<SensorRunSummary> {
  const { data: runRow, error: runError } = await supabase
    .from("vigia_sensor_runs")
    .insert({ sensor_id: sensor.id, status: "running" })
    .select("id")
    .single();

  if (runError) throw runError;
  const runId = (runRow as { id: number }).id;

  try {
    const raw: RawFinding[] = await sensor.run({ supabase });
    await enrichFindings(supabase, raw);
    const seen = new Set<string>();
    const nowIso = new Date().toISOString();
    let created = 0;
    let updated = 0;

    for (const finding of raw) {
      seen.add(finding.fingerprint);

      const { data: existingRow, error: existingError } = await supabase
        .from("vigia_findings")
        .select("id, status, seen_count")
        .eq("sensor_id", sensor.id)
        .eq("fingerprint", finding.fingerprint)
        .maybeSingle();
      if (existingError) throw existingError;

      const existing = existingRow as ExistingFinding | null;

      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from("vigia_findings")
          .insert({
            sensor_id: sensor.id,
            fingerprint: finding.fingerprint,
            domain: sensor.domain,
            lane: finding.lane,
            severity: finding.severity,
            confidence: finding.confidence,
            title: finding.title,
            summary: finding.summary,
            evidence: finding.evidence,
            impact_mxn: finding.impactMxn ?? null,
            entity_type: finding.entityType ?? null,
            entity_id: finding.entityId ?? null,
            entity_label: finding.entityLabel ?? null,
            proposed_action: finding.proposedAction ?? null,
            run_id: runId,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        created += 1;
        await audit(supabase, "finding_created", sensor.id, (inserted as { id: number }).id, {
          fingerprint: finding.fingerprint,
          title: finding.title,
          lane: finding.lane,
          impact_mxn: finding.impactMxn ?? null,
        });
        continue;
      }

      const patch: Record<string, unknown> = {
        title: finding.title,
        summary: finding.summary,
        evidence: finding.evidence,
        severity: finding.severity,
        confidence: finding.confidence,
        impact_mxn: finding.impactMxn ?? null,
        entity_label: finding.entityLabel ?? null,
        proposed_action: finding.proposedAction ?? null,
        last_seen_at: nowIso,
        seen_count: Number(existing.seen_count ?? 1) + 1,
        run_id: runId,
        updated_at: nowIso,
      };

      // Reabrir si habia sido marcado como resuelto y volvio a aparecer.
      // Respetar "descartado": se actualiza la evidencia pero no el estado.
      if (existing.status === "resuelto") {
        patch.status = "abierto";
        patch.resolved_at = null;
      }

      const { error: updateError } = await supabase
        .from("vigia_findings")
        .update(patch)
        .eq("id", existing.id);
      if (updateError) throw updateError;
      updated += 1;

      if (existing.status === "resuelto") {
        await audit(supabase, "finding_reopened", sensor.id, existing.id, {
          fingerprint: finding.fingerprint,
        });
      }
    }

    // Auto-resolver los hallazgos abiertos de este sensor que ya no aparecen.
    const { data: openRows, error: openError } = await supabase
      .from("vigia_findings")
      .select("id, fingerprint")
      .eq("sensor_id", sensor.id)
      .in("status", ["abierto", "reconocido"]);
    if (openError) throw openError;

    const toResolve = ((openRows ?? []) as { id: number; fingerprint: string }[]).filter(
      (row) => !seen.has(row.fingerprint),
    );

    if (toResolve.length > 0) {
      const ids = toResolve.map((row) => row.id);
      const { error: resolveError } = await supabase
        .from("vigia_findings")
        .update({ status: "resuelto", resolved_at: nowIso, updated_at: nowIso })
        .in("id", ids);
      if (resolveError) throw resolveError;
      for (const row of toResolve) {
        await audit(supabase, "finding_resolved", sensor.id, row.id, {
          reason: "ya no aparece en la deteccion",
        });
      }
    }

    await supabase
      .from("vigia_sensor_runs")
      .update({
        status: "ok",
        finished_at: nowIso,
        findings_count: raw.length,
        resolved_count: toResolve.length,
      })
      .eq("id", runId);

    return {
      id: sensor.id,
      found: raw.length,
      created,
      updated,
      resolved: toResolve.length,
    };
  } catch (error) {
    const message = errorMessage(error);
    await supabase
      .from("vigia_sensor_runs")
      .update({ status: "error", finished_at: new Date().toISOString(), error: message })
      .eq("id", runId);
    await audit(supabase, "sensor_error", sensor.id, null, { error: message });
    return { id: sensor.id, found: 0, created: 0, updated: 0, resolved: 0, error: message };
  }
}

export async function runVigia(
  supabase: SupabaseClient,
  options?: { sensorIds?: string[] },
): Promise<VigiaRunSummary> {
  const startedAt = new Date().toISOString();
  const sensors = options?.sensorIds
    ? SENSORS.filter((sensor) => options.sensorIds?.includes(sensor.id))
    : SENSORS;

  const results: SensorRunSummary[] = [];
  for (const sensor of sensors) {
    results.push(await processSensor(supabase, sensor));
  }

  const { data: openRows } = await supabase
    .from("vigia_findings")
    .select("impact_mxn")
    .in("status", ["abierto", "reconocido"]);

  const openFindings = openRows?.length ?? 0;
  const impactMxnOpen = ((openRows ?? []) as { impact_mxn: number | null }[]).reduce(
    (sum, row) => sum + Math.abs(Number(row.impact_mxn ?? 0)),
    0,
  );

  const finishedAt = new Date().toISOString();
  const summary: VigiaRunSummary = {
    startedAt,
    finishedAt,
    sensors: results,
    openFindings,
    newFindings: results.reduce((sum, row) => sum + row.created, 0),
    resolvedFindings: results.reduce((sum, row) => sum + row.resolved, 0),
    impactMxnOpen,
  };

  await audit(supabase, "run_completed", null, null, {
    sensors: results,
    open_findings: openFindings,
    new_findings: summary.newFindings,
    resolved_findings: summary.resolvedFindings,
  });

  return summary;
}
