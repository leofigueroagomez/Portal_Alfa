import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBrandRuleMap,
  resolveLineDiscount,
  type QuoteDiscountDefaults,
} from "../lib/quoteLineDiscounts";

const rules = buildBrandRuleMap([
  { brand: "Sonos", max_client_discount_percent: 0, partner_profit_share_percent: null },
]);

const partnerQuote: QuoteDiscountDefaults = {
  clientPercent: 0,
  isPartnerQuote: true,
  partnerProfitSharePercent: 50,
};

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test("Sonos: tope 0% al cliente aunque la cotizacion tenga 15%; utilidad 10% -> 5% y 5%", () => {
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

  assert.equal(result.clientPercent, 0);
  assert.equal(result.clientSource, "brand");
  close(result.equipmentProfitMxn, 1_000);
  close(result.partnerDiscountMxn, 500);
  close(result.netToAlfaMxn, 9_500);
  assert.equal(result.violation, null);
});

test("Lutron 30% margen, 15% al cliente: queda 15% de utilidad -> 7.5% del precio para cada uno", () => {
  const result = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 100_000,
      equipmentCostMxn: 70_000,
      partnerEligible: true,
      clientOverride: 15,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );

  close(result.clientDiscountMxn, 15_000);
  close(result.equipmentProfitMxn, 15_000);
  close(result.partnerDiscountMxn, 7_500);
  close(result.netToAlfaMxn, 77_500);
  assert.equal(result.violation, null);
});

test("caso real PJ24BMNL21P (27% de margen): el aliado recibe la mitad de la utilidad, no 7.5% del precio", () => {
  const rate = 18.077867;
  const result = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 51.84 * rate,
      equipmentCostMxn: 37.74 * rate,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    { ...partnerQuote, clientPercent: 15 },
    rules
  );

  const clientPrice = 51.84 * rate * 0.85;
  const profit = clientPrice - 37.74 * rate;
  close(result.partnerDiscountMxn, profit / 2);
  assert.equal(result.violation, null);
});

test("mano de obra 50% de margen sin descuento: el aliado se lleva 25% del precio", () => {
  const result = resolveLineDiscount(
    {
      brand: "Hikvision",
      equipmentSaleMxn: 0,
      equipmentCostMxn: 0,
      laborSaleMxn: 10_000,
      laborCostMxn: 5_000,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );

  close(result.laborPartnerDiscountMxn, 2_500);
  assert.equal(result.violation, null);
});

test("override por partida del % de utilidad", () => {
  const result = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 700,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: 40,
    },
    partnerQuote,
    rules
  );
  assert.equal(result.partnerSource, "line");
  close(result.partnerDiscountMxn, 120);
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

test("bloquea cuando el descuento al cliente deja el equipo bajo costo; el aliado no recibe nada", () => {
  const result = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 900,
      partnerEligible: true,
      clientOverride: 15,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );
  assert.match(result.violation || "", /debajo de su costo/);
  assert.equal(result.partnerDiscountMxn, 0);
});

test("bloquea equipo o mano de obra sin costo en cotizacion de aliado", () => {
  const noEquipmentCost = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 0,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );
  assert.match(noEquipmentCost.violation || "", /no tiene costo capturado/);

  const noLaborCost = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 0,
      equipmentCostMxn: 0,
      laborSaleMxn: 300,
      laborCostMxn: 0,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );
  assert.match(noLaborCost.violation || "", /mano de obra no tiene costo interno/);
});

test("sin aliado no hay reparto ni bloqueo por falta de costo", () => {
  const result = resolveLineDiscount(
    {
      brand: "Lutron",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 0,
      laborSaleMxn: 300,
      laborCostMxn: 0,
      partnerEligible: true,
      clientOverride: null,
      partnerOverride: null,
    },
    { clientPercent: 0, isPartnerQuote: false, partnerProfitSharePercent: 50 },
    rules
  );
  assert.equal(result.partnerDiscountMxn, 0);
  assert.equal(result.laborPartnerDiscountMxn, 0);
  assert.equal(result.violation, null);
});

test("producto no elegible no reparte utilidad de equipo", () => {
  const result = resolveLineDiscount(
    {
      brand: "Hikvision",
      equipmentSaleMxn: 1_000,
      equipmentCostMxn: 700,
      partnerEligible: false,
      clientOverride: null,
      partnerOverride: null,
    },
    partnerQuote,
    rules
  );
  assert.equal(result.partnerDiscountMxn, 0);
  assert.equal(result.partnerSource, "not_eligible");
});
