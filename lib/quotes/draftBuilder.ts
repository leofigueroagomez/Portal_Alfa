import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMexicoDate } from "@/lib/mexicoDate";

export type DraftQuoteInput = {
  client_id: number;
  items: Array<{
    product_id: number;
    qty: number;
    margin_percent?: number;
  }>;
  labor?: Array<{ labor_activity_id: number; qty: number }>;
  indirect_cost_percent?: number;
  notes?: string;
};

export type DraftQuoteResult = {
  quote_id: number;
  version: number;
  grand_total_mxn: number;
  warnings: string[];
};

type ExchangeRate = {
  rate: number;
  source: string;
  date: string;
};

type ProductRow = {
  id: number;
  brand: string | null;
  model: string | null;
  name: string | null;
  image_url: string | null;
  cost_price: number | null;
  cost_currency: string | null;
  calculated_sale_price: number | null;
  sale_currency: string | null;
  pricing_method: string | null;
  target_margin: number | null;
  labor_unit_cost: number | null;
  labor_unit_sale_price: number | null;
};

type LaborActivityRow = {
  id: number;
  name: string | null;
  default_unit: string | null;
  default_internal_cost_mxn: number | null;
  default_sale_price_mxn: number | null;
};

type ResolvedLine = {
  kind: "product" | "labor";
  sourceId: number;
  productId: number | null;
  quantity: number;
  saleCurrency: string;
  catalogUnitEquipmentPrice: number;
  unitEquipmentPriceUsd: number;
  equipmentTotalUsd: number;
  unitLaborPriceMxn: number;
  laborTotalMxn: number;
  lineTotalMxn: number;
  productBrand: string;
  productModel: string;
  productName: string;
  productImageUrl: string | null;
  internalUnitLaborCostMxn: number;
  laborUnit: string;
};

type DraftTotals = {
  equipmentTotalUsd: number;
  laborTotalMxn: number;
  equipmentTotalMxn: number;
  indirectCostMxn: number;
  subtotalMxn: number;
  taxableBaseMxn: number;
  ivaMxn: number;
  totalMxn: number;
};

type DraftQuoteCandidate = {
  id: number;
  version: number | null;
  grand_total: number | null;
  notes: string | null;
  indirect_cost_percent: number | null;
};

type CandidateItem = {
  quote_id: number;
  product_id: number | null;
  product_model: string | null;
  product_name: string | null;
  quantity: number | null;
  equipment_total_usd: number | null;
  equipment_total: number | null;
  labor_total: number | null;
};

const IVA_RATE = 0.16;
const DEFAULT_SECTION_NAME = "General";
const LABOR_SECTION_NAME = "Mano de obra";

export class DraftQuoteBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftQuoteBuilderError";
  }
}

function roundMoney(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function positiveInteger(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new DraftQuoteBuilderError(`${label} debe ser un entero positivo.`);
  }
  return parsed;
}

function positiveQuantity(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new DraftQuoteBuilderError(`${label} debe ser mayor que cero.`);
  }
  return parsed;
}

function optionalPercent(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100) {
    throw new DraftQuoteBuilderError(`${label} debe estar entre 0 y menos de 100.`);
  }
  return parsed;
}

function normalizeCurrency(value: string | null | undefined) {
  return (value || "USD").toUpperCase() === "MXN" ? "MXN" : "USD";
}

function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
) {
  if (fromCurrency === toCurrency) return amount;
  if (fromCurrency === "USD" && toCurrency === "MXN") {
    return amount * exchangeRate;
  }
  return exchangeRate > 0 ? amount / exchangeRate : 0;
}

function salePriceFromMargin(
  product: ProductRow,
  marginPercent: number,
  exchangeRate: number
) {
  const cost = Number(product.cost_price || 0);
  if (cost <= 0) return null;

  const saleCurrency = normalizeCurrency(product.sale_currency);
  const costCurrency = normalizeCurrency(product.cost_currency || saleCurrency);
  const convertedCost = convertCurrency(
    cost,
    costCurrency,
    saleCurrency,
    exchangeRate
  );

  return roundMoney(convertedCost / (1 - marginPercent / 100));
}

