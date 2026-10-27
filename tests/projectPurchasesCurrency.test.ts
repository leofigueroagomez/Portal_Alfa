import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computePurchaseLineTotals,
  convertPurchaseEventCost,
  recalculatePurchaseLineTotals,
} from "../lib/projectPurchases";
import { getPurchasedMxnByLine } from "../lib/projectProfitability";

const close = (actual: number | null, expected: number) =>
  assert.ok(actual !== null && Math.abs(actual - expected) < 0.005, `${actual} != ${expected}`);

// Caso real: proyecto 18, linea 365 (USD, TC de partida 17.2054), evento 113 en MXN.
const usdLine = {
  quantity_required: 6,
  unit_cost: 9.81,
  total_required_cost: 58.86,
  cost_currency: "USD",
};
const mxnEventWithoutFx = { quantity: 6, unit_cost: 80.43, cost_currency: "MXN", exchange_rate: null };

test("linea USD con evento MXN sin TC: convierte con el TC de referencia y guarda el MXN exacto", () => {
  const totals = computePurchaseLineTotals(usdLine, [mxnEventWithoutFx], 17.2054);

  close(totals.total_purchased_cost, 482.58 / 17.2054); // 28.05 USD, no 482.58
  close(totals.total_purchased_cost_mxn, 482.58);
  assert.equal(totals.fx_exact, false);
  assert.equal(totals.missing_exchange_rate, false);
  assert.equal(totals.quantity_purchased, 6);
  assert.equal(totals.purchase_status, "purchased");
  close(totals.total_pending_cost, 0);
});

test("linea USD con evento MXN que si trae TC: usa el TC del evento", () => {
  const totals = computePurchaseLineTotals(
    usdLine,
    [{ ...mxnEventWithoutFx, exchange_rate: 20 }],
    17.2054
  );

  close(totals.total_purchased_cost, 482.58 / 20);
  close(totals.total_purchased_cost_mxn, 482.58);
  assert.equal(totals.fx_exact, true);
});

test("linea MXN con evento USD: multiplica por el TC del evento", () => {
  const mxnLine = {
    quantity_required: 10,
    unit_cost: 1_000,
    total_required_cost: 10_000,
    cost_currency: "MXN",
  };
  const totals = computePurchaseLineTotals(
    mxnLine,
    [{ quantity: 4, unit_cost: 50, cost_currency: "USD", exchange_rate: 18.5 }],
    17
  );

  close(totals.total_purchased_cost, 4 * 50 * 18.5); // 3,700 MXN, no 200
  close(totals.total_purchased_cost_mxn, 3_700);
  assert.equal(totals.fx_exact, true);
  assert.equal(totals.purchase_status, "partial");
  close(totals.total_pending_cost, 10_000 - 4 * 1_000);
});

test("misma moneda: suma directa, igual que antes", () => {
  const totals = computePurchaseLineTotals(
    usdLine,
    [
      { quantity: 2, unit_cost: 9, cost_currency: "USD", exchange_rate: 18 },
      { quantity: 1, unit_cost: 10, cost_currency: "USD", exchange_rate: 19 },
    ],
    null
  );

  close(totals.total_purchased_cost, 28);
  close(totals.total_purchased_cost_mxn, 2 * 9 * 18 + 10 * 19);
  assert.equal(totals.fx_exact, true);
});

test("evento MXN sin ningun TC: queda fuera del total USD y se marca; el MXN sigue completo", () => {
  const totals = computePurchaseLineTotals(usdLine, [mxnEventWithoutFx], null);

  close(totals.total_purchased_cost, 0);
  close(totals.total_purchased_cost_mxn, 482.58);
  assert.equal(totals.missing_exchange_rate, true);
  assert.equal(totals.fx_exact, false);
  assert.equal(
    convertPurchaseEventCost(mxnEventWithoutFx, "USD", null).fxSource,
    "missing"
  );
});

// --- recalculatePurchaseLineTotals con un cliente falso -----------------------

type Row = Record<string, unknown>;

function fakeSupabase(tables: Record<string, Row[]>, opts: { mxnColumnExists: boolean }) {
  const updates: Row[] = [];
  const client = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const inFilters: [string, unknown[]][] = [];
      let selectedColumns = "";
      let pendingUpdate: Row | null = null;
      const rows = () =>
        (tables[table] || []).filter(
          (row) =>
            filters.every(([k, v]) => row[k] === v) &&
            inFilters.every(([k, values]) => values.includes(row[k]))
        );
      const builder = {
        select(columns = "") {
          selectedColumns = columns;
          return builder;
        },
        order: () => builder,
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return builder;
        },
        in(column: string, values: unknown[]) {
          inFilters.push([column, values]);
          return builder;
        },
        update(values: Row) {
          pendingUpdate = values;
          return builder;
        },
        single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: "no rows" } }),
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        then(resolve: (value: { data: Row[] | null; error: unknown }) => void) {
          if (pendingUpdate) {
            if (!opts.mxnColumnExists && "total_purchased_cost_mxn" in pendingUpdate) {
              resolve({
                data: null,
                error: {
                  code: "PGRST204",
                  message: "Could not find the 'total_purchased_cost_mxn' column",
                },
              });
              return;
            }
            updates.push({ ...pendingUpdate });
            rows().forEach((row) => Object.assign(row, pendingUpdate));
            resolve({ data: null, error: null });
            return;
          }
          if (!opts.mxnColumnExists && selectedColumns.includes("total_purchased_cost_mxn")) {
            resolve({
              data: null,
              error: { code: "42703", message: "column total_purchased_cost_mxn does not exist" },
            });
            return;
          }
          resolve({ data: rows(), error: null });
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, updates };
}

