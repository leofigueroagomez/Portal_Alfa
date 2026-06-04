import {
  downloadFacturamaInvoiceFile,
  downloadPaymentComplementFile,
} from "@/lib/facturama";

export type FiscalDocumentType = "invoice" | "payment_complement";

export type FiscalDocumentEmailLog = {
  id: number;
  document_type: FiscalDocumentType | string;
  document_id: number;
  document_uuid: string | null;
  to_email: string;
  cc_email: string | null;
  subject: string | null;
  message: string | null;
  status: string;
  resend_email_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string | null;
};

export type ResolvedFiscalDocument = {
  type: FiscalDocumentType;
  id: number;
  status: string | null;
  documentLabel: string;
  subjectPrefix: string;
  folio: string;
  uuid: string | null;
  facturamaId: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  clientName: string | null;
  billingEmail: string | null;
  complementEnv?: "sandbox" | "production";
};

export function isFiscalDocumentType(value: string): value is FiscalDocumentType {
  return value === "invoice" || value === "payment_complement";
}

export function getFiscalDocumentTypeLabel(type: FiscalDocumentType) {
  return type === "payment_complement" ? "Complemento de pago" : "Factura";
}

export async function resolveFiscalDocument(
  supabase: {
    from: (table: string) => any;
  },
  type: FiscalDocumentType,
  id: number
): Promise<ResolvedFiscalDocument | null> {
  if (type === "invoice") {
    const { data, error } = await supabase
      .from("project_invoices")
      .select(
        "id, internal_folio, status, facturama_id, sat_uuid, pdf_url, xml_url, clients(id, name, tax_business_name, billing_email)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const invoice = data as {
      id: number;
      internal_folio: string | null;
      status: string | null;
      facturama_id: string | null;
      sat_uuid: string | null;
      pdf_url: string | null;
      xml_url: string | null;
      clients:
        | {
            name: string | null;
            tax_business_name: string | null;
            billing_email: string | null;
          }
        | Array<{
            name: string | null;
            tax_business_name: string | null;
            billing_email: string | null;
          }>
        | null;
    };
    const client = Array.isArray(invoice.clients)
      ? invoice.clients[0] || null
      : invoice.clients;
    const folio = invoice.internal_folio || `FAC-${String(invoice.id).padStart(4, "0")}`;

    return {
      type,
      id: invoice.id,
      status: invoice.status,
      documentLabel: "Factura",
      subjectPrefix: "Factura",
      folio,
      uuid: invoice.sat_uuid,
      facturamaId: invoice.facturama_id,
      pdfUrl: invoice.pdf_url,
      xmlUrl: invoice.xml_url,
      clientName: client?.tax_business_name || client?.name || null,
      billingEmail: client?.billing_email || null,
    };
  }

  const { data, error } = await supabase
    .from("project_payment_complements")
    .select(
      "id, project_invoice_id, status, complement_env, facturama_id, sat_uuid, pdf_url, xml_url, partiality_number, project_invoices(id, internal_folio, clients(id, name, tax_business_name, billing_email))"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const complement = data as {
    id: number;
    project_invoice_id: number;
    status: string | null;
    complement_env: "sandbox" | "production" | string | null;
    facturama_id: string | null;
    sat_uuid: string | null;
    pdf_url: string | null;
    xml_url: string | null;
    partiality_number: number | null;
    project_invoices:
      | {
          id: number;
          internal_folio: string | null;
          clients:
            | {
                name: string | null;
                tax_business_name: string | null;
                billing_email: string | null;
              }
            | Array<{
                name: string | null;
                tax_business_name: string | null;
                billing_email: string | null;
              }>
            | null;
        }
      | Array<{
          id: number;
          internal_folio: string | null;
          clients:
            | {
                name: string | null;
                tax_business_name: string | null;
                billing_email: string | null;
              }
            | Array<{
                name: string | null;
                tax_business_name: string | null;
                billing_email: string | null;
              }>
            | null;
        }>
      | null;
  };
  const invoice = Array.isArray(complement.project_invoices)
    ? complement.project_invoices[0] || null
    : complement.project_invoices;
  const client = Array.isArray(invoice?.clients)
    ? invoice?.clients[0] || null
    : invoice?.clients || null;
  const invoiceFolio =
    invoice?.internal_folio || `FAC-${String(complement.project_invoice_id).padStart(4, "0")}`;
  const folio = `${invoiceFolio}-P${complement.partiality_number || complement.id}`;

  return {
    type,
    id: complement.id,
    status: complement.status,
    documentLabel: "Complemento de pago",
    subjectPrefix: "Complemento de pago",
    folio,
    uuid: complement.sat_uuid,
    facturamaId: complement.facturama_id,
    pdfUrl: complement.pdf_url,
    xmlUrl: complement.xml_url,
    clientName: client?.tax_business_name || client?.name || null,
    billingEmail: client?.billing_email || null,
    complementEnv: complement.complement_env === "production" ? "production" : "sandbox",
  };
}

export function validateFiscalDocumentReady(document: ResolvedFiscalDocument) {
  if (document.status !== "issued" && document.status !== "paid" && document.status !== "stamped") {
    throw new Error("El documento fiscal no esta timbrado.");
  }
  if (!document.facturamaId || !document.uuid) {
    throw new Error("El documento fiscal debe tener ID de Facturama y UUID.");
  }
  if (!document.pdfUrl || !document.xmlUrl) {
    throw new Error("El documento fiscal no tiene PDF o XML disponible.");
  }
}

export async function downloadFiscalDocumentFiles(document: ResolvedFiscalDocument) {
  if (document.type === "invoice") {
    const [pdf, xml] = await Promise.all([
      downloadFacturamaInvoiceFile(document.facturamaId!, "pdf"),
      downloadFacturamaInvoiceFile(document.facturamaId!, "xml"),
    ]);
    return { pdf, xml };
  }

  const env = document.complementEnv === "production" ? "production" : "sandbox";
  const [pdf, xml] = await Promise.all([
    downloadPaymentComplementFile(document.facturamaId!, "pdf", env),
    downloadPaymentComplementFile(document.facturamaId!, "xml", env),
  ]);
  return { pdf, xml };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildFiscalDocumentEmailTemplate(input: {
  customerName?: string | null;
  documentType: FiscalDocumentType;
  documentLabel: string;
  folio: string;
  uuid: string;
  customMessage?: string | null;
  portalUrl?: string | null;
}) {
  const customerName = input.customerName || "buen dia";
  const mainMessage =
    input.documentType === "payment_complement"
      ? "Te compartimos adjunto el complemento de pago correspondiente al pago registrado. Agradecemos mucho tu confianza y la oportunidad de seguir acompanando a tu empresa con el nivel de servicio, atencion y compromiso que nos caracteriza."
      : "Te compartimos adjunta tu factura correspondiente al servicio brindado por ALFA IT. Agradecemos mucho la confianza que depositas en nosotros y el permitirnos seguir acompanando a tu empresa con soluciones tecnologicas confiables, seguras y bien ejecutadas.";
  const customMessageBlock = input.customMessage
    ? `<p style="font-size:15px; line-height:1.7; margin:0 0 16px;">${escapeHtml(
        input.customMessage
      ).replaceAll("\n", "<br />")}</p>`
    : "";
  const portalButton = input.portalUrl
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(
        input.portalUrl
      )}" style="display:inline-block; background:#9E1B32; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:999px; font-size:14px; font-weight:bold;">Entrar al portal</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#0f172a; padding:28px 32px;">
                <h1 style="margin:0; color:#ffffff; font-size:22px; letter-spacing:0.2px;">ALFA IT</h1>
                <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">Soluciones tecnologicas con atencion premium</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 16px; color:#111827; font-size:20px;">${escapeHtml(
                  input.documentLabel
                )}</h2>
                <p style="font-size:15px; line-height:1.7; margin:0 0 16px;">Hola ${escapeHtml(
                  customerName
                )},</p>
                <p style="font-size:15px; line-height:1.7; margin:0 0 16px;">Esperamos que te encuentres muy bien.</p>
                <p style="font-size:15px; line-height:1.7; margin:0 0 16px;">${mainMessage}</p>
                <p style="font-size:15px; line-height:1.7; margin:0 0 16px;">En este correo encontraras los archivos fiscales en formato PDF y XML para tu revision y resguardo.</p>
                ${customMessageBlock}
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0; background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px; font-size:14px;"><strong>Documento:</strong> ${escapeHtml(
                        input.documentLabel
                      )}</p>
                      <p style="margin:0 0 8px; font-size:14px;"><strong>Folio:</strong> ${escapeHtml(
                        input.folio
                      )}</p>
                      <p style="margin:0; font-size:14px;"><strong>UUID:</strong> ${escapeHtml(
                        input.uuid
                      )}</p>
                    </td>
                  </tr>
                </table>
                ${portalButton}
                <p style="font-size:15px; line-height:1.7; margin:24px 0 0;">Quedamos atentos a cualquier duda o comentario.</p>
                <p style="font-size:15px; line-height:1.7; margin:16px 0 0;">Con aprecio,<br /><strong>Equipo ALFA IT</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc; padding:20px 32px; border-top:1px solid #e5e7eb;">
                <p style="margin:0; color:#64748b; font-size:12px; line-height:1.6;">Este correo fue enviado automaticamente desde el portal de ALFA IT. Los archivos fiscales PDF y XML se encuentran adjuntos para tu resguardo.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
