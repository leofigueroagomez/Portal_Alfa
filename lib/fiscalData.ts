export type PersonType = "physical" | "moral" | "unknown";

export type FiscalCatalogItem = {
  code: string;
  name: string;
  applies_to_person_type: "physical" | "moral" | "both";
  is_active: boolean;
};

export type FiscalClientData = {
  id: number;
  name?: string | null;
  tax_rfc?: string | null;
  tax_business_name?: string | null;
  tax_regime?: string | null;
  default_cfdi_use?: string | null;
  fiscal_regime?: string | null;
  cfdi_use?: string | null;
  tax_zip_code?: string | null;
  billing_email?: string | null;
};

export type FiscalCatalogs = {
  fiscalRegimes: FiscalCatalogItem[];
  cfdiUses: FiscalCatalogItem[];
};

export type FiscalFieldKey =
  | "tax_rfc"
  | "tax_business_name"
  | "fiscal_regime"
  | "cfdi_use"
  | "tax_zip_code"
  | "billing_email";

export const fiscalFieldLabels: Record<FiscalFieldKey, string> = {
  tax_rfc: "RFC",
  tax_business_name: "Razon social",
  fiscal_regime: "Regimen fiscal",
  cfdi_use: "Uso CFDI",
  tax_zip_code: "Codigo postal fiscal",
  billing_email: "Correo de facturacion",
};

const requiredFiscalFields: FiscalFieldKey[] = [
  "tax_rfc",
  "tax_business_name",
  "fiscal_regime",
  "cfdi_use",
  "tax_zip_code",
  "billing_email",
];

export function getClientPersonType(rfc: string | null | undefined): PersonType {
  const clean = rfc?.trim().toUpperCase() || "";
  if (clean.length === 12) return "moral";
  if (clean.length === 13) return "physical";
  return "unknown";
}

export function getFiscalRegimeCode(client: FiscalClientData | null | undefined) {
  const canonical = client?.fiscal_regime?.trim();
  if (canonical) return canonical;

  const legacy = client?.tax_regime?.trim();
  return legacy && /^\d{3}$/.test(legacy) ? legacy : "";
}

export function getCfdiUseCode(client: FiscalClientData | null | undefined) {
  const canonical = client?.cfdi_use?.trim();
  if (canonical) return canonical;

  const legacy = client?.default_cfdi_use?.trim();
  return legacy && /^[A-Z]\d{2}$/i.test(legacy) ? legacy.toUpperCase() : "";
}

export function getCatalogLabel(code: string | null | undefined, catalog: FiscalCatalogItem[]) {
  const item = catalog.find((option) => option.code === code);
  return item ? `${item.code} - ${item.name}` : code || "Pendiente";
}

export function getFiscalRegimeDisplay(client: FiscalClientData, catalog: FiscalCatalogItem[]) {
  const code = getFiscalRegimeCode(client);
  if (code) {
    const item = catalog.find((option) => option.code === code);
    return item ? `${item.code} - ${item.name}` : "Requiere actualizacion";
  }

  return client.tax_regime?.trim() ? "Requiere actualizacion" : "Pendiente";
}

export function getCfdiUseDisplay(client: FiscalClientData, catalog: FiscalCatalogItem[]) {
  const code = getCfdiUseCode(client);
  if (code) {
    const item = catalog.find((option) => option.code === code);
    return item ? `${item.code} - ${item.name}` : "Requiere actualizacion";
  }

  return client.default_cfdi_use?.trim() ? "Requiere actualizacion" : "Pendiente";
}

export function isValidBillingEmail(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function optionMatchesPersonType(option: FiscalCatalogItem, personType: PersonType) {
  if (personType === "unknown") return true;
  return option.applies_to_person_type === "both" || option.applies_to_person_type === personType;
}

export function getMissingFiscalFields(
  client: FiscalClientData | null | undefined,
  catalogs?: FiscalCatalogs
) {
  if (!client) return requiredFiscalFields.map((field) => fiscalFieldLabels[field]);

  const missing: string[] = [];
  const regimeCode = getFiscalRegimeCode(client);
  const cfdiUseCode = getCfdiUseCode(client);

  if (!client.tax_rfc?.trim()) missing.push(fiscalFieldLabels.tax_rfc);
  if (!client.tax_business_name?.trim()) missing.push(fiscalFieldLabels.tax_business_name);
  if (!regimeCode) {
    missing.push(
      client.tax_regime?.trim()
        ? `${fiscalFieldLabels.fiscal_regime} (requiere actualizacion)`
        : fiscalFieldLabels.fiscal_regime
    );
  }
  if (!cfdiUseCode) {
    missing.push(
      client.default_cfdi_use?.trim()
        ? `${fiscalFieldLabels.cfdi_use} (requiere actualizacion)`
        : fiscalFieldLabels.cfdi_use
    );
  }
  if (!/^\d{5}$/.test(client.tax_zip_code?.trim() || "")) {
    missing.push(fiscalFieldLabels.tax_zip_code);
  }
  if (!isValidBillingEmail(client.billing_email)) {
    missing.push(fiscalFieldLabels.billing_email);
  }

  if (catalogs && regimeCode) {
    const regime = catalogs.fiscalRegimes.find((item) => item.code === regimeCode);
    if (!regime || !regime.is_active) {
      missing.push(`${fiscalFieldLabels.fiscal_regime} (requiere actualizacion)`);
    }
  }

  if (catalogs && cfdiUseCode) {
    const cfdiUse = catalogs.cfdiUses.find((item) => item.code === cfdiUseCode);
    if (!cfdiUse || !cfdiUse.is_active) {
      missing.push(`${fiscalFieldLabels.cfdi_use} (requiere actualizacion)`);
    }
  }

  return [...new Set(missing)];
}

export function getFiscalValidationErrors(client: FiscalClientData, catalogs?: FiscalCatalogs) {
  const errors: string[] = [];
  const regimeCode = getFiscalRegimeCode(client);
  const cfdiUseCode = getCfdiUseCode(client);

  if (!client.tax_rfc?.trim()) errors.push("RFC requerido.");
  if (!client.tax_business_name?.trim()) errors.push("Razon social requerida.");
  if (!regimeCode) errors.push("Regimen fiscal requerido.");
  if (!cfdiUseCode) errors.push("Uso CFDI requerido.");
  if (!/^\d{5}$/.test(client.tax_zip_code?.trim() || "")) {
    errors.push("CP fiscal debe tener 5 digitos.");
  }
  if (!isValidBillingEmail(client.billing_email)) {
    errors.push("Correo de facturacion invalido.");
  }

  if (catalogs) {
    const personType = getClientPersonType(client.tax_rfc);
    const regime = catalogs.fiscalRegimes.find((item) => item.code === regimeCode);
    const cfdiUse = catalogs.cfdiUses.find((item) => item.code === cfdiUseCode);

    if (!regime || !regime.is_active) {
      errors.push("Regimen fiscal requiere actualizacion.");
    } else if (!optionMatchesPersonType(regime, personType)) {
      errors.push("Regimen fiscal no corresponde al tipo de persona sugerido por el RFC.");
    }

    if (!cfdiUse || !cfdiUse.is_active) {
      errors.push("Uso CFDI requiere actualizacion.");
    } else if (!optionMatchesPersonType(cfdiUse, personType)) {
      errors.push("Uso CFDI no corresponde al tipo de persona sugerido por el RFC.");
    }
  }

  return [...new Set(errors)];
}

export function formatMissingFiscalFields(fields: string[]) {
  return fields.join(", ");
}