function sampleTables(): Record<string, Row[]> {
  return {
    project_purchase_lines: [
      {
        id: 365,
        ...usdLine,
        supplier: "Syscom",
        project_operational_item_id: 331,
        total_purchased_cost: 482.58,
      },
    ],
    project_purchase_events: [{ project_purchase_line_id: 365, ...mxnEventWithoutFx, supplier: null }],
    project_operational_items: [{ id: 331, exchange_rate: 17.2054 }],
  };
}

test("recalculatePurchaseLineTotals guarda el total convertido y el MXN", async () => {
  const tables = sampleTables();
  const { client, updates } = fakeSupabase(tables, { mxnColumnExists: true });

  await recalculatePurchaseLineTotals(client, 365);

  assert.equal(updates.length, 1);
  close(updates[0].total_purchased_cost as number, 28.05);
  close(updates[0].total_purchased_cost_mxn as number, 482.58);
  assert.equal("supplier" in updates[0], false);
});

test("recalculatePurchaseLineTotals reintenta sin la columna MXN si aun no existe", async () => {
  const tables = sampleTables();
  const { client, updates } = fakeSupabase(tables, { mxnColumnExists: false });

  await recalculatePurchaseLineTotals(client, 365, { supplier: "Syscom GDL" });

  assert.equal(updates.length, 1);
  assert.equal("total_purchased_cost_mxn" in updates[0], false);
  close(updates[0].total_purchased_cost as number, 28.05);
  assert.equal(updates[0].supplier, "Syscom GDL");
});

// --- rentabilidad: comprado en MXN por linea ----------------------------------

function profitabilityTables(mxnStored: number | null | undefined): Record<string, Row[]> {
  const tables = sampleTables();
  const line = tables.project_purchase_lines[0];
  line.client_project_id = 18;
  // Valor viejo mezclado: si rentabilidad lo usara, contaria 482.58 o 28.05 segun el estado.
  line.total_purchased_cost = 28.05;
  if (mxnStored !== undefined) line.total_purchased_cost_mxn = mxnStored;
  tables.project_purchase_lines.push({
    id: 900,
    client_project_id: 18,
    cost_currency: "MXN",
    project_operational_item_id: null,
    total_purchased_cost: 1_000,
    ...(mxnStored !== undefined ? { total_purchased_cost_mxn: 1_000 } : {}),
  });
  tables.project_purchase_events.push({
    project_purchase_line_id: 900,
    quantity: 2,
    unit_cost: 500,
    cost_currency: "MXN",
    exchange_rate: null,
  });
  return tables;
}

test("rentabilidad suma total_purchased_cost_mxn cuando ya esta guardado", async () => {
  const { client } = fakeSupabase(profitabilityTables(482.58), { mxnColumnExists: true });
  const { purchasedMxnByLine, eventsMissingExchangeRate } = await getPurchasedMxnByLine(client, 18);

  close(purchasedMxnByLine.get(365) ?? null, 482.58);
  close(purchasedMxnByLine.get(900) ?? null, 1_000);
  assert.equal(eventsMissingExchangeRate, 0);
});

test("rentabilidad: respaldo desde eventos si total_purchased_cost_mxn viene null", async () => {
  const tables = profitabilityTables(null);
  tables.project_purchase_lines[1].total_purchased_cost_mxn = null;
  const { client } = fakeSupabase(tables, { mxnColumnExists: true });
  const { purchasedMxnByLine } = await getPurchasedMxnByLine(client, 18);

  close(purchasedMxnByLine.get(365) ?? null, 482.58);
  close(purchasedMxnByLine.get(900) ?? null, 1_000);
});

test("rentabilidad: respaldo desde eventos si la columna aun no existe", async () => {
  const { client } = fakeSupabase(profitabilityTables(undefined), { mxnColumnExists: false });
  const { purchasedMxnByLine } = await getPurchasedMxnByLine(client, 18);

  close(purchasedMxnByLine.get(365) ?? null, 482.58);
  close(purchasedMxnByLine.get(900) ?? null, 1_000);
});

test("rentabilidad: compra en USD sin ningun TC se cuenta como faltante", async () => {
  const tables = profitabilityTables(null);
  tables.project_purchase_lines[1].total_purchased_cost_mxn = null;
  tables.project_purchase_events.push({
    project_purchase_line_id: 900,
    quantity: 1,
    unit_cost: 10,
    cost_currency: "USD",
    exchange_rate: null,
  });
  const { client } = fakeSupabase(tables, { mxnColumnExists: true });
  const { purchasedMxnByLine, eventsMissingExchangeRate } = await getPurchasedMxnByLine(client, 18);

  close(purchasedMxnByLine.get(900) ?? null, 1_000);
  assert.equal(eventsMissingExchangeRate, 1);
});
