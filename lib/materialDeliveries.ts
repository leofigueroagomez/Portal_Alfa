export type MaterialDeliveryItemSummary = {
  project_purchase_line_id: number | null;
  quantity_delivered: number | null;
};

export type PurchaseLineAvailabilityInput = {
  id: number;
  quantity_required: number | null;
  quantity_purchased: number | null;
  purchase_status: string | null;
};

export function getDeliveredQuantityByLine(items: MaterialDeliveryItemSummary[]) {
  return items.reduce((map, item) => {
    if (!item.project_purchase_line_id) return map;

    map.set(
      item.project_purchase_line_id,
      Number(map.get(item.project_purchase_line_id) || 0) +
        Number(item.quantity_delivered || 0)
    );

    return map;
  }, new Map<number, number>());
}

export function getAvailablePurchasedQuantity(
  line: PurchaseLineAvailabilityInput,
  deliveredQuantity: number
) {
  return Math.max(Number(line.quantity_purchased || 0) - deliveredQuantity, 0);
}

export function getPurchaseDeliveryStatus(
  line: PurchaseLineAvailabilityInput,
  deliveredQuantity: number
) {
  const quantityRequired = Number(line.quantity_required || 0);
  const quantityPurchased = Number(line.quantity_purchased || 0);

  if (quantityPurchased <= 0) return "pending";
  if (deliveredQuantity >= quantityPurchased - 0.0001) return "delivered_to_site";
  if (quantityPurchased < quantityRequired) return "partial";
  return "in_warehouse";
}
