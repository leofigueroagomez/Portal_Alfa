"use server";

import { revalidatePath } from "next/cache";
import { stampFacturamaInvoice } from "@/lib/facturama";
import { formatMissingFiscalFields, getMissingFiscalFields } from "@/lib/fiscalData";
import { canViewFinancials } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

type InvoiceClient = {
  id: number;
  name: string | null;
  tax_rfc: string | null;
  tax_business_name: string | null;
  tax_regime: string | null;
  default_cfdi_use: string | null;
  tax_zip_code: string | null;
  billing_email: string | null;
};

type InvoiceProject = {
  name: string | null;
};

type InvoiceForStamping = {
  id: number;
  client_project_id: number;
  client_id: number;
  invoice_date: string | null;
  subtotal_mxn: number | null;
  iva_mxn: number | null;
  total_mxn: number | null;
  status: string | null;
  facturama_id: string | null;
  clients: InvoiceClient | InvoiceClient[] | null;
  client_projects: InvoiceProject | InvoiceProject[] | null;
};

function getRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation || null;
}

export async function stampProjectInvoice(invoiceId: number) {
  const profile = await getCurrentUserProfile();

  if (!profile?.is_active || !canViewFinancials(profile.role)) {
    throw new Error("No tienes permisos para timbrar facturas.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("project_invoices")
    .select(
      "id, client_project_id, client_id, invoice_date, subtotal_mxn, iva_mxn, total_mxn, status, facturama_id, clients(id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, tax_zip_code, billing_email), client_projects(name)"
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) throw new Error(`Error leyendo factura: ${error.message}`);
  if (!data) throw new Error("Factura no encontrada.");

  const invoice = data as unknown as InvoiceForStamping;
  const client = getRelation(invoice.clients);
  const project = getRelation(invoice.client_projects);

  if (invoice.status !== "draft") {
    throw new Error("Solo se pueden timbrar facturas en borrador.");
  }

  if (invoice.facturama_id) {
    throw new Error("Esta factura ya tiene ID de Facturama.");
  }

  const subtotalMxn = Number(invoice.subtotal_mxn || 0);
  const ivaMxn = Number(invoice.iva_mxn || 0);
  const totalMxn = Number(invoice.total_mxn || 0);

  if (subtotalMxn <= 0 || totalMxn <= 0) {
    throw new Error("La factura debe tener importes mayores a cero.");
  }

  if (!client) {
    throw new Error("La factura no tiene cliente asociado.");
  }

  const missingFiscalFields = getMissingFiscalFields(client);

  if (missingFiscalFields.length > 0) {
    throw new Error(
      `Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`
    );
  }

  const result = await stampFacturamaInvoice({
    invoiceId: invoice.id,
    invoiceDate: invoice.invoice_date || new Date().toISOString().slice(0, 10),
    subtotalMxn,
    ivaMxn,
    totalMxn,
    projectName: project?.name || null,
    receiver: {
      rfc: client.tax_rfc!.trim().toUpperCase(),
      name: client.tax_business_name!.trim().toUpperCase(),
      fiscalRegime: client.tax_regime!.trim(),
      cfdiUse: client.default_cfdi_use!.trim().toUpperCase(),
      taxZipCode: client.tax_zip_code!.trim(),
    },
  });

  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
  const xmlUrl = `/api/invoices/${invoice.id}/xml`;

  const { error: updateError } = await supabase
    .from("project_invoices")
    .update({
      status: "issued",
      facturama_id: result.facturamaId,
      sat_uuid: result.satUuid,
      pdf_url: pdfUrl,
      xml_url: xmlUrl,
    })
    .eq("id", invoice.id);

  if (updateError) {
    throw new Error(`Factura timbrada, pero no se pudo guardar: ${updateError.message}`);
  }

  revalidatePath("/invoices");
  revalidatePath(`/projects/${invoice.client_project_id}/invoices`);
  revalidatePath(`/projects/${invoice.client_project_id}/account-statement`);

  return {
    ok: true,
    facturamaId: result.facturamaId,
    satUuid: result.satUuid,
  };
}
