export const GENERAL_QUOTE_ITEM_AREA = "General";
export const NEW_EQUIPMENT_SUPPLY_TYPE = "new_equipment";
export const CLIENT_EXISTING_SUPPLY_TYPE = "client_existing";

export type QuoteItemSupplyType =
  | typeof NEW_EQUIPMENT_SUPPLY_TYPE
  | typeof CLIENT_EXISTING_SUPPLY_TYPE;

export type QuoteItemPresentationFields = {
  area?: string | null;
  existing_customer_equipment?: boolean | null;
  existingCustomerEquipment?: boolean | null;
  customer_visible_note?: string | null;
  customerVisibleNote?: string | null;
};

export type QuoteItemAreaAllocation = {
  id?: string | number | null;
  area?: string | null;
  quantity: number;
  supply_type?: QuoteItemSupplyType | string | null;
  supplyType?: QuoteItemSupplyType | string | null;
  customer_visible_note?: string | null;
  customerVisibleNote?: string | null;
  sort_order?: number | null;
  sortOrder?: number | null;
};

export type QuoteItemAllocationSource = QuoteItemPresentationFields & {
  quantity?: number | string | null;
  unit_equipment_price?: number | string | null;
  unitEquipmentPrice?: number | string | null;
  unit_equipment_price_usd?: number | string | null;
  unitEquipmentPriceUsd?: number | string | null;
  equipment_total_usd?: number | string | null;
  equipmentTotalUsd?: number | string | null;
  unit_labor_price?: number | string | null;
  unitLaborPriceMxn?: number | string | null;
  labor_total?: number | string | null;
  laborTotalMxn?: number | string | null;
  line_total?: number | string | null;
  lineTotalMxn?: number | string | null;
  sale_currency?: string | null;
  saleCurrency?: string | null;
  allocations?: QuoteItemAreaAllocation[] | null;
  areaAllocations?: QuoteItemAreaAllocation[] | null;
};

export type NormalizedQuoteItemAreaAllocation = {
  id: string | number | null;
  area: string;
  quantity: number;
  supplyType: QuoteItemSupplyType;
  customerVisibleNote: string | null;
  sortOrder: number;
};

export type QuoteItemAreaBreakdownRow =
  NormalizedQuoteItemAreaAllocation & {
    equipmentTotalUsd: number;
    laborTotalMxn: number;
    lineTotalMxn: number;
  };

export type QuoteItemAreaGroup = {
  area: string;
  allocations: QuoteItemAreaBreakdownRow[];
  equipmentTotalUsd: number;
  laborTotalMxn: number;
  totalMxn: number;
};

export type QuoteItemPresentationTotals = {
  equipmentTotalUsd: number;
  laborTotalMxn: number;
  subtotalMxn: number;
};

export function normalizeQuoteItemArea(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function getQuoteItemAreaLabel(value: string | null | undefined) {
  return normalizeQuoteItemArea(value) || GENERAL_QUOTE_ITEM_AREA;
}

export function shouldGroupQuoteItemsByArea<T extends QuoteItemPresentationFields>(
  items: T[]
) {
  return items.some((item) => Boolean(normalizeQuoteItemArea(item.area)));
}

export function isExistingCustomerEquipment(
  item: QuoteItemPresentationFields
) {
  return Boolean(
    item.existing_customer_equipment || item.existingCustomerEquipment
  );
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSupplyType(
  value: QuoteItemSupplyType | string | null | undefined
): QuoteItemSupplyType {
  return value === CLIENT_EXISTING_SUPPLY_TYPE
    ? CLIENT_EXISTING_SUPPLY_TYPE
    : NEW_EQUIPMENT_SUPPLY_TYPE;
}

export function getQuoteItemAllocations(
  item: QuoteItemAllocationSource
): NormalizedQuoteItemAreaAllocation[] {
  const explicitAllocations = item.allocations || item.areaAllocations || [];
  const normalized = explicitAllocations
    .map((allocation, index) => ({
      id: allocation.id ?? null,
      area: getQuoteItemAreaLabel(allocation.area),
      quantity: toNumber(allocation.quantity),
      supplyType: normalizeSupplyType(
        allocation.supply_type || allocation.supplyType
      ),
      customerVisibleNote:
        (
          allocation.customer_visible_note ??
          allocation.customerVisibleNote ??
          ""
        ).trim() || null,
      sortOrder: Number(allocation.sort_order ?? allocation.sortOrder ?? index),
    }))
    .filter((allocation) => allocation.quantity > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      id: null,
      area: getQuoteItemAreaLabel(item.area),
      quantity: toNumber(item.quantity),
      supplyType: isExistingCustomerEquipment(item)
        ? CLIENT_EXISTING_SUPPLY_TYPE
        : (NEW_EQUIPMENT_SUPPLY_TYPE as QuoteItemSupplyType),
      customerVisibleNote:
        (item.customer_visible_note ?? item.customerVisibleNote ?? "").trim() ||
        null,
      sortOrder: 0,
    },
  ].filter((allocation) => allocation.quantity > 0);
}

export function getQuoteItemAllocationQuantityTotal(
  allocations: QuoteItemAreaAllocation[]
) {
  return allocations.reduce(
    (sum, allocation) => sum + toNumber(allocation.quantity),
    0
  );
}

export function doQuoteItemAllocationsMatchQuantity(
  itemQuantity: number | string | null | undefined,
  allocations: QuoteItemAreaAllocation[]
) {
  if (allocations.length === 0) return true;

  return (
    Math.abs(
      getQuoteItemAllocationQuantityTotal(allocations) - toNumber(itemQuantity)
    ) < 0.0001
  );
}

export function isMissingQuoteItemAreaAllocationsSchema(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message || "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("quote_item_area_allocations")
  );
}

