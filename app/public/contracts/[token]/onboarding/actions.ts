"use server";

import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getContractTokenColumn } from "@/lib/contractTokens";
import { canSubmitContractOnboarding } from "@/lib/contractPublicValidation";
import { DOCUMENT_UPLOAD_TYPES, parseValidatedDataUrl } from "@/lib/uploadValidation";

// Columnas que necesita el formulario publico de onboarding. Sin
// `onboarding_token` ni datos del cliente maestro. `signing_token` si va: quien
// tiene el enlace de onboarding es el firmante del contrato y la pantalla final
// lo lleva directo a firmar.
const ONBOARDING_CONTRACT_SELECT =
  "id, contract_number, status, signing_token, client_type, currency, estimated_weeks, warranty_labor_months, total_amount_mxn, client_signed_at, legal_business_name, legal_rfc, legal_tax_regime, legal_tax_zip_code, legal_fiscal_address, notary_deed_number, notary_deed_date, notary_number, notary_city_state, notary_name, public_registry_folio, representative_name, representative_title, representative_powers_deed, representative_email, representative_phone, representative_curp, site_manager_name, site_manager_phone, site_manager_email, client_tax_constancy_url, client_articles_of_incorporation_url, client_signer_ine_front_url, client_signer_ine_back_url, quotes:quote_id (quote_number), client_projects:client_project_id (name, site_address)";

// Los documentos del formulario llegan como data URL (FileReader). Solo se
// guardan si son imagen/PDF reales por magic bytes; una URL o ruta arbitraria
// se rechaza para que nadie apunte el contrato a archivos ajenos.
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const MAX_FIELD_LENGTH = 500;

function text(value: string | undefined | null) {
  return String(value ?? "").trim().slice(0, MAX_FIELD_LENGTH);
}

function optionalText(value: string | undefined | null) {
  return text(value) || null;
}

function parseOnboardingDocument(value: string | undefined): string | null | false {
  if (!value) return null;
  const document = parseValidatedDataUrl(value, {
    allowed: DOCUMENT_UPLOAD_TYPES,
    maxBytes: MAX_DOCUMENT_BYTES,
  });
  if (!document) return false;
  return `data:${document.mime};base64,${document.buffer.toString("base64")}`;
}

