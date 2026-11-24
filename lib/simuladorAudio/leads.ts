import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const SIMULATOR_LEAD_SOURCE = "Simulador de Audio";
export const SIMULATOR_LEAD_SERVICE = "Simulador de audio";

export type SimulatorAccessForLead = {
  id: number;
  email: string;
  name: string;
  phone: string;
  lead_id: number | null;
  attribution?: unknown;
};

/**
 * Crea el prospecto del visitante la primera vez que verifica su correo.
 * `leads` no tiene columna de correo: va en raw_payload.email, que es de donde
 * lo lee la conversion a cliente en app/(admin)/leads/actions.ts.
 *
 * customer_type se guarda como "residencial" porque el registro no lo pregunta;
 * se corrige cuando el visitante pide propuesta y elige el tipo de proyecto.
 */
export async function ensureLeadForAccess(
  supabase: SupabaseClient,
  access: SimulatorAccessForLead
) {
  if (access.lead_id) return access.lead_id;

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      name: access.name,
      customer_type: "residencial",
      phone: access.phone,
      service: SIMULATOR_LEAD_SERVICE,
      message: "Se registró en el simulador de audio y verificó su correo.",
      interest: "Audio y video",
      source: SIMULATOR_LEAD_SOURCE,
      status: "nuevo",
      raw_payload: {
        email: access.email,
        origin: "simulador_audio",
        simulator_access_id: access.id,
        attribution: access.attribution || null,
      },
    })
    .select("id")
    .single();

  if (leadError) throw leadError;

  const leadId = Number(lead.id);
  const { error: linkError } = await supabase
    .from("simulator_access")
    .update({ lead_id: leadId })
    .eq("id", access.id);

  if (linkError) throw linkError;

  return leadId;
}
