import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuoteBlindsDetail } from "@/lib/quoteBlindsBackend";
import type {
  QuoteBlindsPdfItem,
  QuoteBlindsPdfSnapshot,
} from "@/lib/quoteBlindsPdfHtml";

type NumericLike = number | string | null | undefined;

type QuoteRow = {
  id: number;
  quote_number: string | null;
  created_at: string | null;
  client_id: number | null;
  client_project_id: number | null;
  currency: string | null;
  subtotal_mxn: NumericLike;
  iva_mxn: NumericLike;
  total_mxn: NumericLike;
};

type BlindDetailRow = {
  width_cm: NumericLike;
  height_cm: NumericLike;
  calculated_m2_per_unit: NumericLike;
  blind_type: string | null;
  collection: string | null;
  color: string | null;
  mechanism: string | null;
  control: string | null;
  billable_m2_override: NumericLike;
  reference_image_path: string | null;
};

type ItemRow = {
  id: number;
  area: string | null;
  product_brand: string | null;
  product_model: string | null;
  quantity: NumericLike;
  line_total: NumericLike;
  customer_visible_note: string | null;
  blind_detail: BlindDetailRow | null;
};

type ClientRow = {
  name: string | null;
  company_name: string | null;
};

type ProjectRow = {
  name: string | null;
};

type TermsRow = {
  payment_100_equipment: boolean | null;
  payment_100_advance: boolean | null;
  is_local_guadalajara: boolean | null;
  includes_travel_expenses: boolean | null;
};

const DEFAULT_TERMS = {
  payment100Equipment: true,
  payment100Advance: false,
  isLocalGuadalajara: true,
  includesTravelExpenses: false,
};

let logoDataUrl: string | null = null;

function getLogoDataUrl() {
  if (logoDataUrl) return logoDataUrl;

  const logoPath = path.join(process.cwd(), "public", "logo-print.png");
  const logoBytes = fs.readFileSync(logoPath);
  logoDataUrl = `data:image/png;base64,${logoBytes.toString("base64")}`;
  return logoDataUrl;
}

function toNumber(value: NumericLike) {
  return Number(value || 0);
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function mapSafeItem(item: ItemRow): QuoteBlindsPdfItem {
  const detail = item.blind_detail;
  if (!detail) {
    throw new Error(
      `La partida ${item.id} no tiene detalle de persiana para generar el PDF.`
    );
  }

  const quantity = toNumber(item.quantity);
  const unitM2 = toNumber(detail.calculated_m2_per_unit);
  const calculatedM2 = round(unitM2 * quantity, 4);
  const billableM2 = round(
    detail.billable_m2_override == null
      ? calculatedM2
      : toNumber(detail.billable_m2_override),
    4
  );

  return {
    id: Number(item.id),
    area: item.area?.trim() || "Área general",
    brand: item.product_brand?.trim() || "Sin marca",
    model: item.product_model?.trim() || "Sin modelo",
    blindType: detail.blind_type?.trim() || "Persiana",
    collection: detail.collection?.trim() || "Sin colección",
    color: detail.color?.trim() || "Sin color",
    mechanism: detail.mechanism?.trim() || "Sin definir",
    control: detail.control?.trim() || "Sin definir",
    widthCm: toNumber(detail.width_cm),
    heightCm: toNumber(detail.height_cm),
    quantity,
    unitM2,
    billableM2,
    lineTotalMxn: round(toNumber(item.line_total), 2),
    customerVisibleNote: item.customer_visible_note?.trim() || null,
    hasReferenceImage: Boolean(detail.reference_image_path),
  };
}

export async function getQuoteBlindsPdfSnapshot(
  supabase: SupabaseClient,
  quoteId: number
): Promise<QuoteBlindsPdfSnapshot> {
  const detail = (await getQuoteBlindsDetail(supabase, quoteId)) as {
    quote: QuoteRow;
    items: ItemRow[];
  };
  const quote = detail.quote;

  const [
    { data: client, error: clientError },
    { data: project, error: projectError },
    { data: terms, error: termsError },
  ] = await Promise.all([
    quote.client_id
      ? supabase
          .from("clients")
          .select("name, company_name")
          .eq("id", quote.client_id)
          .maybeSingle<ClientRow>()
      : Promise.resolve({ data: null, error: null }),
    quote.client_project_id
      ? supabase
          .from("client_projects")
          .select("name")
          .eq("id", quote.client_project_id)
          .maybeSingle<ProjectRow>()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("quote_terms_settings")
      .select(
        "payment_100_equipment, payment_100_advance, is_local_guadalajara, includes_travel_expenses"
      )
      .eq("quote_id", quoteId)
      .maybeSingle<TermsRow>(),
  ]);

  if (clientError || projectError || termsError) {
    throw new Error(
      "No fue posible cargar el contexto comercial de la cotización."
    );
  }

  const safeItems = detail.items.map(mapSafeItem);
  const pieces = safeItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
  const billableM2 = round(
    safeItems.reduce(
      (total, item) => total + Number(item.billableM2 || 0),
      0
    ),
    4
  );

  return {
    logoDataUrl: getLogoDataUrl(),
    quote: {
      id: Number(quote.id),
      quoteNumber: quote.quote_number || null,
      createdAt: quote.created_at || null,
      currency: "MXN",
      validityText: "15 días naturales",
    },
    client: {
      name: client?.name || null,
      companyName: client?.company_name || null,
    },
    project: {
      name: project?.name || null,
    },
    totals: {
      pieces,
      billableM2,
      subtotalMxn: round(toNumber(quote.subtotal_mxn), 2),
      ivaMxn: round(toNumber(quote.iva_mxn), 2),
      totalMxn: round(toNumber(quote.total_mxn), 2),
    },
    terms: {
      payment100Equipment:
        terms?.payment_100_equipment ??
        DEFAULT_TERMS.payment100Equipment,
      payment100Advance:
        terms?.payment_100_advance ?? DEFAULT_TERMS.payment100Advance,
      isLocalGuadalajara:
        terms?.is_local_guadalajara ?? DEFAULT_TERMS.isLocalGuadalajara,
      includesTravelExpenses:
        terms?.includes_travel_expenses ??
        DEFAULT_TERMS.includesTravelExpenses,
    },
    items: safeItems,
  };
}
