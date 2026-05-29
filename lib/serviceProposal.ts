export type ServiceProposalQuoteItem = {
  id: number;
  quantity: number | null;
  unit_equipment_price: number | null;
  sale_currency: string | null;
  unit_labor_price: number | null;
  equipment_total: number | null;
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

export function getPartsSubtotalMxn(items: ServiceProposalQuoteItem[]) {
  return items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
}

export function getServiceProposalTotals(
  report: ServiceProposalReport,
  items: ServiceProposalQuoteItem[]
) {
  const serviceSubtotal = Number(report.labor_sale_mxn || 0);
  const partsSubtotal = getPartsSubtotalMxn(items);
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
