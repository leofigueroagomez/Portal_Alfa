import type { SupabaseClient } from "@supabase/supabase-js";

type InvoiceFolioRow = {
  id: number;
  internal_folio: string | null;
};

const SIMPLE_FOLIO_PATTERN = /^FAC-(\d+)$/;
const YEARLY_FOLIO_PATTERN = /^FAC-(\d{4})-(\d+)$/;

function padFolioNumber(value: number) {
  return String(value).padStart(4, "0");
}

export function formatInternalInvoiceFolio(sequence: number, year?: number) {
  return year
    ? `FAC-${year}-${padFolioNumber(sequence)}`
    : `FAC-${padFolioNumber(sequence)}`;
}

export function getInternalFolioSequence(folio: string | null | undefined) {
  const clean = folio?.trim().toUpperCase();
  if (!clean) return null;

  const simpleMatch = clean.match(SIMPLE_FOLIO_PATTERN);
  if (simpleMatch?.[1]) return Number(simpleMatch[1]);

  const yearlyMatch = clean.match(YEARLY_FOLIO_PATTERN);
  if (yearlyMatch?.[2]) return Number(yearlyMatch[2]);

  return null;
}

export function getInternalFolioYear(folio: string | null | undefined) {
  const clean = folio?.trim().toUpperCase();
  if (!clean) return null;

  const yearlyMatch = clean.match(YEARLY_FOLIO_PATTERN);
  return yearlyMatch?.[1] ? Number(yearlyMatch[1]) : null;
}

export async function getNextInternalInvoiceFolio(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("project_invoices")
    .select("id, internal_folio")
    .not("internal_folio", "is", null)
    .order("id", { ascending: false })
    .limit(10000);

  if (error) {
    throw new Error(`No se pudo calcular folio interno: ${error.message}`);
  }

  const rows = (data || []) as InvoiceFolioRow[];
  const currentYear = new Date().getFullYear();
  const hasYearlyConvention = rows.some((row) =>
    YEARLY_FOLIO_PATTERN.test(row.internal_folio?.trim().toUpperCase() || "")
  );

  if (hasYearlyConvention) {
    const maxForYear = rows.reduce((max, row) => {
      if (getInternalFolioYear(row.internal_folio) !== currentYear) return max;
      return Math.max(max, getInternalFolioSequence(row.internal_folio) || 0);
    }, 0);

    return formatInternalInvoiceFolio(maxForYear + 1, currentYear);
  }

  const maxSimple = rows.reduce((max, row) => {
    const clean = row.internal_folio?.trim().toUpperCase() || "";
    if (!SIMPLE_FOLIO_PATTERN.test(clean)) return max;
    return Math.max(max, getInternalFolioSequence(clean) || 0);
  }, 0);

  return formatInternalInvoiceFolio(maxSimple + 1);
}

export function isDuplicateInternalFolioError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; message?: string };
  const message = maybeError.message || "";

  return (
    maybeError.code === "23505" ||
    message.includes("internal_folio") ||
    message.includes("project_invoices_internal_folio")
  );
}
