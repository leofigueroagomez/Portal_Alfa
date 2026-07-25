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
import { QuoteBlindsBackendError } from "@/lib/quoteBlindsBackend";
import { buildQuoteBlindsPdfHtml } from "@/lib/quoteBlindsPdfHtml";
import { getQuoteBlindsPdfSnapshot } from "@/lib/quoteBlindsPdfSnapshot";
import { renderQuotePremiumPdf } from "@/lib/quotePremiumPdf";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSafeFilename(value: string | null, fallback: string) {
  return (value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;

  if (
    !checkBasicRateLimit(
      `quote-blinds-pdf:${profile?.id || "unknown"}:${getClientIp(request)}`,
      20,
      60_000
    )
  ) {
    return jsonError("Too Many Requests", 429);
  }

  const { id } = await context.params;
  const quoteId = parsePositiveInteger(id);
  if (!quoteId) return jsonError("Bad Request", 400);

  try {
    const supabase = await createSupabaseServerClient();
    const snapshot = await getQuoteBlindsPdfSnapshot(supabase, quoteId);
    const html = buildQuoteBlindsPdfHtml(snapshot);
    const pdf = await renderQuotePremiumPdf(html);
    const filename = getSafeFilename(
      snapshot.quote.quoteNumber,
      `cotizacion-${snapshot.quote.id}`
    );

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}-persianas.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof QuoteBlindsBackendError) {
      return NextResponse.json(
        { error: error.message, requestId },
        { status: error.status }
      );
    }

    logApiError(
      requestId,
      `quote blinds PDF generation failed for quote ${quoteId}`,
      error
    );
    return NextResponse.json(
      { error: "Unable to process request", requestId },
      { status: 500 }
    );
  }
}
