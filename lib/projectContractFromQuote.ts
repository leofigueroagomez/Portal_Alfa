import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateContractToken,
  inferClientType,
  inferDisciplinesFromQuoteItems,
  type PaymentMilestone,
} from "@/lib/contracts";

/**
 * Crea el contrato de la cotización si no existe. No revisa sesión: el botón
 * lo hace antes de llamar, y el endpoint de servicio lo autoriza con su token.
 * El insert no guarda un usuario; la tabla no tiene ese campo.
 */
export async function createOrGetProjectContract(
  adminClient: SupabaseClient,
  quoteId: number
) {
  const { data: existingContract } = await adminClient
    .from("project_contracts")
    .select("id, contract_number")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (existingContract) {
    return {
      ok: true as const,
      contractId: existingContract.id,
      contractNumber: existingContract.contract_number,
    };
  }

  const { data: quote, error: quoteError } = await adminClient
    .from("quotes")
    .select(`
      id, quote_number, version, total_mxn, subtotal_mxn, iva_mxn, currency, exchange_rate,
      client_id, client_project_id,
      clients (id, name, company_name, tax_business_name, tax_rfc, tax_regime, tax_zip_code, address, email, phone),
      client_projects (id, name, site_address)
    `)
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return { ok: false as const, error: "Cotización no encontrada para generar contrato." };
  }

  const { data: quoteItems } = await adminClient
    .from("quote_items")
    .select("category, description, title")
    .eq("quote_id", quoteId);

  const client = quote.clients as unknown as {
    id: number;
    name?: string;
    company_name?: string;
    tax_business_name?: string;
    tax_rfc?: string;
    tax_regime?: string;
    tax_zip_code?: string;
    address?: string;
    email?: string;
    phone?: string;
  } | null;

  const project = quote.client_projects as unknown as {
    id: number;
    name?: string;
    site_address?: string;
  } | null;

  const quoteNumber = quote.quote_number || `COT-${String(quote.id).padStart(4, "0")}`;
  const contractNumber = `CONT-${quoteNumber}`;
  const clientType = inferClientType(client?.tax_rfc);
  const disciplines = inferDisciplinesFromQuoteItems(quoteItems || []);
  const onboardingToken = generateContractToken("onb");
  const signingToken = generateContractToken("sgn");

  const legalBusinessName =
    client?.tax_business_name || client?.company_name || client?.name || "El Cliente";
  const legalFiscalAddress = client?.address || project?.site_address || "";

  const defaultMilestones: PaymentMilestone[] = [
    { percentage: 70, concept: "Anticipo a la firma del contrato", trigger: "contract_signature" },
    { percentage: 20, concept: "Entrega de equipos en sitio de obra", trigger: "equipment_delivery" },
    { percentage: 10, concept: "Finiquito y entrega aceptada a entera satisfacción", trigger: "final_handover" },
  ];

  const { data: newContract, error: insertError } = await adminClient
    .from("project_contracts")
    .insert({
      contract_number: contractNumber,
      quote_id: quote.id,
      client_project_id: quote.client_project_id || null,
      client_id: quote.client_id || null,
      version: 1,
      status: "pending_client_data",
      client_type: clientType,
      contract_date: new Date().toISOString().split("T")[0],
      estimated_weeks: 4,
      work_schedule: "Lunes a Viernes de 9:00 a 18:00 hrs y Sábados de 9:00 a 14:00 hrs",
      currency: quote.currency || "MXN",
      exchange_rate: Number(quote.exchange_rate) || 1,
      subtotal_mxn: Number(quote.subtotal_mxn) || 0,
      iva_mxn: Number(quote.iva_mxn) || 0,
      total_amount_mxn: Number(quote.total_mxn) || 0,
      payment_milestones: defaultMilestones,
      disciplines,
      legal_business_name: legalBusinessName,
      legal_rfc: client?.tax_rfc || null,
      legal_tax_regime: client?.tax_regime || null,
      legal_tax_zip_code: client?.tax_zip_code || null,
      legal_fiscal_address: legalFiscalAddress,
      representative_email: client?.email || null,
      representative_phone: client?.phone || null,
      onboarding_token: onboardingToken,
      signing_token: signingToken,
    })
    .select("id, contract_number")
    .single();

  if (insertError || !newContract) {
    console.error("Error creando contrato de proyecto:", insertError);
    return { ok: false as const, error: "No se pudo generar el contrato." };
  }

  revalidatePath(`/quotes/${quoteId}`);
  if (quote.client_project_id) {
    revalidatePath(`/projects/${quote.client_project_id}`);
  }

  return {
    ok: true as const,
    contractId: newContract.id,
    contractNumber: newContract.contract_number,
  };
}
