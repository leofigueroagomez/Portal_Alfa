/**
 * Prorrateo fiscal de conceptos de factura.
 *
 * Reglas que este modulo garantiza:
 * - La suma de importes brutos, descuentos, base gravable e IVA por concepto
 *   sigue cuadrando con los totales de la cotizacion aprobada.
 * - Cuando la cantidad de una partida es un entero, su importe bruto en centavos
 *   es divisible exacto entre la cantidad. Asi `ValorUnitario * Cantidad = Importe`
 *   con dos decimales, que es lo que valida el SAT sobre el CFDI.
 */

export const IVA_RATE = 0.16;

// Tope defensivo para el reparto por cantidad: evita DPs enormes si alguna
// partida trae una cantidad absurda.
const MAX_GRANULARITY_TOTAL = 100000;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function moneyToCents(value: number) {
  return Math.round(roundMoney(value) * 100);
}

export function centsToMoney(cents: number) {
  return roundMoney(cents / 100);
}

export function getIvaFromTaxBase(taxBaseMxn: number) {
  return roundMoney(taxBaseMxn * IVA_RATE);
}

export function taxCentsFromBaseCents(baseCents: number) {
  return Math.round(baseCents * IVA_RATE);
}

function sumCents(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

/**
 * Granularidad en centavos que debe respetar el importe bruto de una partida.
 * Solo las cantidades enteras mayores a 1 imponen restriccion; el resto usa 1
 * (sin restriccion) porque no existe valor unitario a dos decimales que cuadre.
 */
export function getQuantityGranularity(quantity: number) {
  const value = Number(quantity);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 2) return 1;
  return value;
}

function normalizeWeights(weights: number[], fallbackWeight = 1) {
  const normalized = weights.map((weight) =>
    Math.max(Number.isFinite(weight) ? weight : 0, 0)
  );
  const totalWeight = normalized.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight > 0) return normalized;
  return weights.map(() => Math.max(fallbackWeight, 1));
}

/**
 * Reparto clasico de centavos por peso: el ultimo concepto absorbe el residuo.
 * Se sigue usando para el descuento, que no tiene restriccion por cantidad.
 */
export function distributeCentsByWeight(
  targetMxn: number,
  weights: number[],
  fallbackWeight = 1
) {
  const targetCents = moneyToCents(targetMxn);
  if (weights.length === 0) return [];

  const effectiveWeights = normalizeWeights(weights, fallbackWeight);
  const effectiveTotalWeight = effectiveWeights.reduce(
    (sum, weight) => sum + weight,
    0
  );
  let distributedCents = 0;

  return effectiveWeights.map((weight, index) => {
    if (index === effectiveWeights.length - 1) {
      return targetCents - distributedCents;
    }

    const cents = Math.round((targetCents * weight) / effectiveTotalWeight);
    distributedCents += cents;
    return cents;
  });
}

/**
 * Marca que residuos son alcanzables sumando multiplos de las granularidades
 * disponibles. Permite que el reparto greedy nunca se quede atorado con un
 * residuo que si tenia solucion.
 */
function buildReachableResiduals(remainder: number, granularities: number[]) {
  const reachable = new Array<boolean>(remainder + 1).fill(false);
  reachable[0] = true;

  const coins = [...new Set(granularities)].filter(
    (coin) => coin >= 1 && coin <= remainder
  );

  for (let value = 1; value <= remainder; value += 1) {
    for (const coin of coins) {
      if (coin <= value && reachable[value - coin]) {
        reachable[value] = true;
        break;
      }
    }
  }

  return reachable;
}

/**
 * Reparte `targetMxn` entre las partidas respetando la granularidad que impone
 * la cantidad de cada una. La suma siempre es exacta; `matchedQuantities` avisa
 * si alguna partida quedo sin poder cuadrar (caso matematicamente imposible,
 * por ejemplo dos partidas de cantidad 2 con un subtotal impar en centavos).
 */
