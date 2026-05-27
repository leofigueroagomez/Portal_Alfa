"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  defaultExchangeRate: number;
};

type PaymentCategory = "equipment" | "labor";
type PaymentCurrency = "USD" | "MXN";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function reportError(step: string, error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? ` ${error.message}`
      : "";

  console.error(`Error en ${step}:`, error);
  alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
}

export default function ProjectPaymentForm({ projectId, defaultExchangeRate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>("equipment");
  const [currency, setCurrency] = useState<PaymentCurrency>("USD");
  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState(
    defaultExchangeRate > 0 ? String(defaultExchangeRate.toFixed(4)) : ""
  );
  const [notes, setNotes] = useState("");

  function updatePaymentCategory(nextCategory: PaymentCategory) {
    setPaymentCategory(nextCategory);
    if (nextCategory === "labor") {
      setCurrency("MXN");
    }
  }

  function updateCurrency(nextCurrency: PaymentCurrency) {
    if (paymentCategory === "labor") {
      setCurrency("MXN");
      return;
    }

    setCurrency(nextCurrency);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    const numericExchangeRate = currency === "USD" ? Number(exchangeRate) : null;

    if (!paymentDate) {
      alert("Selecciona la fecha de pago.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Captura un monto valido.");
      return;
    }

    if (paymentCategory === "labor" && currency !== "MXN") {
      alert("La mano de obra solo puede registrarse en MXN.");
      return;
    }

    if (currency === "USD" && (!numericExchangeRate || numericExchangeRate <= 0)) {
      alert("Captura el tipo de cambio para pagos en USD.");
      return;
    }

    const amountMxn =
      currency === "USD"
        ? numericAmount * Number(numericExchangeRate)
        : numericAmount;

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSaving(false);
      reportError("leer usuario actual", userError);
      return;
    }

    const { error } = await supabase.from("project_payments").insert({
      client_project_id: projectId,
      payment_date: paymentDate,
      payment_method: paymentMethod.trim() || null,
      payment_reference: paymentReference.trim() || null,
      payment_category: paymentCategory,
      currency,
      amount: numericAmount,
      exchange_rate: numericExchangeRate,
      amount_mxn: amountMxn,
      notes: notes.trim() || null,
      created_by_user_id: user?.id || null,
    });

    if (error) {
      setSaving(false);
      reportError("registrar pago", error);
      return;
    }

    setSaving(false);
    setOpen(false);
    setPaymentDate(today());
    setPaymentMethod("");
    setPaymentReference("");
    setPaymentCategory("equipment");
    setCurrency("USD");
    setAmount("");
    setExchangeRate(defaultExchangeRate > 0 ? String(defaultExchangeRate.toFixed(4)) : "");
    setNotes("");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
      >
        <Plus size={18} />
        Registrar pago
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Registrar pago</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Control interno de cobranza por proyecto.
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
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Forma de pago</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  placeholder="Transferencia, efectivo..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Referencia</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Folio, SPEI, factura..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Categoria</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={paymentCategory}
                  onChange={(event) =>
                    updatePaymentCategory(event.target.value as PaymentCategory)
                  }
                >
                  <option value="equipment">Equipos</option>
                  <option value="labor">Mano de obra</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Moneda</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={currency}
                  disabled={paymentCategory === "labor"}
                  onChange={(event) => updateCurrency(event.target.value as PaymentCurrency)}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Monto</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Tipo de cambio</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={exchangeRate}
                  disabled={currency === "MXN"}
                  onChange={(event) => setExchangeRate(event.target.value)}
                  placeholder="Requerido si es USD"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Notas</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observaciones internas del pago."
                />
              </label>
            </div>

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
                disabled={saving}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {saving ? "Guardando..." : "Guardar pago"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
