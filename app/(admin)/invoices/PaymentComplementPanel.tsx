"use client";

import { useMemo, useState, useTransition } from "react";
import { FileJson, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { PaymentFormCatalogItem } from "@/lib/paymentTerms";
import {
  createPaymentComplementDraft,
  stampPaymentComplementDraft,
  type CreatePaymentComplementDraftResult,
  type StampPaymentComplementResult,
} from "./paymentComplementActions";

type InvoiceForComplement = {
  id: number;
  internal_folio: string | null;
  total_mxn: number | null;
  total?: number | null;
  status: string | null;
  sat_uuid?: string | null;
  payment_method_code?: string | null;
};

type ProjectPaymentForComplement = {
  id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_form_code?: string | null;
  payment_reference: string | null;
  amount_mxn: number | null;
};

type PaymentComplementForPanel = {
  id: number;
  status: string | null;
  partiality_number: number | null;
  previous_balance_mxn: number | null;
  amount_paid_mxn: number | null;
  paid_amount_mxn?: number | null;
  source_payment_amount_mxn?: number | null;
  manual_amount_override?: boolean | null;
  manual_override_reason?: string | null;
  outstanding_balance_mxn: number | null;
  payment_date: string | null;
  payment_form_code: string | null;
  payload_preview: unknown;
  facturama_id?: string | null;
  sat_uuid?: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  last_error?: string | null;
};

type Props = {
  invoice: InvoiceForComplement;
  payments: ProjectPaymentForComplement[];
  complements: PaymentComplementForPanel[];
  paymentForms: PaymentFormCatalogItem[];
  stampingEnabled: boolean;
  complementEnv: "sandbox" | "production";
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isStampedComplement(status: string | null | undefined) {
  return status === "issued" || status === "stamped";
}

function getInvoiceTotal(invoice: InvoiceForComplement) {
  return Number(invoice.total_mxn ?? invoice.total ?? 0);
}

export default function PaymentComplementPanel({
  invoice,
  payments,
  complements,
  paymentForms,
  stampingEnabled,
  complementEnv,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [amountPaidMxn, setAmountPaidMxn] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentFormCode, setPaymentFormCode] = useState("03");
  const [paymentReference, setPaymentReference] = useState("");
  const [result, setResult] = useState<CreatePaymentComplementDraftResult | null>(null);
  const [stampResultById, setStampResultById] = useState<
    Record<number, StampPaymentComplementResult>
  >({});
  const [payloadOpenId, setPayloadOpenId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const stampedComplements = complements.filter((complement) =>
    isStampedComplement(complement.status)
  );
  const paidAmount = stampedComplements.reduce(
    (sum, complement) =>
      sum + Number(complement.paid_amount_mxn ?? complement.amount_paid_mxn ?? 0),
    0
  );
  const pendingBalance = Math.max(getInvoiceTotal(invoice) - paidAmount, 0);
  const nextPartiality = stampedComplements.length + 1;
  const selectedPayment = payments.find((payment) => String(payment.id) === selectedPaymentId);
  const sourcePaymentAmountMxn = selectedPayment
    ? Number(selectedPayment.amount_mxn || 0)
    : null;
  const fiscalPaidAmountMxn = Number(amountPaidMxn || 0);
  const manualAmountOverride =
    sourcePaymentAmountMxn != null &&
    Math.abs(fiscalPaidAmountMxn - sourcePaymentAmountMxn) > 0.01;
  const availablePaymentForms = useMemo(
    () => paymentForms.filter((form) => form.is_active && form.code !== "99"),
    [paymentForms]
  );
  const canCreate =
    invoice.payment_method_code === "PPD" &&
    invoice.status === "issued" &&
    Boolean(invoice.sat_uuid) &&
    pendingBalance > 0;

  function updateSelectedPayment(paymentId: string) {
    setSelectedPaymentId(paymentId);
    const payment = payments.find((item) => String(item.id) === paymentId);

    if (payment) {
      setAmountPaidMxn(String(Number(payment.amount_mxn || 0).toFixed(2)));
      setPaymentDate(payment.payment_date || today());
      setPaymentReference(payment.payment_reference || "");
      if (payment.payment_form_code) setPaymentFormCode(payment.payment_form_code);
    }
  }

  function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await createPaymentComplementDraft(formData);
      setResult(nextResult);
    });
  }

  function stampDraft(complementId: number) {
    setStampResultById((current) => {
      const next = { ...current };
      delete next[complementId];
      return next;
    });
    startTransition(async () => {
      const stampResult = await stampPaymentComplementDraft(complementId);
      setStampResultById((current) => ({
        ...current,
        [complementId]: stampResult,
      }));
    });
  }

  if (!canCreate && complements.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-[#2A2A30] bg-[#101114] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[#B3B3B8]">
            <p className="font-semibold text-white">Complementos de pago</p>
            <p>
              Parcialidad siguiente {nextPartiality} / saldo{" "}
              {formatCurrency(pendingBalance, "MXN")}
            </p>
            <p>
              Ambiente {complementEnv}
              {stampingEnabled ? " / timbrado preparado por flag" : " / preview sin timbrado"}
            </p>
            {complementEnv === "sandbox" ? (
              <p className="mt-1 text-[#F4C66A]">
                Ambiente sandbox: usando receptor fiscal de prueba.
              </p>
            ) : null}
          </div>
          {canCreate ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
            >
              <Plus size={14} />
              Crear borrador
            </button>
          ) : null}
        </div>

        {complements.length > 0 ? (
          <div className="mt-3 space-y-2">
            {complements.map((complement) => (
              <div
                key={complement.id}
                className="rounded-lg border border-[#2A2A30] bg-[#151518] p-3 text-xs text-[#B3B3B8]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">
                      Parcialidad {complement.partiality_number} / {complement.status}
                    </p>
                    {complement.manual_amount_override ? (
                      <span className="rounded-full border border-[#614620] bg-[#322514] px-2 py-1 text-[#F4C66A]">
                        Ajuste manual
                      </span>
                    ) : null}
                  </div>
                  <p>
                    {formatCurrency(
                      Number(complement.paid_amount_mxn ?? complement.amount_paid_mxn ?? 0),
                      "MXN"
                    )}
                  </p>
                </div>
                <p className="mt-1">
                  Saldo anterior{" "}
                  {formatCurrency(Number(complement.previous_balance_mxn || 0), "MXN")} / insoluto{" "}
                  {formatCurrency(Number(complement.outstanding_balance_mxn || 0), "MXN")}
                </p>
                {complement.manual_amount_override ? (
                  <div className="mt-2 rounded-lg border border-[#614620] bg-[#322514] p-2 text-[#F4C66A]">
                    <p className="font-semibold">Ajuste manual</p>
                    <p>
                      Pago registrado:{" "}
                      {formatCurrency(Number(complement.source_payment_amount_mxn || 0), "MXN")} / Importe fiscal complemento:{" "}
                      {formatCurrency(
                        Number(complement.paid_amount_mxn ?? complement.amount_paid_mxn ?? 0),
                        "MXN"
                      )}
                    </p>
                    <p>
                      Diferencia:{" "}
                      {formatCurrency(
                        Number(complement.paid_amount_mxn ?? complement.amount_paid_mxn ?? 0) -
                          Number(complement.source_payment_amount_mxn || 0),
                        "MXN"
                      )}
                    </p>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPayloadOpenId((current) =>
                        current === complement.id ? null : complement.id
                      )
                    }
                    className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                  >
                    Ver payload
                  </button>
                  {complement.status === "draft" && stampingEnabled ? (
                    <button
                      type="button"
                      onClick={() => stampDraft(complement.id)}
                      disabled={pending || complementEnv !== "sandbox"}
                      className="rounded-lg bg-[#9E1B32] px-3 py-2 text-xs font-semibold text-white hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
                    >
                      {pending ? "Timbrando..." : "Timbrar sandbox"}
                    </button>
                  ) : null}
                  {complement.status === "issued" ? (
                    <>
                      <a
                        href={`/api/payment-complements/${complement.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                      >
                        PDF
                      </a>
                      <a
                        href={`/api/payment-complements/${complement.id}/xml`}
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                      >
                        XML
                      </a>
                    </>
                  ) : null}
                </div>
                {complement.status === "issued" ? (
                  <p className="mt-2 text-[#8CE0B6]">
                    UUID: {complement.sat_uuid || "Pendiente en respuesta"}
                  </p>
                ) : null}
                {stampResultById[complement.id] ? (
                  <StampResultMessage result={stampResultById[complement.id]} />
                ) : null}
                {complement.last_error ? (
                  <div className="mt-3 rounded-lg border border-[#6A2A2A] bg-[#351818] p-3 text-[#FFB4B4]">
                    {complement.last_error}
                  </div>
                ) : null}
                {payloadOpenId === complement.id ? (
                  <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-white">
                    {JSON.stringify(complement.payload_preview, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            action={submit}
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl"
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Borrador de complemento</h3>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Fase 1 valida calculo y genera preview de payload. No timbra.
                </p>
                {complementEnv === "sandbox" ? (
                  <p className="mt-2 rounded-xl border border-[#614620] bg-[#322514] px-3 py-2 text-sm text-[#F4C66A]">
                    Ambiente sandbox: usando receptor fiscal de prueba.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Metric label="Parcialidad" value={String(nextPartiality)} />
              <Metric label="Saldo anterior" value={formatCurrency(pendingBalance, "MXN")} />
              <Metric
                label="Pago registrado"
                value={
                  sourcePaymentAmountMxn == null
                    ? "Manual"
                    : formatCurrency(sourcePaymentAmountMxn, "MXN")
                }
              />
              <Metric
                label="Importe fiscal"
                value={formatCurrency(Number(amountPaidMxn || 0), "MXN")}
              />
              <Metric
                label="Saldo insoluto"
                value={formatCurrency(
                  Math.max(pendingBalance - Number(amountPaidMxn || 0), 0),
                  "MXN"
                )}
              />
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Pago registrado</span>
                <select
                  name="projectPaymentId"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={selectedPaymentId}
                  onChange={(event) => updateSelectedPayment(event.target.value)}
                >
                  <option value="">Captura manual</option>
                  {payments.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      #{payment.id} / {payment.payment_date || "Sin fecha"} /{" "}
                      {formatCurrency(Number(payment.amount_mxn || 0), "MXN")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Fecha de pago</span>
                <input
                  type="date"
                  name="paymentDate"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Forma de pago SAT</span>
                <select
                  name="paymentFormCode"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={paymentFormCode}
                  onChange={(event) => setPaymentFormCode(event.target.value)}
                >
                  {availablePaymentForms.map((form) => (
                    <option key={form.code} value={form.code}>
                      {form.code} - {form.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Monto a complementar MXN</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="paidAmountMxn"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={amountPaidMxn}
                  onChange={(event) => setAmountPaidMxn(event.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Referencia</span>
                <input
                  name="paymentReference"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="SPEI, folio, nota interna..."
                />
              </label>
            </div>

            {manualAmountOverride ? (
              <div className="mt-5 rounded-xl border border-[#6A2A2A] bg-[#351818] p-4 text-sm text-[#FFB4B4]">
                <p className="font-semibold">
                  El importe fiscal del complemento es distinto al pago registrado en el estado de cuenta.
                </p>
                <p className="mt-1">
                  Esto puede generar diferencias entre control interno y CFDI. ¿Deseas continuar?
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Metric
                    label="Pago registrado"
                    value={formatCurrency(Number(sourcePaymentAmountMxn || 0), "MXN")}
                  />
                  <Metric
                    label="Importe fiscal"
                    value={formatCurrency(fiscalPaidAmountMxn, "MXN")}
                  />
                  <Metric
                    label="Diferencia"
                    value={formatCurrency(
                      fiscalPaidAmountMxn - Number(sourcePaymentAmountMxn || 0),
                      "MXN"
                    )}
                  />
                </div>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm text-[#FFB4B4]">Motivo obligatorio</span>
                  <textarea
                    name="manualOverrideReason"
                    required
                    className="min-h-20 w-full rounded-xl border border-[#6A2A2A] bg-[#151518] px-4 py-3 text-white outline-none"
                    placeholder="Explica por que el CFDI requiere un importe distinto al pago registrado."
                  />
                </label>
              </div>
            ) : (
              <input type="hidden" name="manualOverrideReason" value="" />
            )}

            {result ? (
              <div
                className={`mt-5 rounded-xl border p-4 text-sm ${
                  result.ok
                    ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                    : "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]"
                }`}
              >
                {result.ok ? (
                  <>
                    <p className="font-semibold">
                      Borrador #{result.complementId} creado.
                    </p>
                    {result.warning ? <p className="mt-1">{result.warning}</p> : null}
                    <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-white">
                      {JSON.stringify(result.payloadPreview, null, 2)}
                    </pre>
                  </>
                ) : (
                  <p>{result.error}</p>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FileJson size={16} />
                  Preview disponible despues de guardar borrador
                </div>
                <p className="text-sm text-[#B3B3B8]">
                  Con el flag de timbrado apagado, ALFA OS no llama Facturama.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {pending ? "Validando..." : "Crear borrador y preview"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
      <p className="mb-1 text-xs text-[#B3B3B8]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function StampResultMessage({ result }: { result: StampPaymentComplementResult }) {
  return (
    <div
      className={`mt-3 rounded-lg border p-3 ${
        result.ok
          ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
          : "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]"
      }`}
    >
      {result.ok ? `Complemento timbrado: ${result.facturamaId}` : result.error}
    </div>
  );
}
