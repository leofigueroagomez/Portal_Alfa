import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * El Vigia de ALFA OS - contratos base de la capa de vigilancia.
 * Ver plan: https://claude.ai/code/artifact/321f9ba1-a6ee-471a-a4e5-f05279cf74a4
 */

export type VigiaDomain = "integridad_datos" | "costos_margenes";

export type FindingLane =
  | "auto_aplicado"
  | "requiere_autorizacion"
  | "prestar_atencion";

export type Severity = "info" | "bajo" | "medio" | "alto" | "critico";

export type Confidence = "alta" | "media" | "baja";

export type RawFinding = {
  /** Clave estable para deduplicar el mismo problema entre corridas. */
  fingerprint: string;
  lane: FindingLane;
  severity: Severity;
  confidence: Confidence;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  impactMxn?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  /** Nombre legible de la entidad; lo llena el runner via enrichFindings(). */
  entityLabel?: string | null;
  proposedAction?: Record<string, unknown> | null;
};

export type SensorContext = {
  supabase: SupabaseClient;
};

export type Sensor = {
  id: string;
  domain: VigiaDomain;
  title: string;
  description: string;
  run: (ctx: SensorContext) => Promise<RawFinding[]>;
};

export type SensorRunSummary = {
  id: string;
  found: number;
  created: number;
  updated: number;
  resolved: number;
  error?: string;
};

export type VigiaRunSummary = {
  startedAt: string;
  finishedAt: string;
  sensors: SensorRunSummary[];
  openFindings: number;
  newFindings: number;
  resolvedFindings: number;
  impactMxnOpen: number;
};

export function severityFromImpact(impactMxn: number | null | undefined): Severity {
  const value = Math.abs(Number(impactMxn ?? 0));
  if (value >= 12000) return "critico";
  if (value >= 3000) return "alto";
  if (value >= 500) return "medio";
  if (value > 0) return "bajo";
  return "info";
}