export async function getContractByOnboardingToken(token: string) {
  if (getContractTokenColumn(token) !== "onboarding_token") {
    throw new Error("El enlace de onboarding no es válido.");
  }
  const adminClient = createSupabaseAdminClient();

  const { data: contract, error } = await adminClient
    .from("project_contracts")
    .select(ONBOARDING_CONTRACT_SELECT)
    .eq("onboarding_token", token)
    .in("status", ["draft", "pending_client_data"])
    .is("client_signed_at", null)
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
  if (getContractTokenColumn(token) !== "onboarding_token") {
    return { ok: false, error: "Token de onboarding inválido." };
  }
  if (!payload || !["b2b", "b2c"].includes(payload.clientType)) {
    return { ok: false, error: "Datos de contrato inválidos." };
  }
  const documents = {
    taxConstancy: parseOnboardingDocument(payload.clientTaxConstancyUrl),
    articlesOfIncorporation: parseOnboardingDocument(payload.clientArticlesOfIncorporationUrl),
    ineFront: parseOnboardingDocument(payload.clientSignerIneFrontUrl),
    ineBack: parseOnboardingDocument(payload.clientSignerIneBackUrl),
  };
  if (Object.values(documents).some((document) => document === false)) {
    return {
      ok: false,
      error: "Los documentos deben ser imagen (JPG, PNG, WebP, HEIC) o PDF de hasta 4 MB.",
    };
  }
  const legalRfc = text(payload.legalRfc).toUpperCase();
  const legalBusinessName = text(payload.legalBusinessName);
  const legalTaxRegime = optionalText(payload.legalTaxRegime);
  const legalTaxZipCode = optionalText(payload.legalTaxZipCode);
  const legalFiscalAddress = text(payload.legalFiscalAddress);

  const adminClient = createSupabaseAdminClient();

  // 1. Validar que exista el contrato por onboarding_token
  const { data: contract, error: findError } = await adminClient
    .from("project_contracts")
    .select("id, status, client_id, client_signed_at")
    .eq("onboarding_token", token)
    .maybeSingle();

  if (findError || !contract) {
    return { ok: false, error: "Contrato no encontrado o token inválido." };
  }
  if (!canSubmitContractOnboarding(contract)) {
    return { ok: false, error: "Los datos del contrato ya fueron enviados o el contrato no está disponible." };
  }

  // 2. Actualizar contrato con los datos proporcionados por el cliente
  const { data: updated, error: updateError } = await adminClient
    .from("project_contracts")
    .update({
      client_type: payload.clientType,
      legal_business_name: legalBusinessName,
      legal_rfc: legalRfc,
      legal_tax_regime: legalTaxRegime,
      legal_tax_zip_code: legalTaxZipCode,
      legal_fiscal_address: legalFiscalAddress,
      
      notary_deed_number: optionalText(payload.notaryDeedNumber),
      notary_deed_date: optionalText(payload.notaryDeedDate),
      notary_number: optionalText(payload.notaryNumber),
      notary_city_state: optionalText(payload.notaryCityState),
      notary_name: optionalText(payload.notaryName),
      public_registry_folio: optionalText(payload.publicRegistryFolio),
      
      representative_name: text(payload.representativeName),
      representative_title: text(payload.representativeTitle),
      representative_powers_deed: optionalText(payload.representativePowersDeed),
      representative_email: text(payload.representativeEmail),
      representative_phone: text(payload.representativePhone),
      representative_curp: optionalText(payload.representativeCurp)?.toUpperCase() || null,
      
      site_manager_name: optionalText(payload.siteManagerName),
      site_manager_phone: optionalText(payload.siteManagerPhone),
      site_manager_email: optionalText(payload.siteManagerEmail),
      
      client_tax_constancy_url: documents.taxConstancy,
      client_articles_of_incorporation_url: documents.articlesOfIncorporation,
      client_signer_ine_front_url: documents.ineFront,
      client_signer_ine_back_url: documents.ineBack,
      
      status: "pending_signatures",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contract.id)
    .eq("onboarding_token", token)
    .eq("status", contract.status)
    .is("client_signed_at", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Error guardando onboarding de contrato:", updateError);
    return { ok: false, error: "No se pudieron guardar los datos del contrato." };
  }
  if (!updated) {
    return { ok: false, error: "El contrato cambió. Actualiza la página antes de continuar." };
  }

  // 3. Datos fiscales del cliente maestro: el contrato ya guarda lo que capturo
  // el firmante; en `clients` solo se completan campos vacios. Un RFC/regimen ya
  // capturado por ALFA (y usado para facturar) no se sobrescribe desde un
  // enlace publico; si difiere, lo concilia ALFA al revisar el contrato.
  if (contract.client_id) {
    const { data: client } = await adminClient
      .from("clients")
      .select("tax_business_name, tax_rfc, tax_regime, tax_zip_code, address")
      .eq("id", contract.client_id)
      .maybeSingle<{
        tax_business_name: string | null;
        tax_rfc: string | null;
        tax_regime: string | null;
        tax_zip_code: string | null;
        address: string | null;
      }>();

    if (client) {
      const candidates = {
        tax_business_name: legalBusinessName,
        tax_rfc: legalRfc,
        tax_regime: legalTaxRegime,
        tax_zip_code: legalTaxZipCode,
        address: legalFiscalAddress,
      };
      const fiscalPatch = Object.fromEntries(
        Object.entries(candidates).filter(
          ([key, value]) => value && !client[key as keyof typeof client]?.trim()
        )
      );

      if (Object.keys(fiscalPatch).length) {
        await adminClient.from("clients").update(fiscalPatch).eq("id", contract.client_id);
      }
    }
  }

  return { ok: true, message: "Datos del contrato guardados exitosamente. Ahora el contrato está listo para firma digital." };
}
