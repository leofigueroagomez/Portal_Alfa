"use server";

import { revalidatePath } from "next/cache";
import {
  cancelFacturamaInvoice,
  checkFacturamaCfdiSatStatus,
  facturamaSandboxReceiverNotice,
  getFacturamaCfdiDetail,
  getFacturamaErrorDetails,
  getFacturamaSandboxReceiverOverride,
  stampFacturamaInvoice,
  type FacturamaCancellationMotive,
  type FacturamaResponseLog,
  type FacturamaSandboxReceiver,
} from "@/lib/facturama";
import {
  sanitizeCfdiDescription,
  validateCfdiDescription,
} from "@/lib/cfdiDescription";
import {
  formatMissingFiscalFields,
  getClientPersonType,
  getFiscalRegimeCode,
  getMissingFiscalFields,
  optionMatchesPersonType,
  resolveInvoiceCfdiUseCode,
  type FiscalCatalogItem,
} from "@/lib/fiscalData";
import { getMissingProductFiscalFields, type ProductFiscalCatalogs } from "@/lib/productFiscalData";
import { canCancelInvoices, canViewFinancials } from "@/lib/permissions";
import { formatRfcDiagnostic, getRfcDiagnostic, type RfcDiagnostic } from "@/lib/rfc";
import { isPaymentMethodCode } from "@/lib/paymentTerms";
import { getMexicoDate } from "@/lib/mexicoDate";
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
  discount_mxn?: number | null;
  taxable_subtotal_mxn?: number | null;
  iva_mxn: number | null;
  total_mxn: number | null;
  status: string | null;
  facturama_id: string | null;
  payment_method_code: string | null;
  payment_form_code: string | null;
  cfdi_use: string | null;
  replaces_invoice_id: number | null;
  clients: InvoiceClient | InvoiceClient[] | null;
  client_projects: InvoiceProject | InvoiceProject[] | null;
};

type InvoiceItemForStamping = {
  id: number;
  description: string | null;
  quantity: number | null;
  unit_price_mxn: number | null;
  subtotal_mxn: number | null;
  gross_amount_mxn?: number | null;
  discount_mxn?: number | null;
  net_amount_mxn?: number | null;
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
  receiver?: CfdiReceiverDiagnostic;
};

type CfdiReceiverDiagnostic = {
  Rfc: string;
  Name: string;
  CfdiUse: string;
  FiscalRegime: string;
  TaxZipCode: string;
};

const IVA_RATE = 0.16;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

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
  sandboxReceiver: FacturamaSandboxReceiver | null,
  receiverDiagnostic: CfdiReceiverDiagnostic | null
): StampFailureDetailsWithDiagnostics {
  return {
    ...details,
    ...(rfcDiagnostic ? { rfc: rfcDiagnostic } : {}),
    ...(clientRfcDiagnostic ? { clientRfc: clientRfcDiagnostic } : {}),
    ...(sandboxReceiver ? { sandboxReceiver } : {}),
    ...(receiverDiagnostic ? { receiver: receiverDiagnostic } : {}),
  };
}

function buildReceiverDiagnostic(receiver: {
  rfc: string;
  name: string;
  cfdiUse: string;
  fiscalRegime: string;
  taxZipCode: string;
}): CfdiReceiverDiagnostic {
  return {
    Rfc: receiver.rfc.trim().toUpperCase(),
    Name: receiver.name.trim().toUpperCase(),
    CfdiUse: receiver.cfdiUse.trim().toUpperCase(),
    FiscalRegime: receiver.fiscalRegime.trim(),
    TaxZipCode: receiver.taxZipCode.trim(),
  };
}

function getInvoiceItemLabel(item: InvoiceItemForStamping) {
  const currentDescription = String(item.description || "").trim();
  return currentDescription
    ? currentDescription.slice(0, 160)
    : `Concepto #${item.id}`;
}

function getInvoiceItemTaxBase(item: InvoiceItemForStamping) {
  return roundMoney(
    Number(
      item.net_amount_mxn ??
        Math.max(
          Number(item.gross_amount_mxn ?? item.subtotal_mxn ?? 0) -
            Number(item.discount_mxn || 0),
          0
        )
    )
  );
}

function getExpectedItemIva(item: InvoiceItemForStamping) {
  if ((item.fiscal_object || "02") !== "02") return 0;
  return roundMoney(getInvoiceItemTaxBase(item) * IVA_RATE);
}

