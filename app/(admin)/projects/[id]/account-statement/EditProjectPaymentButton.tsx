"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import type { PaymentFormCatalogItem } from "@/lib/paymentTerms";
import { editProjectPayment, type EditProjectPaymentResult } from "./paymentActions";

type ProjectPaymentForEdit = {
  id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_form_code?: string | null;
  payment_reference: string | null;
  currency: string | null;
  amount: number | null;
  notes: string | null;
};

type Props = {
  payment: ProjectPaymentForEdit;
  paymentForms: PaymentFormCatalogItem[];
  hasStampedComplement: boolean;
};

function getPaymentFormCode(payment: ProjectPaymentForEdit) {
  return payment.payment_form_code || payment.payment_method || "";
}

export default function EditProjectPaymentButton({
  payment,
  paymentForms,
  hasStampedComplement,
}: Props) {
  const [open, setOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(payment.payment_date || "");
  const [paymentFormCode, setPaymentFormCode] = useState(getPaymentFormCode(payment));
  const [paymentReference, setPaymentReference] = useState(
    payment.payment_reference || ""
  );
  const [amount, setAmount] = useState(String(Number(payment.amount || 0)));
  const [notes, setNotes] = useState(payment.notes || "");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<EditProjectPaymentResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fullEditDisabled = hasStampedComplement;
  const availablePaymentForms = paymentForms.filter(
    (form) => form.is_active && form.code !== "99"
  );

  function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await editProjectPayment(formData);
      setResult(nextResult);
      if (nextResult.ok) setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
      >
        <Pencil size={14} />
        Editar
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            action={submit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl"
          >
            <input type="hidden" name="paymentId" value={payment.id} />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Editar pago</h3>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  {hasStampedComplement
                    ? "Este pago ya tiene complemento timbrado. Solo se permiten notas internas."
                    : "Correccion controlada con auditoria."}
                </p>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Fecha</span>
                <input
                  type="date"
                  name="paymentDate"
                  disabled={fullEditDisabled}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Forma de pago SAT</span>
                <select
                  name="paymentFormCode"
                  disabled={fullEditDisabled}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={paymentFormCode}
                  onChange={(event) => setPaymentFormCode(event.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {availablePaymentForms.map((form) => (
                    <option key={form.code} value={form.code}>
                      {form.code} - {form.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">
                  Monto {payment.currency || "MXN"}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  disabled={fullEditDisabled}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Referencia</span>
                <input
                  name="paymentReference"
                  disabled={fullEditDisabled}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Notas internas</span>
                <textarea
                  name="notes"
                  className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Motivo de correccion</span>
                <textarea
                  name="reason"
                  required
                  className="min-h-20 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Correccion por error de captura..."
                />
              </label>
            </div>

            {result && !result.ok ? (
              <div className="mt-5 rounded-xl border border-[#6A2A2A] bg-[#351818] p-4 text-sm text-[#FFB4B4]">
                {result.error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {pending ? "Guardando..." : "Guardar cambio"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
