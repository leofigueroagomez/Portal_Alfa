import { NextResponse } from "next/server";
import { checkBasicRateLimit, createRequestId, getClientIp, logApiError } from "@/lib/apiAuth";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { getPublicDocumentLink, recordPublicDocumentAccess } from "@/lib/publicDocuments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = createRequestId();
  const { token } = await params;
  const rateLimitKey = `public-doc:xml:${token}:${getClientIp(request)}`;
  if (!checkBasicRateLimit(rateLimitKey, 30, 60_000)) {
    return NextResponse.json({ error: "Too Many Requests", requestId }, { status: 429 });
  }

  const result = await getPublicDocumentLink(token, { request, requestId }).catch((error) => {
    logApiError(requestId, "public document link lookup failed", error);
    return null;
  });

  if (!result) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const { supabase, link } = result;

  if (link.document_type !== "project_invoice_xml" || !link.project_invoice_id) {
    await recordPublicDocumentAccess(supabase, link, "unsupported_xml", {
      request,
      requestId,
    });
    return NextResponse.json({ error: "XML no disponible." }, { status: 404 });
  }

  const { data: invoice, error } = await supabase
    .from("project_invoices")
    .select("id, client_project_id, facturama_id, status")
    .eq("id", link.project_invoice_id)
    .eq("client_project_id", link.client_project_id)
    .in("status", ["issued", "paid"])
    .maybeSingle();

  if (error) {
    logApiError(requestId, "public invoice XML lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!invoice?.facturama_id) {
    await recordPublicDocumentAccess(supabase, link, "missing_invoice_xml", {
      request,
      requestId,
    });
    return NextResponse.json({ error: "Factura sin XML disponible." }, { status: 404 });
  }

  try {
    const file = await downloadFacturamaInvoiceFile(invoice.facturama_id, "xml");
    await recordPublicDocumentAccess(supabase, link, "success", { request, requestId });
    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="factura-${invoice.id}.xml"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logApiError(requestId, "public invoice XML download failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