function logFacturamaItemTaxDiagnostics(
  invoiceId: number,
  invoiceItems: InvoiceItemForStamping[]
) {
  const diagnostics = invoiceItems.map((item, index) => {
    const subtotalMxn = roundMoney(
      Number(item.gross_amount_mxn ?? item.subtotal_mxn ?? 0)
    );
    const discountMxn = roundMoney(Number(item.discount_mxn || 0));
    const taxBaseMxn = getInvoiceItemTaxBase(item);
    const sentTaxMxn = roundMoney(Number(item.iva_mxn || 0));
    const expectedTaxMxn = getExpectedItemIva(item);

    return {
      index,
      id: item.id,
      description: getInvoiceItemLabel(item),
      quantity: Number(item.quantity || 1),
      unitPriceMxn: roundMoney(Number(item.unit_price_mxn || 0)),
      subtotalMxn,
      discountMxn,
      taxBaseMxn,
      taxRate: (item.fiscal_object || "02") === "02" ? IVA_RATE : 0,
      taxTotalSentMxn: sentTaxMxn,
      taxTotalExpectedMxn: expectedTaxMxn,
      differenceMxn: roundMoney(sentTaxMxn - expectedTaxMxn),
    };
  });

  console.info("[stampProjectInvoice] Facturama item tax diagnostics", {
    invoiceId,
    items: diagnostics,
  });

  return diagnostics;
}

function getCfdiDescriptionError(item: InvoiceItemForStamping) {
  const validation = validateCfdiDescription(item.description);
  if (validation.ok) return null;

  const itemLabel = getInvoiceItemLabel(item);
  if (validation.forbiddenCharacters.length > 0) {
    return `El concepto ${itemLabel} contiene caracteres no permitidos: ${validation.forbiddenCharacters.join(
      " "
    )}`;
  }
  if (validation.isEmpty) {
    return `El concepto ${itemLabel} no tiene descripcion CFDI.`;
  }
  if (validation.isTooLong) {
    return `El concepto ${itemLabel} supera 1000 caracteres en descripcion CFDI.`;
  }

  return `El concepto ${itemLabel} contiene caracteres de control no permitidos.`;
}

function getCorporateRegimeNameError(name: string, rfcDiagnostic: RfcDiagnostic) {
  if (rfcDiagnostic.detectedType !== "moral") return null;

  const normalizedName = name
    .toUpperCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const corporateRegimePatterns = [
    /\bS A DE C V\b/,
    /\bSA DE CV\b/,
    /\bS DE R L DE C V\b/,
    /\bS DE RL DE CV\b/,
    /\bS A P I DE C V\b/,
    /\bSAPI DE CV\b/,
    /\bS C\b/,
    /\bA C\b/,
    /\bSOCIEDAD ANONIMA\b/,
    /\bSOCIEDAD CIVIL\b/,
    /\bASOCIACION CIVIL\b/,
  ];

  if (!corporateRegimePatterns.some((pattern) => pattern.test(normalizedName))) {
    return null;
  }

  return "La razon social para CFDI 4.0 no debe incluir regimen societario. Verifica el nombre contra la Constancia de Situacion Fiscal.";
}

