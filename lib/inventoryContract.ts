// Contrato del modulo de Inventario/Almacen: validacion de entradas y
// mensajes de error. Sin dependencias de servidor para poder probarlo con
// node --test (tests/inventory.test.mjs). Las reglas duras viven en SQL
// (sql/20261025_inventory.sql); esto solo adelanta el rechazo con un mensaje claro.

export const DEFAULT_INVENTORY_LOCATION = "Almacén principal";

export type InventoryCurrency = "USD" | "MXN";

export class InventoryValidationError extends Error {}

export type InventoryEntryInput = {
  productId: number;
  location: string;
  quantity: number;
  unitCost: number;
  costCurrency: InventoryCurrency;
  exchangeRate: number | null;
  supplierId: number | null;
  invoiceReference: string | null;
  notes: string | null;
};

export type InventoryAdjustInput = {
  inventoryItemId: number;
  quantityDelta: number;
  unitCostMxn: number | null;
  notes: string;
};

export type InventoryConsumeInput = {
  projectId: number;
  purchaseLineId: number;
  inventoryItemId: number;
  quantity: number;
  purchaseDate: string;
  notes: string | null;
};

export type InventoryLeftoverInput = {
  projectId: number;
  purchaseEventId: number;
  quantity: number;
  unitCostMxn: number;
  location: string;
  notes: string | null;
};

function positiveInteger(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new InventoryValidationError(`${label} invalido.`);
  }
  return parsed;
}

function optionalPositiveInteger(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  return positiveInteger(value, label);
}

// Las cantidades se guardan en numeric(14,2), igual que project_purchase_events.
function quantity(value: unknown, { allowNegative = false } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0 || (!allowNegative && parsed < 0)) {
    throw new InventoryValidationError("Cantidad invalida.");
  }
  if (Math.abs(Math.round(parsed * 100) - parsed * 100) > 1e-6) {
    throw new InventoryValidationError("La cantidad admite maximo 2 decimales.");
  }
  return parsed;
}

function cost(value: unknown, label = "Costo unitario") {
  const parsed = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isFinite(parsed) || parsed < 0) {
    throw new InventoryValidationError(`${label} invalido.`);
  }
  return parsed;
}

function text(value: unknown, maxLength = 500) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function isoDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
    throw new InventoryValidationError("Fecha invalida.");
  }
  return raw;
}

export function parseInventoryEntryInput(raw: Record<string, unknown>): InventoryEntryInput {
  const costCurrency = String(raw.costCurrency ?? "MXN").toUpperCase();
  if (costCurrency !== "USD" && costCurrency !== "MXN") {
    throw new InventoryValidationError("Moneda invalida.");
  }
  const exchangeRate = costCurrency === "USD" ? Number(raw.exchangeRate) : null;
  if (costCurrency === "USD" && (!Number.isFinite(exchangeRate) || Number(exchangeRate) <= 0)) {
    throw new InventoryValidationError("Tipo de cambio requerido para entradas en USD.");
  }

  return {
    productId: positiveInteger(raw.productId, "Producto"),
    location: text(raw.location, 120) || DEFAULT_INVENTORY_LOCATION,
    quantity: quantity(raw.quantity),
    unitCost: cost(raw.unitCost),
    costCurrency,
    exchangeRate,
    supplierId: optionalPositiveInteger(raw.supplierId, "Proveedor"),
    invoiceReference: text(raw.invoiceReference, 120),
    notes: text(raw.notes),
  };
}

export function parseInventoryAdjustInput(raw: Record<string, unknown>): InventoryAdjustInput {
  const quantityDelta = quantity(raw.quantityDelta, { allowNegative: true });
  const notes = text(raw.notes);
  if (!notes) {
    throw new InventoryValidationError("Escribe el motivo del ajuste.");
  }
  const unitCostMxn =
    quantityDelta > 0 && raw.unitCostMxn !== "" && raw.unitCostMxn != null
      ? cost(raw.unitCostMxn, "Costo MXN")
      : null;

  return {
    inventoryItemId: positiveInteger(raw.inventoryItemId, "Existencia"),
    quantityDelta,
    unitCostMxn,
    notes,
  };
}

