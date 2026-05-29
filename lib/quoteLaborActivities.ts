export type LaborActivityCatalogOption = {
  id: number;
  name: string;
  description: string | null;
  default_unit: string | null;
  default_internal_cost_mxn: number | null;
  default_sale_price_mxn: number | null;
  category: string | null;
};

export type QuoteItemLaborActivity = {
  id: string;
  labor_activity_id: number | null;
  name_snapshot: string;
  quantity: number;
  unit: string;
  internal_unit_cost_mxn: number;
  sale_unit_price_mxn: number;
  assigned_role?: string;
  notes?: string;
};

export type QuoteItemLaborHost = {
  quantity: number;
  labor_unit_cost: number | null;
  labor_unit_sale_price: number;
  labor_activities?: QuoteItemLaborActivity[];
};

export function getLaborActivityInternalTotal(activity: QuoteItemLaborActivity) {
  return (
    Number(activity.quantity || 0) *
    Number(activity.internal_unit_cost_mxn || 0)
  );
}

export function getLaborActivitySaleTotal(activity: QuoteItemLaborActivity) {
  return (
    Number(activity.quantity || 0) * Number(activity.sale_unit_price_mxn || 0)
  );
}

export function getItemLaborSaleTotal(item: QuoteItemLaborHost) {
  if (item.labor_activities?.length) {
    return item.labor_activities.reduce(
      (sum, activity) => sum + getLaborActivitySaleTotal(activity),
      0
    );
  }

  return Number(item.labor_unit_sale_price || 0) * Number(item.quantity || 0);
}

export function getItemLaborCostTotal(item: QuoteItemLaborHost) {
  if (item.labor_activities?.length) {
    return item.labor_activities.reduce(
      (sum, activity) => sum + getLaborActivityInternalTotal(activity),
      0
    );
  }

  return Number(item.labor_unit_cost || 0) * Number(item.quantity || 0);
}

export function getItemLaborUnitSalePrice(item: QuoteItemLaborHost) {
  const quantity = Number(item.quantity || 0);

  if (quantity <= 0) {
    return 0;
  }

  return getItemLaborSaleTotal(item) / quantity;
}

export function getItemLaborUnitCost(item: QuoteItemLaborHost) {
  const quantity = Number(item.quantity || 0);

  if (quantity <= 0) {
    return 0;
  }

  return getItemLaborCostTotal(item) / quantity;
}

export function createLegacyLaborActivity(
  quantity: number,
  saleUnitPrice: number | null | undefined,
  internalUnitCost: number | null | undefined
): QuoteItemLaborActivity[] {
  const salePrice = Number(saleUnitPrice || 0);
  const internalCost = Number(internalUnitCost || 0);

  if (salePrice <= 0 && internalCost <= 0) {
    return [];
  }

  return [
    {
      id: crypto.randomUUID(),
      labor_activity_id: null,
      name_snapshot: "Mano de obra general",
      quantity: Number(quantity || 1),
      unit: "pieza",
      internal_unit_cost_mxn: internalCost,
      sale_unit_price_mxn: salePrice,
      assigned_role: "",
      notes: "",
    },
  ];
}
