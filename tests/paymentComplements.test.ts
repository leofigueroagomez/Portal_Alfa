import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePaymentComplement,
  getPaymentComplementValidationErrors,
} from "../lib/paymentComplements";
import {
  buildPaymentFromComplement,
  findDuplicatePaymentCandidates,
  getPaymentMethodFromSatForm,
  type PaymentCandidate,
} from "../lib/complementPayments";

const invoice = {
  status: "issued",
  payment_method_code: "PPD",
  sat_uuid: "11111111-2222-3333-4444-555555555555",
  total_mxn: 20_000,
  total: 20_000,
  client_project_id: 25,
} as const;

const calculation = calculatePaymentComplement({
  invoiceTotalMxn: 20_000,
  existingComplements: [],
  paidAmountMxn: 12_332.59,
});

const stampErrors = (
  linkedPayment: Parameters<typeof getPaymentComplementValidationErrors>[0]["linkedPayment"],
  manualAmountOverride = false
) =>
  getPaymentComplementValidationErrors({
    invoice,
    calculation,
    paymentAlreadyHasComplement: false,
    linkedPayment,
    manualAmountOverride,
  });

test("timbrado: rechaza complemento sin pago ligado", () => {
  const errors = stampErrors(null);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no esta ligado a un pago/);
});

test("timbrado: rechaza pago de otro proyecto", () => {
  const errors = stampErrors({ id: 7, client_project_id: 41, amount_mxn: 12_332.59 });
  assert.ok(errors.some((error) => /no pertenece al proyecto/.test(error)));
});

test("timbrado: pago menor al complemento solo pasa con ajuste manual", () => {
  const partial = { id: 7, client_project_id: 25, amount_mxn: 10_000 };
  assert.ok(stampErrors(partial).some((error) => /menor que el importe/.test(error)));
  assert.deepEqual(stampErrors(partial, true), []);
});

test("timbrado: pago del proyecto con monto igual o mayor es valido", () => {
  assert.deepEqual(stampErrors({ id: 7, client_project_id: 25, amount_mxn: 12_332.59 }), []);
  assert.deepEqual(stampErrors({ id: 7, client_project_id: 25, amount_mxn: 15_000 }), []);
});

test("borrador en modo crear: sin pago todavia no bloquea (linkedPayment undefined)", () => {
  assert.deepEqual(stampErrors(undefined), []);
});

test("crea el pago con los datos del complemento", () => {
  const payment = buildPaymentFromComplement({
    complementId: 8,
    invoiceFolio: "FAC-0020",
    clientProjectId: 25,
    paymentDate: "2026-07-22",
    paidAmountMxn: 12_332.594,
    paymentFormCode: "03",
    paymentReference: "  ANTICIPO SISTEMA CONTRA INCENDIOS AMARRO 220726 ",
    createdByUserId: "00000000-0000-0000-0000-000000000001",
  });

  assert.deepEqual(payment, {
    client_project_id: 25,
    payment_date: "2026-07-22",
    payment_method: "Transferencia",
    payment_reference: "ANTICIPO SISTEMA CONTRA INCENDIOS AMARRO 220726",
    payment_category: "equipment",
    currency: "MXN",
    amount: 12_332.59,
    exchange_rate: null,
    amount_mxn: 12_332.59,
    payment_form_code: "03",
    notes: "Complemento P #8 / FAC-0020",
    created_by_user_id: "00000000-0000-0000-0000-000000000001",
  });
});

test("crea el pago: categoria mano de obra y referencia vacia", () => {
  const payment = buildPaymentFromComplement({
    complementId: 7,
    invoiceFolio: null,
    clientProjectId: 30,
    paymentDate: "2026-06-23",
    paidAmountMxn: 9_716.01,
    paymentFormCode: "01",
    paymentReference: "",
    paymentCategory: "labor",
    createdByUserId: null,
  });

  assert.equal(payment.payment_category, "labor");
  assert.equal(payment.payment_method, "Efectivo");
  assert.equal(payment.payment_reference, null);
  assert.equal(payment.notes, "Complemento P #7 / sin folio");
});

const payments: PaymentCandidate[] = [
  { id: 501, payment_date: "2026-07-20", amount_mxn: 12_000, payment_reference: "anticipo sistema contra incendios amarro 220726" },
  { id: 503, payment_date: "2026-09-17", amount_mxn: 5_285.9, payment_reference: null },
  { id: 504, payment_date: "2026-09-17", amount_mxn: 5_300, payment_reference: null },
  { id: 505, payment_date: "2026-05-01", amount_mxn: 9_000, payment_reference: "SPEI" },
];

test("duplicados: pago capturado dias despues con el mismo monto (caso FAC-0004)", () => {
  const candidates = findDuplicatePaymentCandidates(
    [
      { id: 15, payment_date: "2026-06-06", amount_mxn: 6_068.63, payment_reference: "FAC-0004-CP1" },
      { id: 16, payment_date: "2026-06-25", amount_mxn: 6_068.63, payment_reference: null },
    ],
    { paymentDate: "2026-06-03", amountMxn: 6_068.63, paymentReference: "SPEI" }
  );
  // 3 dias de diferencia entra en la ventana de ±15; 22 dias ya no.
  assert.deepEqual(candidates.map((candidate) => candidate.id), [15]);
});

test("duplicados: misma fecha y monto a ±$1", () => {
  const candidates = findDuplicatePaymentCandidates(payments, {
    paymentDate: "2026-09-17",
    amountMxn: 5_285.4,
  });
  assert.deepEqual(candidates.map((candidate) => [candidate.id, candidate.matchedBy]), [
    [503, ["date_amount"]],
  ]);
});

test("duplicados: misma referencia sin importar mayusculas ni espacios", () => {
  const candidates = findDuplicatePaymentCandidates(payments, {
    paymentDate: "2026-07-22",
    amountMxn: 12_332.59,
    paymentReference: "ANTICIPO  SISTEMA CONTRA INCENDIOS AMARRO 220726",
  });
  assert.deepEqual(candidates.map((candidate) => [candidate.id, candidate.matchedBy]), [
    [501, ["reference"]],
  ]);
});

test("duplicados: referencias genericas cortas (SPEI) no cuentan", () => {
  const candidates = findDuplicatePaymentCandidates(payments, {
    paymentDate: "2026-05-21",
    amountMxn: 10_158.12,
    paymentReference: "SPEI",
  });
  assert.deepEqual(candidates, []);
});

test("duplicados: excluye pagos que ya respaldan otro complemento", () => {
  const candidates = findDuplicatePaymentCandidates(payments, {
    paymentDate: "2026-09-17",
    amountMxn: 5_285.4,
    excludePaymentIds: [503],
  });
  assert.deepEqual(candidates, []);
});

test("mapeo de forma de pago SAT a metodo interno", () => {
  assert.equal(getPaymentMethodFromSatForm("01"), "Efectivo");
  assert.equal(getPaymentMethodFromSatForm("02"), "Cheque");
  assert.equal(getPaymentMethodFromSatForm("03"), "Transferencia");
  assert.equal(getPaymentMethodFromSatForm("04"), "Tarjeta de credito");
  assert.equal(getPaymentMethodFromSatForm("28"), "Tarjeta de debito");
  assert.equal(getPaymentMethodFromSatForm(" 03 "), "Transferencia");
  assert.equal(getPaymentMethodFromSatForm("98"), "Forma SAT 98");
  assert.equal(getPaymentMethodFromSatForm(null), "");
});
