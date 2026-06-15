import { NextResponse } from "next/server";
import { createRequestId, logApiError } from "@/lib/apiAuth";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { getPublicDocumentLink } from "@/lib/publicDocuments";
import { generateProjectDeliveryPdf, generateWarrantyLetterPdf } from "@/lib/postSalePdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = createRequestId();
  const { token } = await params;
  const result = await getPublicDocumentLink(token).catch((error) => {
    logApiError(requestId, "public document link lookup failed", error);
    return null;
  });

  if (!result) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const { supabase, link } = result;

  try {
    if (link.document_type === "project_invoice_pdf" && link.project_invoice_id) {
      const { data: invoice, error } = await supabase
        .from("project_invoices")
        .select("id, client_project_id, facturama_id, status")
        .eq("id", link.project_invoice_id)
        .eq("client_project_id", link.client_project_id)
        .in("status", ["issued", "paid"])
        .maybeSingle();

      if (error) {
        logApiError(requestId, "public invoice PDF lookup failed", error);
        return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
      }

      if (!invoice?.facturama_id) {
        return NextResponse.json({ error: "Factura sin PDF disponible." }, { status: 404 });
      }

      const file = await downloadFacturamaInvoiceFile(invoice.facturama_id, "pdf");
      return new Response(file.bytes, {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `inline; filename="factura-${invoice.id}.pdf"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (link.document_type === "project_delivery" && link.project_delivery_id) {
      const { data: delivery, error } = await supabase
        .from("project_deliveries")
        .select("id")
        .eq("id", link.project_delivery_id)
        .eq("client_project_id", link.client_project_id)
        .in("status", ["delivered", "accepted"])
        .maybeSingle();

      if (error) {
        logApiError(requestId, "public delivery PDF validation failed", error);
        return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
      }

      if (!delivery) {
        return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
      }
    }

    if (link.document_type === "project_warranty" && link.project_warranty_id) {
      const { data: warranty, error } = await supabase
        .from("project_warranties")
        .select("id")
        .eq("id", link.project_warranty_id)
        .eq("client_project_id", link.client_project_id)
        .eq("status", "issued")
        .maybeSingle();

      if (error) {
        logApiError(requestId, "public warranty PDF validation failed", error);
        return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
      }

      if (!warranty) {
        return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
      }
    }

    const pdf =
      link.document_type === "project_delivery" && link.project_delivery_id
        ? await generateProjectDeliveryPdf(
            supabase,
            link.client_project_id,
            link.project_delivery_id
          )
        : link.document_type === "project_warranty" && link.project_warranty_id
          ? await generateWarrantyLetterPdf(
              supabase,
              link.client_project_id,
              link.project_warranty_id
            )
          : null;

    if (!pdf) {
      return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
    }

    const filename =
      link.document_type === "project_delivery"
        ? `acta-entrega-${link.client_project_id}-${link.project_delivery_id}.pdf`
        : `carta-garantia-${link.client_project_id}-${link.project_warranty_id}.pdf`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logApiError(requestId, "public PDF generation failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
