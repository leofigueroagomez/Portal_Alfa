"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

type LeadForConversion = {
  id: number;
  name: string | null;
  company: string | null;
  phone: string | null;
  service: string | null;
  message: string | null;
  source: string | null;
  status: string | null;
  client_id?: number | null;
  created_at: string | null;
  raw_payload: Record<string, unknown> | null;
};

const sourceLabels: Record<string, string> = {
  pagina_web_alfa_high_end_services: "Landing Web",
  "Landing Web": "Landing Web",
  Referido: "Referido",
  LinkedIn: "LinkedIn",
  Google: "Google",
  "Prospectación Directa": "Prospectación Directa",
  "Cliente Existente": "Cliente Existente",
};

function normalizeSource(value: string | null | undefined) {
  return sourceLabels[value || ""] || "Landing Web";
}

function getPayloadEmail(payload: Record<string, unknown> | null) {
  const value = payload?.email || payload?.correo;
  return typeof value === "string" ? value.trim() : "";
}

async function getNextClientNumber() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("client_number")
    .order("client_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return Number(data?.client_number || 0) + 1;
}

export async function convertLeadToClient(formData: FormData) {
  const leadId = Number(formData.get("leadId") || 0);

  if (!leadId) return;

  const supabase = createSupabaseAdminClient();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, name, company, phone, service, message, source, status, client_id, created_at, raw_payload"
    )
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    console.error("[convert-lead] lead lookup failed", { leadId, leadError });
    return;
  }

  const leadData = lead as LeadForConversion;

  if (leadData.client_id) {
    redirect(`/clients/${leadData.client_id}`);
  }

  const source = normalizeSource(leadData.source);
  const clientNumber = await getNextClientNumber();
  const clientPayload = {
    client_number: clientNumber,
    name: leadData.name || "Cliente sin nombre",
    company_name: leadData.company || "",
    email: getPayloadEmail(leadData.raw_payload),
    phone: leadData.phone || "",
    address: "",
    notes: [leadData.service, leadData.message].filter(Boolean).join("\n\n"),
    source,
    lead_captured_at: leadData.created_at,
  };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert(clientPayload)
    .select("id")
    .single();

  if (clientError) {
    console.error("[convert-lead] client insert failed", {
      leadId,
      clientError,
    });
    throw clientError;
  }

  const createdClientId = Number(client.id);

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      status: "convertido",
      client_id: createdClientId,
      source,
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[convert-lead] lead update failed", {
      leadId,
      createdClientId,
      updateError,
    });
    throw updateError;
  }

  revalidatePath("/leads");
  revalidatePath("/clients");
  revalidatePath(`/clients/${createdClientId}`);
  redirect(`/clients/${createdClientId}`);
}
