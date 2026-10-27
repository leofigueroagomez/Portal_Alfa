"use server";

import { revalidatePath } from "next/cache";
import { canViewFinancials } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

// Solo se alterna entre emitida y pagada; borrador/cancelada siguen sus flujos fiscales.
const TOGGLEABLE_STATUSES = ["issued", "paid"] as const;
type ToggleableStatus = (typeof TOGGLEABLE_STATUSES)[number];

function isToggleableStatus(value: unknown): value is ToggleableStatus {
  return TOGGLEABLE_STATUSES.includes(value as ToggleableStatus);
}

export async function updateInvoiceStatusAction(invoiceId: number, nextStatus: string) {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canViewFinancials(profile.role)) {
    return { ok: false as const, error: "No autorizado." };
  }

  if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0 || !isToggleableStatus(nextStatus)) {
    return { ok: false as const, error: "Estado de factura invalido." };
  }

  // Sesion del usuario: RLS sigue aplicando sobre project_invoices.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_invoices")
    .update({ status: nextStatus })
    .eq("id", invoiceId)
    .in("status", [...TOGGLEABLE_STATUSES])
    .select("id, client_project_id")
    .maybeSingle();

  if (error) {
    console.error("[invoices] status update failed:", { invoiceId, error });
    return { ok: false as const, error: "No se pudo actualizar la factura." };
  }

  if (!data) {
    return {
      ok: false as const,
      error: "La factura no existe o su estado actual no permite este cambio.",
    };
  }

  revalidatePath("/invoices");
  if (data.client_project_id) {
    revalidatePath(`/projects/${data.client_project_id}/invoices`);
  }

  return { ok: true as const };
}
