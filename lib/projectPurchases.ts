export type PurchaseSummaryInput = {
  supplier: string | null;
  cost_currency: string | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
  total_required_cost: number | null;
  total_purchased_cost: number | null;
  total_pending_cost: number | null;
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
