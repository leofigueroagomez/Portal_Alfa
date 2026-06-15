import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireFinancialRole,
} from "@/lib/apiAuth";
import {
  buildFiscalDocumentEmailTemplate,
  isFiscalDocumentType,
  resolveFiscalDocument,
  validateFiscalDocumentReady,
} from "@/lib/fiscalDocumentsEmail";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const requestId = createRequestId();
  const { response } = await requireFinancialRole();
  if (response) return response;

  const { type, id } = await params;
  if (!isFiscalDocumentType(type)) {
    return jsonError("Bad Request", 400);
  }

  const documentId = parsePositiveInteger(id);
  if (!documentId) return jsonError("Bad Request", 400);

  const supabase = createSupabaseAdminClient();
  const document = await resolveFiscalDocument(supabase, type, documentId).catch((error) => {
    logApiError(requestId, "fiscal document preview resolve failed", error);
    return null;
  });
  if (!document) {
    return jsonError("Not Found", 404);
  }

  try {
    validateFiscalDocumentReady(document);
  } catch (error) {
    logApiError(requestId, "fiscal document preview validation failed", error);
    return jsonError("Bad Request", 400);
  }

  const url = new URL(request.url);
  const message = url.searchParams.get("message") || "";
  const subject =
    url.searchParams.get("subject") ||
    `${document.subjectPrefix} ${document.folio} - ALFA IT`;
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
    customMessage: message,
    portalUrl,
  });

  return NextResponse.json({
    document: {
      type: document.type,
      id: document.id,
      label: document.documentLabel,
      folio: document.folio,
      uuid: document.uuid,
      customerName: document.clientName,
      billingEmail: document.billingEmail,
      pdfUrl: document.pdfUrl,
      xmlUrl: document.xmlUrl,
    },
    subject,
    html,
  });
}
