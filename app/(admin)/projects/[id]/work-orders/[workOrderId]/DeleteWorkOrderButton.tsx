"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  workOrderId: number;
  contractorPaymentStatus: string | null;
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

export default function DeleteWorkOrderButton({
  projectId,
  workOrderId,
  contractorPaymentStatus,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (contractorPaymentStatus === "applied_to_balance") {
      alert("No se puede eliminar una OT con cobro aplicado al saldo del contratista.");
      return;
    }

    const confirmed = window.confirm(
      "Eliminar esta orden de trabajo? Las actividades volveran a quedar disponibles para asignarse."
    );
    if (!confirmed) return;

    setDeleting(true);

    const { data: existingCharge, error: chargeError } = await supabase
      .from("contractor_account_movements")
      .select("id")
      .eq("work_order_id", workOrderId)
      .eq("movement_type", "work_charge")
      .maybeSingle();

    if (chargeError) {
      setDeleting(false);
      reportError("validar cobro aplicado", chargeError);
      return;
    }

    if (existingCharge) {
      setDeleting(false);
      alert("No se puede eliminar una OT que ya genero movimiento de contratista.");
      return;
    }

    const { data: activities, error: activitiesError } = await supabase
      .from("work_order_activities")
      .select("project_operational_item_labor_activity_id")
      .eq("work_order_id", workOrderId);

    if (activitiesError) {
      setDeleting(false);
      reportError("leer actividades de orden", activitiesError);
      return;
    }

    const operationalActivityIds = Array.from(
      new Set(
        (activities || [])
          .map((activity) => activity.project_operational_item_labor_activity_id)
          .filter(Boolean) as number[]
      )
    );

    if (operationalActivityIds.length > 0) {
      const { error: unlockError } = await supabase
        .from("project_operational_item_labor_activities")
        .update({
          status: "pending",
          work_order_id: null,
        })
        .in("id", operationalActivityIds)
        .in("status", ["assigned", "pending", "in_progress"]);

      if (unlockError) {
        setDeleting(false);
        reportError("liberar actividades operativas", unlockError);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("work_orders")
      .delete()
      .eq("id", workOrderId)
      .eq("client_project_id", projectId);

    setDeleting(false);

    if (deleteError) {
      reportError("eliminar orden de trabajo", deleteError);
      return;
    }

    router.push(`/projects/${projectId}/work-orders`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting || contractorPaymentStatus === "applied_to_balance"}
      className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#7A2E1F] bg-[#3D1C14] px-5 py-3 font-semibold text-[#FFB19C] hover:text-white disabled:border-[#2A2A30] disabled:bg-[#222228] disabled:text-[#77777D]"
    >
      <Trash2 size={18} />
      {deleting ? "Eliminando..." : "Eliminar OT"}
    </button>
  );
}