export function distributeGrossCentsByQuantity(input: {
  targetMxn: number;
  weights: number[];
  quantities: number[];
}) {
  const { targetMxn, weights, quantities } = input;
  if (weights.length === 0) {
    return { grossCents: [] as number[], matchedQuantities: true };
  }

  const targetCents = moneyToCents(targetMxn);
  const granularities = weights.map((_, index) =>
    getQuantityGranularity(quantities[index] ?? 1)
  );
  const granularityTotal = sumCents(granularities);

  if (targetCents < 0 || granularityTotal > MAX_GRANULARITY_TOTAL) {
    const grossCents = distributeCentsByWeight(targetMxn, weights);
    return {
      grossCents,
      matchedQuantities: grossCents.every(
        (cents, index) => cents % granularities[index] === 0
      ),
    };
  }

  const effectiveWeights = normalizeWeights(weights);
  const effectiveTotalWeight = effectiveWeights.reduce(
    (sum, weight) => sum + weight,
    0
  );
  const idealCents = effectiveWeights.map(
    (weight) => (targetCents * weight) / effectiveTotalWeight
  );
  const grossCents = idealCents.map((ideal, index) =>
    Math.floor(ideal / granularities[index]) * granularities[index]
  );

  let remainder = targetCents - sumCents(grossCents);
  const reachable = buildReachableResiduals(Math.max(remainder, 0), granularities);

  while (remainder > 0) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index = 0; index < grossCents.length; index += 1) {
      const granularity = granularities[index];
      if (granularity > remainder) continue;
      if (!reachable[remainder - granularity]) continue;

      // Reduccion del error absoluto al sumarle una granularidad completa.
      const deficit = idealCents[index] - grossCents[index];
      const score = 2 * deficit - granularity;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex < 0) break;

    grossCents[bestIndex] += granularities[bestIndex];
    remainder -= granularities[bestIndex];
  }

  if (remainder !== 0) {
    // Sin solucion exacta: se conserva el subtotal (nunca se pierde el centavo)
    // y `matchedQuantities=false` deja que la validacion bloquee el guardado.
    let fallbackIndex = 0;
    for (let index = 1; index < effectiveWeights.length; index += 1) {
      if (effectiveWeights[index] > effectiveWeights[fallbackIndex]) {
        fallbackIndex = index;
      }
    }
    grossCents[fallbackIndex] += remainder;
  }

  return {
    grossCents,
    matchedQuantities: grossCents.every(
      (cents, index) => cents % granularities[index] === 0
    ),
  };
}

function greatestCommonDivisor(a: number, b: number) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y > 0) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x || 1;
}

function leastCommonMultiple(a: number, b: number) {
  return (a / greatestCommonDivisor(a, b)) * b;
}

// Un movimiento de bruto entre dos partidas tiene que ser multiplo de ambas
// cantidades para no romper la divisibilidad de ninguna. Se acota para no
// distorsionar importes solo por cuadrar un centavo de IVA: si ningun par cabe
// en el tope, el IVA queda dentro de la tolerancia de 5 centavos que ya valida
// `InvoiceForm`.
const MAX_GROSS_MOVE_CENTS = 500;

type MoveMode = "discount" | "gross";

/**
 * Mueve un centavo de base gravable entre dos partidas para cuadrar el IVA
 * total sin alterar subtotal, descuento ni base gravable globales.
 *
 * - Modo `discount`: solo mueve descuento, el bruto no se toca (preserva la
 *   divisibilidad por cantidad). Es el modo preferido.
 * - Modo `gross`: mueve bruto, en pasos multiplos comunes de las cantidades de
 *   ambas partidas, para no romper la divisibilidad de ninguna. Es el fallback
 *   cuando no hay descuento con el que compensar.
 */
