"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WalletCards } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  workOrderId: number;
  projectId: number;
  contractorId: number | null;
  contractorAmountMxn: number;
  paymentStatus: string | null;
  workOrderNumber: string;
  projectName: string;
};

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

export default function ApplyContractorChargeButton({
  workOrderId,
  projectId,
  contractorId,
  contractorAmountMxn,
  paymentStatus,
  workOrderNumber,
  projectName,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleApply() {
    if (!contractorId) {
      alert("Esta orden no tiene contratista asignado.");
      return;
    }

    let appliedAmount = contractorAmountMxn;
    if (appliedAmount <= 0) {
      const typedAmount = window.prompt("Monto a pagar al contratista en MXN:");
      appliedAmount = Number(typedAmount || 0);
      if (!Number.isFinite(appliedAmount) || appliedAmount <= 0) {
        alert("Captura un monto valido antes de aplicar el cobro.");
        return;
      }
    }

    if (paymentStatus === "applied_to_balance") {
      alert("Este trabajo ya fue aplicado al saldo del contratista.");
      return;
    }

    const confirmed = window.confirm(
      `Aplicar ${appliedAmount.toFixed(2)} MXN al saldo del contratista?`
    );
    if (!confirmed) return;

    setSaving(true);

    const { data: existing, error: existingError } = await supabase
      .from("contractor_account_movements")
      .select("id")
      .eq("work_order_id", workOrderId)
      .eq("movement_type", "work_charge")
      .maybeSingle();

    if (existingError) {
      setSaving(false);
      reportError("validar movimiento previo", existingError);
      return;
    }

    if (existing) {
      const { error: updateStatusError } = await supabase
        .from("work_orders")
        .update({
          contractor_payment_status: "applied_to_balance",
          updated_at: new Date().toISOString(),
        })
        .eq("id", workOrderId);

      setSaving(false);
      if (updateStatusError) {
        reportError("actualizar estado de pago", updateStatusError);
        return;
      }
      router.refresh();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: movementError } = await supabase
      .from("contractor_account_movements")
      .insert({
        contractor_id: contractorId,
        client_project_id: projectId,
        work_order_id: workOrderId,
        movement_type: "work_charge",
        amount_mxn: appliedAmount,
        description: `Trabajo realizado: ${workOrderNumber} - ${projectName}`,
        created_by_user_id: user?.id || null,
      });

    if (movementError) {
      setSaving(false);
      reportError("crear cargo al contratista", movementError);
      return;
    }

    const { error: orderError } = await supabase
      .from("work_orders")
      .update({
        contractor_payment_status: "applied_to_balance",
        contractor_amount_mxn: appliedAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workOrderId);

    setSaving(false);

    if (orderError) {
      reportError("actualizar estado de pago", orderError);
      return;
    }

    router.refresh();
    alert("Trabajo aplicado al saldo del contratista.");
  }

  return (
    <button
      type="button"
      onClick={handleApply}
      disabled={saving || paymentStatus === "applied_to_balance"}
      className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
    >
      <WalletCards size={18} />
      {saving ? "Aplicando..." : "Aplicar cobro al saldo"}
    </button>
  );
}
