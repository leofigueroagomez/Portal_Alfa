import { NextResponse } from "next/server";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { canViewFinancials } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

type SendInvoiceEmailBody = {
  to?: string;
  cc?: string;
  message?: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
  error?: unknown;
};

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInvoiceFolio(invoice: { internal_folio: string | null; id: number }) {
  return invoice.internal_folio || `FAC-${String(invoice.id).padStart(4, "0")}`;
}

async function sendResendEmail(input: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
  attachments: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no esta configurado.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      cc: input.cc ? [input.cc] : undefined,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    }),
  });

  const text = await response.text();
  let body: ResendResponse = {};
  try {
    body = text ? (JSON.parse(text) as ResendResponse) : {};
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      body.message || `Resend rechazo el correo (${response.status}): ${text}`
    );
  }

  return body;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canViewFinancials(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const invoiceId = Number(id);

  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: "Factura invalida." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as SendInvoiceEmailBody;
  const requestedTo = cleanEmail(body.to);
  const ccEmail = cleanEmail(body.cc);
  const customMessage =
    typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

  const supabase = createSupabaseAdminClient();
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("project_invoices")
    .select(
      "id, internal_folio, status, facturama_id, sat_uuid, pdf_url, xml_url, clients(id, name, tax_business_name, billing_email)"
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }
  if (!invoiceData) {
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
  }

  const invoice = invoiceData as unknown as {
    id: number;
    internal_folio: string | null;
    status: string | null;
    facturama_id: string | null;
    sat_uuid: string | null;
    pdf_url: string | null;
    xml_url: string | null;
    clients:
      | {
          id: number;
          name: string | null;
          tax_business_name: string | null;
          billing_email: string | null;
        }
      | Array<{
          id: number;
          name: string | null;
          tax_business_name: string | null;
          billing_email: string | null;
        }>
      | null;
  };
  const client = Array.isArray(invoice.clients)
    ? invoice.clients[0] || null
    : invoice.clients;
  const toEmail = requestedTo || cleanEmail(client?.billing_email);
  const folio = getInvoiceFolio(invoice);
  const subject = `Factura ${folio} - ALFA IT`;

  if (invoice.status !== "issued" && invoice.status !== "paid") {
    return NextResponse.json({ error: "La factura no esta timbrada." }, { status: 400 });
  }
  if (!invoice.facturama_id || !invoice.sat_uuid) {
    return NextResponse.json(
      { error: "La factura debe tener ID de Facturama y UUID." },
      { status: 400 }
    );
  }
  if (!invoice.pdf_url || !invoice.xml_url) {
    return NextResponse.json(
      { error: "La factura no tiene PDF o XML disponible." },
      { status: 400 }
    );
  }
  if (!toEmail || !isValidEmail(toEmail)) {
    return NextResponse.json(
      { error: "Captura un correo destino valido." },
      { status: 400 }
    );
  }
  if (ccEmail && !isValidEmail(ccEmail)) {
    return NextResponse.json({ error: "Captura un CC valido." }, { status: 400 });
  }

  try {
    const [pdfFile, xmlFile] = await Promise.all([
      downloadFacturamaInvoiceFile(invoice.facturama_id, "pdf"),
      downloadFacturamaInvoiceFile(invoice.facturama_id, "xml"),
    ]);

    if (!pdfFile.bytes.byteLength || !xmlFile.bytes.byteLength) {
      throw new Error("No se puede enviar una factura sin adjuntos.");
    }

    const customerName = client?.tax_business_name || client?.name || "buen dia";
    const html = `
      <p>Hola ${escapeHtml(customerName)},</p>
      <p>Adjuntamos tu factura en formato PDF y XML.</p>
      <p><strong>Folio:</strong> ${escapeHtml(folio)}</p>
      <p><strong>UUID:</strong> ${escapeHtml(invoice.sat_uuid)}</p>
      ${
        customMessage
          ? `<p>${escapeHtml(customMessage).replaceAll("\n", "<br />")}</p>`
          : ""
      }
      <p>Gracias por tu preferencia.</p>
      <p><strong>ALFA IT</strong></p>
    `;

    const result = await sendResendEmail({
      from:
        process.env.INVOICE_EMAIL_FROM ||
        "ALFA IT <facturacion@portal.alfait.com.mx>",
      to: toEmail,
      cc: ccEmail || undefined,
      subject,
      html,
      attachments: [
        {
          filename: `Factura-${folio}.pdf`,
          content: pdfFile.bytes.toString("base64"),
          contentType: "application/pdf",
        },
        {
          filename: `Factura-${folio}.xml`,
          content: xmlFile.bytes.toString("base64"),
          contentType: "application/xml",
        },
      ],
    });

    const { error: logError } = await supabase.from("invoice_email_logs").insert({
      invoice_id: invoice.id,
      to_email: toEmail,
      cc_email: ccEmail || null,
      subject,
      message: customMessage || null,
      status: "sent",
      resend_email_id: result.id || null,
      error_message: null,
      sent_by: profile.id,
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      return NextResponse.json(
        {
          ok: true,
          warning: `Correo enviado, pero no se pudo guardar historial: ${logError.message}`,
          resendEmailId: result.id || null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      resendEmailId: result.id || null,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "No se pudo enviar la factura.";

    await supabase.from("invoice_email_logs").insert({
      invoice_id: invoice.id,
      to_email: toEmail,
      cc_email: ccEmail || null,
      subject,
      message: customMessage || null,
      status: "failed",
      resend_email_id: null,
      error_message: errorMessage,
      sent_by: profile.id,
      sent_at: null,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
