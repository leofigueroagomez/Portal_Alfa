// Pago de proyecto (project_payments) que respalda un complemento de pago
// (CFDI tipo P). Todo complemento timbrado debe quedar ligado a un pago para que
// el cobrado del proyecto (estado de cuenta, Vigia VTA-03) refleje el cobro.
// Funciones puras: se usan en server actions, en la UI y en tests.

export type ComplementPaymentCategory = "equipment" | "labor";

export type ComplementPaymentMode = "create" | "link";

export type PaymentCandidate = {
  id: number;
  payment_date: string | null;
  amount_mxn: number | null;
  payment_reference: string | null;
};

export type DuplicatePaymentCandidate = PaymentCandidate & {
  matchedBy: Array<"date_amount" | "reference">;
};

export type NewComplementPaymentRow = {
  client_project_id: number;
  payment_date: string;
  payment_method: string;
  payment_reference: string | null;
  payment_category: ComplementPaymentCategory;
  currency: "MXN";
  amount: number;
  exchange_rate: null;
  amount_mxn: number;
  payment_form_code: string;
  notes: string;
  created_by_user_id: string | null;
};

// Tolerancia para considerar "mismo monto" al buscar duplicados (pesos MXN).
export const DUPLICATE_AMOUNT_TOLERANCE_MXN = 1;

// Referencias genericas como "SPEI" o "EFECTIVO" no identifican un pago; solo
// se compara la referencia cuando tiene al menos este numero de caracteres.
export const MIN_REFERENCE_LENGTH_FOR_MATCH = 6;

const paymentMethodBySatForm: Record<string, string> = {
  "01": "Efectivo",
  "02": "Cheque",
  "03": "Transferencia",
  "04": "Tarjeta de credito",
  "05": "Monedero electronico",
  "06": "Dinero electronico",
  "08": "Vales de despensa",
  "12": "Dacion en pago",
  "13": "Pago por subrogacion",
  "14": "Pago por consignacion",
  "15": "Condonacion",
  "17": "Compensacion",
  "23": "Novacion",
  "24": "Confusion",
  "25": "Remision de deuda",
  "26": "Prescripcion o caducidad",
  "27": "A satisfaccion del acreedor",
  "28": "Tarjeta de debito",
  "29": "Tarjeta de servicios",
  "30": "Aplicacion de anticipos",
  "31": "Intermediario pagos",
};

export function getPaymentMethodFromSatForm(code: string | null | undefined) {
  const normalized = (code || "").trim();
  return paymentMethodBySatForm[normalized] || (normalized ? `Forma SAT ${normalized}` : "");
}

export function normalizePaymentReference(value: string | null | undefined) {
  return (value || "").trim().toUpperCase().replace(/\s+/g, " ");
}

function roundMxn(value: number) {
  return Math.round(value * 100) / 100;
}

export function getComplementPaymentNotes(complementId: number, invoiceFolio: string | null) {
  return `Complemento P #${complementId} / ${invoiceFolio || "sin folio"}`;
}

export function findDuplicatePaymentCandidates(
  payments: PaymentCandidate[],
  input: {
    paymentDate: string;
    amountMxn: number;
    paymentReference?: string | null;
    excludePaymentIds?: Iterable<number>;
  }
): DuplicatePaymentCandidate[] {
  const excluded = new Set(Array.from(input.excludePaymentIds || [], Number));
  const reference = normalizePaymentReference(input.paymentReference);
  const compareReference = reference.length >= MIN_REFERENCE_LENGTH_FOR_MATCH;

  return payments.flatMap((payment) => {
    if (excluded.has(Number(payment.id))) return [];

    const matchedBy: DuplicatePaymentCandidate["matchedBy"] = [];
    const sameDate = Boolean(payment.payment_date) && payment.payment_date === input.paymentDate;
    const amountDiff = Math.abs(Number(payment.amount_mxn || 0) - Number(input.amountMxn || 0));
    if (sameDate && amountDiff <= DUPLICATE_AMOUNT_TOLERANCE_MXN) {
      matchedBy.push("date_amount");
    }
    if (compareReference && normalizePaymentReference(payment.payment_reference) === reference) {
      matchedBy.push("reference");
    }

    return matchedBy.length > 0 ? [{ ...payment, matchedBy }] : [];
  });
}

export function buildPaymentFromComplement(input: {
  complementId: number;
  invoiceFolio: string | null;
  clientProjectId: number;
  paymentDate: string;
  paidAmountMxn: number;
  paymentFormCode: string;
  paymentReference: string | null;
  paymentCategory?: ComplementPaymentCategory;
  createdByUserId: string | null;
}): NewComplementPaymentRow {
  const amountMxn = roundMxn(Number(input.paidAmountMxn));

  return {
    client_project_id: Number(input.clientProjectId),
    payment_date: input.paymentDate,
    payment_method: getPaymentMethodFromSatForm(input.paymentFormCode),
    payment_reference: input.paymentReference?.trim() || null,
    payment_category: input.paymentCategory === "labor" ? "labor" : "equipment",
    currency: "MXN",
    amount: amountMxn,
    exchange_rate: null,
    amount_mxn: amountMxn,
    payment_form_code: input.paymentFormCode,
    notes: getComplementPaymentNotes(input.complementId, input.invoiceFolio),
    created_by_user_id: input.createdByUserId,
  };
}
