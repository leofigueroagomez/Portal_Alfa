import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { computeImpactTotal, type ImpactRow } from "./impact";
import { SENSORS } from "./sensors";
import type { FindingLane, Severity, VigiaDomain } from "./types";

export type VigiaFindingRecord = {
  id: number;
  sensor_id: string;
  fingerprint: string;
  domain: VigiaDomain;
  lane: FindingLane;
  severity: Severity;
  confidence: "alta" | "media" | "baja";
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  impact_mxn: number | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  proposed_action: Record<string, unknown> | null;
  status:
    | "abierto"
    | "reconocido"
    | "descartado"
    | "resuelto"
    | "auto_aplicado"
    | "expirado"
    | "pospuesto";
  snooze_until: string | null;
  first_seen_at: string;
  last_seen_at: string;
  seen_count: number;
  resolved_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
};

export type VigiaOverview = {
  totalOpen: number;
  requiresAuthCount: number;
  payAttentionCount: number;
  autoAppliedCount: number;
  recognizedCount: number;
  dismissedCount: number;
  resolvedCount: number;
  snoozedCount: number;
  impactMxnOpen: number;
  integrityScore: number;
  activeSensorsCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
};

export type VigiaAuditRecord = {
  id: number;
  event_type: string;
  actor: string;
  sensor_id: string | null;
  finding_id: number | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function getVigiaOverview(
  supabase?: SupabaseClient,
): Promise<VigiaOverview> {
  const client = supabase ?? createSupabaseAdminClient();

  const [findingsRes, lastRunRes, totalProjectsRes, projectsWithFindingsRes] =
    await Promise.all([
      client.from("vigia_findings").select("*"),
      client
        .from("vigia_sensor_runs")
        .select("started_at, status")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("client_projects")
        .select("id", { count: "exact", head: true })
        .in("sales_stage", ["won", "delivered"]),
      client
        .from("vigia_findings")
        .select("entity_id")
        .eq("entity_type", "client_project")
        .in("status", ["abierto", "reconocido"]),
    ]);

  const findings = (findingsRes.data ?? []) as VigiaFindingRecord[];

  let requiresAuthCount = 0;
  let payAttentionCount = 0;
  let autoAppliedCount = 0;
  let recognizedCount = 0;
  let dismissedCount = 0;
  let resolvedCount = 0;
  let snoozedCount = 0;

  for (const f of findings) {
    if (f.status === "abierto" || f.status === "reconocido") {
      if (f.lane === "requiere_autorizacion") requiresAuthCount++;
      if (f.lane === "prestar_atencion") payAttentionCount++;
      if (f.lane === "auto_aplicado") autoAppliedCount++;
      if (f.status === "reconocido") recognizedCount++;
    } else if (f.status === "descartado") {
      dismissedCount++;
    } else if (f.status === "resuelto") {
      resolvedCount++;
    } else if (f.status === "pospuesto") {
      snoozedCount++;
    }
  }

  // Mismo calculo de impacto que el brief (evita doble conteo de rollups).
  const impactMxnOpen = computeImpactTotal(
    findings
      .filter((f) => f.status === "abierto" || f.status === "reconocido")
      .map(
        (f): ImpactRow => ({
          sensor_id: f.sensor_id,
          entity_type: f.entity_type,
          entity_id: f.entity_id,
          impact_mxn: f.impact_mxn,
        }),
      ),
  );

  const totalOpen = requiresAuthCount + payAttentionCount;

  // Calculo del indice de salud / integridad de proyectos
  const totalActiveProjects = totalProjectsRes.count || 1;
  const uniqueAffectedProjects = new Set(
    (projectsWithFindingsRes.data ?? []).map((row) => row.entity_id).filter(Boolean),
  ).size;
  const cleanProjects = Math.max(0, totalActiveProjects - uniqueAffectedProjects);
  const integrityScore = Math.min(
    100,
    Math.max(0, Math.round((cleanProjects / totalActiveProjects) * 100)),
  );

  return {
    totalOpen,
    requiresAuthCount,
    payAttentionCount,
    autoAppliedCount,
    recognizedCount,
    dismissedCount,
    resolvedCount,
    snoozedCount,
    impactMxnOpen,
    integrityScore,
    activeSensorsCount: SENSORS.length,
    lastRunAt: lastRunRes.data?.started_at ?? null,
    lastRunStatus: lastRunRes.data?.status ?? null,
  };
}

export async function getVigiaFindings(
  options?: {
    lane?: FindingLane | "todos";
    status?:
      | "abierto"
      | "reconocido"
      | "descartado"
      | "resuelto"
      | "pospuesto"
      | "todos";
    domain?: VigiaDomain | "todos";
  },
  supabase?: SupabaseClient,
): Promise<VigiaFindingRecord[]> {
  const client = supabase ?? createSupabaseAdminClient();

  let query = client.from("vigia_findings").select("*");

  if (options?.lane && options.lane !== "todos") {
    query = query.eq("lane", options.lane);
  }

  if (options?.domain && options.domain !== "todos") {
    query = query.eq("domain", options.domain);
  }

  if (options?.status && options.status !== "todos") {
    query = query.eq("status", options.status);
  } else if (!options?.status) {
    // Por defecto mostrar los abiertos y reconocidos
    query = query.in("status", ["abierto", "reconocido"]);
  }

  query = query
    .order("impact_mxn", { ascending: true, nullsFirst: false })
    .order("last_seen_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as VigiaFindingRecord[];
}

export async function getVigiaAuditLogs(
  limit = 30,
  supabase?: SupabaseClient,
): Promise<VigiaAuditRecord[]> {
  const client = supabase ?? createSupabaseAdminClient();

  const { data, error } = await client
    .from("vigia_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as VigiaAuditRecord[];
}
