import { NextResponse } from "next/server";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { getPublicDocumentLink } from "@/lib/publicDocuments";

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

  if (link.document_type !== "project_invoice_xml" || !link.project_invoice_id) {
    return NextResponse.json({ error: "XML no disponible." }, { status: 404 });
  }

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
    return NextResponse.json({ error: "Factura sin XML disponible." }, { status: 404 });
  }

  try {
    const file = await downloadFacturamaInvoiceFile(invoice.facturama_id, "xml");
    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="factura-${invoice.id}.xml"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error descargando XML.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
