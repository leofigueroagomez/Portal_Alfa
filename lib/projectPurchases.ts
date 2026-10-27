import type { SupabaseClient } from "@supabase/supabase-js";

export type PurchaseSummaryInput = {
  id?: number | null;
  client_project_id?: number | null;
  supplier: string | null;
  cost_currency: string | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
  unit_cost?: number | null;
  exchange_rate?: number | null;
  total_required_cost: number | null;
  total_purchased_cost: number | null;
  total_pending_cost: number | null;
  /** Presupuesto cotizado de la partida operativa (ver getPurchaseBudgetEstimate). */
  original_quantity?: number | null;
  original_unit_cost?: number | null;
  original_cost_currency?: string | null;
};

export type PurchaseEventSummaryInput = {
  project_purchase_line_id: number | null;
  quantity: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate?: number | null;
};

export type PurchaseVariationSummary = {
  estimated: number;
  real: number;
  saving: number;
  overrun: number;
  net: number;
};

export function summarizePurchaseTotalsByCurrency(lines: PurchaseSummaryInput[]) {
  const totals = new Map<
    string,
    { required: number; purchased: number; pending: number }
  >();

  lines.forEach((line) => {
    const currency = (line.cost_currency || "USD").toUpperCase();
    const current = totals.get(currency) || {
      required: 0,
      purchased: 0,
      pending: 0,
    };

    totals.set(currency, {
      required: current.required + Number(line.total_required_cost || 0),
      purchased: current.purchased + Number(line.total_purchased_cost || 0),
      pending: current.pending + Number(line.total_pending_cost || 0),
    });
  });

  return totals;
}

export function summarizePendingBySupplier(lines: PurchaseSummaryInput[]) {
  const supplierTotals = new Map<string, Map<string, number>>();

  lines.forEach((line) => {
    const supplier = line.supplier?.trim() || "Sin proveedor";
    const currency = (line.cost_currency || "USD").toUpperCase();
    const currencyTotals = supplierTotals.get(supplier) || new Map<string, number>();

    currencyTotals.set(
      currency,
      Number(currencyTotals.get(currency) || 0) + Number(line.total_pending_cost || 0)
    );
    supplierTotals.set(supplier, currencyTotals);
  });

  return supplierTotals;
}

export function getPurchaseProgressPercent(lines: PurchaseSummaryInput[]) {
  const requiredQuantity = lines.reduce(
    (sum, line) => sum + Number(line.quantity_required || 0),
    0
  );
  const purchasedQuantity = lines.reduce(
    (sum, line) => sum + Number(line.quantity_purchased || 0),
    0
  );

  return requiredQuantity > 0
    ? Math.min((purchasedQuantity / requiredQuantity) * 100, 100)
    : 0;
}

