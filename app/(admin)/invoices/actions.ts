"use server";

import { revalidatePath } from "next/cache";
import {
  facturamaSandboxReceiverNotice,
  getFacturamaErrorDetails,
  getFacturamaSandboxReceiverOverride,
  stampFacturamaInvoice,
  type FacturamaResponseLog,
  type FacturamaSandboxReceiver,
} from "@/lib/facturama";
import {
  formatMissingFiscalFields,
  getCfdiUseCode,
  getFiscalRegimeCode,
  getMissingFiscalFields,
  type FiscalCatalogItem,
} from "@/lib/fiscalData";
import { getMissingProductFiscalFields, type ProductFiscalCatalogs } from "@/lib/productFiscalData";
import { canViewFinancials } from "@/lib/permissions";
import { formatRfcDiagnostic, getRfcDiagnostic, type RfcDiagnostic } from "@/lib/rfc";
import { isPaymentMethodCode } from "@/lib/paymentTerms";
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
  subtotal?: number | null;
  iva?: number | null;
  total?: number | null;
  subtotal_mxn: number | null;
  iva_mxn: number | null;
  total_mxn: number | null;
  status: string | null;
  facturama_id: string | null;
  payment_method_code: string | null;
  payment_form_code: string | null;
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

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type StampFailureDetails = FacturamaResponseLog | {
  type: "application";
  message: string;
  name?: string;
};

type StampFailureDetailsWithDiagnostics = StampFailureDetails & {
  rfc?: RfcDiagnostic;
  clientRfc?: RfcDiagnostic;
  sandboxReceiver?: FacturamaSandboxReceiver;
};

export type StampProjectInvoiceResult =
  | {
      ok: true;
      facturamaId: string;
      satUuid: string | null;
      warning?: string;
      details?: {
        sandboxReceiver?: FacturamaSandboxReceiver;
      };
    }
  | {
      ok: false;
      error: string;
      details?: StampFailureDetailsWithDiagnostics;
    };

function getRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation || null;
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "No se pudo timbrar la factura.";
}

function getActionErrorDetails(error: unknown): StampFailureDetails {
  const facturamaDetails = getFacturamaErrorDetails(error);
  if (facturamaDetails) return facturamaDetails;

  if (error instanceof Error) {
    return {
      type: "application",
      name: error.name,
      message: error.message,
    };
  }

  return {
    type: "application",
    message: String(error || "Error desconocido."),
  };
}

function withRfcDiagnostic(
  details: StampFailureDetails,
  rfcDiagnostic: RfcDiagnostic | null,
  clientRfcDiagnostic: RfcDiagnostic | null,
  sandboxReceiver: FacturamaSandboxReceiver | null
): StampFailureDetailsWithDiagnostics {
  return {
    ...details,
    ...(rfcDiagnostic ? { rfc: rfcDiagnostic } : {}),
    ...(clientRfcDiagnostic ? { clientRfc: clientRfcDiagnostic } : {}),
    ...(sandboxReceiver ? { sandboxReceiver } : {}),
  };
}

function getSandboxMissingFiscalFields(
  receiver: {
    name: string;
    fiscalRegime: string;
    cfdiUse: string;
    taxZipCode: string;
  },
  catalogs: {
    fiscalRegimes: FiscalCatalogItem[];
    cfdiUses: FiscalCatalogItem[];
  }
) {
  const missing: string[] = [];

  if (!receiver.name.trim()) {
    missing.push("Razon social sandbox");
  }

  if (!receiver.fiscalRegime) {
    missing.push("Regimen fiscal sandbox");
  } else {
    const fiscalRegime = catalogs.fiscalRegimes.find(
      (item) => item.code === receiver.fiscalRegime
    );
    if (!fiscalRegime || !fiscalRegime.is_active) {
      missing.push("Regimen fiscal sandbox (requiere actualizacion)");
    }
  }

  if (!/^\d{5}$/.test(receiver.taxZipCode)) {
    missing.push("Codigo postal fiscal sandbox");
  }

  if (!receiver.cfdiUse) {
    missing.push("Uso CFDI");
  } else {
    const cfdiUse = catalogs.cfdiUses.find((item) => item.code === receiver.cfdiUse);
    if (!cfdiUse || !cfdiUse.is_active) {
      missing.push("Uso CFDI (requiere actualizacion)");
    }
  }

  return missing;
}

