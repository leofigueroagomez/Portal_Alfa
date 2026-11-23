import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrency } from "../lib/format";
import { equipmentAdvanceUsd } from "../lib/quoteEquipmentAdvance";

// Lectura de producción, 2026-11-23, cotizaciones en borrador.
// ALFA-0214-V1 y ALFA-0215-V1 comparten lista y tipo de cambio.
const listUsd = 16781.7;
const exchangeRate = 19.113379;

test("ALFA-0214-V1 (305) anticipa el neto, no la lista", () => {
  const advance = equipmentAdvanceUsd({
    equipmentTotalUsd: listUsd,
    discountMxn: 31910.74,
    exchangeRate,
  });

  assert.equal(formatCurrency(advance, "USD"), "USD 15,112.15");
  assert.equal(formatCurrency(listUsd, "USD"), "USD 16,781.70");
});

test("ALFA-0215-V1 (306) anticipa el neto con su descuento de encabezado", () => {
  const advance = equipmentAdvanceUsd({
    equipmentTotalUsd: listUsd,
    discountMxn: 75236.56,
    exchangeRate,
  });

  assert.equal(formatCurrency(advance, "USD"), "USD 12,845.37");
});

test("sin descuento o sin tipo de cambio el anticipo queda en precio de lista", () => {
  assert.equal(
    equipmentAdvanceUsd({
      equipmentTotalUsd: listUsd,
      discountMxn: 0,
      exchangeRate,
    }),
    listUsd
  );
  assert.equal(
    equipmentAdvanceUsd({
      equipmentTotalUsd: listUsd,
      discountMxn: null,
      exchangeRate,
    }),
    listUsd
  );
  assert.equal(
    equipmentAdvanceUsd({
      equipmentTotalUsd: listUsd,
      discountMxn: 31910.74,
      exchangeRate: 0,
    }),
    listUsd
  );
  assert.equal(
    equipmentAdvanceUsd({
      equipmentTotalUsd: listUsd,
      discountMxn: 31910.74,
      exchangeRate: null,
    }),
    listUsd
  );
});

test("el anticipo no baja de cero y no recibe el descuento de aliado", () => {
  assert.equal(
    equipmentAdvanceUsd({
      equipmentTotalUsd: 100,
      discountMxn: 19.113379 * 250,
      exchangeRate,
    }),
    0
  );

  const withHeaderOnly = equipmentAdvanceUsd({
    equipmentTotalUsd: listUsd,
    discountMxn: 31910.74,
    exchangeRate,
  });
  assert.equal(formatCurrency(withHeaderOnly, "USD"), "USD 15,112.15");
});
