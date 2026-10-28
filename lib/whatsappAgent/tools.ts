import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { businessClock } from "./format";
import { addTagByName, handoffTagName, leadTagName, setCustomFieldByName, summaryFieldName } from "./manychat";

/**
 * Herramientas que el agente puede usar. El orden y el texto deben ser
 * estables: forman parte del prefijo cacheado.
 */

const CUSTOMER_TYPES = ["residencial", "comercial", "corporativo", "industrial"] as const;
const TIMELINES = ["Lo antes posible", "Este mes", "1 a 3 meses", "Solo estoy explorando"] as const;
const HANDOFF_REASONS = [
  "cliente_lo_pidio",
  "emergencia",
  "cliente_molesto",
  "soporte_tecnico",
  "fuera_de_alcance",
  "otro",
] as const;

const HANDOFF_HOURS = 24;

export const WHATSAPP_AGENT_TOOLS: BetaTool[] = [
  {
    name: "registrar_prospecto",
    description:
      "Registra o actualiza en ALFA OS al prospecto de esta conversación para que un ingeniero de servicio a cliente lo contacte y agende la visita técnica. Úsala cuando ya tengas al menos el nombre, qué quiere lograr y la zona. Si ya lo registraste, vuelve a llamarla solo cuando haya datos nuevos.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["nombre", "empresa", "tipo_cliente", "servicio", "ubicacion", "urgencia", "resumen"],
      properties: {
        nombre: { type: "string", description: "Nombre del cliente como lo dio." },
        empresa: { type: ["string", "null"], description: "Empresa o negocio, si aplica." },
        tipo_cliente: {
          type: "string",
          enum: [...CUSTOMER_TYPES],
          description: "residencial para casas; comercial para locales, restaurantes u oficinas pequeñas; corporativo para empresas; industrial para bodegas o plantas.",
        },
        servicio: { type: "string", description: "Qué quiere lograr, en una frase (por ejemplo: cámaras para ver la entrada desde el celular)." },
        ubicacion: { type: ["string", "null"], description: "Colonia y municipio." },
        urgencia: {
          type: "string",
          enum: [...TIMELINES, "Sin definir"],
          description: "Para cuándo lo quiere. Sin definir si no lo ha dicho.",
        },
        resumen: { type: "string", description: "Dos o tres líneas para el ingeniero: qué necesita, el lugar y cualquier detalle útil para la visita." },
      },
    },
  },
  {
    name: "pasar_a_persona",
    description:
      "Pasa la conversación a una persona del equipo de ALFA. Después de usarla ya no contestas en esta conversación: una persona continúa. Úsala si el cliente lo pide, si hay una emergencia (robo, alarma sonando, humo, chispas), si se nota molesto, si una falla no se resolvió con los pasos básicos o si piden algo que no puedes resolver.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["motivo", "resumen"],
      properties: {
        motivo: { type: "string", enum: [...HANDOFF_REASONS] },
        resumen: { type: "string", description: "Qué pasa y qué necesita el cliente, para que la persona continúe sin volver a preguntar." },
      },
    },
  },
];

export type ToolConversation = {
  id: number;
  manychat_subscriber_id: string;
  phone: string | null;
  client_id: number | null;
  lead_id: number | null;
};

type ToolOutcome = { content: string; isError?: boolean; handoff?: boolean; leadId?: number };

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const HANDOFF_REASON_LABELS: Record<string, string> = {
  cliente_lo_pidio: "el cliente lo pidió",
  emergencia: "EMERGENCIA",
  cliente_molesto: "cliente molesto",
  soporte_tecnico: "falla sin resolver",
  fuera_de_alcance: "fuera de alcance del asistente",
  otro: "otro",
};

/**
 * Deja el resumen en un campo del contacto de ManyChat para que quien tome la
 * conversacion lo lea sin recorrer el chat. Si falla, solo se registra.
 */
async function writeTeamSummary(conversation: ToolConversation, header: string, summary: string) {
  const value = `${header} · ${businessClock(new Date()).label}\n${summary}`.slice(0, 1000);
  const written = await setCustomFieldByName(conversation.manychat_subscriber_id, summaryFieldName(), value);
  if (!written.ok) console.error("[whatsapp-agent] resumen para el equipo:", written.error);
}

