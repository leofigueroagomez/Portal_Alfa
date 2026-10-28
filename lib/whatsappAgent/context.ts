import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { businessClock, phoneKey } from "./format";

/**
 * Contexto de ALFA OS que el agente recibe en cada turno, como mensaje
 * `system` dentro de la conversacion (no en el prompt fijo, para no romper la
 * cache).
 *
 * Reconocer por telefono no es autenticar: solo se pasa lo necesario para
 * atender (nombre, proyectos y si siguen en garantia). Nada de direcciones,
 * saldos, RFC ni contactos.
 */

type ClientRow = { id: number; name: string | null; company: string | null; company_name: string | null; phone: string | null };
type ProjectRow = { id: number; client_id: number | null; name: string | null; status: string | null; site_contact_phone: string | null };
type WarrantyRow = {
  client_project_id: number;
  equipment_warranty_end_date: string | null;
  installation_warranty_end_date: string | null;
  maintenance_policy_active: boolean | null;
};
type LeadRow = { id: number; created_at: string | null; service: string | null; phone: string | null };

export type ContactRecognition = {
  clientId: number | null;
  lines: string[];
};

function laterDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export async function recognizeContact(
  supabase: SupabaseClient,
  phone: string | null,
  knownClientId: number | null
): Promise<ContactRecognition> {
  const key = phoneKey(phone);
  if (!key && !knownClientId) return { clientId: null, lines: [] };

  let clientId = knownClientId;

  if (!clientId && key) {
    // Pocos clientes hoy: se filtra en memoria para tolerar formatos de
    // telefono distintos (+52, espacios, guiones).
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, company, company_name, phone")
      .not("phone", "is", null);
    const match = ((clients || []) as ClientRow[]).find((row) => phoneKey(row.phone) === key);
    clientId = match?.id ?? null;

    if (!clientId) {
      const { data: projects } = await supabase
        .from("client_projects")
        .select("id, client_id, name, status, site_contact_phone")
        .not("site_contact_phone", "is", null);
      const projectMatch = ((projects || []) as ProjectRow[]).find(
        (row) => phoneKey(row.site_contact_phone) === key
      );
      clientId = projectMatch?.client_id ?? null;
    }
  }

  const lines: string[] = [];

  if (clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, company, company_name, phone")
      .eq("id", clientId)
      .maybeSingle();
    const clientRow = client as ClientRow | null;
    const company = clientRow?.company_name || clientRow?.company;
    lines.push(
      `Su teléfono coincide con un cliente de ALFA: ${clientRow?.name || "sin nombre"}${company ? ` (${company})` : ""}.`
    );

    const { data: projects } = await supabase
      .from("client_projects")
      .select("id, client_id, name, status, site_contact_phone")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(8);
    const projectRows = (projects || []) as ProjectRow[];

    if (projectRows.length) {
      const { data: warranties } = await supabase
        .from("project_warranties")
        .select(
          "client_project_id, equipment_warranty_end_date, installation_warranty_end_date, maintenance_policy_active"
        )
        .in(
          "client_project_id",
          projectRows.map((row) => row.id)
        );
      const warrantyRows = (warranties || []) as WarrantyRow[];
      const today = new Date().toISOString().slice(0, 10);

      for (const project of projectRows) {
        const projectWarranties = warrantyRows.filter((row) => row.client_project_id === project.id);
        let warrantyText = "sin carta de garantía registrada";
        if (projectWarranties.length) {
          const end = projectWarranties.reduce<string | null>(
            (acc, row) =>
              laterDate(acc, laterDate(row.installation_warranty_end_date, row.equipment_warranty_end_date)),
            null
          );
          const policy = projectWarranties.some((row) => row.maintenance_policy_active);
          warrantyText = end
            ? end >= today
              ? `en garantía hasta ${end}`
              : `garantía vencida desde ${end}`
            : "garantía sin fecha registrada";
          if (policy) warrantyText += ", con póliza de mantenimiento activa";
        }
        lines.push(`Proyecto "${project.name || "sin nombre"}" (${project.status || "sin estado"}): ${warrantyText}.`);
      }
    }
  } else if (key) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, created_at, service, phone")
      .order("created_at", { ascending: false })
      .limit(500);
    const previous = ((leads || []) as LeadRow[]).find((row) => phoneKey(row.phone) === key);
    if (previous) {
      lines.push(
        `Ya nos había contactado antes (${(previous.created_at || "").slice(0, 10)}) interesado en: ${previous.service || "sin detalle"}.`
      );
    }
  }

  return { clientId, lines };
}

export function buildTurnContext(params: {
  now: Date;
  contactName: string | null;
  recognition: ContactRecognition;
  leadId: number | null;
}) {
  const clock = businessClock(params.now);
  const lines = [
    "Contexto de ALFA OS para este turno (el cliente no lo ve; no lo cites tal cual).",
    `Hora en Guadalajara: ${clock.label}. ${clock.inHours ? "Dentro" : "Fuera"} del horario de atención.`,
  ];
  if (params.contactName) lines.push(`Nombre del contacto en WhatsApp: ${params.contactName}.`);
  lines.push(...params.recognition.lines);
  if (params.leadId) {
    lines.push(`Ya registraste a este prospecto (lead #${params.leadId}); si hay datos nuevos, actualízalo.`);
  }
  return lines.join("\n");
}
