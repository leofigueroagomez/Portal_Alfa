/**
 * Anticipo de equipos del PDF Premium.
 * La línea "Equipos" sigue en precio de lista. El anticipo resta solo el
 * descuento de encabezado (`quotes.discount_amount_mxn`), en USD con el tipo
 * de cambio del snapshot. No incluye el descuento de aliado.
 */
export function equipmentAdvanceUsd(input: {
  equipmentTotalUsd: number;
  discountMxn?: number | null;
  exchangeRate?: number | null;
}) {
  const equipment = Number(input.equipmentTotalUsd) || 0;
  const discount = Number(input.discountMxn) || 0;
  const exchangeRate = Number(input.exchangeRate);

  if (discount <= 0) return equipment;
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return equipment;

  return Math.max(0, equipment - discount / exchangeRate);
}