function getReceiverValidationErrors(
  receiver: CfdiReceiverDiagnostic,
  rfcDiagnostic: RfcDiagnostic,
  catalogs: {
    fiscalRegimes: FiscalCatalogItem[];
    cfdiUses: FiscalCatalogItem[];
  }
) {
  const errors: string[] = [];

  if (rfcDiagnostic.length !== 12 && rfcDiagnostic.length !== 13) {
    errors.push("RFC debe tener 12 caracteres para persona moral o 13 para persona fisica.");
  }

  if (!rfcDiagnostic.isValid) {
    errors.push(`RFC invalido para timbrar. ${formatRfcDiagnostic(rfcDiagnostic)}`);
  }

  if (!receiver.Name) {
    errors.push("Razon social requerida.");
  }

  const corporateRegimeError = getCorporateRegimeNameError(receiver.Name, rfcDiagnostic);
  if (corporateRegimeError) errors.push(corporateRegimeError);

  if (!/^\d{5}$/.test(receiver.TaxZipCode)) {
    errors.push("Codigo postal fiscal debe tener 5 digitos.");
  }

  const personType = getClientPersonType(receiver.Rfc);
  const fiscalRegime = catalogs.fiscalRegimes.find(
    (item) => item.code === receiver.FiscalRegime
  );
  const cfdiUse = catalogs.cfdiUses.find((item) => item.code === receiver.CfdiUse);

  if (!fiscalRegime || !fiscalRegime.is_active) {
    errors.push("Regimen fiscal seleccionado no existe o no esta activo en el catalogo SAT.");
  } else if (!optionMatchesPersonType(fiscalRegime, personType)) {
    errors.push("Regimen fiscal no corresponde al tipo de persona sugerido por el RFC.");
  }

  if (!cfdiUse || !cfdiUse.is_active) {
    errors.push("Uso CFDI seleccionado no existe o no esta activo en el catalogo SAT.");
  } else if (!optionMatchesPersonType(cfdiUse, personType)) {
    errors.push("Uso CFDI no corresponde al tipo de persona sugerido por el RFC.");
  }

  return [...new Set(errors)];
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
  let receiverDiagnostic: CfdiReceiverDiagnostic | null = null;

  try {
    const profile = await getCurrentUserProfile();

    if (!profile?.is_active || !canViewFinancials(profile.role)) {
      throw new Error("No tienes permisos para timbrar facturas.");
    }

    supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_invoices")
      .select(
        "id, client_project_id, client_id, invoice_date, subtotal_mxn, discount_mxn, taxable_subtotal_mxn, iva_mxn, total_mxn, subtotal, iva, total, status, facturama_id, payment_method_code, payment_form_code, cfdi_use, replaces_invoice_id, clients(id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email), client_projects(name)"
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
    const discountMxn = Number(invoice.discount_mxn || 0);
    const taxableSubtotalMxn = Number(
      invoice.taxable_subtotal_mxn ?? subtotalMxn - discountMxn
    );
    const ivaMxn = Number(invoice.iva_mxn ?? invoice.iva ?? 0);
    const totalMxn = Number(invoice.total_mxn ?? invoice.total ?? 0);

    if (subtotalMxn <= 0 || totalMxn <= 0) {
      throw new Error("La factura debe tener importes mayores a cero.");
    }

    if (discountMxn > subtotalMxn) {
      throw new Error("El descuento no puede ser mayor que el subtotal de la factura.");
    }

    if (Math.abs(subtotalMxn - discountMxn - taxableSubtotalMxn) > 0.05) {
      throw new Error("El subtotal neto no cuadra con el descuento de la factura.");
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
          cfdiUse: resolveInvoiceCfdiUseCode(invoice.cfdi_use, client),
          taxZipCode: sandboxReceiver.taxZipCode,
        }
      : {
          rfc: client.tax_rfc || "",
          name: client.tax_business_name || "",
          fiscalRegime: getFiscalRegimeCode(client),
          cfdiUse: resolveInvoiceCfdiUseCode(invoice.cfdi_use, client),
          taxZipCode: client.tax_zip_code || "",
    };
    rfcDiagnostic = getRfcDiagnostic(receiver.rfc);
    receiverDiagnostic = buildReceiverDiagnostic({
      ...receiver,
      rfc: rfcDiagnostic.normalized || receiver.rfc,
    });

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
    const missingFiscalFieldsRaw = sandboxReceiver
      ? getSandboxMissingFiscalFields(receiver, fiscalCatalogs)
      : getMissingFiscalFields(client, fiscalCatalogs);
    // El uso de CFDI puede venir de la propia factura (project_invoices.cfdi_use),
    // no solo de la ficha del cliente. Si el receptor ya trae un uso valido y
    // activo, no bloqueamos por "Uso CFDI" faltante en el cliente; su validez la
    // confirma getReceiverValidationErrors mas abajo.
    const invoiceCfdiUseIsValid = fiscalCatalogs.cfdiUses.some(
      (item) => item.code === receiver.cfdiUse && item.is_active
    );
    const missingFiscalFields = invoiceCfdiUseIsValid
      ? missingFiscalFieldsRaw.filter((field) => !field.startsWith("Uso CFDI"))
      : missingFiscalFieldsRaw;

    if (missingFiscalFields.length > 0) {
      throw new Error(
        `Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`
      );
    }

    const receiverValidationErrors = getReceiverValidationErrors(
      receiverDiagnostic,
      rfcDiagnostic,
      fiscalCatalogs
    );

    if (receiverValidationErrors.length > 0) {
      throw new Error(`Datos fiscales del receptor invalidos: ${receiverValidationErrors.join(" | ")}`);
    }

    const { data: itemData, error: itemsError } = await supabase
      .from("project_invoice_items")
      .select(
        "id, description, quantity, unit_price_mxn, subtotal_mxn, gross_amount_mxn, discount_mxn, net_amount_mxn, iva_mxn, total_mxn, sat_product_service_code, sat_unit_code, sat_unit_name, fiscal_object, product_id"
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

    const cfdiDescriptionErrors = invoiceItems
      .map(getCfdiDescriptionError)
      .filter(Boolean);

    if (cfdiDescriptionErrors.length > 0) {
      throw new Error(cfdiDescriptionErrors.join(" | "));
    }

    const itemGrossTotal = invoiceItems.reduce(
      (sum, item) => sum + Number(item.gross_amount_mxn ?? item.subtotal_mxn ?? 0),
      0
    );
    const itemDiscountTotal = invoiceItems.reduce(
      (sum, item) => sum + Number(item.discount_mxn || 0),
      0
    );
    const itemNetTotal = invoiceItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.net_amount_mxn ??
            Math.max(
              Number(item.gross_amount_mxn ?? item.subtotal_mxn ?? 0) -
                Number(item.discount_mxn || 0),
              0
            )
        ),
      0
    );
    const itemIvaTotal = invoiceItems.reduce(
      (sum, item) => sum + Number(item.iva_mxn || 0),
      0
    );
    const itemTotal = invoiceItems.reduce(
      (sum, item) => sum + Number(item.total_mxn || 0),
      0
    );

    if (Math.abs(itemGrossTotal - subtotalMxn) > 0.05) {
      throw new Error("La suma bruta de conceptos no cuadra con la factura.");
    }

    if (Math.abs(itemDiscountTotal - discountMxn) > 0.05) {
      throw new Error("La suma de descuentos por concepto no cuadra con la factura.");
    }

    if (Math.abs(itemNetTotal - taxableSubtotalMxn) > 0.05) {
      throw new Error("La suma neta de conceptos no cuadra con la factura.");
    }

    if (Math.abs(itemIvaTotal - ivaMxn) > 0.05 || Math.abs(itemTotal - totalMxn) > 0.05) {
      throw new Error("La suma de IVA o total de conceptos no cuadra con la factura.");
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
        ? [`${getInvoiceItemLabel(item)}: ${missing.join(", ")}`]
        : [];
    });

    if (missingItemFields.length > 0) {
      throw new Error(`Faltan datos fiscales en conceptos: ${missingItemFields.join(" | ")}`);
    }

    const itemTaxDiagnostics = logFacturamaItemTaxDiagnostics(invoice.id, invoiceItems);
    const invalidItemTaxes = itemTaxDiagnostics.filter(
      (item) => Math.abs(item.differenceMxn) > 0.009
    );

    if (invalidItemTaxes.length > 0) {
      throw new Error(
        `IVA invalido por concepto antes de Facturama: ${invalidItemTaxes
          .map(
            (item) =>
              `items[${item.index}] ${item.description} enviado ${item.taxTotalSentMxn}, esperado ${item.taxTotalExpectedMxn}`
          )
          .join(" | ")}`
      );
    }

    let substitutionRelation:
      | { type: "04"; uuids: string[] }
      | null = null;

    if (invoice.replaces_invoice_id) {
      const { data: replacedInvoice, error: replacedError } = await supabase
        .from("project_invoices")
        .select("id, sat_uuid, status")
        .eq("id", invoice.replaces_invoice_id)
        .maybeSingle();

      if (replacedError) {
        throw new Error(
          `Error leyendo la factura que esta sustituye: ${replacedError.message}`
        );
      }
      if (!replacedInvoice?.sat_uuid) {
        throw new Error(
          "La factura que esta sustituye no tiene UUID timbrado. No se puede relacionar la sustitucion (relacion SAT 04)."
        );
      }

      substitutionRelation = { type: "04", uuids: [replacedInvoice.sat_uuid] };
    }

    const result = await stampFacturamaInvoice({
      invoiceId: invoice.id,
      invoiceDate: invoice.invoice_date || getMexicoDate(),
      subtotalMxn,
      ivaMxn,
      totalMxn,
      paymentMethodCode,
      paymentFormCode,
      projectName: project?.name || null,
      relation: substitutionRelation,
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
        description: sanitizeCfdiDescription(item.description),
        quantity: Number(item.quantity || 1),
        unitPriceMxn: Number(item.unit_price_mxn || 0),
        subtotalMxn: Number(item.gross_amount_mxn ?? item.subtotal_mxn ?? 0),
        discountMxn: Number(item.discount_mxn || 0),
        netAmountMxn: Number(
          item.net_amount_mxn ??
            Math.max(
              Number(item.gross_amount_mxn ?? item.subtotal_mxn ?? 0) -
                Number(item.discount_mxn || 0),
              0
            )
        ),
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
      sandboxReceiver,
      receiverDiagnostic
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

export type DeleteDraftInvoiceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteDraftInvoice(
  invoiceId: number
): Promise<DeleteDraftInvoiceResult> {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile?.is_active || !canViewFinancials(profile.role)) {
      throw new Error("No tienes permisos para eliminar facturas.");
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_invoices")
      .select("id, client_project_id, status, facturama_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) throw new Error(`Error leyendo factura: ${error.message}`);
    if (!data) throw new Error("Factura no encontrada.");

    if (data.status !== "draft" || data.facturama_id) {
      throw new Error(
        "Solo se pueden eliminar borradores que no se han timbrado."
      );
    }

    const { error: deleteError } = await supabase
      .from("project_invoices")
      .delete()
      .eq("id", invoiceId)
      .eq("status", "draft")
      .is("facturama_id", null);

    if (deleteError) {
      throw new Error(`Error eliminando borrador: ${deleteError.message}`);
    }

    revalidatePath("/invoices");
    if (data.client_project_id) {
      revalidatePath(`/projects/${data.client_project_id}/invoices`);
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido.",
    };
  }
}

export type CancelProjectInvoiceResult =
  | {
      ok: true;
      satStatus: "canceled" | "requested" | "rejected" | "unknown";
      message: string;
    }
  | { ok: false; error: string };

export async function cancelProjectInvoice(
  invoiceId: number,
  motive: FacturamaCancellationMotive,
  uuidReplacement?: string
): Promise<CancelProjectInvoiceResult> {
  let supabase: SupabaseAdminClient | null = null;

  try {
    const profile = await getCurrentUserProfile();

    if (!profile?.is_active || !canCancelInvoices(profile.role)) {
      throw new Error("Solo Direccion puede cancelar facturas.");
    }

    supabase = createSupabaseAdminClient();
    const { data: invoice, error } = await supabase
      .from("project_invoices")
      .select("id, client_project_id, status, facturama_id, sat_uuid")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) throw new Error(`Error leyendo factura: ${error.message}`);
    if (!invoice) throw new Error("Factura no encontrada.");

    if (
      !["issued", "paid"].includes(String(invoice.status)) ||
      !invoice.facturama_id ||
      !invoice.sat_uuid
    ) {
      throw new Error(
        "Solo se pueden cancelar facturas timbradas (emitidas o pagadas)."
      );
    }

    // Motivo 01: el SAT exige el UUID del CFDI que sustituye a este. Si no se
    // paso a mano, se busca una factura timbrada que ya declaro sustituir a esta
    // (replaces_invoice_id), que es el flujo "corregir y reemplazar".
    let effectiveUuidReplacement = uuidReplacement?.trim() || "";
    if (motive === "01" && !effectiveUuidReplacement) {
      const { data: substitute } = await supabase
        .from("project_invoices")
        .select("id, sat_uuid, status")
        .eq("replaces_invoice_id", invoiceId)
        .in("status", ["issued", "paid"])
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (substitute?.sat_uuid) {
        effectiveUuidReplacement = substitute.sat_uuid;
      }
    }

    if (motive === "01" && !effectiveUuidReplacement) {
      throw new Error(
        "El motivo 01 (comprobante con errores con relacion) requiere el UUID del CFDI que lo sustituye. Timbra primero la factura de reemplazo o captura el UUID a mano."
      );
    }

    const result = await cancelFacturamaInvoice(
      invoice.facturama_id,
      motive,
      effectiveUuidReplacement || null
    );

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      cancellation_motive: motive,
      cancellation_uuid_replacement: effectiveUuidReplacement || null,
      cancellation_status: result.status === "unknown" ? null : result.status,
      cancellation_acuse_xml: result.acuseXmlBase64,
      cancelled_by_user_id: profile.id,
      last_error: null,
      facturama_response: result.facturamaResponse,
    };

    if (result.status === "canceled") {
      updatePayload.status = "cancelled";
      updatePayload.cancelled_at = nowIso;
    }

    const { error: updateError } = await supabase
      .from("project_invoices")
      .update(updatePayload)
      .eq("id", invoiceId);

    if (updateError) {
      throw new Error(`Error guardando cancelacion: ${updateError.message}`);
    }

    revalidatePath("/invoices");
    if (invoice.client_project_id) {
      revalidatePath(`/projects/${invoice.client_project_id}/invoices`);
    }

    const message =
      result.status === "canceled"
        ? "Factura cancelada ante el SAT."
        : result.status === "requested"
          ? "Cancelacion solicitada. Queda pendiente de aceptacion del receptor ante el SAT (hasta 72 horas). El estatus interno seguira como esta hasta confirmar."
          : result.status === "rejected"
            ? "El SAT rechazo la solicitud de cancelacion."
            : "Facturama respondio con un estatus no reconocido, revisa el detalle.";

    return { ok: true, satStatus: result.status, message };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cancelar la factura.";
    const details = getFacturamaErrorDetails(error);

    if (supabase) {
      await supabase
        .from("project_invoices")
        .update({
          last_error: message,
          facturama_response: details,
        })
        .eq("id", invoiceId);
    }

    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// H2 — Resolver una cancelacion que quedo pendiente (`requested`, hasta 72 h).
// Consulta el estatus real del CFDI ante el SAT y cierra el ciclo si ya se
// cancelo (o registra el rechazo). No vuelve a enviar una peticion de cancelacion.
// ---------------------------------------------------------------------------

export type CheckInvoiceCancellationStatusResult =
  | {
      ok: true;
      satStatus: "vigente" | "canceled" | "not_found" | "unknown";
      resolved: boolean;
      message: string;
    }
  | { ok: false; error: string };

export async function checkInvoiceCancellationStatus(
  invoiceId: number
): Promise<CheckInvoiceCancellationStatusResult> {
  let supabase: SupabaseAdminClient | null = null;

  try {
    const profile = await getCurrentUserProfile();

    if (!profile?.is_active || !canCancelInvoices(profile.role)) {
      throw new Error("Solo Direccion puede consultar el estado de cancelacion.");
    }

    supabase = createSupabaseAdminClient();
    const { data: invoice, error } = await supabase
      .from("project_invoices")
      .select(
        "id, client_project_id, status, facturama_id, sat_uuid, total_mxn, total, cancellation_status, clients(tax_rfc)"
      )
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) throw new Error(`Error leyendo factura: ${error.message}`);
    if (!invoice) throw new Error("Factura no encontrada.");
    if (!invoice.facturama_id || !invoice.sat_uuid) {
      throw new Error("La factura no tiene CFDI timbrado que consultar.");
    }
    if (String(invoice.status) === "cancelled") {
      return {
        ok: true,
        satStatus: "canceled",
        resolved: false,
        message: "La factura ya esta marcada como cancelada.",
      };
    }

    const client = getRelation(
      invoice.clients as { tax_rfc: string | null } | { tax_rfc: string | null }[] | null
    );
    const totalMxn = Number(invoice.total_mxn ?? invoice.total ?? 0);

    let issuerRfc = "";
    let receiverRfc = (client?.tax_rfc || "").trim();
    let statusTotalMxn = totalMxn;

    try {
      const detail = await getFacturamaCfdiDetail(invoice.facturama_id);
      if (detail.issuerRfc) issuerRfc = detail.issuerRfc;
      if (detail.receiverRfc) receiverRfc = detail.receiverRfc;
      if (typeof detail.totalMxn === "number" && detail.totalMxn > 0) {
        statusTotalMxn = detail.totalMxn;
      }
    } catch {
      // Si el detalle falla seguimos con lo que tenemos localmente; el issuer
      // RFC es el unico dato que no podemos suplir.
    }

    if (!issuerRfc || !receiverRfc || !(statusTotalMxn > 0)) {
      throw new Error(
        "No se pudo reunir RFC emisor / receptor / total para consultar el estatus ante el SAT."
      );
    }

    const satStatus = await checkFacturamaCfdiSatStatus({
      uuid: invoice.sat_uuid,
      issuerRfc,
      receiverRfc,
      totalMxn: statusTotalMxn,
    });

    const updatePayload: Record<string, unknown> = {
      last_error: null,
      facturama_response: satStatus.facturamaResponse,
    };
    let resolved = false;
    let message: string;

    if (satStatus.normalized === "canceled") {
      updatePayload.status = "cancelled";
      updatePayload.cancellation_status = "canceled";
      updatePayload.cancelled_at = new Date().toISOString();
      resolved = true;
      message = "El SAT confirma que el CFDI esta cancelado. Factura marcada como cancelada.";
    } else if (satStatus.normalized === "vigente") {
      message =
        invoice.cancellation_status === "requested"
          ? "El CFDI sigue vigente ante el SAT: la cancelacion continua pendiente de aceptacion del receptor."
          : "El CFDI esta vigente ante el SAT.";
    } else if (satStatus.normalized === "not_found") {
      message = "El SAT no encontro el CFDI con esos datos. Revisa RFC y total.";
    } else {
      message = `Respuesta del SAT no reconocida: ${satStatus.status || "sin estatus"}.`;
    }

    const { error: updateError } = await supabase
      .from("project_invoices")
      .update(updatePayload)
      .eq("id", invoiceId);

    if (updateError) {
      throw new Error(`Error guardando estatus: ${updateError.message}`);
    }

    revalidatePath("/invoices");
    if (invoice.client_project_id) {
      revalidatePath(`/projects/${invoice.client_project_id}/invoices`);
    }

    return {
      ok: true,
      satStatus: satStatus.normalized,
      resolved,
      message,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo consultar el estado de cancelacion.";

    if (supabase) {
      await supabase
        .from("project_invoices")
        .update({ last_error: message })
        .eq("id", invoiceId);
    }

    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// H4 — Uso de CFDI (tipo de gasto) editable por factura, mientras esta en borrador.
// ---------------------------------------------------------------------------

export type SetInvoiceCfdiUseResult =
  | { ok: true; cfdiUse: string | null }
  | { ok: false; error: string };

export async function setInvoiceCfdiUse(
  invoiceId: number,
  cfdiUseCode: string
): Promise<SetInvoiceCfdiUseResult> {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile?.is_active || !canViewFinancials(profile.role)) {
      throw new Error("No tienes permisos para editar facturas.");
    }

    const normalized = cfdiUseCode.trim().toUpperCase();

    const supabase = createSupabaseAdminClient();
    const { data: invoice, error } = await supabase
      .from("project_invoices")
      .select("id, client_project_id, status, facturama_id, clients(tax_rfc)")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) throw new Error(`Error leyendo factura: ${error.message}`);
    if (!invoice) throw new Error("Factura no encontrada.");
    if (invoice.status !== "draft" || invoice.facturama_id) {
      throw new Error(
        "El uso de CFDI solo se puede cambiar mientras la factura es un borrador sin timbrar."
      );
    }

    // Vacio => heredar del cliente al timbrar.
    if (!normalized) {
      const { error: clearError } = await supabase
        .from("project_invoices")
        .update({ cfdi_use: null })
        .eq("id", invoiceId);

      if (clearError) throw new Error(`Error guardando uso de CFDI: ${clearError.message}`);

      revalidatePath("/invoices");
      if (invoice.client_project_id) {
        revalidatePath(`/projects/${invoice.client_project_id}/invoices`);
      }
      return { ok: true, cfdiUse: null };
    }

    if (!/^[A-Z]\d{2}$/.test(normalized)) {
      throw new Error("El uso de CFDI debe tener el formato del catalogo SAT (p. ej. G01, G03).");
    }

    const { data: catalogRow, error: catalogError } = await supabase
      .from("cfdi_use_catalog")
      .select("code, name, applies_to_person_type, is_active")
      .eq("code", normalized)
      .maybeSingle();

    if (catalogError) throw new Error("No se pudo validar el uso de CFDI contra el catalogo SAT.");
    if (!catalogRow || !catalogRow.is_active) {
      throw new Error("Ese uso de CFDI no existe o no esta activo en el catalogo SAT.");
    }

    const client = getRelation(
      invoice.clients as { tax_rfc: string | null } | { tax_rfc: string | null }[] | null
    );
    const personType = getClientPersonType(client?.tax_rfc);
    if (!optionMatchesPersonType(catalogRow as FiscalCatalogItem, personType)) {
      throw new Error(
        "Ese uso de CFDI no corresponde al tipo de persona del RFC del cliente."
      );
    }

    const { error: updateError } = await supabase
      .from("project_invoices")
      .update({ cfdi_use: normalized })
      .eq("id", invoiceId);

    if (updateError) throw new Error(`Error guardando uso de CFDI: ${updateError.message}`);

    revalidatePath("/invoices");
    if (invoice.client_project_id) {
      revalidatePath(`/projects/${invoice.client_project_id}/invoices`);
    }

    return { ok: true, cfdiUse: normalized };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido.",
    };
  }
}

// ---------------------------------------------------------------------------
// H1 — "Corregir y reemplazar": crea un borrador nuevo copiado de una factura
// timbrada, ligado por replaces_invoice_id. Al timbrarlo se agrega la relacion
// SAT 04 y despues se puede cancelar la original con motivo 01.
// ---------------------------------------------------------------------------

export type CreateReplacementInvoiceDraftResult =
  | { ok: true; invoiceId: number; clientProjectId: number | null }
  | { ok: false; error: string };

export async function createReplacementInvoiceDraft(
  originalInvoiceId: number
): Promise<CreateReplacementInvoiceDraftResult> {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile?.is_active || !canViewFinancials(profile.role)) {
      throw new Error("No tienes permisos para crear facturas.");
    }

    const supabase = createSupabaseAdminClient();
    const { data: original, error } = await supabase
      .from("project_invoices")
      .select(
        "id, client_project_id, client_id, source_type, source_quote_id, source_service_report_id, subtotal_mxn, discount_mxn, taxable_subtotal_mxn, iva_mxn, total_mxn, subtotal, iva, total, status, facturama_id, sat_uuid, payment_method_code, payment_form_code, requires_payment_complement, payment_complement_status, cfdi_use"
      )
      .eq("id", originalInvoiceId)
      .maybeSingle();

    if (error) throw new Error(`Error leyendo factura: ${error.message}`);
    if (!original) throw new Error("Factura no encontrada.");
    if (
      !["issued", "paid"].includes(String(original.status)) ||
      !original.facturama_id ||
      !original.sat_uuid
    ) {
      throw new Error(
        "Solo se puede reemplazar una factura timbrada (emitida o pagada)."
      );
    }

    const { data: existingSubstitutes, error: existingError } = await supabase
      .from("project_invoices")
      .select("id, status")
      .eq("replaces_invoice_id", originalInvoiceId);

    if (existingError) {
      throw new Error(`Error revisando reemplazos previos: ${existingError.message}`);
    }

    const liveSubstitute = (existingSubstitutes || []).find(
      (row) => row.status !== "cancelled"
    );
    if (liveSubstitute) {
      throw new Error(
        `Ya existe un borrador/factura de reemplazo (#${liveSubstitute.id}) para esta factura.`
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("project_invoice_items")
      .select(
        "source_quote_item_id, product_id, description, quantity, unit_price_mxn, subtotal_mxn, gross_amount_mxn, discount_mxn, net_amount_mxn, iva_mxn, total_mxn, sat_product_service_code, sat_unit_code, sat_unit_name, fiscal_object, sort_order"
      )
      .eq("project_invoice_id", originalInvoiceId)
      .order("sort_order", { ascending: true });

    if (itemsError) throw new Error(`Error leyendo conceptos: ${itemsError.message}`);
    if (!items || items.length === 0) {
      throw new Error("La factura original no tiene conceptos para copiar.");
    }

    const invoicePayload = {
      client_project_id: original.client_project_id,
      client_id: original.client_id,
      source_type: original.source_type || "manual",
      source_quote_id: original.source_quote_id,
      source_service_report_id: original.source_service_report_id,
      invoice_date: getMexicoDate(),
      subtotal_mxn: original.subtotal_mxn,
      discount_mxn: original.discount_mxn ?? 0,
      taxable_subtotal_mxn: original.taxable_subtotal_mxn,
      iva_mxn: original.iva_mxn,
      total_mxn: original.total_mxn,
      subtotal: original.subtotal ?? original.subtotal_mxn,
      iva: original.iva ?? original.iva_mxn,
      total: original.total ?? original.total_mxn,
      payment_method_code: original.payment_method_code || "PUE",
      payment_form_code: original.payment_form_code || "03",
      requires_payment_complement: original.requires_payment_complement ?? false,
      payment_complement_status: original.payment_complement_status || "not_required",
      cfdi_use: original.cfdi_use,
      replaces_invoice_id: originalInvoiceId,
      status: "draft",
    };

    const { data: created, error: insertError } = await supabase
      .from("project_invoices")
      .insert(invoicePayload)
      .select("id, client_project_id")
      .single();

    if (insertError || !created) {
      throw new Error(
        `No se pudo crear el borrador de reemplazo: ${insertError?.message || "sin id"}`
      );
    }

    const { error: itemsInsertError } = await supabase
      .from("project_invoice_items")
      .insert(
        items.map((item, index) => ({
          project_invoice_id: created.id,
          source_quote_item_id: item.source_quote_item_id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price_mxn: item.unit_price_mxn,
          subtotal_mxn: item.subtotal_mxn,
          gross_amount_mxn: item.gross_amount_mxn,
          discount_mxn: item.discount_mxn,
          net_amount_mxn: item.net_amount_mxn,
          iva_mxn: item.iva_mxn,
          total_mxn: item.total_mxn,
          sat_product_service_code: item.sat_product_service_code,
          sat_unit_code: item.sat_unit_code,
          sat_unit_name: item.sat_unit_name,
          fiscal_object: item.fiscal_object,
          sort_order: item.sort_order ?? index,
        }))
      );

    if (itemsInsertError) {
      // Deja el borrador huerfano-sin-conceptos fuera: lo borramos para no dejar basura.
      await supabase.from("project_invoices").delete().eq("id", created.id);
      throw new Error(`Error copiando conceptos: ${itemsInsertError.message}`);
    }

    revalidatePath("/invoices");
    if (created.client_project_id) {
      revalidatePath(`/projects/${created.client_project_id}/invoices`);
    }

    return {
      ok: true,
      invoiceId: created.id,
      clientProjectId: created.client_project_id ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido.",
    };
  }
}
