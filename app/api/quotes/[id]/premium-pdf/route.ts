import { NextResponse } from "next/server";
import {
  checkBasicRateLimit,
  createRequestId,
  getClientIp,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireInternalUser,
} from "@/lib/apiAuth";
import { buildQuotePremiumPdfHtml } from "@/lib/quotePremiumPdfHtml";
import { renderQuotePremiumPdf } from "@/lib/quotePremiumPdf";
import { getQuotePdfSnapshot } from "@/lib/quotePdfSnapshot";
import {
  getPartnerBranding,
  getPartnerBrandingMissingReason,
  type CommercialPartner,
} from "@/lib/commercialPartners";
import { canGeneratePartnerQuotes } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSafeFilename(value: string | null, fallback: string) {
  return (value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;

  if (
    !checkBasicRateLimit(
      `quote-premium-pdf:${profile?.id || "unknown"}:${getClientIp(request)}`,
      20,
      60_000
    )
  ) {
    return jsonError("Too Many Requests", 429);
  }

  const { id } = await params;
  const quoteId = parsePositiveInteger(id);
  if (!quoteId) return jsonError("Bad Request", 400);

  try {
    const supabase = await createSupabaseServerClient();
    const snapshot = await getQuotePdfSnapshot(supabase, quoteId);
    const brandingMode = new URL(request.url).searchParams.get("branding");
    let branding:
      | {
          name: string;
          logoUrl: string;
          primaryColor: string;
          secondaryColor: string;
          hidePartnerDiscount: boolean;
        }
      | undefined;

    if (brandingMode === "partner") {
      if (!canGeneratePartnerQuotes(profile?.role)) {
        return jsonError("Forbidden", 403);
      }

      const { data: quote } = await supabase
        .from("quotes")
        .select("is_partner_quote, commercial_partner_id")
        .eq("id", quoteId)
        .maybeSingle<{
          is_partner_quote: boolean | null;
          commercial_partner_id: number | null;
        }>();

      if (!quote?.is_partner_quote) return jsonError("Bad Request", 400);

      const { data: partner } = quote.commercial_partner_id
        ? await supabase
            .from("commercial_partners")
            .select(
              "id, commercial_name, logo_url, logo_storage_path, primary_color, secondary_color, contact_name, contact_email, contact_phone, is_active"
            )
            .eq("id", quote.commercial_partner_id)
            .maybeSingle<CommercialPartner>()
        : { data: null };

      const missingReason = getPartnerBrandingMissingReason(
        supabase,
        partner || null
      );
      const partnerBranding = getPartnerBranding(supabase, partner || null);
      if (missingReason || !partnerBranding) {
        return NextResponse.json(
          { error: missingReason || "White label unavailable", requestId },
          { status: 422 }
        );
      }

      branding = {
        ...partnerBranding,
        hidePartnerDiscount: true,
      };
    }

    const html = buildQuotePremiumPdfHtml(snapshot, branding);
    const pdf = await renderQuotePremiumPdf(html);
    const filename = getSafeFilename(
      snapshot.quote.quoteNumber,
      `cotizacion-${snapshot.quote.id}`
    );

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}${
          branding ? "-aliado" : "-premium-v0"
        }.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Cotizacion no encontrada."
        ? "Not Found"
        : "Unable to process request";

    if (message === "Not Found") return jsonError("Not Found", 404);

    logApiError(
      requestId,
      `quote premium PDF generation failed for quote ${quoteId}`,
      error
    );
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
