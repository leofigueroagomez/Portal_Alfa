"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import type { ProjectContractRecord } from "@/lib/contracts";

export async function getContractByOnboardingToken(token: string) {
  const adminClient = createSupabaseAdminClient();

  const { data: contract, error } = await adminClient
    .from("project_contracts")
    .select(`
      *,
      quotes:quote_id (quote_number),
      client_projects:client_project_id (name, site_address),
      clients:client_id (name, company_name, email, phone, tax_business_name, tax_rfc, tax_regime, tax_zip_code, address)
    `)
    .eq("onboarding_token", token)
    .maybeSingle();

  if (error || !contract) {
    throw new Error("El enlace de onboarding no es válido o ha expirado.");
  }

  return contract;
}

export async function submitClientContractOnboardingAction(
  token: string,
  payload: {
    clientType: "b2b" | "b2c";
    legalBusinessName: string;
    legalRfc: string;
    legalTaxRegime?: string;
    legalTaxZipCode?: string;
    legalFiscalAddress: string;
    
    // Notariales B2B
    notaryDeedNumber?: string;
    notaryDeedDate?: string;
    notaryNumber?: string;
    notaryCityState?: string;
    notaryName?: string;
    publicRegistryFolio?: string;
    
    // Representante
    representativeName: string;
    representativeTitle: string;
    representativePowersDeed?: string;
    representativeEmail: string;
    representativePhone: string;
    representativeCurp?: string;
    
    // Obra
    siteManagerName?: string;
    siteManagerPhone?: string;
    siteManagerEmail?: string;
    
    // Documentos URLs
    clientTaxConstancyUrl?: string;
    clientArticlesOfIncorporationUrl?: string;
    clientSignerIneFrontUrl?: string;
    clientSignerIneBackUrl?: string;
  }
) {
  const adminClient = createSupabaseAdminClient();

  // 1. Validar que exista el contrato por onboarding_token
  const { data: contract, error: findError } = await adminClient
    .from("project_contracts")
    .select("id, status, client_id")
    .eq("onboarding_token", token)
    .maybeSingle();

  if (findError || !contract) {
    return { ok: false, error: "Contrato no encontrado o token inválido." };
  }

  // 2. Actualizar contrato con los datos proporcionados por el cliente
  const { error: updateError } = await adminClient
    .from("project_contracts")
    .update({
      client_type: payload.clientType,
      legal_business_name: payload.legalBusinessName,
      legal_rfc: payload.legalRfc?.trim().toUpperCase(),
      legal_tax_regime: payload.legalTaxRegime || null,
      legal_tax_zip_code: payload.legalTaxZipCode || null,
      legal_fiscal_address: payload.legalFiscalAddress,
      
      notary_deed_number: payload.notaryDeedNumber || null,
      notary_deed_date: payload.notaryDeedDate || null,
      notary_number: payload.notaryNumber || null,
      notary_city_state: payload.notaryCityState || null,
      notary_name: payload.notaryName || null,
      public_registry_folio: payload.publicRegistryFolio || null,
      
      representative_name: payload.representativeName,
      representative_title: payload.representativeTitle,
      representative_powers_deed: payload.representativePowersDeed || null,
      representative_email: payload.representativeEmail,
      representative_phone: payload.representativePhone,
      representative_curp: payload.representativeCurp?.trim().toUpperCase() || null,
      
      site_manager_name: payload.siteManagerName || null,
      site_manager_phone: payload.siteManagerPhone || null,
      site_manager_email: payload.siteManagerEmail || null,
      
      client_tax_constancy_url: payload.clientTaxConstancyUrl || null,
      client_articles_of_incorporation_url: payload.clientArticlesOfIncorporationUrl || null,
      client_signer_ine_front_url: payload.clientSignerIneFrontUrl || null,
      client_signer_ine_back_url: payload.clientSignerIneBackUrl || null,
      
      status: "pending_signatures",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contract.id);

  if (updateError) {
    console.error("Error guardando onboarding de contrato:", updateError);
    return { ok: false, error: "No se pudieron guardar los datos del contrato." };
  }

  // 3. Opcional: Actualizar datos fiscales del cliente en la tabla `clients` si no los tenía
  if (contract.client_id) {
    await adminClient
      .from("clients")
      .update({
        tax_business_name: payload.legalBusinessName,
        tax_rfc: payload.legalRfc?.trim().toUpperCase(),
        tax_regime: payload.legalTaxRegime || null,
        tax_zip_code: payload.legalTaxZipCode || null,
        address: payload.legalFiscalAddress,
      })
      .eq("id", contract.client_id);
  }

  return { ok: true, message: "Datos del contrato guardados exitosamente. Ahora el contrato está listo para firma digital." };
}
