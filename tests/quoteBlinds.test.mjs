import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateQuoteBlindItemAmounts,
  calculateQuoteBlindTotals,
  isPrivateQuoteBlindImagePath,
  isQuoteBlindImagePathForQuote,
  isQuoteBlindsType,
  parseQuoteBlindItemInput,
  QuoteBlindValidationError,
} from "../lib/quoteBlindsContract.ts";
import {
  canDeleteBlindQuoteItems,
  canManageBlindQuotes,
} from "../lib/permissions.ts";

const validItem = {
  area: "Recámara principal",
  brand: "Hunter Douglas",
  model: "Duette",
  width_cm: 120,
  height_cm: 200,
  blind_type: "Celular",
  collection: "Applause",
  color: "Marfil",
  mechanism: "Motorizado",
  control: "Control remoto",
  quantity: 2,
  price_per_m2_mxn: 350,
  billable_m2_override: null,
  override_reason: null,
  reference_image_path: "quote-blinds/123/reference.webp",
  internal_notes: "Validar motor con proveedor.",
  customer_visible_note: "Incluye instalación.",
};

test("calcula m2 unitario, m2 total y total de partida", () => {
  const parsed = parseQuoteBlindItemInput(validItem);
  assert.deepEqual(calculateQuoteBlindItemAmounts(parsed), {
    calculated_m2_per_unit: 2.4,
    calculated_m2_total: 4.8,
    billable_m2: 4.8,
    unit_equipment_price_mxn: 840,
    line_total_mxn: 1680,
  });
});

test("usa ajuste manual total sólo con motivo", () => {
  const parsed = parseQuoteBlindItemInput({
    ...validItem,
    billable_m2_override: 5,
    override_reason: "Mínimo facturable del proveedor",
  });

  assert.equal(calculateQuoteBlindItemAmounts(parsed).billable_m2, 5);
  assert.equal(calculateQuoteBlindItemAmounts(parsed).line_total_mxn, 1750);
  assert.throws(
    () =>
      parseQuoteBlindItemInput({
        ...validItem,
        billable_m2_override: 5,
        override_reason: null,
      }),
    QuoteBlindValidationError
  );
});

test("calcula subtotal, IVA y total sin alterar el contrato estándar", () => {
  assert.deepEqual(
    calculateQuoteBlindTotals([
      { equipment_total: 1680, labor_total: 0 },
      { equipment_total: 320, labor_total: 0 },
    ]),
    {
      equipment_total_mxn: 2000,
      labor_total_mxn: 0,
      subtotal_mxn: 2000,
      taxable_base_mxn: 2000,
      iva_mxn: 320,
      total_mxn: 2320,
    }
  );
  assert.equal(isQuoteBlindsType("blinds"), true);
  assert.equal(isQuoteBlindsType("standard"), false);
});

test("rechaza campos requeridos, dimensiones, cantidad y precio inválidos", () => {
  for (const field of [
    "area",
    "brand",
    "model",
    "blind_type",
    "collection",
    "color",
    "mechanism",
    "control",
  ]) {
    assert.throws(
      () => parseQuoteBlindItemInput({ ...validItem, [field]: "" }),
      QuoteBlindValidationError
    );
  }

  for (const patch of [
    { width_cm: 0 },
    { height_cm: -1 },
    { quantity: 1.5 },
    { quantity: 0 },
    { price_per_m2_mxn: -1 },
    { price_per_m2_mxn: null },
  ]) {
    assert.throws(
      () => parseQuoteBlindItemInput({ ...validItem, ...patch }),
      QuoteBlindValidationError
    );
  }
});

test("acepta sólo paths privados persistentes de quote-blinds", () => {
  assert.equal(
    isPrivateQuoteBlindImagePath("quote-blinds/123/reference.webp"),
    true
  );
  assert.equal(
    isQuoteBlindImagePathForQuote("quote-blinds/123/reference.webp", 123),
    true
  );
  assert.equal(
    isQuoteBlindImagePathForQuote("quote-blinds/999/reference.webp", 123),
    false
  );
  for (const path of [
    "https://example.com/reference.webp",
    "data:image/png;base64,abc",
    "quote-blinds/../secret",
    "quote-blinds//reference.webp",
    "other-bucket/reference.webp",
  ]) {
    assert.equal(isPrivateQuoteBlindImagePath(path), false);
  }
});

test("la matriz de permisos coincide con RLS de Sprint 1", () => {
  for (const role of ["admin", "direccion", "comercial", "ingenieria"]) {
    assert.equal(canManageBlindQuotes(role), true);
  }
  for (const role of ["project_manager", "instalador", "compras", "finanzas", "client"]) {
    assert.equal(canManageBlindQuotes(role), false);
  }

  assert.equal(canDeleteBlindQuoteItems("admin"), true);
  assert.equal(canDeleteBlindQuoteItems("direccion"), true);
  assert.equal(canDeleteBlindQuoteItems("comercial"), false);
  assert.equal(canDeleteBlindQuoteItems("ingenieria"), false);
  assert.equal(canDeleteBlindQuoteItems("client"), false);
  assert.equal(canManageBlindQuotes(null), false);
  assert.equal(canManageBlindQuotes("unknown"), false);
});
