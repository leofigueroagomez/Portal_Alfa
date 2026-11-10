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
  buildQuotePremiumPdfFilename,
  resolvePartnerQuotePdfBranding,
} from "@/lib/quotePartnerPdfBranding";
import { canGeneratePartnerQuotes } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    // Solo "partner" cambia el PDF. Cualquier otro valor se ignora, como antes.
    const brandingMode = new URL(request.url).searchParams.get("branding");
    let branding:
      | {
          name: string;
          logoUrl: string;
          primaryColor: string;
          secondaryColor: string;
          hidePartnerDiscount: true;
        }
      | undefined;

    if (brandingMode === "partner") {
      if (!canGeneratePartnerQuotes(profile?.role)) {
        return jsonError("Forbidden", 403);
      }

      const resolved = await resolvePartnerQuotePdfBranding(supabase, quoteId);
      if (!resolved.ok) {
        if (resolved.status === 422) {
          return NextResponse.json(
            { error: resolved.error, requestId },
            { status: 422 }
          );
        }
        return jsonError("Bad Request", 400);
      }

      branding = resolved.branding;
    }

    const html = buildQuotePremiumPdfHtml(snapshot, branding);
    const pdf = await renderQuotePremiumPdf(html);
    const filename = buildQuotePremiumPdfFilename(snapshot, branding);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}.pdf"`,
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
