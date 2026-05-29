export type ContractorMovementType =
  | "advance_payment"
  | "work_charge"
  | "adjustment"
  | "refund";

export function getContractorMovementLabel(type: string | null | undefined) {
  if (type === "advance_payment") return "Abono";
  if (type === "work_charge") return "Trabajo aplicado";
  if (type === "adjustment") return "Ajuste";
  if (type === "refund") return "Devolucion";
  return "Movimiento";
}

export function getContractorPaymentStatusLabel(status: string | null | undefined) {
  if (status === "applied_to_balance") return "Aplicado a saldo";
  if (status === "paid_direct") return "Pagado directo";
  if (status === "cancelled") return "Cancelado";
  return "Pendiente";
}

export function getSignedContractorMovementAmount(
  type: string | null | undefined,
  amount: number | string | null | undefined
) {
  const numericAmount = Number(amount || 0);

  if (type === "work_charge" || type === "refund") {
    return -Math.abs(numericAmount);
  }

  return numericAmount;
}

export function getContractorBalance(
  movements: { movement_type: string | null; amount_mxn: number | string | null }[]
) {
  return movements.reduce(
    (sum, movement) =>
      sum +
      getSignedContractorMovementAmount(
        movement.movement_type,
        movement.amount_mxn
      ),
    0
  );
}

export function getContractorBalanceLabel(balance: number) {
  if (balance > 0.0001) return "A favor del contratista";
  if (balance < -0.0001) return "ALFA debe";
  return "Liquidado";
}
