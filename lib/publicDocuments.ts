import crypto from "crypto";
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
  revoked_at?: string | null;
  access_count?: number | null;
  last_accessed_at?: string | null;
};

type PublicDocumentAuditInput = {
  request?: Request;
  requestId?: string;
};

function hashIp(value: string | null) {
  if (!value || value === "unknown") return null;
  // TODO: Replace with a keyed HMAC if a shared audit salt is added to production env.
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientIp(request?: Request) {
  if (!request) return null;
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

async function selectPublicDocumentLink(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  token: string
) {
  const selectFields =
    "id, token, document_type, client_project_id, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format, expires_at, revoked_at, access_count, last_accessed_at";

  const result = await supabase
    .from("public_document_links")
    .select(selectFields)
    .eq("token", token)
    .maybeSingle();

  if (!result.error || result.error.code !== "42703") return result;

  return supabase
    .from("public_document_links")
    .select(
      "id, token, document_type, client_project_id, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format, expires_at"
    )
    .eq("token", token)
    .maybeSingle();
}

export async function recordPublicDocumentAccess(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  link: PublicDocumentLink,
  result: string,
  audit?: PublicDocumentAuditInput
) {
  try {
    const ipHash = hashIp(getClientIp(audit?.request));
    const userAgent = audit?.request?.headers.get("user-agent")?.slice(0, 500) || null;

    await supabase.from("public_document_access_events").insert({
      public_document_link_id: link.id,
      ip_hash: ipHash,
      user_agent: userAgent,
      result,
      request_id: audit?.requestId || null,
    });
  } catch (error) {
    console.error("public document access audit insert failed:", error);
  }

  if (result !== "success") return;

  try {
    await supabase
      .from("public_document_links")
      .update({
        access_count: Number(link.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("id", link.id);
  } catch (error) {
    console.error("public document access counter update failed:", error);
  }
}

export async function getPublicDocumentLink(
  token: string,
  audit?: PublicDocumentAuditInput
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await selectPublicDocumentLink(supabase, token);

  if (error) throw error;
  if (!data) return null;

  const link = data as PublicDocumentLink;
  if (link.revoked_at) {
    await recordPublicDocumentAccess(supabase, link, "revoked", audit);
    return null;
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    await recordPublicDocumentAccess(supabase, link, "expired", audit);
    return null;
  }

  return { supabase, link };
}
