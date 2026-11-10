import { renderQuotePremiumPdf } from "@/lib/quotePremiumPdf";
import { buildQuotePremiumPdfHtml } from "@/lib/quotePremiumPdfHtml";
import { getQuotePdfSnapshot } from "@/lib/quotePdfSnapshot";
import {
  buildQuotePremiumPdfFilename,
  resolvePartnerQuotePdfBranding,
  type PartnerQuotePdfBranding,
} from "@/lib/quotePartnerPdfBranding";
import {
  QuotePdfServiceClientError,
  serveQuotePdfPremium,
  type QuotePdfServiceBrandingMode,
} from "@/lib/quotePdfServiceGate";
import { checkRateLimit } from "@/lib/rateLimit";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * PDF Premium de solo lectura para el asistente externo.
 * Mismas funciones que el botón: snapshot, branding de aliado, HTML y
 * renderQuotePremiumPdf. Sin ?branding=partner el PDF es el formato ALFA.
 * La query no autentica.
 */
async function renderOfficialPremiumPdf(
  quoteId: number,
  mode: QuotePdfServiceBrandingMode
) {
  const supabase = createSupabaseAdminClient();
  const snapshot = await getQuotePdfSnapshot(supabase, quoteId);
  let branding: PartnerQuotePdfBranding | undefined;

  if (mode === "partner") {
    const resolved = await resolvePartnerQuotePdfBranding(supabase, quoteId);
    if (!resolved.ok) {
      throw new QuotePdfServiceClientError(
        resolved.reason === "not_partner_quote" ? "Not a partner quote" : resolved.error,
        resolved.status
      );
    }
    branding = resolved.branding;
  }

  const html = buildQuotePremiumPdfHtml(snapshot, branding);
  const pdf = await renderQuotePremiumPdf(html);

  return {
    pdf: new Uint8Array(pdf),
    filename: buildQuotePremiumPdfFilename(snapshot, branding),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return serveQuotePdfPremium(request, id, {
    env: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      QUOTE_PDF_SERVICE_TOKEN: process.env.QUOTE_PDF_SERVICE_TOKEN,
    },
    checkRateLimit,
    renderQuotePdf: renderOfficialPremiumPdf,
    onError: ({ quoteId, error, requestId }) => {
      console.error(
        `[api:${requestId}] quote premium PDF service failed for quote ${quoteId}`,
        error
      );
    },
  });
}
