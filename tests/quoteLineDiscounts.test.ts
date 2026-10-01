import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBrandRuleMap,
  computeLaborDiscounts,
  resolveLineDiscount,
  type QuoteDiscountDefaults,
} from "../lib/quoteLineDiscounts";

const rules = buildBrandRuleMap([
  { brand: "Sonos", max_client_discount_percent: 0, partner_discount_percent: 5 },
]);

const partnerQuote: QuoteDiscountDefaults = {
  clientPercent: 0,
  isPartnerQuote: true,
  partnerEquipmentPercent: 15,
};

test("Sonos: regla de marca, sin descuento al cliente y 5% al aliado", () => {
  const result = resolveLineDiscount(
    {
      brand: "sonos ",
      equipmentSaleMxn: 10_000,
      equipmentCostMxn: 9_000,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    { ...partnerQuote, clientPercent: 15 },
    rules
  );

  // El 15% general no aplica: el tope de Sonos es 0%.
  assert.equal(result.clientPercent, 0);
  assert.equal(result.clientSource, "brand");
  assert.equal(result.partnerPercent, 5);
  assert.equal(result.partnerDiscountMxn, 500);
  assert.equal(result.netToAlfaMxn, 9_500);
  assert.equal(result.violation, null);
});

test("Lutron: 15% cliente y 7.5% aliado sobre precio ya descontado (opcion A)", () => {
  const result = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 100_000,
      equipmentCostMxn: 50_000,
      partnerEligible: true,
      clientOverride: 15,
      partnerOverride: 7.5,
    },
    partnerQuote,
    rules
  );

  assert.equal(result.clientDiscountMxn, 15_000);
  assert.equal(result.partnerDiscountMxn, 6_375);
  assert.equal(result.netToAlfaMxn, 78_625);
  assert.equal(result.violation, null);
});

test("bloquea un override que rebasa el tope de la marca", () => {
  const result = resolveLineDiscount(
    {
      brand: "Sonos",
      equipmentSaleMxn: 10_000,
      equipmentCostMxn: 9_000,
      partnerEligible: true,
      clientOverride: 15,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );

  assert.match(result.violation || "", /maximo 0%/);
});

test("bloquea una partida que queda por debajo de su costo", () => {
  const result = resolveLineDiscount(
    {
      brand: "Sonos",
      equipmentSaleMxn: 10_000,
      equipmentCostMxn: 9_000,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: 15,
    },
    partnerQuote,
    rules
  );

  assert.match(result.violation || "", /debajo de su costo/);
});

test("sin reglas ni overrides se comporta como antes", () => {
  const eligible = resolveLineDiscount(
    {
      brand: "Hikvision",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 0,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );
  assert.equal(eligible.partnerDiscountMxn, 150);

  const notEligible = resolveLineDiscount(
    {
      brand: "Hikvision",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 0,
      partnerEligible: false,
      clientOverride: null,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );
  assert.equal(notEligible.partnerDiscountMxn, 0);

  const nonPartner = resolveLineDiscount(
    {
      brand: "Sonos",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 0,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    { clientPercent: 0, isPartnerQuote: false, partnerEquipmentPercent: 15 },
    rules
  );
  assert.equal(nonPartner.partnerDiscountMxn, 0);
});

test("mano de obra: aliado sobre el precio ya descontado", () => {
  const labor = computeLaborDiscounts(
    10_000,
    { clientPercent: 10, isPartnerQuote: true, partnerEquipmentPercent: 15 },
    25
  );
  assert.equal(labor.clientDiscountMxn, 1_000);
  assert.equal(labor.partnerDiscountMxn, 2_250);
});
