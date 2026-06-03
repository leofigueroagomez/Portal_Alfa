"use server";

import { revalidatePath } from "next/cache";
import { stampFacturamaInvoice } from "@/lib/facturama";
import {
  formatMissingFiscalFields,
  getCfdiUseCode,
  getFiscalRegimeCode,
  getMissingFiscalFields,
  type FiscalCatalogItem,
} from "@/lib/fiscalData";
import { getMissingProductFiscalFields, type ProductFiscalCatalogs } from "@/lib/productFiscalData";
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
  fiscal_regime: string | null;
  cfdi_use: string | null;
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

type InvoiceItemForStamping = {
  id: number;
  description: string | null;
  quantity: number | null;
  unit_price_mxn: number | null;
  subtotal_mxn: number | null;
  iva_mxn: number | null;
  total_mxn: number | null;
  sat_product_service_code: string | null;
  sat_unit_code: string | null;
  sat_unit_name: string | null;
  fiscal_object: string | null;
  product_id: number | null;
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
      "id, client_project_id, client_id, invoice_date, subtotal_mxn, iva_mxn, total_mxn, status, facturama_id, clients(id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email), client_projects(name)"
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

  const fiscalRegimeCode = getFiscalRegimeCode(client);
  const cfdiUseCode = getCfdiUseCode(client);
  const [regimesResult, cfdiUsesResult] = await Promise.all([
    supabase
      .from("fiscal_regime_catalog")
      .select("code, name, applies_to_person_type, is_active")
      .eq("code", fiscalRegimeCode),
    supabase
      .from("cfdi_use_catalog")
      .select("code, name, applies_to_person_type, is_active")
      .eq("code", cfdiUseCode),
  ]);

  if (regimesResult.error || cfdiUsesResult.error) {
    throw new Error("No se pudieron validar los catalogos SAT.");
  }

  const missingFiscalFields = getMissingFiscalFields(client, {
    fiscalRegimes: (regimesResult.data || []) as FiscalCatalogItem[],
    cfdiUses: (cfdiUsesResult.data || []) as FiscalCatalogItem[],
  });

  if (missingFiscalFields.length > 0) {
    throw new Error(
      `Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`
    );
  }

  const { data: itemData, error: itemsError } = await supabase
    .from("project_invoice_items")
    .select(
      "id, description, quantity, unit_price_mxn, subtotal_mxn, iva_mxn, total_mxn, sat_product_service_code, sat_unit_code, sat_unit_name, fiscal_object, product_id"
    )
    .eq("project_invoice_id", invoice.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(`Error leyendo conceptos fiscales: ${itemsError.message}`);
  }

  const invoiceItems = (itemData || []) as InvoiceItemForStamping[];

  if (invoiceItems.length === 0) {
    throw new Error("La factura no tiene conceptos fiscales.");
  }

  const productCodes = [
    ...new Set(invoiceItems.map((item) => item.sat_product_service_code).filter(Boolean)),
  ] as string[];
  const unitCodes = [
    ...new Set(invoiceItems.map((item) => item.sat_unit_code).filter(Boolean)),
  ] as string[];
  const taxObjectCodes = [
    ...new Set(invoiceItems.map((item) => item.fiscal_object || "02").filter(Boolean)),
  ] as string[];
  const [productServicesResult, unitsResult, taxObjectsResult] = await Promise.all([
    supabase
      .from("sat_product_service_catalog")
      .select("code, description, is_active")
      .in("code", productCodes.length > 0 ? productCodes : ["__none__"]),
    supabase
      .from("sat_unit_catalog")
      .select("code, name, description, is_active")
      .in("code", unitCodes.length > 0 ? unitCodes : ["__none__"]),
    supabase
      .from("tax_object_catalog")
      .select("code, name, is_active")
      .in("code", taxObjectCodes.length > 0 ? taxObjectCodes : ["__none__"]),
  ]);

  if (productServicesResult.error || unitsResult.error || taxObjectsResult.error) {
    throw new Error("No se pudieron validar catalogos SAT de conceptos.");
  }

  const productCatalogs: ProductFiscalCatalogs = {
    productServices: productServicesResult.data || [],
    units: unitsResult.data || [],
    taxObjects: taxObjectsResult.data || [],
  };
  const missingItemFields = invoiceItems.flatMap((item) => {
    const missing = getMissingProductFiscalFields(
      {
        id: Number(item.product_id || item.id),
        name: item.description,
        sat_product_service_code: item.sat_product_service_code,
        sat_unit_code: item.sat_unit_code,
        sat_unit_name: item.sat_unit_name,
        fiscal_object: item.fiscal_object,
      },
      productCatalogs
    );

    return missing.length > 0 ? [`${item.description || `Concepto #${item.id}`}: ${missing.join(", ")}`] : [];
  });

  if (missingItemFields.length > 0) {
    throw new Error(`Faltan datos fiscales en conceptos: ${missingItemFields.join(" | ")}`);
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
      fiscalRegime: fiscalRegimeCode,
      cfdiUse: cfdiUseCode,
      taxZipCode: client.tax_zip_code!.trim(),
    },
    items: invoiceItems.map((item) => ({
      productCode: item.sat_product_service_code!,
      unitCode: item.sat_unit_code!,
      unit: item.sat_unit_name!,
      description: item.description || "Concepto ALFA",
      quantity: Number(item.quantity || 1),
      unitPriceMxn: Number(item.unit_price_mxn || 0),
      subtotalMxn: Number(item.subtotal_mxn || 0),
      ivaMxn: Number(item.iva_mxn || 0),
      totalMxn: Number(item.total_mxn || 0),
      fiscalObject: item.fiscal_object || "02",
    })),
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
