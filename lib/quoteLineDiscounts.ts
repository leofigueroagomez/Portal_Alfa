// Descuentos por partida, reparto de utilidad con el aliado y reglas por marca.
//
// Regla de negocio (confirmada por Leo, 2026-10-01): primero se aplica el
// descuento al cliente; la utilidad que queda (precio al cliente - costo) se
// reparte con el aliado. Por defecto 50/50, en equipo y en mano de obra.
//   precio cliente = venta x (1 - c)
//   utilidad       = precio cliente - costo
//   aliado         = utilidad x s          (s = % de la utilidad para el aliado)
//   ALFA neto      = precio cliente - aliado
// Ejemplos: Lutron con 30% de margen y 15% al cliente deja 15% de utilidad ->
// 7.5% para cada uno. Sonos con 10% de margen y 0% al cliente -> 5% y 5%.
//
// Resolucion por partida de equipo:
//   cliente: override de la partida ?? min(% general de la cotizacion, tope de marca)
//            (el tope de marca solo limita lo heredado; un % escrito en la partida
//            se respeta, decision de Leo 2026-10-05)
//   aliado:  override de la partida ?? % de utilidad de la marca ??
//            (producto no elegible ? 0 : % de utilidad de la cotizacion)
// La mano de obra usa el % general al cliente y el % de utilidad de la cotizacion.
//
// Bloqueos duros al guardar (no avisos):
//   - precio en una moneda distinta a la del costo (regla de Leo: un producto
//     maneja una sola moneda; mezclarlas cobro 18x de mas o vendio con perdida);
//   - precio al cliente por debajo del costo;
//   - en cotizacion de aliado, equipo o mano de obra con venta y sin costo
//     (sin costo no hay utilidad que repartir y el aliado se llevaria de mas).

export type BrandCommercialRule = {
  id?: number;
  brand: string;
  max_client_discount_percent: number | null;
  partner_profit_share_percent: number | null;
  notes?: string | null;
  is_active?: boolean | null;
};

export type BrandRuleMap = Map<string, BrandCommercialRule>;

export const DEFAULT_PARTNER_PROFIT_SHARE_PERCENT = 50;

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
      message.includes("partner_profit_share_percent") ||
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
  // % de la utilidad que se lleva el aliado.
  partnerProfitSharePercent: number;
};

export type LineDiscountInput = {
  brand: string | null | undefined;
  equipmentSaleMxn: number;
  equipmentCostMxn: number;
  laborSaleMxn?: number;
  laborCostMxn?: number;
  // Moneda del precio de la partida y del costo del producto.
  saleCurrency?: string | null;
  costCurrency?: string | null;
  partnerEligible: boolean | null | undefined;
  clientOverride: number | null | undefined;
  partnerOverride: number | null | undefined;
};

export type LineDiscountSource = "line" | "brand" | "quote" | "not_eligible" | "none";

export type LineDiscountResult = {
  clientPercent: number;
  partnerSharePercent: number;
  clientSource: LineDiscountSource;
  partnerSource: LineDiscountSource;
  clientDiscountMxn: number;
  equipmentProfitMxn: number;
  partnerDiscountMxn: number;
  netToAlfaMxn: number;
  laborClientDiscountMxn: number;
  laborPartnerDiscountMxn: number;
  brandRule: BrandCommercialRule | null;
  currencyMismatch: boolean;
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

  let partnerSharePercent = 0;
  let partnerSource: LineDiscountSource = "none";

  if (defaults.isPartnerQuote) {
    const partnerOverride = parseOptionalPercent(line.partnerOverride);
    const brandShare =
      brandRule?.partner_profit_share_percent === null ||
      brandRule?.partner_profit_share_percent === undefined
        ? null
        : clampPercent(Number(brandRule.partner_profit_share_percent));

    if (partnerOverride !== null) {
      partnerSharePercent = clampPercent(partnerOverride);
      partnerSource = "line";
    } else if (brandShare !== null) {
      partnerSharePercent = brandShare;
      partnerSource = "brand";
    } else if (line.partnerEligible === false) {
      partnerSharePercent = 0;
      partnerSource = "not_eligible";
    } else {
      partnerSharePercent = clampPercent(defaults.partnerProfitSharePercent);
      partnerSource = "quote";
    }
  }

  const sale = Math.max(Number(line.equipmentSaleMxn) || 0, 0);
  const cost = Math.max(Number(line.equipmentCostMxn) || 0, 0);
  const clientDiscountMxn = sale * (clientPercent / 100);
  const clientPriceMxn = sale - clientDiscountMxn;
  const equipmentProfitMxn = clientPriceMxn - cost;
  const partnerDiscountMxn =
    Math.max(equipmentProfitMxn, 0) * (partnerSharePercent / 100);
  const netToAlfaMxn = clientPriceMxn - partnerDiscountMxn;

  // Mano de obra: % general al cliente y % de utilidad de la cotizacion. Como
  // antes, `partner_discount_eligible` solo aplica al equipo.
  const laborSale = Math.max(Number(line.laborSaleMxn) || 0, 0);
  const laborCost = Math.max(Number(line.laborCostMxn) || 0, 0);
  const laborClientDiscountMxn = laborSale * (clampPercent(defaults.clientPercent) / 100);
  const laborClientPrice = laborSale - laborClientDiscountMxn;
  const laborShare = defaults.isPartnerQuote
    ? clampPercent(defaults.partnerProfitSharePercent)
    : 0;
  const laborPartnerDiscountMxn =
    Math.max(laborClientPrice - laborCost, 0) * (laborShare / 100);

  let violation: string | null = null;
  const saleCurrency = (line.saleCurrency || "").trim().toUpperCase();
  const costCurrency = (line.costCurrency || "").trim().toUpperCase();

  const currencyMismatch = Boolean(
    sale > 0 && saleCurrency && costCurrency && saleCurrency !== costCurrency
  );

  if (currencyMismatch) {
    violation = `El precio esta en ${saleCurrency} y el costo en ${costCurrency}; un producto debe manejar una sola moneda. Corrige el producto en el catalogo y usa "Actualizar desde catalogo".`;
  } else if (sale > 0 && cost > 0 && clientPriceMxn + 0.005 < cost) {
    violation = `Con ${formatPercent(clientPercent)} al cliente el equipo queda por debajo de su costo.`;
  } else if (sale > 0 && cost <= 0 && partnerSharePercent > 0) {
    violation =
      "El equipo no tiene costo capturado y no se puede calcular la utilidad del aliado.";
  } else if (laborSale > 0 && laborCost > 0 && laborClientPrice + 0.005 < laborCost) {
    violation = `Con ${formatPercent(defaults.clientPercent)} al cliente la mano de obra queda por debajo de su costo.`;
  } else if (laborSale > 0 && laborCost <= 0 && laborShare > 0) {
    violation =
      "La mano de obra no tiene costo interno y no se puede calcular la utilidad del aliado.";
  }

  return {
    clientPercent,
    partnerSharePercent,
    clientSource,
    partnerSource,
    clientDiscountMxn,
    equipmentProfitMxn,
    partnerDiscountMxn,
    netToAlfaMxn,
    laborClientDiscountMxn,
    laborPartnerDiscountMxn,
    brandRule,
    currencyMismatch,
    violation,
  };
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
      return "producto sin reparto al aliado";
    default:
      return "";
  }
}
