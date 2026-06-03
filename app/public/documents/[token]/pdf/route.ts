import { NextResponse } from "next/server";
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