async function registerLead(
  supabase: SupabaseClient,
  conversation: ToolConversation,
  input: Record<string, unknown>
): Promise<ToolOutcome> {
  const name = text(input.nombre, 120);
  const service = text(input.servicio, 200);
  const customerType = text(input.tipo_cliente, 50);
  const location = text(input.ubicacion, 200);
  const summary = text(input.resumen, 1500);
  const timeline = text(input.urgencia, 100);

  if (!name || !service || !CUSTOMER_TYPES.includes(customerType as (typeof CUSTOMER_TYPES)[number])) {
    return { content: "Faltan el nombre, el servicio o el tipo de cliente.", isError: true };
  }
  if (!conversation.phone) {
    return {
      content: "No tenemos el teléfono de este contacto; pasa la conversación a una persona para que lo registre.",
      isError: true,
    };
  }

  const row = {
    name,
    company: text(input.empresa, 120) || null,
    customer_type: customerType,
    phone: conversation.phone,
    service,
    message: [summary, location ? `Ubicación: ${location}` : ""].filter(Boolean).join("\n"),
    timeline: TIMELINES.includes(timeline as (typeof TIMELINES)[number]) ? timeline : null,
    client_id: conversation.client_id,
    raw_payload: {
      canal: "whatsapp",
      manychat_subscriber_id: conversation.manychat_subscriber_id,
      ubicacion: location || null,
      registrado_por: "agente_whatsapp",
    },
  };

  if (conversation.lead_id) {
    const { error } = await supabase
      .from("leads")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", conversation.lead_id);
    if (error) throw error;
    await writeTeamSummary(conversation, `Prospecto #${conversation.lead_id} (actualizado)`, row.message);
    return { content: `Prospecto #${conversation.lead_id} actualizado.`, leadId: conversation.lead_id };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...row, source: "WhatsApp", status: "nuevo" })
    .select("id")
    .single();
  if (error) throw error;

  const leadId = Number((data as { id: number }).id);
  await supabase
    .from("whatsapp_agent_conversations")
    .update({ lead_id: leadId, updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  await writeTeamSummary(conversation, `Prospecto #${leadId}`, row.message);
  const tagged = await addTagByName(conversation.manychat_subscriber_id, leadTagName());
  if (!tagged.ok) console.error("[whatsapp-agent] etiqueta de prospecto:", tagged.error);

  return {
    content: `Prospecto #${leadId} registrado. Dile al cliente que un ingeniero de servicio a cliente lo contactará a la brevedad para agendar la visita técnica sin costo.`,
    leadId,
  };
}

async function handOff(
  supabase: SupabaseClient,
  conversation: ToolConversation,
  input: Record<string, unknown>
): Promise<ToolOutcome> {
  const reason = HANDOFF_REASONS.includes(text(input.motivo, 40) as (typeof HANDOFF_REASONS)[number])
    ? text(input.motivo, 40)
    : "otro";
  const summary = text(input.resumen, 1500);
  const until = new Date(Date.now() + HANDOFF_HOURS * 60 * 60_000).toISOString();

  const { error } = await supabase
    .from("whatsapp_agent_conversations")
    .update({
      status: "handoff",
      handoff_reason: `${reason}: ${summary}`.slice(0, 1600),
      handoff_until: until,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);
  if (error) throw error;

  // El resumen va antes que la etiqueta: la regla de ManyChat asigna la
  // conversacion al recibir la etiqueta y quien la abra ya debe verlo.
  await writeTeamSummary(conversation, `Pasó a persona: ${HANDOFF_REASON_LABELS[reason] || reason}`, summary);
  const tagged = await addTagByName(conversation.manychat_subscriber_id, handoffTagName());
  if (!tagged.ok) console.error("[whatsapp-agent] etiqueta de handoff:", tagged.error);

  return {
    content:
      "Listo, la conversación pasa a una persona del equipo. Despídete en un mensaje corto diciendo que alguien del equipo continúa (si es fuera de horario, que será el siguiente día hábil) y no hagas más preguntas.",
    handoff: true,
  };
}

export async function runWhatsAppTool(
  supabase: SupabaseClient,
  conversation: ToolConversation,
  name: string,
  input: unknown
): Promise<ToolOutcome> {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  try {
    if (name === "registrar_prospecto") return await registerLead(supabase, conversation, args);
    if (name === "pasar_a_persona") return await handOff(supabase, conversation, args);
    return { content: `Herramienta desconocida: ${name}`, isError: true };
  } catch (error) {
    console.error(`[whatsapp-agent] herramienta ${name} fallo:`, error);
    return {
      content: "No se pudo guardar en este momento. Sigue atendiendo y, si hace falta, pasa la conversación a una persona.",
      isError: true,
    };
  }
}
