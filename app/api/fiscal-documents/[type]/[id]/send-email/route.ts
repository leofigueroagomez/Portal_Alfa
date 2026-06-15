import { NextResponse } from "next/server";
import {
  checkBasicRateLimit,
  createRequestId,
  getClientIp,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireFinancialRole,
} from "@/lib/apiAuth";
import {
  buildFiscalDocumentEmailTemplate,
  downloadFiscalDocumentFiles,
  isFiscalDocumentType,
  resolveFiscalDocument,
  validateFiscalDocumentReady,
} from "@/lib/fiscalDocumentsEmail";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

type Body = {
  to?: string;
  cc?: string;
  subject?: string;
  message?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendResendEmail(input: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
  attachments: Array<{ filename: string; content: string; contentType: string }>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no esta configurado.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.INVOICE_EMAIL_FROM ||
        "ALFA IT <facturacion@alfait.com.mx>",
      to: [input.to],
      cc: input.cc ? [input.cc] : undefined,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    }),
  });

  const text = await response.text();
  let body: { id?: string; message?: string } = {};
  try {
    body = text ? (JSON.parse(text) as { id?: string; message?: string }) : {};
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
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const requestId = createRequestId();
  const rateLimitKey = `fiscal-document-send-email:${getClientIp(request)}`;
  if (!checkBasicRateLimit(rateLimitKey, 10, 60_000)) {
    return NextResponse.json({ error: "Too Many Requests", requestId }, { status: 429 });
  }

  const { profile, response } = await requireFinancialRole();
  if (response) return response;

  const { type, id } = await params;
  if (!isFiscalDocumentType(type)) {
    return jsonError("Bad Request", 400);
  }

  const documentId = parsePositiveInteger(id);
  if (!documentId) return jsonError("Bad Request", 400);

  const body = (await request.json().catch(() => ({}))) as Body;
  const toEmail = clean(body.to);
  const ccEmail = clean(body.cc);
  const customMessage = clean(body.message).slice(0, 2000);

  const supabase = createSupabaseAdminClient();
  const document = await resolveFiscalDocument(supabase, type, documentId).catch((error) => {
    logApiError(requestId, "fiscal document send resolve failed", error);
    return null;
  });
  if (!document) {
    return jsonError("Not Found", 404);
  }

  const effectiveTo = toEmail || document.billingEmail || "";
  const subject =
    clean(body.subject) || `${document.subjectPrefix} ${document.folio} - ALFA IT`;

  try {
    validateFiscalDocumentReady(document);
    if (!effectiveTo || !isValidEmail(effectiveTo)) {
      throw new Error("Captura un correo destino valido.");
    }
    if (ccEmail && !isValidEmail(ccEmail)) {
      throw new Error("Captura un CC valido.");
    }

    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL ||
      process.env.PORTAL_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      null;
    const html = buildFiscalDocumentEmailTemplate({
      customerName: document.clientName,
      documentType: document.type,
      documentLabel: document.documentLabel,
      folio: document.folio,
      uuid: document.uuid!,
      customMessage,
      portalUrl,
    });
    const { pdf, xml } = await downloadFiscalDocumentFiles(document);
    if (!pdf.bytes.byteLength || !xml.bytes.byteLength) {
      throw new Error("No se puede enviar sin PDF y XML adjuntos.");
    }

    const result = await sendResendEmail({
      from:
        process.env.INVOICE_EMAIL_FROM ||
        "ALFA IT <facturacion@alfait.com.mx>",
      to: effectiveTo,
      cc: ccEmail || undefined,
      subject,
      html,
      attachments: [
        {
          filename: `${document.documentLabel}-${document.folio}.pdf`,
          content: pdf.bytes.toString("base64"),
          contentType: "application/pdf",
        },
        {
          filename: `${document.documentLabel}-${document.folio}.xml`,
          content: xml.bytes.toString("base64"),
          contentType: "application/xml",
        },
      ],
    });

    await supabase.from("fiscal_document_email_logs").insert({
      document_type: document.type,
      document_id: document.id,
      document_uuid: document.uuid,
      to_email: effectiveTo,
      cc_email: ccEmail || null,
      subject,
      message: customMessage || null,
      status: "sent",
      resend_email_id: result.id || null,
      error_message: null,
      sent_by: profile.id,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, resendEmailId: result.id || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar.";
    logApiError(requestId, "fiscal document send failed", error);

    const { error: logError } = await supabase.from("fiscal_document_email_logs").insert({
      document_type: document.type,
      document_id: document.id,
      document_uuid: document.uuid,
      to_email: effectiveTo || document.billingEmail || "sin-correo",
      cc_email: ccEmail || null,
      subject,
      message: customMessage || null,
      status: "failed",
      resend_email_id: null,
      error_message: message,
      sent_by: profile.id,
      sent_at: null,
    });

    if (logError) {
      logApiError(requestId, "fiscal document failed email log insert failed", logError);
    }

    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
