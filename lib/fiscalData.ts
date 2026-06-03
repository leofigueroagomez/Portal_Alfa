export type FiscalClientData = {
  id: number;
  name?: string | null;
  tax_rfc?: string | null;
  tax_business_name?: string | null;
  tax_regime?: string | null;
  default_cfdi_use?: string | null;
  tax_zip_code?: string | null;
  billing_email?: string | null;
};

export type FiscalFieldKey =
  | "tax_rfc"
  | "tax_business_name"
  | "tax_regime"
  | "default_cfdi_use"
  | "tax_zip_code"
  | "billing_email";

export const fiscalFieldLabels: Record<FiscalFieldKey, string> = {
  tax_rfc: "RFC",
  tax_business_name: "Razon social",
  tax_regime: "Regimen fiscal",
  default_cfdi_use: "Uso CFDI",
  tax_zip_code: "Codigo postal fiscal",
  billing_email: "Correo de facturacion",
};

const requiredFiscalFields: FiscalFieldKey[] = [
  "tax_rfc",
  "tax_business_name",
  "tax_regime",
  "default_cfdi_use",
  "tax_zip_code",
  "billing_email",
];

export function isValidBillingEmail(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function getMissingFiscalFields(client: FiscalClientData | null | undefined) {
  if (!client) return requiredFiscalFields.map((field) => fiscalFieldLabels[field]);

  return requiredFiscalFields
    .filter((field) => {
      const value = client[field]?.trim();
      if (!value) return true;
      if (field === "tax_zip_code") return !/^\d{5}$/.test(value);
      if (field === "billing_email") return !isValidBillingEmail(value);
      return false;
    })
    .map((field) => fiscalFieldLabels[field]);
}

export function getFiscalValidationErrors(client: FiscalClientData) {
  const errors: string[] = [];

  if (!client.tax_rfc?.trim()) errors.push("RFC requerido.");
  if (!client.tax_business_name?.trim()) errors.push("Razon social requerida.");
  if (!client.tax_regime?.trim()) errors.push("Regimen fiscal requerido.");
  if (!client.default_cfdi_use?.trim()) errors.push("Uso CFDI requerido.");
  if (!/^\d{5}$/.test(client.tax_zip_code?.trim() || "")) {
    errors.push("CP fiscal debe tener 5 digitos.");
  }
  if (!isValidBillingEmail(client.billing_email)) {
    errors.push("Correo de facturacion invalido.");
  }

  return errors;
}

export function formatMissingFiscalFields(fields: string[]) {
  return fields.join(", ");
}
