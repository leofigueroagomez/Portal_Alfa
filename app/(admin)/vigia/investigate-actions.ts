"use server";

import { revalidatePath } from "next/cache";
import { normalizeRole } from "@/lib/permissions";
import { investigateFinding } from "@/lib/vigia/investigate";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

/**
 * Sprint B2: "Investigar a fondo" un hallazgo bajo demanda.
 *
 * Bloquea mientras corre (playbook + 1 llamada al modelo, ~1-3 min). La pagina
 * /vigia declara maxDuration=300 para darle aire. El diagnostico completo se
 * manda por correo aparte; aqui devolvemos solo la causa raiz para la Bandeja.
 */
export async function investigateFindingAction(findingId: number): Promise<{
  ok: boolean;
  error?: string;
  status?: string;
  causaRaiz?: string;
  explicacion?: string;
  emailed?: boolean;
}> {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) return { ok: false, error: "No autenticado en ALFA OS." };
  const role = normalizeRole(profile.role);
  if (role !== "admin" && role !== "direccion") {
    return {
      ok: false,
      error: "No autorizado: se requiere rol de Direccion o Administrador.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const outcome = await investigateFinding(supabase, findingId, {
    trigger: "manual",
    requestedBy: profile.email || profile.full_name || "operador",
  });

  revalidatePath("/vigia");
  return {
    ok: outcome.ok,
    error: outcome.error,
    status: outcome.status,
    causaRaiz: outcome.causaRaiz,
    explicacion: outcome.explicacion,
    emailed: outcome.emailed,
  };
}
