"use server";

import { isAdminLike } from "@/lib/permissions";
import {
  syncAllApprovedProjectOperationalItems,
  type SyncAllProjectOperationalItemsResult,
} from "@/lib/projectOperationalItems";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export async function regenerateOperationalBaseAction(): Promise<
  | { ok: true; result: SyncAllProjectOperationalItemsResult }
  | { ok: false; error: string }
> {
  const profile = await getCurrentInternalUserProfile();

  // Mantenimiento masivo: solo admin/direccion (privilegios identicos).
  if (!profile || !isAdminLike(profile.role)) {
    return { ok: false, error: "No autorizado." };
  }

  try {
    // Cliente con la sesion del usuario: RLS sigue aplicando.
    const supabase = await createSupabaseServerClient();
    const result = await syncAllApprovedProjectOperationalItems(supabase, profile.id);
    return { ok: true, result };
  } catch (error) {
    console.error("[admin-operations] regenerate failed:", error);
    return { ok: false, error: "No se pudo regenerar la base operativa." };
  }
}