export function hasQuoteItemAllocations(item: QuoteItemAllocationSource) {
  return Boolean((item.allocations || item.areaAllocations || []).length);
}

function getItemEquipmentUnitPriceUsd(
  item: QuoteItemAllocationSource,
  exchangeRate: number
) {
  const unitEquipmentPriceUsd =
    toNumber(item.unit_equipment_price_usd) || toNumber(item.unitEquipmentPriceUsd);

  if (unitEquipmentPriceUsd > 0) {
    return unitEquipmentPriceUsd;
  }

  const unitEquipmentPrice =
    toNumber(item.unit_equipment_price) || toNumber(item.unitEquipmentPrice);
  const saleCurrency = (item.sale_currency || item.saleCurrency || "USD").toUpperCase();
  const unitUsd =
    saleCurrency === "MXN"
      ? exchangeRate > 0
        ? unitEquipmentPrice / exchangeRate
        : 0
      : unitEquipmentPrice;

  return unitUsd;
}

function getItemLaborTotalMxn(item: QuoteItemAllocationSource) {
  const explicitLaborTotal =
    toNumber(item.labor_total) || toNumber(item.laborTotalMxn);
  if (explicitLaborTotal > 0) return explicitLaborTotal;

  const unitLaborPrice =
    toNumber(item.unit_labor_price) || toNumber(item.unitLaborPriceMxn);
  return unitLaborPrice * toNumber(item.quantity);
}

export function getQuoteItemAreaBreakdown(
  item: QuoteItemAllocationSource,
  exchangeRate: number
): QuoteItemAreaBreakdownRow[] {
  const itemQuantity = toNumber(item.quantity);
  const allocations = getQuoteItemAllocations(item);
  const laborTotalMxn = getItemLaborTotalMxn(item);
  const hasExplicitAllocations = hasQuoteItemAllocations(item);
  const newEquipmentQuantity = allocations.reduce(
    (sum, allocation) =>
      allocation.supplyType === CLIENT_EXISTING_SUPPLY_TYPE
        ? sum
        : sum + allocation.quantity,
    0
  );
  const equipmentBillableQuantity = hasExplicitAllocations
    ? newEquipmentQuantity
    : isExistingCustomerEquipment(item)
      ? 0
      : itemQuantity;
  const equipmentTotalUsd =
    getItemEquipmentUnitPriceUsd(item, exchangeRate) * equipmentBillableQuantity;

  if (itemQuantity <= 0) return [];

  return allocations.map((allocation) => {
    const laborRatio = allocation.quantity / itemQuantity;
    const equipmentRatio =
      hasExplicitAllocations && newEquipmentQuantity > 0
        ? allocation.quantity / newEquipmentQuantity
        : allocation.quantity / itemQuantity;
    const allocationEquipmentTotalUsd =
      allocation.supplyType === CLIENT_EXISTING_SUPPLY_TYPE
        ? 0
        : equipmentTotalUsd * equipmentRatio;
    const allocationLaborTotalMxn = laborTotalMxn * laborRatio;

    return {
      ...allocation,
      equipmentTotalUsd: allocationEquipmentTotalUsd,
      laborTotalMxn: allocationLaborTotalMxn,
      lineTotalMxn:
        allocationEquipmentTotalUsd * exchangeRate + allocationLaborTotalMxn,
    };
  });
}

export function getQuoteItemAreaGroups<T extends QuoteItemAllocationSource>(
  items: T[],
  exchangeRate: number
): QuoteItemAreaGroup[] {
  const groups = new Map<string, QuoteItemAreaGroup>();

  for (const item of items) {
    for (const allocation of getQuoteItemAreaBreakdown(item, exchangeRate)) {
      const current =
        groups.get(allocation.area) || {
          area: allocation.area,
          allocations: [],
          equipmentTotalUsd: 0,
          laborTotalMxn: 0,
          totalMxn: 0,
        };

      current.allocations.push(allocation);
      current.equipmentTotalUsd += allocation.equipmentTotalUsd;
      current.laborTotalMxn += allocation.laborTotalMxn;
      current.totalMxn += allocation.lineTotalMxn;
      groups.set(allocation.area, current);
    }
  }

  return Array.from(groups.values());
}

export function getQuoteItemsPresentationTotals<
  T extends QuoteItemAllocationSource,
>(items: T[], exchangeRate: number): QuoteItemPresentationTotals {
  return items.reduce<QuoteItemPresentationTotals>(
    (totals, item) => {
      for (const allocation of getQuoteItemAreaBreakdown(item, exchangeRate)) {
        totals.equipmentTotalUsd += allocation.equipmentTotalUsd;
        totals.laborTotalMxn += allocation.laborTotalMxn;
        totals.subtotalMxn += allocation.lineTotalMxn;
      }

      return totals;
    },
    {
      equipmentTotalUsd: 0,
      laborTotalMxn: 0,
      subtotalMxn: 0,
    }
  );
}

export function shouldGroupQuoteItemsByPresentation<
  T extends QuoteItemAllocationSource,
>(items: T[]) {
  return items.some(
    (item) =>
      hasQuoteItemAllocations(item) || Boolean(normalizeQuoteItemArea(item.area))
  );
}