export function getPurchaseLineVariation(
  line: PurchaseSummaryInput,
  events: PurchaseEventSummaryInput[]
) {
  const lineCurrency = (line.cost_currency || "USD").toUpperCase();
  const quantityRequired = Number(line.quantity_required || 0);
  // El presupuesto cotizado manda sobre total_required_cost guardado, que pudo
  // quedar sobrescrito con el costo de un producto sustituto.
  const budget = getPurchaseBudgetEstimate({
    quantity: quantityRequired,
    original_quantity: line.original_quantity,
    original_unit_cost: line.original_unit_cost,
    original_cost_currency: line.original_cost_currency,
    cost_currency: lineCurrency,
    exchange_rate: line.exchange_rate,
  });
  const estimatedUnitCost =
    budget.source === "quote_budget"
      ? budget.unit_cost
      : quantityRequired > 0
        ? Number(line.total_required_cost || 0) / quantityRequired
        : Number(line.unit_cost || 0);
  const estimatedExchangeRate = Number(line.exchange_rate || 0);
  const estimatedUnitCostMxn =
    lineCurrency === "USD"
      ? estimatedExchangeRate > 0
        ? estimatedUnitCost * estimatedExchangeRate
        : 0
      : estimatedUnitCost;
  let purchasedQuantity = 0;
  let estimated = 0;
  let real = 0;
  let skippedQuantity = 0;
  let missingExchangeRate = false;

  events.forEach((eventItem) => {
    const quantity = Number(eventItem.quantity || 0);
    const eventCurrency = (eventItem.cost_currency || lineCurrency).toUpperCase();
    const eventExchangeRate = Number(eventItem.exchange_rate || 0);

    if (quantity <= 0) return;

    if (lineCurrency === "USD" && estimatedExchangeRate <= 0) {
      missingExchangeRate = true;
      skippedQuantity += quantity;
      return;
    }

    if (eventCurrency === "USD" && eventExchangeRate <= 0) {
      missingExchangeRate = true;
      skippedQuantity += quantity;
      return;
    }

    const realUnitCostMxn =
      eventCurrency === "USD"
        ? Number(eventItem.unit_cost || 0) * eventExchangeRate
        : Number(eventItem.unit_cost || 0);

    purchasedQuantity += quantity;
    estimated += estimatedUnitCostMxn * quantity;
    real += realUnitCostMxn * quantity;
  });
  const net = estimated - real;
  const realUnitCostAverage = purchasedQuantity > 0 ? real / purchasedQuantity : 0;

  return {
    currency: "MXN",
    estimatedCurrency: lineCurrency,
    estimatedUnitCost,
    estimatedUnitCostMxn,
    estimatedExchangeRate,
    realUnitCostAverage,
    purchasedQuantity,
    estimated,
    real,
    variation: net,
    percent: estimated > 0 ? (net / estimated) * 100 : 0,
    status:
      purchasedQuantity <= 0 && skippedQuantity <= 0
        ? "no_purchases"
        : missingExchangeRate
          ? "missing_exchange_rate"
          : net > 0
            ? "saving"
            : net < 0
              ? "overrun"
              : "neutral",
    missingExchangeRate,
    skippedQuantity,
  };
}

export function summarizePurchaseVariationMxn(
  lines: PurchaseSummaryInput[],
  eventsByLine: Map<number, PurchaseEventSummaryInput[]>
) {
  const totals: PurchaseVariationSummary = {
    estimated: 0,
    real: 0,
    saving: 0,
    overrun: 0,
    net: 0,
  };

  lines.forEach((line) => {
    if (!line.id) return;

    const variation = getPurchaseLineVariation(
      line,
      eventsByLine.get(line.id) || []
    );
    totals.estimated += variation.estimated;
    totals.real += variation.real;
    totals.saving += Math.max(variation.variation, 0);
    totals.overrun += Math.max(-variation.variation, 0);
    totals.net += variation.variation;
  });

  return totals;
}

// ---------------------------------------------------------------------------
// Estimado de compra desde el presupuesto cotizado
// ---------------------------------------------------------------------------
// El estimado de una linea de compra es lo que se cotizo para la partida:
// original_quantity x original_unit_cost, en la moneda del producto cotizado.
// Si en Traduccion tecnica se sustituye el producto o cambia la cantidad, el
// presupuesto no cambia: se prorratea entre la cantidad nueva (estimado
// unitario = presupuesto / cantidad nueva). El costo real sigue saliendo de
// project_purchase_events y operational_unit_cost sigue siendo el costo del
// producto actual. Ejemplo (Komorebi, linea 512): KEF $3,178 x 1 sustituido por
// Klipsch $1,242 x 2 -> estimado $3,178 ($1,589 c/u), real $2,484, ahorro $694.
// Partidas sin presupuesto (agregadas en traduccion) usan cantidad x costo
// operativo.

export type PurchaseBudgetInput = {
  /** Cantidad requerida actual de la linea. */
  quantity: number | null;
  original_quantity?: number | null;
  original_unit_cost?: number | null;
  /** Moneda del presupuesto: la del producto cotizado. */
  original_cost_currency?: string | null;
  /** Respaldo cuando la partida no tiene presupuesto cotizado. */
  operational_unit_cost?: number | null;
  /** Moneda de la linea de compra. */
  cost_currency: string | null;
  /** TC de la partida operativa (el de la cotizacion). */
  exchange_rate?: number | null;
};

export type PurchaseBudgetEstimate = {
  /**
   * quote_budget: prorrateo del presupuesto cotizado.
   * operational_cost: sin presupuesto, cantidad x costo operativo.
   * missing_exchange_rate: el presupuesto esta en otra moneda y no hay TC; trae
   * el respaldo operativo pero no debe guardarse como estimado.
   */
  source: "quote_budget" | "operational_cost" | "missing_exchange_rate";
  unit_cost: number;
  total_required_cost: number;
};

