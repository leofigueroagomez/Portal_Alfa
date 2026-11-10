import { slugifyFilenamePart } from "@/lib/filenames";
import { getMexicoDate } from "@/lib/mexicoDate";
import { renderQuotePremiumPdf } from "@/lib/quotePremiumPdf";
import { buildQuotePremiumPdfHtml } from "@/lib/quotePremiumPdfHtml";
import { getQuotePdfSnapshot } from "@/lib/quotePdfSnapshot";
import {
  formatQuotePdfServiceErrorLog,
  serveQuotePdfPremium,
} from "@/lib/quotePdfServiceGate";
import { checkRateLimit } from "@/lib/rateLimit";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * PDF Premium de solo lectura para el asistente externo.
 * Mismas tres funciones que el botón del portal y que
 * scripts/render-quote-pdf.mts: snapshot, HTML y renderQuotePremiumPdf.
 * Siempre formato ALFA, borrador incluido. La query no autentica.
 */
async function renderOfficialPremiumPdf(quoteId: number) {
  const supabase = createSupabaseAdminClient();
  const snapshot = await getQuotePdfSnapshot(supabase, quoteId);
  const html = buildQuotePremiumPdfHtml(snapshot);
  const pdf = await renderQuotePremiumPdf(html);

  const quoteNumberPart =
    slugifyFilenamePart(snapshot.quote.quoteNumber) || `ID${snapshot.quote.id}`;
  const clientPart = slugifyFilenamePart(
    snapshot.client.companyName || snapshot.client.name
  );
  const alfaSuffix = snapshot.quote.isPartnerQuote ? "-ALFA" : "";
  const filename = ["Cotizacion", quoteNumberPart, clientPart, getMexicoDate()]
    .filter(Boolean)
    .join("-")
    .concat(alfaSuffix);

  return { pdf: new Uint8Array(pdf), filename };
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
    onError: (info) => {
      console.error(formatQuotePdfServiceErrorLog(info));
    },
  });
}
