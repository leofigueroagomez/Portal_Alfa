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
    const html = buildQuotePremiumPdfHtml(snapshot);
    const pdf = await renderQuotePremiumPdf(html);
    const filename = getSafeFilename(
      snapshot.quote.quoteNumber,
      `cotizacion-${snapshot.quote.id}`
    );

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}-premium-v0.pdf"`,
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

    logApiError(requestId, "quote premium PDF generation failed", error);
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