export function getPurchaseBudgetEstimate(input: PurchaseBudgetInput): PurchaseBudgetEstimate {
  const quantity = Number(input.quantity || 0);
  const lineCurrency = normalizeCurrency(input.cost_currency);
  const budget = Number(input.original_quantity || 0) * Number(input.original_unit_cost || 0);
  const operationalUnitCost = Number(input.operational_unit_cost || 0);
  const fallback: PurchaseBudgetEstimate = {
    source: "operational_cost",
    unit_cost: operationalUnitCost,
    total_required_cost: roundMoney(quantity * operationalUnitCost),
  };

  if (budget <= 0 || quantity <= 0) return fallback;

  const budgetCurrency = normalizeCurrency(input.original_cost_currency, lineCurrency);
  let budgetInLineCurrency = budget;
  if (budgetCurrency !== lineCurrency) {
    const rate = Number(input.exchange_rate || 0);
    if (rate <= 0) return { ...fallback, source: "missing_exchange_rate" };
    budgetInLineCurrency = budgetCurrency === "USD" ? budget * rate : budget / rate;
  }

  const total = roundMoney(budgetInLineCurrency);
  return { source: "quote_budget", unit_cost: total / quantity, total_required_cost: total };
}

/**
 * Moneda del presupuesto cotizado de una partida operativa. original_unit_cost
 * se sembro con el costo del producto cotizado en su moneda, pero cost_currency
 * de la partida cambia si se sustituye por un producto en otra moneda. Si el
 * producto actual ya no es el cotizado, se usa la moneda del producto cotizado.
 */
export function resolveOriginalCostCurrency(
  item: { product_id: number | null; cost_currency: string | null },
  quoted: { product_id: number | null; cost_currency: string | null } | null | undefined
) {
  if (quoted?.product_id && quoted.product_id !== item.product_id && quoted.cost_currency) {
    return normalizeCurrency(quoted.cost_currency);
  }
  return normalizeCurrency(item.cost_currency);
}

/** Moneda del presupuesto cotizado por id de partida operativa. */
export async function loadOriginalCostCurrencies(
  supabase: SupabaseClient,
  items: {
    id: number;
    source_quote_item_id: number | null;
    product_id: number | null;
    cost_currency: string | null;
  }[]
): Promise<Map<number, string>> {
  const quoteItemIds = Array.from(
    new Set(items.map((item) => item.source_quote_item_id).filter(Boolean) as number[])
  );
  const quotedProductByQuoteItem = new Map<number, number | null>();

  if (quoteItemIds.length > 0) {
    const { data, error } = await supabase
      .from("quote_items")
      .select("id, product_id")
      .in("id", quoteItemIds);
    if (error) throw error;
    ((data || []) as { id: number; product_id: number | null }[]).forEach((row) =>
      quotedProductByQuoteItem.set(row.id, row.product_id)
    );
  }

  const quotedProductIds = Array.from(
    new Set(
      items
        .map((item) =>
          item.source_quote_item_id
            ? quotedProductByQuoteItem.get(item.source_quote_item_id)
            : null
        )
        .filter((productId) => productId !== null && productId !== undefined)
    )
  ) as number[];
  const productCurrency = new Map<number, string | null>();

  if (quotedProductIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("id, cost_currency")
      .in("id", quotedProductIds);
    if (error) throw error;
    ((data || []) as { id: number; cost_currency: string | null }[]).forEach((row) =>
      productCurrency.set(row.id, row.cost_currency)
    );
  }

  return new Map(
    items.map((item) => {
      const quotedProductId = item.source_quote_item_id
        ? quotedProductByQuoteItem.get(item.source_quote_item_id) ?? null
        : null;
      return [
        item.id,
        resolveOriginalCostCurrency(
          item,
          quotedProductId
            ? { product_id: quotedProductId, cost_currency: productCurrency.get(quotedProductId) ?? null }
            : null
        ),
      ];
    })
  );
}

export function getPurchaseLineStatus(quantityPurchased: number, quantityRequired: number) {
  if (quantityPurchased <= 0) return "pending";
  if (quantityPurchased >= quantityRequired) return "purchased";
  return "partial";
}