export function parseInventoryConsumeInput(raw: Record<string, unknown>): InventoryConsumeInput {
  return {
    projectId: positiveInteger(raw.projectId, "Proyecto"),
    purchaseLineId: positiveInteger(raw.purchaseLineId, "Linea de compra"),
    inventoryItemId: positiveInteger(raw.inventoryItemId, "Existencia"),
    quantity: quantity(raw.quantity),
    purchaseDate: isoDate(raw.purchaseDate),
    notes: text(raw.notes),
  };
}

export function parseInventoryLeftoverInput(raw: Record<string, unknown>): InventoryLeftoverInput {
  return {
    projectId: positiveInteger(raw.projectId, "Proyecto"),
    purchaseEventId: positiveInteger(raw.purchaseEventId, "Compra"),
    quantity: quantity(raw.quantity),
    unitCostMxn: cost(raw.unitCostMxn, "Costo MXN"),
    location: text(raw.location, 120) || DEFAULT_INVENTORY_LOCATION,
    notes: text(raw.notes),
  };
}

/** Costo unitario en MXN de un evento de compra (USD * TC). null si falta TC. */
export function getPurchaseEventUnitCostMxn(event: {
  unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate: number | null;
}) {
  const unitCost = Number(event.unit_cost || 0);
  if ((event.cost_currency || "USD").toUpperCase() !== "USD") return unitCost;
  const exchangeRate = Number(event.exchange_rate || 0);
  return exchangeRate > 0 ? unitCost * exchangeRate : null;
}

/** Mismo promedio ponderado que inventory_register_entry (para vista previa). */
export function getAverageCostAfterEntry(
  currentQuantity: number,
  currentAverageMxn: number,
  entryQuantity: number,
  entryUnitCostMxn: number
) {
  if (currentQuantity <= 0) return entryUnitCostMxn;
  return (
    (currentQuantity * currentAverageMxn + entryQuantity * entryUnitCostMxn) /
    (currentQuantity + entryQuantity)
  );
}

const sqlErrorMessages: Record<string, string> = {
  INVENTORY_INVALID_QUANTITY: "Cantidad invalida.",
  INVENTORY_INVALID_COST: "Costo invalido.",
  INVENTORY_INVALID_CURRENCY: "Moneda invalida.",
  INVENTORY_EXCHANGE_RATE_REQUIRED: "Tipo de cambio requerido para entradas en USD.",
  INVENTORY_SOURCE_EVENT_MISMATCH: "La compra de origen no corresponde a este producto.",
  INVENTORY_ADJUST_REASON_REQUIRED: "Escribe el motivo del ajuste.",
  INVENTORY_ITEM_NOT_FOUND: "La existencia ya no esta disponible.",
  INVENTORY_INSUFFICIENT_STOCK: "No hay existencias suficientes en almacen.",
  INVENTORY_LINE_NOT_IN_PROJECT: "La linea de compra no pertenece a este proyecto.",
  INVENTORY_EXCEEDS_PENDING: "La cantidad excede lo pendiente de comprar en la linea.",
  INVENTORY_PRODUCT_MISMATCH: "El producto de almacen no coincide con la linea de compra.",
};

export function getInventoryErrorMessage(error: unknown) {
  if (error instanceof InventoryValidationError) return error.message;
  const message =
    error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const code = Object.keys(sqlErrorMessages).find((key) => message.includes(key));
  if (code) return sqlErrorMessages[code];
  if (/inventory_\w+.*(does not exist|schema cache)|(does not exist|schema cache).*inventory_/i.test(message)) {
    return "El modulo de inventario no esta instalado en este entorno (sql/20261025_inventory.sql).";
  }
  return "No se pudo guardar el movimiento de inventario.";
}
