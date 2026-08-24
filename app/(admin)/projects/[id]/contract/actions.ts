"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";
import {
  generateContractToken,
  inferClientType,
  inferDisciplinesFromQuoteItems,
  buildClientContractOnboardingWhatsAppMessage,
  buildClientContractSigningWhatsAppMessage,
  type PaymentMilestone,
} from "@/lib/contracts";

export async function createOrGetProjectContractAction(quoteId: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  const adminClient = createSupabaseAdminClient();

  // 1. Verificar si ya existe un contrato para esta cotización
  const { data: existingContract } = await adminClient
    .from("project_contracts")
    .select("id, contract_number")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (existingContract) {
    return { ok: true, contractId: existingContract.id, contractNumber: existingContract.contract_number };
  }

  // 2. Obtener cotización, partidas, proyecto y cliente
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
    return { ok: false, error: "Cotización no encontrada para generar contrato." };
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

  const legalBusinessName = client?.tax_business_name || client?.company_name || client?.name || "El Cliente";
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
    return { ok: false, error: "No se pudo generar el contrato." };
  }

  revalidatePath(`/quotes/${quoteId}`);
  if (quote.client_project_id) {
    revalidatePath(`/projects/${quote.client_project_id}`);
  }

  return { ok: true, contractId: newContract.id, contractNumber: newContract.contract_number };
}

export async function getContractDispatchContext(contractId: number) {
  const adminClient = createSupabaseAdminClient();

  const { data: contract, error } = await adminClient
    .from("project_contracts")
    .select(`
      *,
      quotes:quote_id (quote_number),
      client_projects:client_project_id (name, site_address),
      clients:client_id (name, company_name, phone, email)
    `)
    .eq("id", contractId)
    .single();

  if (error || !contract) {
    throw new Error("Contrato no encontrado.");
  }

  const baseUrl = getAppBaseUrl();
  const onboardingUrl = `${baseUrl}/public/contracts/${contract.onboarding_token}/onboarding`;
  const signingUrl = `${baseUrl}/public/contracts/${contract.signing_token}/sign`;
  const pdfUrl = `${baseUrl}/api/contracts/${contract.id}/pdf`;

  const clientName =
    contract.legal_business_name ||
    contract.representative_name ||
    (contract.clients as { company_name?: string; name?: string } | null)?.company_name ||
    (contract.clients as { name?: string } | null)?.name ||
    "Cliente";

  const projectName = (contract.client_projects as { name?: string } | null)?.name || "Proyecto ALFA IT";
  const recipientPhone =
    contract.representative_phone ||
    (contract.clients as { phone?: string } | null)?.phone ||
    "";
  const cleanPhone = recipientPhone.replace(/[^\d+]/g, "").replace(/^\+/, "");

  // Mensaje para Onboarding
  const { text: onboardingText } = buildClientContractOnboardingWhatsAppMessage({
    clientName,
    contractNumber: contract.contract_number,
    projectName,
    onboardingUrl,
  });

  // Mensaje para Firma
  const { text: signingText } = buildClientContractSigningWhatsAppMessage({
    clientName,
    contractNumber: contract.contract_number,
    projectName,
    signingUrl,
  });

  const waOnboardingUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(onboardingText)}`
    : `https://wa.me/?text=${encodeURIComponent(onboardingText)}`;

  const waSigningUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(signingText)}`
    : `https://wa.me/?text=${encodeURIComponent(signingText)}`;

  return {
    contract,
    clientName,
    projectName,
    recipientPhone,
    onboardingUrl,
    signingUrl,
    pdfUrl,
    waOnboardingUrl,
    onboardingText,
    waSigningUrl,
    signingText,
  };
}

export async function signContractAsAlfaAction(
  contractId: number,
  signatureDataUrl: string
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  const adminClient = createSupabaseAdminClient();

  // Guardar firma de ALFA
  const { error } = await adminClient
    .from("project_contracts")
    .update({
      alfa_signature_image_url: signatureDataUrl,
      alfa_signed_at: new Date().toISOString(),
      alfa_signer_name: "Ing. Leonardo Figueroa Gómez",
    })
    .eq("id", contractId);

  if (error) {
    return { ok: false, error: "Error guardando firma de ALFA." };
  }

  revalidatePath(`/projects`);
  return { ok: true, message: "Firma de Dirección registrada con éxito." };
}

