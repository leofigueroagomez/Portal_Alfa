import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProratedConceptAmounts,
  distributeGrossCentsByQuantity,
  getConceptUnitPriceErrors,
  moneyToCents,
} from "../invoiceProration";

function sum(values: number[]) {
  return values.reduce((total, value) => total + moneyToCents(value), 0);
}

function assertUnitPricesMatchGross(
  amounts: Array<{
    quantity: number;
    unitPriceMxn: number;
    grossAmountMxn: number;
  }>
) {
  const errors = getConceptUnitPriceErrors(
    amounts.map((amount, index) => ({
      label: `Concepto ${index}`,
      quantity: amount.quantity,
      unitPriceMxn: amount.unitPriceMxn,
      grossAmountMxn: amount.grossAmountMxn,
    }))
  );

  assert.deepEqual(errors, []);
}

/**
 * Cotizacion 178 (ALFA-0131-V1, proyecto 85), datos reales:
 *
 *   subtotal_mxn        6129.48
 *   partner_total_discount_mxn 1159.42
 *   iva_mxn              795.21
 *   total_mxn           5765.26
 *
 * Partidas (line_total, cantidad):
 *   Planet GT-802S            3304.86  x2
 *   Linked Pro EF-150-SC      2731.82  x1
 *   Linked Pro LP-UT6A-100    92.79    x2
 *
 * El prorrateo anterior le asignaba 3304.87 al Planet, y 3304.87 / 2 = 1652.435
 * -> 1652.43 con 1652.43 x 2 = 3304.86. Un centavo de descuadre que el SAT
 * puede rechazar al timbrar, porque `lib/facturama.ts` manda UnitPrice y
 * Subtotal por concepto.
 */
const QUOTE_178 = {
  subtotalMxn: 6129.48,
  discountMxn: 1159.42,
  ivaMxn: 795.21,
  totalMxn: 5765.26,
  weights: [3304.86, 2731.82, 92.79],
  quantities: [2, 1, 2],
};

test("cotizacion 178: cada concepto cumple valor unitario x cantidad = importe", () => {
  const { amounts, matchedQuantities, matchedTargetIva } =
    buildProratedConceptAmounts(QUOTE_178);

  assert.equal(matchedQuantities, true);
  assert.equal(matchedTargetIva, true);
  assertUnitPricesMatchGross(amounts);

  // La partida del Planet ya no se lleva el centavo suelto.
  assert.equal(amounts[0].quantity, 2);
  assert.equal(amounts[0].grossAmountMxn, 3304.86);
  assert.equal(amounts[0].unitPriceMxn, 1652.43);
});

test("cotizacion 178: los totales siguen siendo los de la cotizacion aprobada", () => {
  const { amounts } = buildProratedConceptAmounts(QUOTE_178);

  assert.equal(sum(amounts.map((a) => a.grossAmountMxn)), moneyToCents(6129.48));
  assert.equal(sum(amounts.map((a) => a.discountMxn)), moneyToCents(1159.42));
  assert.equal(sum(amounts.map((a) => a.ivaMxn)), moneyToCents(795.21));

  // Base gravable = bruto - descuento por concepto, y la suma cuadra.
  for (const amount of amounts) {
    assert.equal(
      moneyToCents(amount.netAmountMxn),
      moneyToCents(amount.grossAmountMxn) - moneyToCents(amount.discountMxn)
    );
    assert.equal(
      moneyToCents(amount.totalMxn),
      moneyToCents(amount.netAmountMxn) + moneyToCents(amount.ivaMxn)
    );
  }

  const netTotal = sum(amounts.map((a) => a.netAmountMxn));
  assert.equal(netTotal, moneyToCents(6129.48) - moneyToCents(1159.42));

  // Diferencia contra el total aprobado dentro de la tolerancia de 5 centavos
  // que ya aplica InvoiceForm (la cotizacion trae 1 centavo de arrastre propio:
  // 6129.48 - 1159.42 = 4970.06, pero guarda taxable_base_mxn = 4970.05).
  const invoiceTotal = sum(amounts.map((a) => a.totalMxn));
  assert.ok(
    Math.abs(invoiceTotal - moneyToCents(QUOTE_178.totalMxn)) <= 5,
    `total ${invoiceTotal} vs cotizacion ${moneyToCents(QUOTE_178.totalMxn)}`
  );
});

