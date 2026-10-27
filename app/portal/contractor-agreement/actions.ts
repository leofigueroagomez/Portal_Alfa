"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContractorPortalContext } from "@/lib/contractorPortal";
import { CONTRACTOR_AGREEMENT_VERSION } from "@/lib/contractorAgreementTemplate";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { isValidContractSignaturePng } from "@/lib/contractPublicValidation";
import { DOCUMENT_UPLOAD_TYPES, parseValidatedDataUrl } from "@/lib/uploadValidation";

const SERVICE_REGIMES = new Set(["independent_technician", "specialized_contractor"]);
const PERSON_TYPES = new Set(["fisica", "moral"]);
// Cada documento viaja como data URL dentro del Server Action (limite de body
// de Next: 1 MB por defecto); el tope por archivo es defensivo.
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const MAX_FIELD_LENGTH = 500;

function field(formData: FormData, name: string, fallback = "") {
  return String(formData.get(name) || fallback).trim().slice(0, MAX_FIELD_LENGTH);
}

/** Documento opcional: vacio => null; invalido => error explicito. */
function parseDocument(value: string, label: string) {
  if (!value) return null;
  const document = parseValidatedDataUrl(value, {
    allowed: DOCUMENT_UPLOAD_TYPES,
    maxBytes: MAX_DOCUMENT_BYTES,
  });
  if (!document) {
    throw new Error(`${label}: adjunta una imagen (JPG, PNG, WebP, HEIC) o PDF de hasta 4 MB.`);
  }
  return `data:${document.mime};base64,${document.buffer.toString("base64")}`;
}

