import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireFinancialRole,
} from "@/lib/apiAuth";
import { isFiscalDocumentType } from "@/lib/fiscalDocumentsEmail";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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
  const { data, error } = await supabase
    .from("fiscal_document_email_logs")
    .select(
      "id, document_type, document_id, document_uuid, to_email, cc_email, subject, message, status, resend_email_id, error_message, sent_at, created_at"
    )
    .eq("document_type", type)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) {
    logApiError(requestId, "fiscal document email history failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId, logs: [] }, { status: 500 });
  }

  return NextResponse.json({ logs: data || [] });
}