test("el prorrateo anterior si producia el descuadre de la cotizacion 178", () => {
  // Reparto clasico por peso con el ultimo concepto absorbiendo el residuo:
  // le tocaban 3304.87 al Planet.
  const legacyErrors = getConceptUnitPriceErrors([
    {
      label: "Planet GT-802S",
      quantity: 2,
      unitPriceMxn: 1652.43,
      grossAmountMxn: 3304.87,
    },
  ]);

  assert.equal(legacyErrors.length, 1);
  assert.match(legacyErrors[0], /3304\.86/);
  assert.match(legacyErrors[0], /3304\.87/);
});

test("sin descuento el IVA se cuadra sin romper la divisibilidad por cantidad", () => {
  const { amounts, matchedQuantities, matchedTargetIva } =
    buildProratedConceptAmounts({
      subtotalMxn: 6129.48,
      discountMxn: 0,
      ivaMxn: 980.72,
      weights: [3304.86, 2731.82, 92.79],
      quantities: [2, 1, 2],
    });

  assert.equal(matchedQuantities, true);
  assert.equal(matchedTargetIva, true);
  assertUnitPricesMatchGross(amounts);
  assert.equal(sum(amounts.map((a) => a.grossAmountMxn)), moneyToCents(6129.48));
  assert.equal(sum(amounts.map((a) => a.ivaMxn)), moneyToCents(980.72));
});

test("sin descuento y con todas las cantidades > 1 el IVA se cuadra por multiplos", () => {
  // Sin descuento no hay centavos de descuento que mover, y ninguna partida
  // admite mover un solo centavo de bruto: el ajuste se hace en pasos
  // multiplos comunes de las cantidades (aqui 4 centavos).
  const { amounts, matchedQuantities, matchedTargetIva } =
    buildProratedConceptAmounts({
      subtotalMxn: 40.56,
      discountMxn: 0,
      ivaMxn: 6.49,
      weights: [2028, 2028],
      quantities: [2, 4],
    });

  assert.equal(matchedQuantities, true);
  assert.equal(matchedTargetIva, true);
  assertUnitPricesMatchGross(amounts);
  assert.equal(sum(amounts.map((a) => a.grossAmountMxn)), moneyToCents(40.56));
  assert.equal(sum(amounts.map((a) => a.ivaMxn)), moneyToCents(6.49));
});

test("el reparto no se atora cuando el residuo solo cabe en una granularidad grande", () => {
  // Residuo 3 con granularidades 2 y 3: elegir el 2 primero dejaria 1 centavo
  // imposible de colocar.
  const { grossCents, matchedQuantities } = distributeGrossCentsByQuantity({
    targetMxn: 100.03,
    weights: [50, 50],
    quantities: [2, 3],
  });

  assert.equal(matchedQuantities, true);
  assert.equal(grossCents[0] + grossCents[1], 10003);
  assert.equal(grossCents[0] % 2, 0);
  assert.equal(grossCents[1] % 3, 0);
});

test("caso sin solucion: se conserva el subtotal y se marca el descuadre", () => {
  // Dos partidas de cantidad 2 con subtotal impar en centavos: no existe
  // reparto valido, asi que el subtotal se respeta y la validacion bloquea.
  const { grossCents, matchedQuantities } = distributeGrossCentsByQuantity({
    targetMxn: 100.01,
    weights: [50, 50],
    quantities: [2, 2],
  });

  assert.equal(matchedQuantities, false);
  assert.equal(grossCents[0] + grossCents[1], 10001);
});

test("cantidades no enteras no bloquean el guardado", () => {
  const errors = getConceptUnitPriceErrors([
    {
      label: "Cable por metro",
      quantity: 1.5,
      unitPriceMxn: 33.33,
      grossAmountMxn: 50,
    },
  ]);

  assert.deepEqual(errors, []);
});

test("cantidad 1 y concepto de servicio pasan la validacion", () => {
  assert.deepEqual(
    getConceptUnitPriceErrors([
      {
        label: "Servicio tecnico",
        quantity: 1,
        unitPriceMxn: 2400,
        grossAmountMxn: 2400,
      },
    ]),
    []
  );
});
