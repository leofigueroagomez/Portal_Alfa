import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPartnerBranding,
  getPartnerBrandingMissingReason,
  type CommercialPartner,
  type PartnerBranding,
} from "@/lib/commercialPartners";
import { slugifyFilenamePart } from "@/lib/filenames";
import { getMexicoDate } from "@/lib/mexicoDate";

/**
 * Misma resolución que el modo ?branding=partner del botón PDF Premium.
 * El llamador decide el 403 de rol. Aquí solo se lee la cotización y el aliado.
 */

const PARTNER_COLUMNS =
  "id, commercial_name, logo_url, logo_storage_path, primary_color, secondary_color, contact_name, contact_email, contact_phone, is_active";

export type PartnerQuotePdfBranding = PartnerBranding & {
  hidePartnerDiscount: true;
};

export type PartnerQuotePdfBrandingResult =
  | { ok: true; branding: PartnerQuotePdfBranding }
  | {
      ok: false;
      status: 400;
      error: "Bad Request";
      reason: "not_partner_quote";
    }
  | {
      ok: false;
      status: 422;
      error: string;
      reason: "missing_branding";
    };

type QuoteNameSource = {
  quote: {
    id: number;
    quoteNumber: string | null;
    isPartnerQuote?: boolean;
  };
  client: {
    companyName: string | null;
    name: string | null;
  };
};

export function buildQuotePremiumPdfFilename(
  snapshot: QuoteNameSource,
  branding?: PartnerBranding | null,
  date = getMexicoDate()
) {
  const quoteNumberPart =
    slugifyFilenamePart(snapshot.quote.quoteNumber) || `ID${snapshot.quote.id}`;
  const clientPart = slugifyFilenamePart(
    snapshot.client.companyName || snapshot.client.name
  );
  const suffix = branding
    ? "-Aliado"
    : snapshot.quote.isPartnerQuote
      ? "-ALFA"
      : "";

  return ["Cotizacion", quoteNumberPart, clientPart, date]
    .filter(Boolean)
    .join("-")
    .concat(suffix);
}

export async function resolvePartnerQuotePdfBranding(
  supabase: SupabaseClient,
  quoteId: number
): Promise<PartnerQuotePdfBrandingResult> {
  const { data: quote } = await supabase
    .from("quotes")
    .select("is_partner_quote, commercial_partner_id")
    .eq("id", quoteId)
    .maybeSingle<{
      is_partner_quote: boolean | null;
      commercial_partner_id: number | null;
    }>();

  if (!quote?.is_partner_quote) {
    return { ok: false, status: 400, error: "Bad Request", reason: "not_partner_quote" };
  }

  const { data: partner } = quote.commercial_partner_id
    ? await supabase
        .from("commercial_partners")
        .select(PARTNER_COLUMNS)
        .eq("id", quote.commercial_partner_id)
        .maybeSingle<CommercialPartner>()
    : { data: null };

  const missingReason = getPartnerBrandingMissingReason(supabase, partner || null);
  const partnerBranding = getPartnerBranding(supabase, partner || null);
  if (missingReason || !partnerBranding) {
    return {
      ok: false,
      status: 422,
      error: missingReason || "White label unavailable",
      reason: "missing_branding",
    };
  }

  return {
    ok: true,
    branding: {
      ...partnerBranding,
      hidePartnerDiscount: true,
    },
  };
}