function moveTaxBaseCent(input: {
  baseCents: number[];
  grossCents: number[];
  discountCents: number[];
  granularities: number[];
  direction: 1 | -1;
  mode: MoveMode;
}) {
  const { baseCents, grossCents, discountCents, granularities, direction, mode } =
    input;

  // Se guarda el mejor par (el de menor movimiento) en lugar de tomar el
  // primero, para que el modo bruto distorsione lo menos posible.
  let best: { receiver: number; donor: number; step: number } | null = null;

  for (let receiver = 0; receiver < baseCents.length; receiver += 1) {
    for (let donor = 0; donor < baseCents.length; donor += 1) {
      if (receiver === donor) continue;

      // En modo descuento el bruto no se toca, asi que basta con un centavo.
      // En modo bruto hay que mover un multiplo comun de ambas cantidades.
      const step =
        mode === "discount"
          ? 1
          : leastCommonMultiple(granularities[receiver], granularities[donor]);

      if (best && step >= best.step) continue;

      const nextReceiverBase = baseCents[receiver] + direction * step;
      const nextDonorBase = baseCents[donor] - direction * step;

      if (nextReceiverBase < 0 || nextDonorBase < 0) continue;

      if (mode === "discount") {
        const nextReceiverDiscount = discountCents[receiver] - direction * step;
        const nextDonorDiscount = discountCents[donor] + direction * step;

        if (nextReceiverDiscount < 0 || nextDonorDiscount < 0) continue;
        if (nextReceiverDiscount > grossCents[receiver]) continue;
        if (nextDonorDiscount > grossCents[donor]) continue;
      } else {
        if (step > MAX_GROSS_MOVE_CENTS) continue;

        const nextReceiverGross = grossCents[receiver] + direction * step;
        const nextDonorGross = grossCents[donor] - direction * step;

        if (nextReceiverGross < 0 || nextDonorGross < 0) continue;
        if (nextDonorGross < discountCents[donor]) continue;
        if (nextReceiverGross < discountCents[receiver]) continue;
      }

      const currentTax =
        taxCentsFromBaseCents(baseCents[receiver]) +
        taxCentsFromBaseCents(baseCents[donor]);
      const nextTax =
        taxCentsFromBaseCents(nextReceiverBase) +
        taxCentsFromBaseCents(nextDonorBase);

      if (nextTax - currentTax !== direction) continue;

      best = { receiver, donor, step };
      if (step === 1) break;
    }

    if (best?.step === 1) break;
  }

  if (!best) return false;

  const { receiver, donor, step } = best;
  baseCents[receiver] += direction * step;
  baseCents[donor] -= direction * step;

  if (mode === "discount") {
    discountCents[receiver] -= direction * step;
    discountCents[donor] += direction * step;
  } else {
    grossCents[receiver] += direction * step;
    grossCents[donor] -= direction * step;
  }

  return true;
}

export function alignTaxBaseDistribution(input: {
  grossCents: number[];
  discountCents: number[];
  quantities: number[];
  targetIvaMxn: number;
}) {
  const grossCents = [...input.grossCents];
  const discountCents = [...input.discountCents];
  const granularities = grossCents.map((_, index) =>
    getQuantityGranularity(input.quantities[index] ?? 1)
  );
  const baseCents = grossCents.map((gross, index) =>
    Math.max(gross - (discountCents[index] || 0), 0)
  );
  const targetIvaCents = moneyToCents(input.targetIvaMxn);
  let currentIvaCents = sumCents(baseCents.map(taxCentsFromBaseCents));
  let remainingIterations = Math.abs(targetIvaCents - currentIvaCents) * 50 + 100;

  while (currentIvaCents !== targetIvaCents && remainingIterations > 0) {
    const direction: 1 | -1 = currentIvaCents < targetIvaCents ? 1 : -1;
    const moved =
      moveTaxBaseCent({
        baseCents,
        grossCents,
        discountCents,
        granularities,
        direction,
        mode: "discount",
      }) ||
      moveTaxBaseCent({
        baseCents,
        grossCents,
        discountCents,
        granularities,
        direction,
        mode: "gross",
      });

    if (!moved) break;
    currentIvaCents = sumCents(baseCents.map(taxCentsFromBaseCents));
    remainingIterations -= 1;
  }

  return {
    grossCents,
    discountCents,
    baseCents,
    ivaCents: baseCents.map(taxCentsFromBaseCents),
    matchedTargetIva: currentIvaCents === targetIvaCents,
  };
}

/**
 * Valor unitario que cumple `ValorUnitario * Cantidad = Importe` cuando el
 * reparto pudo respetar la granularidad de la cantidad.
 */