// ---------------------------------------------------------------------------
// Recalculo de una linea de compra desde sus eventos
// ---------------------------------------------------------------------------
// total_purchased_cost se guarda en la moneda de la LINEA. Cada evento se
// convierte antes de sumar: MXN -> USD divide entre el tipo de cambio del
// evento y USD -> MXN multiplica por el. Si el evento no trae TC (las compras
// en MXN nunca lo guardan) se usa el de referencia: el TC de la partida
// operativa, el mismo que usa getPurchaseLineVariation. Un total convertido con
// TC de referencia es aproximado, asi que tambien se guarda
// total_purchased_cost_mxn (cada evento en MXN con su propio TC) y la pantalla
// muestra ese cuando la conversion no fue exacta.

export type PurchaseLineRecalcInput = {
  quantity_required: number | null;
  unit_cost: number | null;
  total_required_cost: number | null;
  cost_currency: string | null;
  supplier?: string | null;
};

export type PurchaseLineRecalcEvent = {
  quantity: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate?: number | null;
  supplier?: string | null;
};

export type PurchaseFxSource = "same_currency" | "event" | "reference" | "missing";

export type PurchaseLineTotals = {
  quantity_purchased: number;
  /** En la moneda de la linea. */
  total_purchased_cost: number;
  /** null solo si un evento en USD no tiene ningun TC para pasarlo a MXN. */
  total_purchased_cost_mxn: number | null;
  total_pending_cost: number;
  purchase_status: string;
  supplier_from_events: string | null;
  /** true si ninguna conversion necesito el TC de referencia. */
  fx_exact: boolean;
  /** true si algun evento no se pudo convertir a la moneda de la linea (queda fuera del total). */
  missing_exchange_rate: boolean;
};

function normalizeCurrency(value: string | null | undefined, fallback = "USD") {
  return (value || fallback).toUpperCase() === "MXN" ? "MXN" : "USD";
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Costo (cantidad x costo unitario) de un evento convertido a la moneda indicada. */
export function convertPurchaseEventCost(
  eventItem: PurchaseLineRecalcEvent,
  targetCurrency: string,
  referenceExchangeRate?: number | null
): { amount: number | null; fxSource: PurchaseFxSource } {
  const target = normalizeCurrency(targetCurrency);
  const eventCurrency = normalizeCurrency(eventItem.cost_currency, target);
  const amount = Number(eventItem.quantity || 0) * Number(eventItem.unit_cost || 0);

  if (eventCurrency === target) return { amount, fxSource: "same_currency" };

  const eventRate = Number(eventItem.exchange_rate || 0);
  const referenceRate = Number(referenceExchangeRate || 0);
  const rate = eventRate > 0 ? eventRate : referenceRate;
  const fxSource: PurchaseFxSource =
    eventRate > 0 ? "event" : referenceRate > 0 ? "reference" : "missing";

  if (rate <= 0) return { amount: null, fxSource };

  return {
    amount: eventCurrency === "MXN" ? amount / rate : amount * rate,
    fxSource,
  };
}

/** Totales de una linea a partir de TODOS sus eventos de compra. */
export function computePurchaseLineTotals(
  line: PurchaseLineRecalcInput,
  events: PurchaseLineRecalcEvent[],
  referenceExchangeRate?: number | null
): PurchaseLineTotals {
  const lineCurrency = normalizeCurrency(line.cost_currency);
  const quantityRequired = Number(line.quantity_required || 0);
  const estimatedUnitCost =
    quantityRequired > 0
      ? Number(line.total_required_cost || 0) / quantityRequired
      : Number(line.unit_cost || 0);
  let quantityPurchased = 0;
  let totalPurchasedCost = 0;
  let totalPurchasedCostMxn: number | null = 0;
  let fxExact = true;
  let missingExchangeRate = false;

  events.forEach((eventItem) => {
    quantityPurchased += Number(eventItem.quantity || 0);

    const inLineCurrency = convertPurchaseEventCost(
      eventItem,
      lineCurrency,
      referenceExchangeRate
    );
    if (inLineCurrency.amount === null) {
      missingExchangeRate = true;
    } else {
      totalPurchasedCost += inLineCurrency.amount;
    }
    if (inLineCurrency.fxSource === "reference" || inLineCurrency.fxSource === "missing") {
      fxExact = false;
    }

    const inMxn = convertPurchaseEventCost(eventItem, "MXN", referenceExchangeRate);
    totalPurchasedCostMxn =
      totalPurchasedCostMxn === null || inMxn.amount === null
        ? null
        : totalPurchasedCostMxn + inMxn.amount;
  });

  return {
    quantity_purchased: quantityPurchased,
    total_purchased_cost: roundMoney(totalPurchasedCost),
    total_purchased_cost_mxn:
      totalPurchasedCostMxn === null ? null : roundMoney(totalPurchasedCostMxn),
    total_pending_cost: roundMoney(
      Math.max(Number(line.total_required_cost || 0) - quantityPurchased * estimatedUnitCost, 0)
    ),
    purchase_status: getPurchaseLineStatus(quantityPurchased, quantityRequired),
    supplier_from_events:
      events.find((eventItem) => eventItem.supplier?.trim())?.supplier || null,
    fx_exact: fxExact,
    missing_exchange_rate: missingExchangeRate,
  };
}

/** true si el error de PostgREST es porque total_purchased_cost_mxn aun no existe. */
export function isMissingMxnColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    (error.code === "PGRST204" || error.code === "42703") &&
    String(error.message || "").includes("total_purchased_cost_mxn")
  );
}

