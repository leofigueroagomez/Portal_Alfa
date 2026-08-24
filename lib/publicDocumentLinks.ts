import "server-only";

import crypto from "crypto";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import type { PublicDocumentLink } from "@/lib/publicDocuments";

type PublicDocumentType = PublicDocumentLink["document_type"];

type PublicDocumentLinkInput = {
  clientProjectId?: number | null;
  serviceReportId?: number | null;
  documentType: PublicDocumentType;
  projectDeliveryId?: number | null;
  projectWarrantyId?: number | null;
  quoteId?: number | null;
  documentId?: number | null;
  projectInvoiceId?: number | null;
  fileFormat?: "pdf" | "xml" | null;
};

type IdentityFilterQuery<T> = {
  eq(column: string, value: unknown): T;
  is(column: string, value: null): T;
};

const fiscalDocumentTypes = new Set<PublicDocumentType>([
  "project_invoice_pdf",
  "project_invoice_xml",
]);

function getDefaultExpiresAt(documentType: PublicDocumentType) {
  if (documentType === "project_delivery_sign" || documentType === "service_report_sign") {
    return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  }
  const days = fiscalDocumentTypes.has(documentType) ? 30 : 90;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function applyIdentityFilter<T extends IdentityFilterQuery<T>>(
  query: T,
  input: PublicDocumentLinkInput
) {
  if (input.serviceReportId) {
    return query.eq("service_report_id", input.serviceReportId);
  }

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
    "id, token, document_type, client_project_id, service_report_id, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format, expires_at, revoked_at, access_count, last_accessed_at";

  let existingQuery = supabase
    .from("public_document_links")
    .select(selectFields)
    .eq("document_type", input.documentType)
    .gt("expires_at", new Date().toISOString())
    .is("revoked_at", null);

  if (input.clientProjectId) {
    existingQuery = existingQuery.eq("client_project_id", input.clientProjectId);
  }

  const existingResult = await applyIdentityFilter(
    existingQuery,
    input
  ).maybeSingle();
  let existing = existingResult.data as PublicDocumentLink | null;
  let existingError = existingResult.error;

  if (existingError && existingError.code === "42703") {
    let fallbackQuery = supabase
      .from("public_document_links")
      .select(
        "id, token, document_type, client_project_id, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format, expires_at"
      )
      .eq("document_type", input.documentType)
      .gt("expires_at", new Date().toISOString());

    if (input.clientProjectId) {
      fallbackQuery = fallbackQuery.eq("client_project_id", input.clientProjectId);
    }

    const fallback = await applyIdentityFilter(fallbackQuery, input).maybeSingle();
    existing = fallback.data as PublicDocumentLink | null;
    existingError = fallback.error;
  }

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as PublicDocumentLink;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const insertResult = await supabase
    .from("public_document_links")
    .insert({
      token,
      document_type: input.documentType,
      client_project_id: input.clientProjectId || null,
      service_report_id: input.serviceReportId || null,
      project_delivery_id: input.projectDeliveryId || null,
      project_warranty_id: input.projectWarrantyId || null,
      quote_id: input.quoteId || null,
      document_id: input.documentId || null,
      project_invoice_id: input.projectInvoiceId || null,
      file_format: input.fileFormat || null,
      expires_at: getDefaultExpiresAt(input.documentType),
    })
    .select(selectFields)
    .single();
  let data = insertResult.data as PublicDocumentLink | null;
  let error = insertResult.error;

  if (error && error.code === "42703") {
    const fallback = await supabase
      .from("public_document_links")
      .select(
        "id, token, document_type, client_project_id, project_delivery_id, project_warranty_id, quote_id, document_id, project_invoice_id, file_format, expires_at"
      )
      .eq("token", token)
      .single();
    data = fallback.data as PublicDocumentLink | null;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  return data as PublicDocumentLink;
}

export async function getOrCreateDeliverySigningLink(input: {
  clientProjectId: number;
  projectDeliveryId: number;
}) {
  return getOrCreatePublicDocumentLink({
    clientProjectId: input.clientProjectId,
    projectDeliveryId: input.projectDeliveryId,
    documentType: "project_delivery_sign",
  });
}

export async function getOrCreateWarrantyPublicLink(input: {
  clientProjectId: number;
  projectWarrantyId: number;
}) {
  return getOrCreatePublicDocumentLink({
    clientProjectId: input.clientProjectId,
    projectWarrantyId: input.projectWarrantyId,
    documentType: "project_warranty",
  });
}

export async function getOrCreateServiceSigningLink(input: {
  serviceReportId: number;
  clientProjectId?: number | null;
}) {
  return getOrCreatePublicDocumentLink({
    serviceReportId: input.serviceReportId,
    clientProjectId: input.clientProjectId || null,
    documentType: "service_report_sign",
  });
}

export async function getOrCreateServiceReportPublicLink(input: {
  serviceReportId: number;
  clientProjectId?: number | null;
}) {
  return getOrCreatePublicDocumentLink({
    serviceReportId: input.serviceReportId,
    clientProjectId: input.clientProjectId || null,
    documentType: "service_report",
  });
}
