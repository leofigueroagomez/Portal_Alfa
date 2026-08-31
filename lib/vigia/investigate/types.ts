import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * El Vigia - Sprint B2: "Investigar a fondo".
 *
 * Contrato hibrido: un playbook determinista arma el expediente (dossier) y
 * una unica llamada a Claude lo interpreta. El dossier es solo lectura sobre
 * las tablas de negocio; el modelo nunca escribe nada.
 */

/** Fila de vigia_findings tal como la lee el orquestador. */
export type InvestigationFinding = {
  id: number;
  sensor_id: string;
  domain: string;
  lane: string;
  severity: string;
  confidence: string;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  impact_mxn: number | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  proposed_action: Record<string, unknown> | null;
  status: string;
};

/** Bloque del expediente: un titulo y datos crudos de una consulta de diagnostico. */
export type DossierBlock = {
  titulo: string;
  descripcion?: string;
  datos: unknown;
};

export type InvestigationDossier = {
  playbook: string;
  resumen: string;
  bloques: DossierBlock[];
  /** Pistas deterministas para el modelo (no son la conclusion). */
  senales: string[];
};

export type Playbook = {
  id: string;
  /** sensor_id que atiende este playbook, o "*" para el generico. */
  sensorId: string;
  run: (
    supabase: SupabaseClient,
    finding: InvestigationFinding,
  ) => Promise<InvestigationDossier>;
};

/** Salida estructurada de la unica llamada al modelo. */
export type Interpretation = {
  causa_raiz: string;
  explicacion: string;
  accion_recomendada: string;
  es_automatizable: boolean;
  partidas_a_conservar?: number[];
  partidas_a_eliminar?: number[];
  riesgos?: string;
  pasos_verificacion?: string[];
  confianza: "alta" | "media" | "baja";
};

export type ModelUsage = { input_tokens: number; output_tokens: number };

export type InterpretResult = {
  interpretation: Interpretation;
  usage: ModelUsage;
  model: string;
};

export type BudgetStatus = {
  ok: boolean;
  spentUsd: number;
  capUsd: number;
  remainingUsd: number;
  reason?: string;
};

export type InvestigationOutcome = {
  ok: boolean;
  error?: string;
  investigationId?: number;
  status?: "completada" | "error" | "sin_presupuesto";
  causaRaiz?: string;
  explicacion?: string;
  costUsd?: number;
  emailed?: boolean;
  budget?: BudgetStatus;
};
