// Descuentos por partida y reglas comerciales por marca.
//
// Regla de negocio (confirmada por Leo, 2026-10-01): el descuento del aliado se
// calcula sobre el precio que YA trae el descuento al cliente (opcion A).
//   cliente paga   = venta x (1 - c)
//   aliado liquida = venta x (1 - c) x (1 - p)
//
// Resolucion del % efectivo de cada partida de equipo:
//   cliente: override de la partida ?? min(% global de la cotizacion, tope de marca)
//   aliado:  override de la partida ?? % de la marca ?? (no elegible ? 0 : % global)
//
// Un override de partida que rebase el tope de la marca, o una partida que quede
// vendida por debajo de su costo, es un bloqueo duro al guardar (no un aviso).

export type BrandCommercialRule = {
  id?: number;
  brand: string;
  max_client_discount_percent: number | null;
  partner_discount_percent: number | null;
  notes?: string | null;
  is_active?: boolean | null;
};

export type BrandRuleMap = Map<string, BrandCommercialRule>;

export function normalizeBrandKey(brand: string | null | undefined) {
  return (brand || "").trim().toLowerCase();
}

export function buildBrandRuleMap(
  rules: BrandCommercialRule[] | null | undefined
): BrandRuleMap {
  const map: BrandRuleMap = new Map();
  for (const rule of rules || []) {
    if (rule.is_active === false) continue;
    const key = normalizeBrandKey(rule.brand);
    if (key) map.set(key, rule);
  }
  return map;
}

// Columnas faltantes en PostgREST (migracion aun no aplicada en un entorno).
export function isMissingLineDiscountSchema(
  error: { code?: string; message?: string } | null | undefined
) {
  if (!error) return false;
  const message = error.message || "";
  return (
    (error.code === "PGRST204" ||
      error.code === "42703" ||
      error.code === "PGRST205" ||
      error.code === "42P01") &&
    (message.includes("client_discount_percent") ||
      message.includes("partner_discount_percent") ||
      message.includes("client_discount_mxn") ||
      message.includes("partner_discount_mxn") ||
      message.includes("brand_commercial_rules"))
  );
}

export function parseOptionalPercent(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

export type QuoteDiscountDefaults = {
  // % global al cliente; 0 si la cotizacion no usa descuento porcentual.
  clientPercent: number;
  isPartnerQuote: boolean;
  partnerEquipmentPercent: number;
};

export type LineDiscountInput = {
  brand: string | null | undefined;
  equipmentSaleMxn: number;
  equipmentCostMxn: number;
  partnerEligible: boolean | null | undefined;
  clientOverride: number | null | undefined;
  partnerOverride: number | null | undefined;
};

export type LineDiscountSource = "line" | "brand" | "quote" | "not_eligible" | "none";

export type LineDiscountResult = {
  clientPercent: number;
  partnerPercent: number;
  clientSource: LineDiscountSource;
  partnerSource: LineDiscountSource;
  clientDiscountMxn: number;
  partnerDiscountMxn: number;
  netToAlfaMxn: number;
  brandRule: BrandCommercialRule | null;
  violation: string | null;
};

export function resolveLineDiscount(
  line: LineDiscountInput,
  defaults: QuoteDiscountDefaults,
  rules: BrandRuleMap
): LineDiscountResult {
  const brandRule = rules.get(normalizeBrandKey(line.brand)) || null;
  const brandMaxClient =
    brandRule?.max_client_discount_percent === null ||
    brandRule?.max_client_discount_percent === undefined
      ? null
      : clampPercent(Number(brandRule.max_client_discount_percent));

  let clientPercent: number;
  let clientSource: LineDiscountSource;
  const clientOverride = parseOptionalPercent(line.clientOverride);

  if (clientOverride !== null) {
    clientPercent = clampPercent(clientOverride);
    clientSource = "line";
  } else if (brandMaxClient !== null && defaults.clientPercent > brandMaxClient) {
    clientPercent = brandMaxClient;
    clientSource = "brand";
  } else {
    clientPercent = clampPercent(defaults.clientPercent);
    clientSource = clientPercent > 0 ? "quote" : "none";
  }

  let partnerPercent = 0;
  let partnerSource: LineDiscountSource = "none";

  if (defaults.isPartnerQuote) {
    const partnerOverride = parseOptionalPercent(line.partnerOverride);
    const brandPartner =
      brandRule?.partner_discount_percent === null ||
      brandRule?.partner_discount_percent === undefined
        ? null
        : clampPercent(Number(brandRule.partner_discount_percent));

    if (partnerOverride !== null) {
      partnerPercent = clampPercent(partnerOverride);
      partnerSource = "line";
    } else if (brandPartner !== null) {
      partnerPercent = brandPartner;
      partnerSource = "brand";
    } else if (line.partnerEligible === false) {
      partnerPercent = 0;
      partnerSource = "not_eligible";
    } else {
      partnerPercent = clampPercent(defaults.partnerEquipmentPercent);
      partnerSource = "quote";
    }
  }

  const sale = Math.max(Number(line.equipmentSaleMxn) || 0, 0);
  const clientDiscountMxn = sale * (clientPercent / 100);
  const clientPriceMxn = sale - clientDiscountMxn;
  const partnerDiscountMxn = clientPriceMxn * (partnerPercent / 100);
  const netToAlfaMxn = clientPriceMxn - partnerDiscountMxn;

  let violation: string | null = null;
  const brandLabel = (line.brand || "").trim() || "esta marca";

  if (
    clientSource === "line" &&
    brandMaxClient !== null &&
    clientPercent > brandMaxClient + 1e-9
  ) {
    violation = `${brandLabel} permite maximo ${formatPercent(brandMaxClient)} de descuento al cliente y la partida tiene ${formatPercent(clientPercent)}.`;
  } else {
    const cost = Math.max(Number(line.equipmentCostMxn) || 0, 0);
    if (sale > 0 && cost > 0 && netToAlfaMxn + 0.005 < cost) {
      violation = `Con ${formatPercent(clientPercent)} al cliente${
        partnerPercent > 0 ? ` y ${formatPercent(partnerPercent)} al aliado` : ""
      } la partida queda por debajo de su costo.`;
    }
  }

  return {
    clientPercent,
    partnerPercent,
    clientSource,
    partnerSource,
    clientDiscountMxn,
    partnerDiscountMxn,
    netToAlfaMxn,
    brandRule,
    violation,
  };
}

// Mano de obra: no tiene override por partida. Usa el % global al cliente y el %
// de mano de obra del aliado, con la misma regla A.
export function computeLaborDiscounts(
  laborSaleMxn: number,
  defaults: QuoteDiscountDefaults,
  partnerLaborPercent: number
) {
  const sale = Math.max(Number(laborSaleMxn) || 0, 0);
  const clientDiscountMxn = sale * (clampPercent(defaults.clientPercent) / 100);
  const partnerDiscountMxn = defaults.isPartnerQuote
    ? (sale - clientDiscountMxn) * (clampPercent(partnerLaborPercent) / 100)
    : 0;
  return { clientDiscountMxn, partnerDiscountMxn };
}

export function formatPercent(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0$/, "")}%`;
}

export function describeDiscountSource(source: LineDiscountSource) {
  switch (source) {
    case "line":
      return "manual";
    case "brand":
      return "regla de marca";
    case "quote":
      return "general";
    case "not_eligible":
      return "producto sin descuento aliado";
    default:
      return "";
  }
}