/**
 * Unica funcion que reescribe los totales de una linea de compra. Lee la linea,
 * todos sus eventos y el TC de su partida operativa, y guarda el resultado.
 * Llamarla despues de crear, editar, mover o borrar eventos de compra.
 *
 * - supplier: valor explicito para la linea. Si se omite y
 *   syncSupplierFromEvents es true, toma el primer proveedor de los eventos.
 * - Si la columna total_purchased_cost_mxn aun no existe (script
 *   sql/20261025_fix_purchase_line_totals.sql sin aplicar) reintenta sin ella.
 */
export async function recalculatePurchaseLineTotals(
  supabase: SupabaseClient,
  lineId: number,
  options: { supplier?: string | null; syncSupplierFromEvents?: boolean } = {}
): Promise<PurchaseLineTotals> {
  const { data: line, error: lineError } = await supabase
    .from("project_purchase_lines")
    .select(
      "id, quantity_required, unit_cost, total_required_cost, cost_currency, supplier, project_operational_item_id"
    )
    .eq("id", lineId)
    .single();
  if (lineError) throw lineError;

  const { data: eventsData, error: eventsError } = await supabase
    .from("project_purchase_events")
    .select("quantity, unit_cost, cost_currency, exchange_rate, supplier")
    .eq("project_purchase_line_id", lineId)
    .order("id", { ascending: true });
  if (eventsError) throw eventsError;

  let referenceExchangeRate: number | null = null;
  if (line.project_operational_item_id) {
    const { data: operationalItem, error: operationalError } = await supabase
      .from("project_operational_items")
      .select("exchange_rate")
      .eq("id", line.project_operational_item_id)
      .maybeSingle();
    if (operationalError) throw operationalError;
    referenceExchangeRate = Number(operationalItem?.exchange_rate || 0) || null;
  }

  const totals = computePurchaseLineTotals(
    line as PurchaseLineRecalcInput,
    (eventsData || []) as PurchaseLineRecalcEvent[],
    referenceExchangeRate
  );
  const update: Record<string, unknown> = {
    quantity_purchased: totals.quantity_purchased,
    total_purchased_cost: totals.total_purchased_cost,
    total_purchased_cost_mxn: totals.total_purchased_cost_mxn,
    total_pending_cost: totals.total_pending_cost,
    purchase_status: totals.purchase_status,
    updated_at: new Date().toISOString(),
  };
  if (options.supplier !== undefined) {
    update.supplier = options.supplier;
  } else if (options.syncSupplierFromEvents) {
    update.supplier = totals.supplier_from_events || line.supplier || null;
  }

  let { error: updateError } = await supabase
    .from("project_purchase_lines")
    .update(update)
    .eq("id", lineId);
  if (isMissingMxnColumnError(updateError)) {
    delete update.total_purchased_cost_mxn;
    ({ error: updateError } = await supabase
      .from("project_purchase_lines")
      .update(update)
      .eq("id", lineId));
  }
  if (updateError) throw updateError;

  return totals;
}
