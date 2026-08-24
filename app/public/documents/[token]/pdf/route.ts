import { NextResponse } from "next/server";
import { checkBasicRateLimit, createRequestId, getClientIp, logApiError } from "@/lib/apiAuth";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { getPublicDocumentLink, recordPublicDocumentAccess } from "@/lib/publicDocuments";
import { generateProjectDeliveryPdf, generateWarrantyLetterPdf } from "@/lib/postSalePdf";
import { generateServiceReportPdf } from "@/lib/serviceReportPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = createRequestId();
  const { token } = await params;
  const rateLimitKey = `public-doc:pdf:${token}:${getClientIp(request)}`;
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

  try {
    // Facturas
    if (link.document_type === "project_invoice_pdf" && link.project_invoice_id) {
      const { data: invoice, error } = await supabase
        .from("project_invoices")
        .select("id, client_project_id, facturama_id, status")
        .eq("id", link.project_invoice_id)
        .in("status", ["issued", "paid"])
        .maybeSingle();

      if (error) {
        logApiError(requestId, "public invoice PDF lookup failed", error);
        return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
      }

      if (!invoice?.facturama_id) {
        await recordPublicDocumentAccess(supabase, link, "missing_invoice_pdf", {
          request,
          requestId,
        });
        return NextResponse.json({ error: "Factura sin PDF disponible." }, { status: 404 });
      }

      const file = await downloadFacturamaInvoiceFile(invoice.facturama_id, "pdf");
      await recordPublicDocumentAccess(supabase, link, "success", { request, requestId });
      return new Response(file.bytes, {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `inline; filename="factura-${invoice.id}.pdf"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Entregas de Proyecto
    if (
      (link.document_type === "project_delivery" || link.document_type === "project_delivery_sign") &&
      link.project_delivery_id
    ) {
      const { data: delivery, error } = await supabase
        .from("project_deliveries")
        .select("id")
        .eq("id", link.project_delivery_id)
        .in("status", ["delivered", "accepted"])
        .maybeSingle();

      if (error) {
        logApiError(requestId, "public delivery PDF validation failed", error);
        return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
      }

      if (!delivery) {
        await recordPublicDocumentAccess(supabase, link, "missing_delivery", {
          request,
          requestId,
        });
        return NextResponse.json({ error: "Documento no disponible o aún no firmado." }, { status: 404 });
      }
    }

    // Garantías
    if (link.document_type === "project_warranty" && link.project_warranty_id) {
      const { data: warranty, error } = await supabase
        .from("project_warranties")
        .select("id")
        .eq("id", link.project_warranty_id)
        .eq("status", "issued")
        .maybeSingle();

      if (error) {
        logApiError(requestId, "public warranty PDF validation failed", error);
        return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
      }

      if (!warranty) {
        await recordPublicDocumentAccess(supabase, link, "missing_warranty", {
          request,
          requestId,
        });
        return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
      }
    }

    // Reportes de Servicio Técnico
    if (
      (link.document_type === "service_report" || link.document_type === "service_report_sign") &&
      link.service_report_id
    ) {
      const { data: service, error } = await supabase
        .from("service_reports")
        .select("id")
        .eq("id", link.service_report_id)
        .maybeSingle();

      if (error) {
        logApiError(requestId, "public service report PDF validation failed", error);
        return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
      }

      if (!service) {
        await recordPublicDocumentAccess(supabase, link, "missing_service", {
          request,
          requestId,
        });
        return NextResponse.json({ error: "Reporte de servicio no disponible." }, { status: 404 });
      }
    }

    let pdf: Buffer | null = null;
    let filename = "documento-alfa.pdf";

    if (
      (link.document_type === "project_delivery" || link.document_type === "project_delivery_sign") &&
      link.project_delivery_id &&
      link.client_project_id
    ) {
      pdf = await generateProjectDeliveryPdf(supabase, link.client_project_id, link.project_delivery_id);
      filename = `acta-entrega-${link.client_project_id}-${link.project_delivery_id}.pdf`;
    } else if (
      link.document_type === "project_warranty" &&
      link.project_warranty_id &&
      link.client_project_id
    ) {
      pdf = await generateWarrantyLetterPdf(supabase, link.client_project_id, link.project_warranty_id);
      filename = `carta-garantia-${link.client_project_id}-${link.project_warranty_id}.pdf`;
    } else if (
      (link.document_type === "service_report" || link.document_type === "service_report_sign") &&
      link.service_report_id
    ) {
      pdf = await generateServiceReportPdf(supabase, link.service_report_id);
      filename = `reporte-servicio-SERV-${String(link.service_report_id).padStart(4, "0")}.pdf`;
    }

    if (!pdf) {
      await recordPublicDocumentAccess(supabase, link, "unsupported_pdf", {
        request,
        requestId,
      });
      return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
    }

    await recordPublicDocumentAccess(supabase, link, "success", { request, requestId });
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