function catalogSalePrice(
  product: ProductRow,
  requestedMargin: number | undefined,
  exchangeRate: number,
  warnings: string[]
) {
  if (requestedMargin !== undefined) {
    const overridden = salePriceFromMargin(product, requestedMargin, exchangeRate);
    if (overridden !== null) return overridden;
    warnings.push(
      `Producto ${product.id}: no se pudo aplicar el margen ${requestedMargin}% porque no tiene costo; se uso el precio calculado del catalogo.`
    );
  }

  const storedPrice = Number(product.calculated_sale_price || 0);
  if (storedPrice > 0) return storedPrice;

  const productMargin = optionalPercent(
    product.target_margin,
    `Margen del producto ${product.id}`
  );
  if (productMargin !== undefined) {
    const calculated = salePriceFromMargin(product, productMargin, exchangeRate);
    if (calculated !== null) {
      warnings.push(
        `Producto ${product.id}: se recalculo el precio con su margen de catalogo porque calculated_sale_price esta vacio.`
      );
      return calculated;
    }
  }

  const fallbackCost = Number(product.cost_price || 0);
  if (fallbackCost > 0) {
    warnings.push(
      `Producto ${product.id}: no tiene precio de venta calculado; se uso el costo convertido sin margen.`
    );
    return convertCurrency(
      fallbackCost,
      normalizeCurrency(product.cost_currency),
      normalizeCurrency(product.sale_currency),
      exchangeRate
    );
  }

  warnings.push(
    `Producto ${product.id}: no tiene costo ni precio de venta calculado; la partida quedo en cero.`
  );
  return 0;
}

function resolveProductLine(
  product: ProductRow,
  item: DraftQuoteInput["items"][number],
  indirectCostPercent: number,
  exchangeRate: number,
  warnings: string[]
): ResolvedLine {
  const quantity = positiveQuantity(item.qty, `Cantidad del producto ${product.id}`);
  const margin = optionalPercent(
    item.margin_percent,
    `Margen del producto ${product.id}`
  );
  const saleCurrency = normalizeCurrency(product.sale_currency);
  const baseSalePrice = catalogSalePrice(product, margin, exchangeRate, warnings);
  const baseSalePriceUsd =
    saleCurrency === "MXN" ? baseSalePrice / exchangeRate : baseSalePrice;
  const indirectMultiplier = 1 + indirectCostPercent / 100;
  const unitEquipmentPriceUsd = baseSalePriceUsd * indirectMultiplier;
  const equipmentTotalUsd = unitEquipmentPriceUsd * quantity;
  const unitLaborPriceMxn = Number(product.labor_unit_sale_price || 0);
  const laborTotalMxn = unitLaborPriceMxn * quantity;

  if (product.cost_price === null || Number(product.cost_price) <= 0) {
    warnings.push(`Producto ${product.id}: costo faltante o en cero.`);
  }

  return {
    kind: "product",
    sourceId: product.id,
    productId: product.id,
    quantity,
    saleCurrency,
    catalogUnitEquipmentPrice: roundMoney(baseSalePrice),
    unitEquipmentPriceUsd: roundMoney(unitEquipmentPriceUsd),
    equipmentTotalUsd: roundMoney(equipmentTotalUsd),
    unitLaborPriceMxn: roundMoney(unitLaborPriceMxn),
    laborTotalMxn: roundMoney(laborTotalMxn),
    lineTotalMxn: roundMoney(equipmentTotalUsd * exchangeRate + laborTotalMxn),
    productBrand: product.brand || "Sin marca",
    productModel: product.model || "Sin modelo",
    productName: product.name || `Producto ${product.id}`,
    productImageUrl: product.image_url,
    internalUnitLaborCostMxn: roundMoney(
      Number(product.labor_unit_cost || 0)
    ),
    laborUnit: "pieza",
  };
}

