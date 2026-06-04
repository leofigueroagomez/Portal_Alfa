import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export type PublicDocumentLink = {
  id: number;
  token: string;
  document_type:
    | "project_delivery"
    | "project_warranty"
    | "approved_quote"
    | "authorized_plan"
    | "project_invoice_pdf"
    | "project_invoice_xml";
  client_project_id: number;
  project_delivery_id: number | null;
  project_warranty_id: number | null;
  quote_id: number | null;
  document_id: number | null;
  project_invoice_id: number | null;
  file_format: string | null;
  expires_at: string | null;
};

export async function getPublicDocumentLink(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("public_document_links")
    .select(
      "id, token, document_type, client_project_id, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format, expires_at"
    )
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const link = data as PublicDocumentLink;
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return null;
  }

  return { supabase, link };
}
