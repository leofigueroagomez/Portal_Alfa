import { NextResponse } from "next/server";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { getPublicDocumentLink } from "@/lib/publicDocuments";
import { generateProjectDeliveryPdf, generateWarrantyLetterPdf } from "@/lib/postSalePdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await getPublicDocumentLink(token);

  if (!result) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const { supabase, link } = result;

  try {
    if (link.document_type === "project_invoice_pdf" && link.project_invoice_id) {
      const { data: invoice, error } = await supabase
        .from("project_invoices")
        .select("id, client_project_id, facturama_id")
        .eq("id", link.project_invoice_id)
        .eq("client_project_id", link.client_project_id)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
    const message = error instanceof Error ? error.message : "No se pudo generar el PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