function resolveLaborLine(
  activity: LaborActivityRow,
  labor: NonNullable<DraftQuoteInput["labor"]>[number]
): ResolvedLine {
  const quantity = positiveQuantity(
    labor.qty,
    `Cantidad de la actividad ${activity.id}`
  );
  const unitLaborPriceMxn = Number(activity.default_sale_price_mxn || 0);
  const name = activity.name?.trim() || `Actividad ${activity.id}`;

  return {
    kind: "labor",
    sourceId: activity.id,
    productId: null,
    quantity,
    saleCurrency: "MXN",
    catalogUnitEquipmentPrice: 0,
    unitEquipmentPriceUsd: 0,
    equipmentTotalUsd: 0,
    unitLaborPriceMxn: roundMoney(unitLaborPriceMxn),
    laborTotalMxn: roundMoney(unitLaborPriceMxn * quantity),
    lineTotalMxn: roundMoney(unitLaborPriceMxn * quantity),
    productBrand: "ALFA",
    productModel: `LABOR-${activity.id}`,
    productName: name,
    productImageUrl: null,
    internalUnitLaborCostMxn: roundMoney(
      Number(activity.default_internal_cost_mxn || 0)
    ),
    laborUnit: activity.default_unit?.trim() || "pieza",
  };
}

function calculateTotals(
  lines: ResolvedLine[],
  indirectCostPercent: number,
  exchangeRate: number
): DraftTotals {
  const equipmentTotalUsdRaw = lines.reduce(
    (sum, line) => sum + line.equipmentTotalUsd,
    0
  );
  const laborTotalMxnRaw = lines.reduce(
    (sum, line) => sum + line.laborTotalMxn,
    0
  );
  const equipmentTotalMxnRaw = equipmentTotalUsdRaw * exchangeRate;
  const subtotalMxnRaw = equipmentTotalMxnRaw + laborTotalMxnRaw;
  const indirectMultiplier = 1 + indirectCostPercent / 100;
  const indirectCostMxnRaw =
    indirectMultiplier > 0
      ? equipmentTotalMxnRaw * (1 - 1 / indirectMultiplier)
      : 0;

  return {
    equipmentTotalUsd: roundMoney(equipmentTotalUsdRaw),
    laborTotalMxn: roundMoney(laborTotalMxnRaw),
    equipmentTotalMxn: roundMoney(equipmentTotalMxnRaw),
    indirectCostMxn: roundMoney(indirectCostMxnRaw),
    subtotalMxn: roundMoney(subtotalMxnRaw),
    taxableBaseMxn: roundMoney(subtotalMxnRaw),
    ivaMxn: roundMoney(subtotalMxnRaw * IVA_RATE),
    totalMxn: roundMoney(subtotalMxnRaw * (1 + IVA_RATE)),
  };
}

function validateInput(input: DraftQuoteInput) {
  if (!input || typeof input !== "object") {
    throw new DraftQuoteBuilderError("El borrador de cotizacion es invalido.");
  }

  const clientId = positiveInteger(input.client_id, "client_id");
  const items = Array.isArray(input.items) ? input.items : [];
  const labor = Array.isArray(input.labor) ? input.labor : [];

  if (items.length === 0 && labor.length === 0) {
    throw new DraftQuoteBuilderError(
      "La cotizacion debe incluir al menos un producto o una actividad de mano de obra."
    );
  }

  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 5000) {
    throw new DraftQuoteBuilderError(
      "Las notas no pueden exceder 5000 caracteres."
    );
  }

  return {
    clientId,
    items: items.map((item, index) => ({
      product_id: positiveInteger(item.product_id, `items[${index}].product_id`),
      qty: positiveQuantity(item.qty, `items[${index}].qty`),
      margin_percent: optionalPercent(
        item.margin_percent,
        `items[${index}].margin_percent`
      ),
    })),
    labor: labor.map((item, index) => ({
      labor_activity_id: positiveInteger(
        item.labor_activity_id,
        `labor[${index}].labor_activity_id`
      ),
      qty: positiveQuantity(item.qty, `labor[${index}].qty`),
    })),
    indirectCostPercent: optionalPercent(
      input.indirect_cost_percent,
      "indirect_cost_percent"
    ),
    notes,
  };
}

