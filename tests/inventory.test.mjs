import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_INVENTORY_LOCATION,
  getAverageCostAfterEntry,
  getInventoryErrorMessage,
  getPurchaseEventUnitCostMxn,
  InventoryValidationError,
  parseInventoryAdjustInput,
  parseInventoryConsumeInput,
  parseInventoryEntryInput,
  parseInventoryLeftoverInput,
} from "../lib/inventoryContract.ts";
import { computePurchaseLineTotals } from "../lib/projectPurchases.ts";

test("entrada MXN usa ubicacion por defecto y no guarda TC", () => {
  const input = parseInventoryEntryInput({
    productId: "229",
    location: "  ",
    quantity: "255",
    unitCost: "6.7066",
    costCurrency: "mxn",
    exchangeRate: "18",
    supplierId: "",
  });
  assert.equal(input.productId, 229);
  assert.equal(input.location, DEFAULT_INVENTORY_LOCATION);
  assert.equal(input.costCurrency, "MXN");
  assert.equal(input.exchangeRate, null);
  assert.equal(input.supplierId, null);
});

test("entrada USD exige tipo de cambio", () => {
  assert.throws(
    () =>
      parseInventoryEntryInput({ productId: 1, quantity: 1, unitCost: 1, costCurrency: "USD" }),
    InventoryValidationError
  );
  const input = parseInventoryEntryInput({
    productId: 1,
    quantity: 1,
    unitCost: 1,
    costCurrency: "USD",
    exchangeRate: "18.25",
  });
  assert.equal(input.exchangeRate, 18.25);
});

test("cantidades: positivas, max 2 decimales; costo obligatorio", () => {
  const base = { productId: 1, unitCost: 1, costCurrency: "MXN" };
  assert.throws(() => parseInventoryEntryInput({ ...base, quantity: 0 }), /Cantidad/);
  assert.throws(() => parseInventoryEntryInput({ ...base, quantity: -1 }), /Cantidad/);
  assert.throws(() => parseInventoryEntryInput({ ...base, quantity: 1.005 }), /2 decimales/);
  assert.equal(parseInventoryEntryInput({ ...base, quantity: "12.5" }).quantity, 12.5);
  assert.throws(
    () => parseInventoryEntryInput({ productId: 1, quantity: 1, unitCost: "", costCurrency: "MXN" }),
    /Costo/
  );
});

test("ajuste: delta con signo, motivo obligatorio, costo solo si suma", () => {
  assert.throws(
    () => parseInventoryAdjustInput({ inventoryItemId: 1, quantityDelta: -2, notes: " " }),
    /motivo/
  );
  const negative = parseInventoryAdjustInput({
    inventoryItemId: 1,
    quantityDelta: "-2",
    unitCostMxn: "10",
    notes: "merma",
  });
  assert.equal(negative.quantityDelta, -2);
  assert.equal(negative.unitCostMxn, null);
  const positive = parseInventoryAdjustInput({
    inventoryItemId: 1,
    quantityDelta: 3,
    unitCostMxn: "10",
    notes: "hallazgo",
  });
  assert.equal(positive.unitCostMxn, 10);
  assert.throws(
    () => parseInventoryAdjustInput({ inventoryItemId: 1, quantityDelta: 0, notes: "x" }),
    /Cantidad/
  );
});

test("consumo y sobrante validan ids y fecha", () => {
  const consume = parseInventoryConsumeInput({
    projectId: "25",
    purchaseLineId: "444",
    inventoryItemId: "1",
    quantity: "50",
    purchaseDate: "2026-10-25",
  });
  assert.deepEqual(consume, {
    projectId: 25,
    purchaseLineId: 444,
    inventoryItemId: 1,
    quantity: 50,
    purchaseDate: "2026-10-25",
    notes: null,
  });
  assert.throws(
    () => parseInventoryConsumeInput({ ...consume, purchaseDate: "25/10/2026" }),
    /Fecha/
  );
  assert.throws(() => parseInventoryConsumeInput({ ...consume, projectId: "abc" }), /Proyecto/);

  const leftover = parseInventoryLeftoverInput({
    projectId: 25,
    purchaseEventId: 123,
    quantity: 255,
    unitCostMxn: "6.7066",
  });
  assert.equal(leftover.location, DEFAULT_INVENTORY_LOCATION);
  assert.equal(leftover.unitCostMxn, 6.7066);
});

test("costo MXN del evento de compra", () => {
  assert.equal(getPurchaseEventUnitCostMxn({ unit_cost: 6.71, cost_currency: "MXN", exchange_rate: null }), 6.71);
  assert.equal(getPurchaseEventUnitCostMxn({ unit_cost: 2, cost_currency: "USD", exchange_rate: 18 }), 36);
  assert.equal(getPurchaseEventUnitCostMxn({ unit_cost: 2, cost_currency: "USD", exchange_rate: null }), null);
});

test("costo promedio ponderado igual que inventory_register_entry", () => {
  assert.equal(getAverageCostAfterEntry(0, 99, 10, 5), 5);
  assert.equal(getAverageCostAfterEntry(10, 5, 10, 18), 11.5);
  // Genki Poke: bobina 305 m a $2,045.50 -> 255 m en almacen
  assert.equal(Math.round((2045.5 / 305) * 10000) / 10000, 6.7066);
});

test("mensajes de error de SQL", () => {
  assert.equal(
    getInventoryErrorMessage({ message: "INVENTORY_INSUFFICIENT_STOCK" }),
    "No hay existencias suficientes en almacen."
  );
  assert.match(
    getInventoryErrorMessage({ message: 'relation "public.inventory_v_stock" does not exist' }),
    /no esta instalado/
  );
  assert.equal(
    getInventoryErrorMessage({ message: "algo inesperado" }),
    "No se pudo guardar el movimiento de inventario."
  );
});

test("consumo de almacen (evento MXN sin TC) sobre linea en USD", () => {
  // Linea en USD estimada a 0.39 x 50 con TC de referencia 20; el consumo de
  // almacen genera un evento MXN sin exchange_rate (como inventory_consume_to_project).
  const line = {
    quantity_required: 50,
    unit_cost: 0.39,
    total_required_cost: 19.5,
    cost_currency: "USD",
  };
  const consumption = { quantity: 20, unit_cost: 6.71, cost_currency: "MXN", exchange_rate: null };

  const partial = computePurchaseLineTotals(line, [consumption], 20);
  assert.equal(partial.quantity_purchased, 20);
  assert.equal(partial.total_purchased_cost, 6.71); // 134.20 MXN / 20
  assert.equal(partial.total_purchased_cost_mxn, 134.2);
  assert.equal(partial.purchase_status, "partial");
  assert.equal(partial.fx_exact, false);

  const done = computePurchaseLineTotals(line, [consumption, { ...consumption, quantity: 30 }], 20);
  assert.equal(done.purchase_status, "purchased");
  assert.equal(done.total_pending_cost, 0);
});
