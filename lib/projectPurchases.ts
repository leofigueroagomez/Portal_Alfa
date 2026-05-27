export type PurchaseSummaryInput = {
  id?: number | null;
  client_project_id?: number | null;
  supplier: string | null;
  cost_currency: string | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
  unit_cost?: number | null;
  total_required_cost: number | null;
  total_purchased_cost: number | null;
  total_pending_cost: number | null;
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
  const estimatedUnitCost =
    quantityRequired > 0
      ? Number(line.total_required_cost || 0) / quantityRequired
      : Number(line.unit_cost || 0);
  let purchasedQuantity = 0;
  let estimated = 0;
  let real = 0;
  let skippedQuantity = 0;
  let missingExchangeRate = false;

  events.forEach((eventItem) => {
    const quantity = Number(eventItem.quantity || 0);
    const eventCurrency = (eventItem.cost_currency || lineCurrency).toUpperCase();

    if (quantity <= 0) return;

    if (eventCurrency !== lineCurrency) {
      if (
        lineCurrency === "MXN" &&
        eventCurrency === "USD" &&
        Number(eventItem.exchange_rate || 0) > 0
      ) {
        purchasedQuantity += quantity;
        estimated += estimatedUnitCost * quantity;
        real += Number(eventItem.unit_cost || 0) * quantity * Number(eventItem.exchange_rate);
        return;
      }

      missingExchangeRate = true;
      skippedQuantity += quantity;
      return;
    }

    purchasedQuantity += quantity;
    estimated += estimatedUnitCost * quantity;
    real += Number(eventItem.unit_cost || 0) * quantity;
  });
  const net = estimated - real;
  const realUnitCostAverage = purchasedQuantity > 0 ? real / purchasedQuantity : 0;

  return {
    currency: lineCurrency,
    estimatedUnitCost,
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

export function summarizePurchaseVariationByCurrency(
  lines: PurchaseSummaryInput[],
  eventsByLine: Map<number, PurchaseEventSummaryInput[]>
) {
  const totals = new Map<string, PurchaseVariationSummary>();

  lines.forEach((line) => {
    if (!line.id) return;

    const variation = getPurchaseLineVariation(
      line,
      eventsByLine.get(line.id) || []
    );
    const current = totals.get(variation.currency) || {
      estimated: 0,
      real: 0,
      saving: 0,
      overrun: 0,
      net: 0,
    };

    totals.set(variation.currency, {
      estimated: current.estimated + variation.estimated,
      real: current.real + variation.real,
      saving: current.saving + Math.max(variation.variation, 0),
      overrun: current.overrun + Math.max(-variation.variation, 0),
      net: current.net + variation.variation,
    });
  });

  return totals;
}