export async function updateContractSettingsAction(
  contractId: number,
  payload: {
    estimatedWeeks?: number;
    workSchedule?: string;
    paymentMilestones?: PaymentMilestone[];
    technicalPrerequisites?: string;
    technicalExclusions?: string;
    warrantyLaborMonths?: number;
  }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  const adminClient = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.estimatedWeeks !== undefined) updateData.estimated_weeks = payload.estimatedWeeks;
  if (payload.workSchedule !== undefined) updateData.work_schedule = payload.workSchedule;
  if (payload.paymentMilestones !== undefined) updateData.payment_milestones = payload.paymentMilestones;
  if (payload.technicalPrerequisites !== undefined) updateData.technical_prerequisites = payload.technicalPrerequisites;
  if (payload.technicalExclusions !== undefined) updateData.technical_exclusions = payload.technicalExclusions;
  if (payload.warrantyLaborMonths !== undefined) updateData.warranty_labor_months = payload.warrantyLaborMonths;

  const { error } = await adminClient
    .from("project_contracts")
    .update(updateData)
    .eq("id", contractId);

  if (error) {
    return { ok: false, error: "Error actualizando configuración del contrato." };
  }

  revalidatePath(`/projects`);
  return { ok: true, message: "Contrato actualizado con éxito." };
}

export async function sendContractReminderAction(contractId: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  const adminClient = createSupabaseAdminClient();
  const baseUrl = getAppBaseUrl();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ALFA IT <direccion@alfait.com.mx>";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurado en entorno." };
  }

  const { data: contract, error } = await adminClient
    .from("project_contracts")
    .select(`
      id, contract_number, status, onboarding_token, signing_token,
      onboarding_reminders_count, signing_reminders_count,
      legal_business_name, representative_name, representative_email,
      clients (name, company_name, email),
      client_projects (name)
    `)
    .eq("id", contractId)
    .single();

  if (error || !contract) {
    return { ok: false, error: "Contrato no encontrado." };
  }

  const recipientEmail =
    contract.representative_email ||
    (contract.clients as { email?: string } | null)?.email;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return { ok: false, error: "El cliente no tiene un correo electrónico válido registrado." };
  }

  const clientName =
    contract.legal_business_name ||
    contract.representative_name ||
    (contract.clients as { company_name?: string; name?: string } | null)?.company_name ||
    (contract.clients as { name?: string } | null)?.name ||
    "Cliente";

  const projectName = (contract.client_projects as { name?: string } | null)?.name || "Proyecto ALFA IT";
  const isOnboarding = contract.status === "pending_client_data" || contract.status === "draft";
  const targetUrl = isOnboarding
    ? `${baseUrl}/public/contracts/${contract.onboarding_token}/onboarding`
    : `${baseUrl}/public/contracts/${contract.signing_token}/sign`;

  const subject = isOnboarding
    ? `[Recordatorio] Completar Datos para Contrato - ${projectName} (${contract.contract_number}) | ALFA IT`
    : `[Recordatorio] Firma Digital de Contrato - ${projectName} (${contract.contract_number}) | ALFA IT`;

  const buttonText = isOnboarding ? "Completar Datos del Contrato" : "Revisar y Firmar Contrato";
  const actionDescription = isOnboarding
    ? "es indispensable completar los datos fiscales y del representante legal para emitir tu contrato oficial."
    : "tu contrato se encuentra listo y pendiente de tu firma digital de conformidad.";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0b0d0f; padding: 24px; text-align: center; border-bottom: 3px solid #9e1b32;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase;">ALFA IT SOLUCIONES</h2>
        <p style="color: #9e1b32; margin: 4px 0 0 0; font-size: 11px; font-weight: bold; letter-spacing: 1px;">RECORDATORIO DE CONTRATO DE PROYECTO</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <p style="font-size: 15px; line-height: 1.5;">Estimado(a) <strong>${clientName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #444;">
          Con motivo de tu proyecto <strong>${projectName}</strong> (Folio: <strong>${contract.contract_number}</strong>), te recordamos que ${actionDescription}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${targetUrl}" style="background-color: #9e1b32; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block;">
            ${buttonText}
          </a>
        </div>
        <p style="font-size: 12px; color: #777; line-height: 1.4;">
          El proceso es 100% digital, seguro y cuenta con validez legal.
        </p>
      </div>
      <div style="background-color: #f9f9fb; padding: 16px 24px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee;">
        ALFA IT Soluciones S.A. de C.V. • Franz Liszt 5160, Zapopan, Jal. • direccion@alfait.com.mx
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Error de Resend: ${errText}` };
    }

    if (isOnboarding) {
      await adminClient
        .from("project_contracts")
        .update({
          last_onboarding_reminder_sent_at: new Date().toISOString(),
          onboarding_reminders_count: (contract.onboarding_reminders_count || 0) + 1,
        })
        .eq("id", contract.id);
    } else {
      await adminClient
        .from("project_contracts")
        .update({
          last_signing_reminder_sent_at: new Date().toISOString(),
          signing_reminders_count: (contract.signing_reminders_count || 0) + 1,
        })
        .eq("id", contract.id);
    }

    return { ok: true, message: `Recordatorio enviado con éxito a ${recipientEmail}.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error enviando correo" };
  }
}
