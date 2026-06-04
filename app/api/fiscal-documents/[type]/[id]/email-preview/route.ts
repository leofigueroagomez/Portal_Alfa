import { NextResponse } from "next/server";
import {
  buildFiscalDocumentEmailTemplate,
  isFiscalDocumentType,
  resolveFiscalDocument,
  validateFiscalDocumentReady,
} from "@/lib/fiscalDocumentsEmail";
import { canViewFinancials } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const profile = await getCurrentInternalUserProfile();
  if (!profile || !canViewFinancials(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { type, id } = await params;
  if (!isFiscalDocumentType(type)) {
    return NextResponse.json({ error: "Tipo de documento invalido." }, { status: 400 });
  }

  const documentId = Number(id);
  if (!Number.isFinite(documentId) || documentId <= 0) {
    return NextResponse.json({ error: "Documento invalido." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const document = await resolveFiscalDocument(supabase, type, documentId);
  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  try {
    validateFiscalDocumentReady(document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Documento no listo." },
      { status: 400 }
    );
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