export async function submitContractorAgreementAction(formData: FormData) {
  const context = await getContractorPortalContext();
  if (!context) {
    throw new Error("No tienes autorización como contratista.");
  }

  const { portalUser, user } = context;

  // 0. Régimen de Prestación
  const serviceRegime = field(formData, "service_regime", "independent_technician");

  // 1. Identificación Legal y Fiscal
  const personType = field(formData, "person_type", "fisica");
  const legalBusinessName = field(formData, "legal_business_name");
  const signerName = field(formData, "signer_name");
  const signerRfc = field(formData, "signer_rfc").toUpperCase();
  const signerCurp = field(formData, "signer_curp").toUpperCase();
  const signerPhone = field(formData, "signer_phone");
  const signerEmail = field(formData, "signer_email", user.email || "").toLowerCase();
  const fiscalAddress = field(formData, "fiscal_address");
  const representativeName = field(formData, "representative_name");
  const representativePowers = field(formData, "representative_powers");
  const signerRole = field(formData, "signer_role", "Técnico Especialista / Subcontratista");

  // 2. Laboral y REPSE
  const hasRepse = formData.get("has_repse") === "true" || formData.get("has_repse") === "on";
  const repseNumber = field(formData, "repse_number").toUpperCase();
  const repseActivity = field(formData, "repse_activity");
  const repseExpirationDate = field(formData, "repse_expiration_date") || null;
  const imssPatronalRegistry = field(formData, "imss_patronal_registry").toUpperCase();
  const approximateWorkers = Number(formData.get("approximate_workers")) || 1;
  const siteSupervisorName = field(formData, "site_supervisor_name");
  const siteSupervisorPhone = field(formData, "site_supervisor_phone");

  // 3. Datos Bancarios
  const bankName = field(formData, "bank_name");
  const bankClabe = field(formData, "bank_clabe").replace(/\s/g, "");
  const bankAccountHolder = field(formData, "bank_account_holder");

  // 4. Documentación y Firma
  const signatureData = String(formData.get("signature_data") || "").trim();
  const ineFrontData = String(formData.get("ine_front_data") || "").trim();
  const ineBackData = String(formData.get("ine_back_data") || "").trim();
  const taxConstancyData = String(formData.get("tax_constancy_data") || "").trim();

  // 5. Geolocalización
  const geoLatStr = field(formData, "geo_lat");
  const geoLngStr = field(formData, "geo_lng");
  const geoAccuracyStr = field(formData, "geo_accuracy");

  const geoLat = geoLatStr ? Number(geoLatStr) : null;
  const geoLng = geoLngStr ? Number(geoLngStr) : null;
  const geoAccuracy = geoAccuracyStr ? Number(geoAccuracyStr) : null;

  // 6. Consentimientos
  const termsAccepted = formData.get("terms_accepted") === "on" || formData.get("terms_accepted") === "true";
  const ndaAccepted = formData.get("nda_accepted") === "on" || formData.get("nda_accepted") === "true";
  const dataPrivacyAccepted = formData.get("data_privacy_accepted") === "on" || formData.get("data_privacy_accepted") === "true";
  const laborLiabilityAccepted = formData.get("labor_liability_accepted") === "on" || formData.get("labor_liability_accepted") === "true";

  // Validaciones
  if (!SERVICE_REGIMES.has(serviceRegime) || !PERSON_TYPES.has(personType)) {
    throw new Error("Régimen de prestación o tipo de persona no válido.");
  }
  if (!legalBusinessName) {
    throw new Error("El nombre legal o razón social es obligatorio.");
  }
  if (!signerName) {
    throw new Error("El nombre del firmante es obligatorio.");
  }
  if (!signerRfc || signerRfc.length < 12) {
    throw new Error("El RFC es obligatorio y debe tener al menos 12 caracteres.");
  }
  if (!fiscalAddress) {
    throw new Error("El domicilio fiscal completo es obligatorio.");
  }
  if (!signerPhone) {
    throw new Error("El teléfono de contacto / WhatsApp es obligatorio.");
  }
  if (!bankName || !/^\d{18}$/.test(bankClabe)) {
    throw new Error("La CLABE interbancaria debe tener exactamente 18 dígitos y el banco es obligatorio.");
  }
  if (!bankAccountHolder) {
    throw new Error("El titular de la cuenta bancaria es obligatorio.");
  }
  if (!ineFrontData) {
    throw new Error("Es obligatorio adjuntar la fotografía de tu Identificación Oficial (INE / Pasaporte) de frente.");
  }
  if (!isValidContractSignaturePng(signatureData)) {
    throw new Error("Es necesario estampar la firma autógrafa en el recuadro digital (PNG de hasta 200 KB).");
  }
  // Magic bytes + tope por archivo; se guarda con el mime detectado, no el declarado.
  const ineFrontDocument = parseDocument(ineFrontData, "Identificación (frente)");
  const ineBackDocument = parseDocument(ineBackData, "Identificación (reverso)");
  const taxConstancyDocument = parseDocument(taxConstancyData, "Constancia de situación fiscal");
  if (!ndaAccepted || !dataPrivacyAccepted || !laborLiabilityAccepted) {
    throw new Error("Debes aceptar todas las cláusulas del Contrato Marco para continuar.");
  }

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "127.0.0.1";
  const userAgent = headerList.get("user-agent") || "Web Client";

  const admin = createSupabaseAdminClient();

  // Un convenio firmado no se reemplaza ni se duplica desde el portal; si hay
  // que corregirlo lo gestiona ALFA. Mismo criterio (contratista + usuario)
  // que usa la pagina para mostrar el convenio vigente.
  const { data: existingAgreement, error: existingError } = await admin
    .from("contractor_signed_agreements")
    .select("id")
    .eq("contractor_id", portalUser.contractor_id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error("No se pudo verificar el estado del convenio. Intenta de nuevo.");
  }
  if (existingAgreement) {
    throw new Error("Ya firmaste el Contrato Marco. Si necesitas corregir datos, contacta a ALFA.");
  }

  // Guardar en contractor_signed_agreements
  const { error: insertError } = await admin
    .from("contractor_signed_agreements")
    .insert({
      contractor_id: portalUser.contractor_id,
      contractor_portal_user_id: portalUser.id,
      user_id: user.id,
      service_regime: serviceRegime,
      agreement_type: "master_services_and_nda_contract",
      agreement_version: CONTRACTOR_AGREEMENT_VERSION,
      person_type: personType,
      legal_business_name: legalBusinessName,
      signer_name: signerName,
      signer_rfc: signerRfc,
      signer_curp: signerCurp || null,
      signer_phone: signerPhone,
      signer_email: signerEmail,
      fiscal_address: fiscalAddress,
      representative_name: representativeName || null,
      representative_powers: representativePowers || null,
      signer_role: signerRole,
      has_repse: hasRepse,
      repse_number: repseNumber || null,
      repse_activity: repseActivity || null,
      repse_expiration_date: repseExpirationDate,
      imss_patronal_registry: imssPatronalRegistry || null,
      approximate_workers: approximateWorkers,
      site_supervisor_name: siteSupervisorName || null,
      site_supervisor_phone: siteSupervisorPhone || null,
      bank_name: bankName,
      bank_clabe: bankClabe,
      bank_account_holder: bankAccountHolder,
      signature_data: signatureData,
      ine_front_data: ineFrontDocument,
      ine_back_data: ineBackDocument,
      tax_constancy_data: taxConstancyDocument,
      geo_lat: Number.isFinite(geoLat) ? geoLat : null,
      geo_lng: Number.isFinite(geoLng) ? geoLng : null,
      geo_accuracy: Number.isFinite(geoAccuracy) ? geoAccuracy : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      terms_accepted: true,
      nda_accepted: true,
      data_privacy_accepted: true,
      labor_liability_accepted: true,
      repse_compliance_accepted: true,
      warranty_accepted: true,
      signed_at: new Date().toISOString(),
    });

  if (insertError) {
    throw new Error(`Error al registrar el contrato firmado: ${insertError.message}`);
  }

  // Maestro `contractors`: el nombre lo administra ALFA (la razon social legal
  // queda en el convenio firmado). Del portal solo se completan telefono/correo
  // cuando estan vacios; nunca se sobrescribe un dato ya capturado por ALFA.
  try {
    const { data: contractorRow } = await admin
      .from("contractors")
      .select("phone, email")
      .eq("id", portalUser.contractor_id)
      .maybeSingle<{ phone: string | null; email: string | null }>();

    const contactPatch: Record<string, string> = {};
    if (contractorRow && !contractorRow.phone?.trim() && signerPhone) contactPatch.phone = signerPhone;
    if (contractorRow && !contractorRow.email?.trim() && signerEmail) contactPatch.email = signerEmail;

    if (Object.keys(contactPatch).length) {
      await admin
        .from("contractors")
        .update(contactPatch)
        .eq("id", portalUser.contractor_id);
    }
  } catch (e) {
    console.debug("[ContractorAgreement] Optional contractor profile update skipped:", e);
  }

  revalidatePath("/portal");
  revalidatePath(`/portal/services`);
  revalidatePath(`/contractors/${portalUser.contractor_id}`);
  revalidatePath(`/contractors/${portalUser.contractor_id}/portal-users`);

  return { ok: true };
}
