import "server-only";

import crypto from "crypto";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import type { PublicDocumentLink } from "@/lib/publicDocuments";

type PublicDocumentType = PublicDocumentLink["document_type"];

type PublicDocumentLinkInput = {
  clientProjectId: number;
  documentType: PublicDocumentType;
  projectDeliveryId?: number | null;
  projectWarrantyId?: number | null;
  quoteId?: number | null;
  documentId?: number | null;
  projectInvoiceId?: number | null;
  fileFormat?: "pdf" | "xml" | null;
};

function applyIdentityFilter(query: any, input: PublicDocumentLinkInput) {
  if (input.projectDeliveryId) {
    return query.eq("project_delivery_id", input.projectDeliveryId);
  }

  if (input.projectWarrantyId) {
    return query.eq("project_warranty_id", input.projectWarrantyId);
  }

  if (input.quoteId) {
    return query.eq("quote_id", input.quoteId);
  }

  if (input.documentId) {
    return query.eq("document_id", input.documentId);
  }

  if (input.projectInvoiceId) {
    return query
      .eq("project_invoice_id", input.projectInvoiceId)
      .eq("file_format", input.fileFormat || "pdf");
  }

  return query;
}

export async function getOrCreatePublicDocumentLink(input: PublicDocumentLinkInput) {
  const supabase = createSupabaseAdminClient();
  const selectFields =
    "id, token, document_type, client_project_id, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format, expires_at";

  const existingQuery = supabase
    .from("public_document_links")
    .select(selectFields)
    .eq("client_project_id", input.clientProjectId)
    .eq("document_type", input.documentType)
    .is("expires_at", null);

  const { data: existing, error: existingError } = await applyIdentityFilter(
    existingQuery,
    input
  ).maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as PublicDocumentLink;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const { data, error } = await supabase
    .from("public_document_links")
    .insert({
      token,
      document_type: input.documentType,
      client_project_id: input.clientProjectId,
      project_delivery_id: input.projectDeliveryId || null,
      project_warranty_id: input.projectWarrantyId || null,
      quote_id: input.quoteId || null,
      document_id: input.documentId || null,
      project_invoice_id: input.projectInvoiceId || null,
      file_format: input.fileFormat || null,
    })
    .select(selectFields)
    .single();

  if (error) {
    throw error;
  }

  return data as PublicDocumentLink;
}
