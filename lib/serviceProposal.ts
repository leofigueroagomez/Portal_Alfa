export type ServiceProposalQuoteItem = {
  id: number;
  quantity: number | null;
  unit_equipment_price: number | null;
  unit_equipment_price_usd?: number | null;
  sale_currency: string | null;
  unit_labor_price: number | null;
  equipment_total: number | null;
  equipment_total_usd?: number | null;
  labor_total: number | null;
  line_total: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
};

export type ServiceProposalReport = {
  labor_sale_mxn: number | null;
  service_discount_type?: string | null;
  service_discount_mxn?: number | null;
  service_discount_percent?: number | null;
};

export function getItemCurrency(item: ServiceProposalQuoteItem) {
  return (item.sale_currency || "USD").toUpperCase() === "MXN" ? "MXN" : "USD";
}

export function getItemEquipmentTotalOriginal(item: ServiceProposalQuoteItem) {
  const quantity = Number(item.quantity || 0);
  const currency = getItemCurrency(item);

  if (item.unit_equipment_price != null) {
    return Number(item.unit_equipment_price || 0) * quantity;
  }

  if (currency === "USD") {
    return Number(item.equipment_total_usd ?? item.equipment_total ?? 0);
  }

  return Math.max(
    Number(item.line_total || 0) - Number(item.labor_total || 0),
    0
  );
}

export function getItemEquipmentTotalMxn(
  item: ServiceProposalQuoteItem,
  exchangeRate: number
) {
  const currency = getItemCurrency(item);
  const safeExchangeRate = exchangeRate > 0 ? exchangeRate : 1;

  if (currency === "MXN") {
    return getItemEquipmentTotalOriginal(item);
  }

  const usdTotal =
    item.equipment_total_usd != null
      ? Number(item.equipment_total_usd || 0)
      : getItemEquipmentTotalOriginal(item);

  return usdTotal * safeExchangeRate;
}

export function getItemLineTotalMxn(
  item: ServiceProposalQuoteItem,
  exchangeRate: number
) {
  return (
    getItemEquipmentTotalMxn(item, exchangeRate) +
    Number(item.labor_total || 0)
  );
}

export function getPartsSubtotalMxn(
  items: ServiceProposalQuoteItem[],
  exchangeRate: number
) {
  return items.reduce(
    (sum, item) => sum + getItemLineTotalMxn(item, exchangeRate),
    0
  );
}

export function getServiceProposalTotals(
  report: ServiceProposalReport,
  items: ServiceProposalQuoteItem[],
  exchangeRate = 1
) {
  const serviceSubtotal = Number(report.labor_sale_mxn || 0);
  const partsSubtotal = getPartsSubtotalMxn(items, exchangeRate);
  const subtotal = serviceSubtotal + partsSubtotal;
  const rawDiscount =
    report.service_discount_type === "amount"
      ? Number(report.service_discount_mxn || 0)
      : report.service_discount_type === "percent"
        ? subtotal * (Number(report.service_discount_percent || 0) / 100)
        : 0;
  const discount = Math.min(Math.max(rawDiscount, 0), subtotal);
  const taxableBase = Math.max(subtotal - discount, 0);
  const iva = taxableBase * 0.16;
  const total = taxableBase + iva;

  return {
    serviceSubtotal,
    partsSubtotal,
    subtotal,
    discount,
    taxableBase,
    iva,
    total,
  };
}
