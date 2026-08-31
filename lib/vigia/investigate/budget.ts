import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BudgetStatus, ModelUsage } from "./types";

/**
 * Candado de costo de las investigaciones (Sprint B2).
 *
 * Tope mensual duro en USD. El gasto del mes se calcula sumando cost_usd de
 * las filas de vigia_investigations con started_at dentro del mes en curso.
 * Al alcanzar el tope, checkBudget() devuelve ok:false y el orquestador NO
 * llama al modelo (registra la investigacion como 'sin_presupuesto').
 */

export const DEFAULT_MONTHLY_CAP_USD = 25;
export const DEFAULT_PRICE_INPUT_USD_PER_MTOK = 3;
export const DEFAULT_PRICE_OUTPUT_USD_PER_MTOK = 15;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function monthlyCapUsd(): number {
  return envNumber("VIGIA_INVESTIGATE_MONTHLY_CAP_USD", DEFAULT_MONTHLY_CAP_USD);
}

export function computeCostUsd(usage: ModelUsage): number {
  const priceIn = envNumber(
    "VIGIA_PRICE_INPUT_USD_PER_MTOK",
    DEFAULT_PRICE_INPUT_USD_PER_MTOK,
  );
  const priceOut = envNumber(
    "VIGIA_PRICE_OUTPUT_USD_PER_MTOK",
    DEFAULT_PRICE_OUTPUT_USD_PER_MTOK,
  );
  const cost =
    (Number(usage.input_tokens || 0) / 1_000_000) * priceIn +
    (Number(usage.output_tokens || 0) / 1_000_000) * priceOut;
  return Math.round(cost * 10_000) / 10_000;
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

export async function getMonthlySpendUsd(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase
    .from("vigia_investigations")
    .select("cost_usd")
    .gte("started_at", monthStartIso());
  if (error) throw error;
  return (data ?? []).reduce(
    (sum, row) => sum + Number((row as { cost_usd: number | null }).cost_usd ?? 0),
    0,
  );
}

export async function checkBudget(
  supabase: SupabaseClient,
): Promise<BudgetStatus> {
  const capUsd = monthlyCapUsd();
  const spentUsd = await getMonthlySpendUsd(supabase);
  const remainingUsd = Math.max(0, Math.round((capUsd - spentUsd) * 10_000) / 10_000);
  if (spentUsd >= capUsd) {
    return {
      ok: false,
      spentUsd,
      capUsd,
      remainingUsd,
      reason: `Tope mensual de investigaciones alcanzado ($${spentUsd.toFixed(
        2,
      )} / $${capUsd.toFixed(2)} USD). Se reanuda el 1 del mes que entra o sube VIGIA_INVESTIGATE_MONTHLY_CAP_USD.`,
    };
  }
  return { ok: true, spentUsd, capUsd, remainingUsd };
}