async function fetchExchangeRate(): Promise<ExchangeRate> {
  const today = getMexicoDate();
  const errors: string[] = [];
  const token = process.env.BANXICO_TOKEN;

  if (token) {
    try {
      const response = await fetch(
        "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno",
        {
          headers: { "Bmx-Token": token },
          next: { revalidate: 60 * 60 * 6 },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const datum = json?.bmx?.series?.[0]?.datos?.[0];
      const rate = Number(String(datum?.dato || "").replace(",", ""));
      if (!rate) throw new Error("dato FIX invalido");
      const [day, month, year] = String(datum?.fecha || "").split("/");
      return {
        rate,
        source: "Banxico SIE SF43718",
        date:
          day && month && year
            ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
            : today,
      };
    } catch (error) {
      errors.push(`Banxico: ${error instanceof Error ? error.message : error}`);
    }
  }

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const rate = Number(json?.rates?.MXN);
    if (!rate) throw new Error("USD/MXN invalido");
    return {
      rate,
      source: "open.er-api.com USD/MXN",
      date: json?.time_last_update_utc
        ? getMexicoDate(new Date(json.time_last_update_utc))
        : today,
    };
  } catch (error) {
    errors.push(
      `Fuente publica: ${error instanceof Error ? error.message : error}`
    );
  }

  throw new DraftQuoteBuilderError(
    `No se pudo obtener un tipo de cambio seguro (${errors.join(" | ")}).`
  );
}

function lineSignature(line: ResolvedLine) {
  return JSON.stringify({
    productId: line.productId,
    model: line.productModel,
    name: line.productName,
    quantity: Number(line.quantity),
    equipmentTotalUsd: roundMoney(line.equipmentTotalUsd),
    laborTotalMxn: roundMoney(line.laborTotalMxn),
  });
}

function candidateSignature(item: CandidateItem) {
  return JSON.stringify({
    productId: item.product_id === null ? null : Number(item.product_id),
    model: item.product_model || "",
    name: item.product_name || "",
    quantity: Number(item.quantity || 0),
    equipmentTotalUsd: roundMoney(
      Number(item.equipment_total_usd ?? item.equipment_total ?? 0)
    ),
    laborTotalMxn: roundMoney(Number(item.labor_total || 0)),
  });
}

async function findMatchingDraft(
  supabase: SupabaseClient,
  clientId: number,
  notes: string | null,
  indirectCostPercent: number,
  lines: ResolvedLine[]
) {
  const { data: candidates, error: candidatesError } = await supabase
    .from("quotes")
    .select("id, version, grand_total, notes, indirect_cost_percent")
    .eq("client_id", clientId)
    .eq("status", "draft")
    .eq("is_latest", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (candidatesError) {
    throw new DraftQuoteBuilderError(
      `No se pudo verificar idempotencia: ${candidatesError.message}`
    );
  }

  const comparableCandidates = ((candidates || []) as DraftQuoteCandidate[]).filter(
    (candidate) =>
      (candidate.notes?.trim() || null) === notes &&
      roundMoney(Number(candidate.indirect_cost_percent || 0)) ===
        roundMoney(indirectCostPercent)
  );
  if (comparableCandidates.length === 0) return null;

  const candidateIds = comparableCandidates.map((candidate) => candidate.id);
  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select(
      "quote_id, product_id, product_model, product_name, quantity, equipment_total_usd, equipment_total, labor_total"
    )
    .in("quote_id", candidateIds);

  if (itemsError) {
    throw new DraftQuoteBuilderError(
      `No se pudieron comparar borradores existentes: ${itemsError.message}`
    );
  }

  const expected = lines.map(lineSignature).sort();
  const candidateItems = (items || []) as CandidateItem[];

  for (const candidate of comparableCandidates) {
    const actual = candidateItems
      .filter((item) => Number(item.quote_id) === candidate.id)
      .map(candidateSignature)
      .sort();
    if (
      actual.length === expected.length &&
      actual.every((signature, index) => signature === expected[index])
    ) {
      return candidate;
    }
  }

  return null;
}

async function nextBaseNumber(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("quote_groups")
    .select("base_number")
    .not("base_number", "is", null)
    .order("base_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DraftQuoteBuilderError(
      `No se pudo calcular la numeracion: ${error.message}`
    );
  }

  const lastNumber = data?.base_number?.match(/ALFA-(\d+)/)?.[1];
  return `ALFA-${String((Number(lastNumber) || 0) + 1).padStart(4, "0")}`;
}

async function insertSection(
  supabase: SupabaseClient,
  quoteId: number,
  name: string,
  sortOrder: number,
  lines: ResolvedLine[],
  exchangeRate: number
) {
  const equipmentTotalUsd = roundMoney(
    lines.reduce((sum, line) => sum + line.equipmentTotalUsd, 0)
  );
  const laborTotalMxn = roundMoney(
    lines.reduce((sum, line) => sum + line.laborTotalMxn, 0)
  );
  const { data: section, error: sectionError } = await supabase
    .from("quote_sections")
    .insert({
      quote_id: quoteId,
      name,
      sort_order: sortOrder,
      equipment_total: equipmentTotalUsd,
      labor_total: laborTotalMxn,
      total: roundMoney(equipmentTotalUsd * exchangeRate + laborTotalMxn),
    })
    .select("id")
    .single();

  if (sectionError || !section) {
    throw new DraftQuoteBuilderError(
      `No se pudo crear la seccion ${name}: ${sectionError?.message || "sin respuesta"}`
    );
  }

  const rows = lines.map((line, index) => ({
    quote_id: quoteId,
    quote_section_id: section.id,
    product_id: line.productId,
    quantity: line.quantity,
    sale_currency: line.saleCurrency,
    unit_equipment_price: line.catalogUnitEquipmentPrice,
    unit_equipment_price_usd: line.unitEquipmentPriceUsd,
    unit_labor_price: line.unitLaborPriceMxn,
    equipment_total: line.equipmentTotalUsd,
    equipment_total_usd: line.equipmentTotalUsd,
    labor_total: line.laborTotalMxn,
    line_total: line.lineTotalMxn,
    product_brand: line.productBrand,
    product_model: line.productModel,
    product_name: line.productName,
    product_image_url: line.productImageUrl,
    existing_customer_equipment: false,
    area: null,
    customer_visible_note: null,
    sort_order: index,
  }));
  const { data: savedItems, error: itemError } = await supabase
    .from("quote_items")
    .insert(rows)
    .select("id, sort_order");

  if (itemError || !savedItems) {
    throw new DraftQuoteBuilderError(
      `No se pudieron crear las partidas de ${name}: ${itemError?.message || "sin respuesta"}`
    );
  }

  const laborRows = lines.flatMap((line, index) => {
    if (line.unitLaborPriceMxn <= 0 && line.internalUnitLaborCostMxn <= 0) {
      return [];
    }
    const savedItem = savedItems.find(
      (item) => Number(item.sort_order || 0) === index
    );
    if (!savedItem) return [];
    return [
      {
        quote_item_id: savedItem.id,
        labor_activity_id: line.kind === "labor" ? line.sourceId : null,
        name_snapshot:
          line.kind === "labor" ? line.productName : "Mano de obra general",
        quantity: line.quantity,
        unit: line.laborUnit,
        internal_unit_cost_mxn: line.internalUnitLaborCostMxn,
        sale_unit_price_mxn: line.unitLaborPriceMxn,
        internal_total_mxn: roundMoney(
          line.internalUnitLaborCostMxn * line.quantity
        ),
        sale_total_mxn: line.laborTotalMxn,
        assigned_role: null,
        notes: null,
        sort_order: 0,
      },
    ];
  });

  if (laborRows.length > 0) {
    const { error: laborError } = await supabase
      .from("quote_item_labor_activities")
      .insert(laborRows);
    if (laborError) {
      throw new DraftQuoteBuilderError(
        `No se pudieron guardar las actividades de ${name}: ${laborError.message}`
      );
    }
  }
}

async function cleanupPartialDraft(
  supabase: SupabaseClient,
  quoteId: number | null,
  quoteGroupId: number
) {
  const cleanupErrors: string[] = [];

  if (quoteId !== null) {
    try {
      const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
      if (error) cleanupErrors.push(`quote ${quoteId}: ${error.message}`);
    } catch (error) {
      cleanupErrors.push(
        `quote ${quoteId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  try {
    const { error } = await supabase
      .from("quote_groups")
      .delete()
      .eq("id", quoteGroupId);
    if (error) cleanupErrors.push(`quote_group ${quoteGroupId}: ${error.message}`);
  } catch (error) {
    cleanupErrors.push(
      `quote_group ${quoteGroupId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return cleanupErrors;
}

export async function buildDraftQuote(
  supabase: SupabaseClient,
  input: DraftQuoteInput
): Promise<DraftQuoteResult> {
  const parsed = validateInput(input);
  const warnings: string[] = [];

  const productIds = [...new Set(parsed.items.map((item) => item.product_id))];
  const laborIds = [
    ...new Set(parsed.labor.map((item) => item.labor_activity_id)),
  ];

  const [{ data: settings, error: settingsError }, productResult, laborResult] =
    await Promise.all([
      supabase
        .from("company_settings")
        .select("indirect_cost_percent")
        .eq("id", true)
        .maybeSingle(),
      productIds.length > 0
        ? supabase
            .from("products")
            .select(
              "id, brand, model, name, image_url, cost_price, cost_currency, calculated_sale_price, sale_currency, pricing_method, target_margin, labor_unit_cost, labor_unit_sale_price"
            )
            .in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      laborIds.length > 0
        ? supabase
            .from("labor_activity_catalog")
            .select(
              "id, name, default_unit, default_internal_cost_mxn, default_sale_price_mxn"
            )
            .in("id", laborIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (settingsError) {
    throw new DraftQuoteBuilderError(
      `No se pudo leer settings/pricing: ${settingsError.message}`
    );
  }
  if (productResult.error) {
    throw new DraftQuoteBuilderError(
      `No se pudieron resolver los productos: ${productResult.error.message}`
    );
  }
  if (laborResult.error) {
    throw new DraftQuoteBuilderError(
      `No se pudo resolver la mano de obra: ${laborResult.error.message}`
    );
  }

  const products = (productResult.data || []) as ProductRow[];
  const productById = new Map(products.map((product) => [product.id, product]));
  const missingProducts = productIds.filter((id) => !productById.has(id));
  if (missingProducts.length > 0) {
    throw new DraftQuoteBuilderError(
      `Productos inexistentes o no accesibles: ${missingProducts.join(", ")}.`
    );
  }

  const activities = (laborResult.data || []) as LaborActivityRow[];
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity])
  );
  const missingActivities = laborIds.filter((id) => !activityById.has(id));
  if (missingActivities.length > 0) {
    throw new DraftQuoteBuilderError(
      `Actividades de mano de obra inexistentes o no accesibles: ${missingActivities.join(", ")}.`
    );
  }

  const indirectCostPercent =
    parsed.indirectCostPercent ?? Number(settings?.indirect_cost_percent || 0);
  optionalPercent(indirectCostPercent, "indirect_cost_percent");

  const exchangeRate = await fetchExchangeRate();
  const productLines = parsed.items.map((item) =>
    resolveProductLine(
      productById.get(item.product_id)!,
      item,
      indirectCostPercent,
      exchangeRate.rate,
      warnings
    )
  );
  const laborLines = parsed.labor.map((item) =>
    resolveLaborLine(activityById.get(item.labor_activity_id)!, item)
  );
  const lines = [...productLines, ...laborLines];
  const totals = calculateTotals(lines, indirectCostPercent, exchangeRate.rate);

  const matchingDraft = await findMatchingDraft(
    supabase,
    parsed.clientId,
    parsed.notes,
    indirectCostPercent,
    lines
  );
  if (matchingDraft) {
    return {
      quote_id: matchingDraft.id,
      version: Number(matchingDraft.version || 1),
      grand_total_mxn: roundMoney(Number(matchingDraft.grand_total || 0)),
      warnings: [...new Set(warnings)],
    };
  }

  const baseNumber = await nextBaseNumber(supabase);
  const { data: quoteGroup, error: groupError } = await supabase
    .from("quote_groups")
    .insert({ base_number: baseNumber })
    .select("id")
    .single();
  if (groupError || !quoteGroup) {
    throw new DraftQuoteBuilderError(
      `No se pudo crear quote_group: ${groupError?.message || "sin respuesta"}`
    );
  }

  const quoteGroupId = Number(quoteGroup.id);
  const quotePayload = {
    quote_group_id: quoteGroupId,
    quote_base_number: baseNumber,
    version: 1,
    quote_number: `${baseNumber}-V1`,
    is_latest: true,
    status: "draft",
    currency: "USD",
    client_id: parsed.clientId,
    client_project_id: null,
    exchange_rate: exchangeRate.rate,
    exchange_rate_source: exchangeRate.source,
    exchange_rate_date: exchangeRate.date,
    equipment_total: totals.equipmentTotalUsd,
    labor_total: totals.laborTotalMxn,
    discount_type: "none",
    discount_percent: 0,
    discount_amount_mxn: 0,
    indirect_cost_percent: indirectCostPercent,
    indirect_cost_mxn: totals.indirectCostMxn,
    misc_total_mxn: 0,
    subtotal_mxn: totals.subtotalMxn,
    taxable_base_mxn: totals.taxableBaseMxn,
    iva_mxn: totals.ivaMxn,
    total_mxn: totals.totalMxn,
    grand_total: totals.totalMxn,
    includes_travel_expenses_detail: false,
    travel_fuel_mxn: 0,
    travel_tolls_mxn: 0,
    travel_food_mxn: 0,
    travel_total_mxn: 0,
    is_partner_quote: false,
    commercial_partner_id: null,
    partner_equipment_discount_percent: 0,
    partner_labor_discount_percent: 0,
    partner_equipment_discount_mxn: 0,
    partner_labor_discount_mxn: 0,
    partner_total_discount_mxn: 0,
    notes: parsed.notes,
    include_diagnostic_context: false,
  };
  let createdQuoteId: number | null = null;

  try {
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert(quotePayload)
      .select("id")
      .single();
    if (quoteError || !quote) {
      throw new DraftQuoteBuilderError(
        `No se pudo crear la cotizacion: ${quoteError?.message || "sin respuesta"}`
      );
    }
    createdQuoteId = Number(quote.id);

    let sectionIndex = 0;
    if (productLines.length > 0) {
      await insertSection(
        supabase,
        createdQuoteId,
        DEFAULT_SECTION_NAME,
        sectionIndex++,
        productLines,
        exchangeRate.rate
      );
    }
    if (laborLines.length > 0) {
      await insertSection(
        supabase,
        createdQuoteId,
        LABOR_SECTION_NAME,
        sectionIndex,
        laborLines,
        exchangeRate.rate
      );
    }

    const { error: termsError } = await supabase
      .from("quote_terms_settings")
      .insert({
        quote_id: createdQuoteId,
        payment_100_equipment: true,
        labor_payment_mode: "50_50",
        payment_100_advance: false,
        is_local_guadalajara: true,
        includes_travel_expenses: false,
        includes_conduit: false,
        includes_cabling: false,
      });
    if (termsError) {
      throw new DraftQuoteBuilderError(
        `No se pudieron crear los terminos de la cotizacion: ${termsError.message}`
      );
    }

    return {
      quote_id: createdQuoteId,
      version: 1,
      grand_total_mxn: totals.totalMxn,
      warnings: [...new Set(warnings)],
    };
  } catch (error) {
    const cleanupErrors = await cleanupPartialDraft(
      supabase,
      createdQuoteId,
      quoteGroupId
    );
    const originalMessage = error instanceof Error ? error.message : String(error);
    const cleanupMessage =
      cleanupErrors.length > 0
        ? ` Limpieza compensatoria incompleta: ${cleanupErrors.join(" | ")}.`
        : "";

    throw new DraftQuoteBuilderError(`${originalMessage}${cleanupMessage}`);
  }
}
