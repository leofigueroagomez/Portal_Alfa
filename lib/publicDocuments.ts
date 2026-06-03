import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export type PublicDocumentLink = {
  id: number;
  token: string;
  document_type: "project_delivery" | "project_warranty";
  client_project_id: number;
  project_delivery_id: number | null;
  project_warranty_id: number | null;
  expires_at: string | null;
};

export async function getPublicDocumentLink(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("public_document_links")
    .select(
      "id, token, document_type, client_project_id, project_delivery_id, project_warranty_id, expires_at"
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
