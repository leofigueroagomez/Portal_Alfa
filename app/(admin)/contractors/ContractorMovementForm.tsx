"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

type Props = {
  contractorId: number;
  type: "advance_payment" | "adjustment";
};

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

export default function ContractorMovementForm({ contractorId, type }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [movementDate, setMovementDate] = useState(today());
  const [amountMxn, setAmountMxn] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(amountMxn || 0);
    if (!Number.isFinite(amount) || amount === 0) {
      alert("Captura un monto valido.");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("contractor_account_movements").insert({
      contractor_id: contractorId,
      movement_date: movementDate,
      movement_type: type,
      amount_mxn: amount,
      description:
        description.trim() ||
        (type === "advance_payment" ? "Abono a contratista" : "Ajuste manual"),
      payment_method: paymentMethod.trim() || null,
      reference: reference.trim() || null,
      created_by_user_id: user?.id || null,
    });

    setSaving(false);

    if (error) {
      reportError("registrar movimiento", error);
      return;
    }

    setAmountMxn("");
    setPaymentMethod("");
    setReference("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
      <h3 className="font-semibold">
        {type === "advance_payment" ? "Registrar abono" : "Ajuste manual"}
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          type="date"
          className="rounded-lg bg-[#151518] px-3 py-2 outline-none"
          value={movementDate}
          onChange={(event) => setMovementDate(event.target.value)}
        />
        <input
          type="number"
          step="0.01"
          className="rounded-lg bg-[#151518] px-3 py-2 outline-none"
          placeholder={type === "adjustment" ? "Monto (+ o -)" : "Monto"}
          value={amountMxn}
          onChange={(event) => setAmountMxn(event.target.value)}
        />
        <input
          className="rounded-lg bg-[#151518] px-3 py-2 outline-none"
          placeholder="Forma de pago"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        />
        <input
          className="rounded-lg bg-[#151518] px-3 py-2 outline-none"
          placeholder="Referencia"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
      </div>
      <input
        className="w-full rounded-lg bg-[#151518] px-3 py-2 outline-none"
        placeholder="Notas"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#9E1B32] px-4 py-2 text-sm font-semibold hover:bg-[#B91C3C] disabled:bg-[#151518] disabled:text-[#77777D]"
      >
        {saving ? "Guardando..." : "Registrar"}
      </button>
    </form>
  );
}
