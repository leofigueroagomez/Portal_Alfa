import { NextResponse } from "next/server";
import { isFiscalDocumentType } from "@/lib/fiscalDocumentsEmail";
import { canViewFinancials } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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
  const { data, error } = await supabase
    .from("fiscal_document_email_logs")
    .select(
      "id, document_type, document_id, document_uuid, to_email, cc_email, subject, message, status, resend_email_id, error_message, sent_at, created_at"
    )
    .eq("document_type", type)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }

  return NextResponse.json({ logs: data || [] });
}