async function saveInvoiceStampMetadata(
  supabase: SupabaseAdminClient,
  invoiceId: number,
  lastError: string | null,
  facturamaResponse: unknown
) {
  const { error } = await supabase
    .from("project_invoices")
    .update({
      last_error: lastError,
      facturama_response: facturamaResponse,
    })
    .eq("id", invoiceId);

  if (error) {
    console.warn("[stampProjectInvoice] metadata update failed", {
      invoiceId,
      error: error.message,
    });
  }
}

export async function stampProjectInvoice(
  invoiceId: number
): Promise<StampProjectInvoiceResult> {
  let supabase: SupabaseAdminClient | null = null;
  let invoiceProjectId: number | null = null;
  let rfcDiagnostic: RfcDiagnostic | null = null;
  let clientRfcDiagnostic: RfcDiagnostic | null = null;
  let sandboxReceiver: FacturamaSandboxReceiver | null = null;

  try {
    const profile = await getCurrentUserProfile();

    if (!profile?.is_active || !canViewFinancials(profile.role)) {
      throw new Error("No tienes permisos para timbrar facturas.");
    }

    supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_invoices")
      .select(
        "id, client_project_id, client_id, invoice_date, subtotal_mxn, iva_mxn, total_mxn, subtotal, iva, total, status, facturama_id, payment_method_code, payment_form_code, clients(id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email), client_projects(name)"
      )
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) throw new Error(`Error leyendo factura: ${error.message}`);
    if (!data) throw new Error("Factura no encontrada.");

    const invoice = data as unknown as InvoiceForStamping;
    invoiceProjectId = invoice.client_project_id;
    const client = getRelation(invoice.clients);
    const project = getRelation(invoice.client_projects);

    if (invoice.status !== "draft") {
      throw new Error("Solo se pueden timbrar facturas en borrador.");
    }

    if (invoice.facturama_id) {
      throw new Error("Esta factura ya tiene ID de Facturama.");
    }

    const paymentMethodCode = invoice.payment_method_code || "PUE";
    const paymentFormCode = invoice.payment_form_code || "";

    if (!isPaymentMethodCode(paymentMethodCode)) {
      throw new Error("Seleccione un metodo de pago valido: PUE o PPD.");
    }

    if (paymentMethodCode === "PPD" && paymentFormCode !== "99") {
      throw new Error("Para PPD la forma de pago debe ser 99 Por definir.");
    }

    const { data: paymentFormData, error: paymentFormError } = await supabase
      .from("sat_payment_form_catalog")
      .select("code, name, is_active")
      .eq("code", paymentFormCode)
      .maybeSingle();

    if (paymentFormError) {
      throw new Error(`Error validando forma de pago SAT: ${paymentFormError.message}`);
    }

    if (!paymentFormData?.is_active) {
      throw new Error("Seleccione una forma de pago valida del catalogo SAT.");
    }

    const subtotalMxn = Number(invoice.subtotal_mxn ?? invoice.subtotal ?? 0);
    const ivaMxn = Number(invoice.iva_mxn ?? invoice.iva ?? 0);
    const totalMxn = Number(invoice.total_mxn ?? invoice.total ?? 0);

    if (subtotalMxn <= 0 || totalMxn <= 0) {
      throw new Error("La factura debe tener importes mayores a cero.");
    }

    if (!client) {
      throw new Error("La factura no tiene cliente asociado.");
    }

    sandboxReceiver = getFacturamaSandboxReceiverOverride();
    clientRfcDiagnostic = getRfcDiagnostic(client.tax_rfc);
    const receiver = sandboxReceiver
      ? {
          rfc: sandboxReceiver.rfc,
          name: sandboxReceiver.name,
          fiscalRegime: sandboxReceiver.fiscalRegime,
          cfdiUse: getCfdiUseCode(client),
          taxZipCode: sandboxReceiver.taxZipCode,
        }
      : {
          rfc: client.tax_rfc || "",
          name: client.tax_business_name || "",
          fiscalRegime: getFiscalRegimeCode(client),
          cfdiUse: getCfdiUseCode(client),
          taxZipCode: client.tax_zip_code || "",
        };
    rfcDiagnostic = getRfcDiagnostic(receiver.rfc);

    if (!rfcDiagnostic.normalized) {
      throw new Error("No se puede timbrar sin RFC fiscal del receptor.");
    }

    if (!rfcDiagnostic.isValid) {
      throw new Error(`RFC invalido para timbrar. ${formatRfcDiagnostic(rfcDiagnostic)}`);
    }

    const [regimesResult, cfdiUsesResult] = await Promise.all([
      supabase
        .from("fiscal_regime_catalog")
        .select("code, name, applies_to_person_type, is_active")
        .eq("code", receiver.fiscalRegime),
      supabase
        .from("cfdi_use_catalog")
        .select("code, name, applies_to_person_type, is_active")
        .eq("code", receiver.cfdiUse),
    ]);

    if (regimesResult.error || cfdiUsesResult.error) {
      throw new Error("No se pudieron validar los catalogos SAT.");
    }

    const fiscalCatalogs = {
      fiscalRegimes: (regimesResult.data || []) as FiscalCatalogItem[],
      cfdiUses: (cfdiUsesResult.data || []) as FiscalCatalogItem[],
    };
    const missingFiscalFields = sandboxReceiver
      ? getSandboxMissingFiscalFields(receiver, fiscalCatalogs)
      : getMissingFiscalFields(client, fiscalCatalogs);

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

      return missing.length > 0
        ? [`${item.description || `Concepto #${item.id}`}: ${missing.join(", ")}`]
        : [];
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
      paymentMethodCode,
      paymentFormCode,
      projectName: project?.name || null,
      receiver: {
        rfc: rfcDiagnostic.normalized,
        name: receiver.name.trim().toUpperCase(),
        fiscalRegime: receiver.fiscalRegime,
        cfdiUse: receiver.cfdiUse,
        taxZipCode: receiver.taxZipCode,
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

    await saveInvoiceStampMetadata(
      supabase,
      invoice.id,
      null,
      result.facturamaResponse
    );

    revalidatePath("/invoices");
    revalidatePath(`/projects/${invoice.client_project_id}/invoices`);
    revalidatePath(`/projects/${invoice.client_project_id}/account-statement`);

    return {
      ok: true,
      facturamaId: result.facturamaId,
      satUuid: result.satUuid,
      ...(sandboxReceiver
        ? {
            warning: facturamaSandboxReceiverNotice,
            details: { sandboxReceiver },
          }
        : {}),
    };
  } catch (error) {
    const message = getActionErrorMessage(error);
    const details = withRfcDiagnostic(
      getActionErrorDetails(error),
      rfcDiagnostic,
      clientRfcDiagnostic,
      sandboxReceiver
    );
    const facturamaStatus = "status" in details ? details.status : null;

    console.error("[stampProjectInvoice] failed", {
      invoiceId,
      facturamaStatus,
      error: message,
      rfc: rfcDiagnostic
        ? {
            normalized: rfcDiagnostic.normalized,
            length: rfcDiagnostic.length,
            detectedType: rfcDiagnostic.detectedType,
            isValid: rfcDiagnostic.isValid,
          }
        : null,
    });

    if (supabase) {
      await saveInvoiceStampMetadata(supabase, invoiceId, message, details);
    }

    revalidatePath("/invoices");
    if (invoiceProjectId) {
      revalidatePath(`/projects/${invoiceProjectId}/invoices`);
      revalidatePath(`/projects/${invoiceProjectId}/account-statement`);
    }

    return {
      ok: false,
      error: message,
      details,
    };
  }
}