export function getConceptUnitPriceMxn(grossCents: number, quantity: number) {
  const value = Number(quantity);
  if (!Number.isFinite(value) || value <= 0) return centsToMoney(grossCents);
  if (Number.isInteger(value) && grossCents % value === 0) {
    return centsToMoney(grossCents / value);
  }
  return roundMoney(centsToMoney(grossCents) / value);
}

export type ConceptUnitPriceCheck = {
  label: string;
  quantity: number;
  unitPriceMxn: number;
  grossAmountMxn: number;
};

function formatMoney(value: number) {
  return value.toFixed(2);
}

/**
 * Verifica por concepto que `ValorUnitario * Cantidad = Importe` a dos
 * decimales, que es lo que `lib/facturama.ts` manda como `UnitPrice` y
 * `Subtotal` y lo que el SAT revisa al timbrar.
 *
 * Las cantidades no enteras se omiten: no existe valor unitario a dos decimales
 * que las cuadre siempre, y hoy no hay partidas asi en el catalogo.
 */
export function getConceptUnitPriceErrors(items: ConceptUnitPriceCheck[]) {
  const errors: string[] = [];

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }

    const unitPriceCents = moneyToCents(item.unitPriceMxn);
    const grossCents = moneyToCents(item.grossAmountMxn);
    const expectedGrossCents = unitPriceCents * quantity;

    if (expectedGrossCents === grossCents) continue;

    errors.push(
      `${item.label}: valor unitario ${formatMoney(
        centsToMoney(unitPriceCents)
      )} x ${quantity} = ${formatMoney(
        centsToMoney(expectedGrossCents)
      )}, pero el importe del concepto es ${formatMoney(
        centsToMoney(grossCents)
      )}.`
    );
  }

  return errors;
}

export type ProratedConceptAmount = {
  quantity: number;
  unitPriceMxn: number;
  grossAmountMxn: number;
  discountMxn: number;
  netAmountMxn: number;
  ivaMxn: number;
  totalMxn: number;
};

/**
 * Prorratea los totales fiscales de una cotizacion aprobada entre sus partidas.
 *
 * Invariantes: la suma de brutos es `subtotalMxn`, la de descuentos es
 * `discountMxn` y la de IVA es `ivaMxn` (salvo que `matchedTargetIva` sea
 * false). Ademas cada bruto es divisible exacto entre su cantidad entera,
 * salvo que `matchedQuantities` sea false.
 */
export function buildProratedConceptAmounts(input: {
  subtotalMxn: number;
  discountMxn: number;
  ivaMxn: number;
  weights: number[];
  quantities: number[];
}) {
  const { subtotalMxn, discountMxn, ivaMxn, weights, quantities } = input;

  const { grossCents, matchedQuantities } = distributeGrossCentsByQuantity({
    targetMxn: subtotalMxn,
    weights,
    quantities,
  });
  const discountCents = distributeCentsByWeight(discountMxn, grossCents);
  const distribution = alignTaxBaseDistribution({
    grossCents,
    discountCents,
    quantities,
    targetIvaMxn: ivaMxn,
  });

  const amounts: ProratedConceptAmount[] = weights.map((_, index) => {
    const quantity = Number(quantities[index] ?? 1) || 1;
    const itemGrossCents = distribution.grossCents[index] || 0;
    const itemBaseCents = distribution.baseCents[index] || 0;
    const itemIvaCents = distribution.ivaCents[index] || 0;

    return {
      quantity,
      unitPriceMxn: getConceptUnitPriceMxn(itemGrossCents, quantity),
      grossAmountMxn: centsToMoney(itemGrossCents),
      discountMxn: centsToMoney(distribution.discountCents[index] || 0),
      netAmountMxn: centsToMoney(itemBaseCents),
      ivaMxn: centsToMoney(itemIvaCents),
      totalMxn: centsToMoney(itemBaseCents + itemIvaCents),
    };
  });

  return {
    amounts,
    matchedQuantities,
    matchedTargetIva: distribution.matchedTargetIva,
  };
}
