import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPurchaseBudgetEstimate,
  getPurchaseLineVariation,
  resolveOriginalCostCurrency,
  summarizePurchaseVariationMxn,
} from "../lib/projectPurchases";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 0.005, `${actual} != ${expected}`);

// Caso real: Komorebi (proyecto 9), linea 512, partida operativa 525.
// Cotizado: KEF Ci160ER $3,178 x 1. Sustituido en Traduccion tecnica por
// Klipsch CS-18C-WH $1,242 x 2. Compra real: 2 x $1,242 MXN.
const komorebiItem = {
  original_quantity: 1,
  original_unit_cost: 3178,
  original_cost_currency: "MXN",
};
const klipschEvent = { project_purchase_line_id: 512, quantity: 2, unit_cost: 1242, cost_currency: "MXN", exchange_rate: null };

test("Komorebi 512: el estimado de la sustitucion es el presupuesto cotizado prorrateado", () => {
  const estimate = getPurchaseBudgetEstimate({
    ...komorebiItem,
    quantity: 2,
    operational_unit_cost: 1242,
    cost_currency: "MXN",
    exchange_rate: 17.3243,
  });

  assert.equal(estimate.source, "quote_budget");
  close(estimate.total_required_cost, 3178);
  close(estimate.unit_cost, 1589);
});

test("Komorebi 512: variacion = estimado $3,178, real $2,484, ahorro $694", () => {
  // La linea guardada quedo con el costo del Klipsch (el bug): el presupuesto
  // cotizado manda sobre total_required_cost.
  const corruptedLine = {
    id: 512,
    supplier: null,
    quantity_required: 2,
    quantity_purchased: 2,
    unit_cost: 1242,
    cost_currency: "MXN",
    exchange_rate: 17.3243,
    total_required_cost: 2484,
    total_purchased_cost: 2484,
    total_pending_cost: 0,
    ...komorebiItem,
  };
  const variation = getPurchaseLineVariation(corruptedLine, [klipschEvent]);

  close(variation.estimated, 3178);
  close(variation.real, 2484);
  close(variation.variation, 694);
  close(variation.estimatedUnitCost, 1589);
  assert.equal(variation.status, "saving");

  const summary = summarizePurchaseVariationMxn(
    [corruptedLine],
    new Map([[512, [klipschEvent]]])
  );
  close(summary.estimated, 3178);
  close(summary.real, 2484);
  close(summary.saving, 694);
  close(summary.overrun, 0);
});

test("linea sin datos de presupuesto: sigue usando total_required_cost guardado", () => {
  const variation = getPurchaseLineVariation(
    {
      supplier: null,
      quantity_required: 2,
      quantity_purchased: 2,
      cost_currency: "MXN",
      total_required_cost: 3178,
      total_purchased_cost: 2484,
      total_pending_cost: 0,
    },
    [klipschEvent]
  );

  close(variation.estimated, 3178);
  close(variation.variation, 694);
});

test("cambio de cantidad del mismo producto: el presupuesto no crece con la cantidad", () => {
  const estimate = getPurchaseBudgetEstimate({
    quantity: 12,
    original_quantity: 10,
    original_unit_cost: 100,
    original_cost_currency: "USD",
    operational_unit_cost: 100,
    cost_currency: "USD",
  });

  close(estimate.total_required_cost, 1000);
  close(estimate.unit_cost, 1000 / 12);
});

test("sustitucion a otra moneda: convierte el presupuesto con el TC de la partida", () => {
  const usdToMxn = getPurchaseBudgetEstimate({
    quantity: 2,
    original_quantity: 1,
    original_unit_cost: 100,
    original_cost_currency: "USD",
    operational_unit_cost: 700,
    cost_currency: "MXN",
    exchange_rate: 17.5,
  });
  assert.equal(usdToMxn.source, "quote_budget");
  close(usdToMxn.total_required_cost, 1750);
  close(usdToMxn.unit_cost, 875);

  const mxnToUsd = getPurchaseBudgetEstimate({
    quantity: 1,
    original_quantity: 1,
    original_unit_cost: 1750,
    original_cost_currency: "MXN",
    operational_unit_cost: 90,
    cost_currency: "USD",
    exchange_rate: 17.5,
  });
  close(mxnToUsd.total_required_cost, 100);
});

test("sustitucion a otra moneda sin TC: no inventa estimado", () => {
  const estimate = getPurchaseBudgetEstimate({
    quantity: 2,
    original_quantity: 1,
    original_unit_cost: 100,
    original_cost_currency: "USD",
    operational_unit_cost: 700,
    cost_currency: "MXN",
    exchange_rate: null,
  });

  assert.equal(estimate.source, "missing_exchange_rate");
});

test("partida agregada en traduccion (sin presupuesto): cantidad x costo operativo", () => {
  const estimate = getPurchaseBudgetEstimate({
    quantity: 3,
    original_quantity: 0,
    original_unit_cost: 0,
    operational_unit_cost: 250,
    cost_currency: "MXN",
  });

  assert.equal(estimate.source, "operational_cost");
  close(estimate.total_required_cost, 750);
  close(estimate.unit_cost, 250);
});

test("moneda del presupuesto: la del producto cotizado si ya se sustituyo", () => {
  assert.equal(
    resolveOriginalCostCurrency(
      { product_id: 99, cost_currency: "MXN" },
      { product_id: 20, cost_currency: "USD" }
    ),
    "USD"
  );
  assert.equal(
    resolveOriginalCostCurrency(
      { product_id: 20, cost_currency: "MXN" },
      { product_id: 20, cost_currency: "USD" }
    ),
    "MXN"
  );
  assert.equal(resolveOriginalCostCurrency({ product_id: 5, cost_currency: "usd" }, null), "USD");
});
