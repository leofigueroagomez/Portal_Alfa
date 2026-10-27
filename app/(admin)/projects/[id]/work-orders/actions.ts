"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { generateProjectSpecializedWorkOrders } from "@/lib/workOrdersAutomation";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { canManageWorkOrders } from "@/lib/permissions";

export async function autoGenerateWorkOrdersAction(projectId: number) {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canManageWorkOrders(profile.role)) {
    return { ok: false, error: "No autorizado." };
  }

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    return { ok: false, error: "Proyecto invalido." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await generateProjectSpecializedWorkOrders(supabase, projectId);
  if (!result.ok) {
    return { ok: false, error: result.error || "No se pudieron generar las órdenes de trabajo." };
  }

  revalidatePath(`/projects/${projectId}/work-orders`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, generatedOrders: result.generatedOrders };
}

export async function updateWorkOrderAssignmentAction({
  workOrderId,
  projectId,
  executionType,
  contractorId,
  assignedToName,
  assignedToPhone,
}: {
  workOrderId: number;
  projectId: number;
  executionType: "subcontractor" | "internal_staff";
  contractorId?: number | null;
  assignedToName?: string | null;
  assignedToPhone?: string | null;
}) {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canManageWorkOrders(profile.role)) {
    return { ok: false, error: "No autorizado." };
  }

  if (
    !Number.isSafeInteger(workOrderId) || workOrderId <= 0 ||
    !Number.isSafeInteger(projectId) || projectId <= 0 ||
    !["subcontractor", "internal_staff"].includes(executionType)
  ) {
    return { ok: false, error: "Asignacion invalida." };
  }

  const supabase = await createSupabaseServerClient();
  const updateData: Record<string, unknown> = {
    execution_type: executionType,
    updated_at: new Date().toISOString(),
    status: "assigned",
  };

  if (executionType === "internal_staff") {
    updateData.contractor_id = null;
    updateData.assigned_to_name = assignedToName || "Personal Interno ALFA";
    updateData.assigned_to_phone = assignedToPhone || null;
    // Si es interno, el pago a subcontratista es $0 (margen 100% retenido)
    updateData.contractor_amount_mxn = 0;
  } else {
    updateData.contractor_id = contractorId || null;
    updateData.assigned_to_name = assignedToName || null;
    updateData.assigned_to_phone = assignedToPhone || null;
  }

  const { data: updatedOrder, error } = await supabase
    .from("work_orders")
    .update(updateData)
    .eq("id", workOrderId)
    .eq("client_project_id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!updatedOrder) {
    return { ok: false, error: "Orden no encontrada en el proyecto autorizado." };
  }

  revalidatePath(`/projects/${projectId}/work-orders`);
  return { ok: true };
}
