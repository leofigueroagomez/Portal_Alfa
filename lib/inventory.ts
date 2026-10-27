import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryStockRow = {
  inventory_item_id: number;
  product_id: number;
  location: string;
  quantity_available: number;
  average_cost_mxn: number;
  stock_value_mxn: number;
  last_movement_at: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  unit_name: string | null;
  product_sku: string | null;
};

export type InventoryMovementRow = {
  id: number;
  inventory_item_id: number;
  product_id: number;
  location: string;
  movement_type: "in" | "out" | "adjust";
  quantity: number;
  unit_cost: number;
  cost_currency: string;
  exchange_rate: number | null;
  unit_cost_mxn: number;
  total_cost_mxn: number;
  quantity_after: number;
  average_cost_mxn_after: number;
  source_purchase_event_id: number | null;
  client_project_id: number | null;
  project_purchase_line_id: number | null;
  project_purchase_event_id: number | null;
  supplier_id: number | null;
  invoice_reference: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
};

const STOCK_COLUMNS =
  "inventory_item_id, product_id, location, quantity_available, average_cost_mxn, stock_value_mxn, last_movement_at, product_brand, product_model, product_name, unit_name, product_sku";

const MOVEMENT_COLUMNS =
  "id, inventory_item_id, product_id, location, movement_type, quantity, unit_cost, cost_currency, exchange_rate, unit_cost_mxn, total_cost_mxn, quantity_after, average_cost_mxn_after, source_purchase_event_id, client_project_id, project_purchase_line_id, project_purchase_event_id, supplier_id, invoice_reference, notes, created_by_user_id, created_at";

function toNumberRow<T extends Record<string, unknown>>(row: T, keys: (keyof T)[]) {
  const next = { ...row };
  keys.forEach((key) => {
    if (next[key] !== null && next[key] !== undefined) {
      next[key] = Number(next[key]) as T[keyof T];
    }
  });
  return next;
}

function normalizeStock(row: InventoryStockRow) {
  return toNumberRow(row, ["quantity_available", "average_cost_mxn", "stock_value_mxn"]);
}

function normalizeMovement(row: InventoryMovementRow) {
  return toNumberRow(row, [
    "quantity",
    "unit_cost",
    "exchange_rate",
    "unit_cost_mxn",
    "total_cost_mxn",
    "quantity_after",
    "average_cost_mxn_after",
  ]);
}

export async function getInventoryStock(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("inventory_v_stock")
    .select(STOCK_COLUMNS)
    .order("product_brand", { ascending: true })
    .order("product_model", { ascending: true })
    .order("location", { ascending: true });

  if (error) throw error;
  return ((data || []) as InventoryStockRow[]).map(normalizeStock);
}

/** Existencias con saldo > 0 de los productos dados, agrupadas por producto. */
export async function getInventoryStockByProduct(
  supabase: SupabaseClient,
  productIds: number[]
) {
  const stockByProduct = new Map<number, InventoryStockRow[]>();
  if (productIds.length === 0) return stockByProduct;

  const { data, error } = await supabase
    .from("inventory_v_stock")
    .select(STOCK_COLUMNS)
    .in("product_id", productIds)
    .gt("quantity_available", 0);

  if (error) throw error;

  ((data || []) as InventoryStockRow[]).map(normalizeStock).forEach((row) => {
    stockByProduct.set(row.product_id, [...(stockByProduct.get(row.product_id) || []), row]);
  });
  return stockByProduct;
}

export async function getInventoryKardex(supabase: SupabaseClient, inventoryItemId: number) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select(MOVEMENT_COLUMNS)
    .eq("inventory_item_id", inventoryItemId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);

  if (error) throw error;
  return ((data || []) as InventoryMovementRow[]).map(normalizeMovement);
}

/** Entradas ya registradas como sobrante de cada evento de compra. */
export async function getLeftoverQuantityByPurchaseEvent(
  supabase: SupabaseClient,
  purchaseEventIds: number[]
) {
  const totals = new Map<number, number>();
  if (purchaseEventIds.length === 0) return totals;

  const { data, error } = await supabase
    .from("inventory_movements")
    .select("source_purchase_event_id, quantity")
    .eq("movement_type", "in")
    .in("source_purchase_event_id", purchaseEventIds);

  if (error) throw error;

  (data || []).forEach((row) => {
    const eventId = Number(row.source_purchase_event_id);
    totals.set(eventId, (totals.get(eventId) || 0) + Number(row.quantity || 0));
  });
  return totals;
}

/** Eventos de compra generados por "Consumir de almacen" (no se editan a mano). */
export async function getInventoryGeneratedPurchaseEventIds(
  supabase: SupabaseClient,
  purchaseEventIds: number[]
) {
  if (purchaseEventIds.length === 0) return new Set<number>();

  const { data, error } = await supabase
    .from("inventory_movements")
    .select("project_purchase_event_id")
    .in("project_purchase_event_id", purchaseEventIds);

  if (error) throw error;
  return new Set((data || []).map((row) => Number(row.project_purchase_event_id)));
}
