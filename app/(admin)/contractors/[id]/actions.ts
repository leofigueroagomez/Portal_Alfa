"use server";

import { revalidatePath } from "next/cache";
import { canManageContractors } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";

const deletableMovementTypes = ["advance_payment", "adjustment", "refund"];

export async function deleteContractorMovement(
  contractorId: number,
  movementId: number
) {
  const profile = await getCurrentUserProfile();

  if (!profile?.is_active || !canManageContractors(profile.role)) {
    return {
      ok: false,
      message: "No tienes permisos para eliminar movimientos de contratistas.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: movement, error: movementError } = await supabase
    .from("contractor_account_movements")
    .select("id, contractor_id, movement_type")
    .eq("id", movementId)
    .eq("contractor_id", contractorId)
    .maybeSingle();

  if (movementError) {
    return {
      ok: false,
      message: `No se pudo validar el movimiento: ${movementError.message}`,
    };
  }

  if (!movement) {
    return {
      ok: false,
      message: "Movimiento no encontrado.",
    };
  }

  if (!deletableMovementTypes.includes(String(movement.movement_type || ""))) {
    return {
      ok: false,
      message:
        "Este movimiento viene de una orden de trabajo. Cancela o corrige la OT para modificarlo.",
    };
  }

  const { error } = await supabase
    .from("contractor_account_movements")
    .delete()
    .eq("id", movementId)
    .eq("contractor_id", contractorId);

  if (error) {
    return {
      ok: false,
      message: `No se pudo eliminar el movimiento: ${error.message}`,
    };
  }

  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath(`/contractors/${contractorId}/statement/print`);

  return {
    ok: true,
    message: "Movimiento eliminado.",
  };
}
