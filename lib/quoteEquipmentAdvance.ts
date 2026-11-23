/**
 * Anticipo de equipos del PDF Premium.
 * La línea "Equipos" sigue en precio de lista. El anticipo resta solo el
 * descuento de encabezado (`quotes.discount_amount_mxn`), en USD con el tipo
 * de cambio guardado en la cotización. No incluye el descuento de aliado.
 *
 * El snapshot usa 1 cuando `exchange_rate` es null o 0. Ese 1 no es un tipo
 * de cambio: aquí se ignora y el anticipo queda en precio de lista.
 */
export function quotedExchangeRate(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}

export function equipmentAdvanceUsd(input: {
  equipmentTotalUsd: number;
  discountMxn?: number | null;
  exchangeRate?: number | null;
}) {
  const equipment = Number(input.equipmentTotalUsd) || 0;
  const discount = Number(input.discountMxn) || 0;
  const exchangeRate = quotedExchangeRate(input.exchangeRate);

  if (discount <= 0 || exchangeRate == null) return equipment;

  return Math.max(0, equipment - discount / exchangeRate);
}
