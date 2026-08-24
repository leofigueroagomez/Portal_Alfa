"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContractorPortalContext } from "@/lib/contractorPortal";
import { CONTRACTOR_AGREEMENT_VERSION } from "@/lib/contractorAgreementTemplate";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export async function submitContractorAgreementAction(formData: FormData) {
  const context = await getContractorPortalContext();
  if (!context) {
    throw new Error("No tienes autorización como contratista.");
  }

  const { portalUser, user } = context;

  // 0. Régimen de Prestación
  const serviceRegime = String(formData.get("service_regime") || "independent_technician").trim();

  // 1. Identificación Legal y Fiscal
  const personType = String(formData.get("person_type") || "fisica").trim();
  const legalBusinessName = String(formData.get("legal_business_name") || "").trim();
  const signerName = String(formData.get("signer_name") || "").trim();
  const signerRfc = String(formData.get("signer_rfc") || "").trim().toUpperCase();
  const signerCurp = String(formData.get("signer_curp") || "").trim().toUpperCase();
  const signerPhone = String(formData.get("signer_phone") || "").trim();
  const signerEmail = String(formData.get("signer_email") || user.email || "").trim().toLowerCase();
  const fiscalAddress = String(formData.get("fiscal_address") || "").trim();
  const representativeName = String(formData.get("representative_name") || "").trim();
  const representativePowers = String(formData.get("representative_powers") || "").trim();
  const signerRole = String(formData.get("signer_role") || "Técnico Especialista / Subcontratista").trim();

  // 2. Laboral y REPSE
  const hasRepse = formData.get("has_repse") === "true" || formData.get("has_repse") === "on";
  const repseNumber = String(formData.get("repse_number") || "").trim().toUpperCase();
  const repseActivity = String(formData.get("repse_activity") || "").trim();
  const repseExpirationDate = String(formData.get("repse_expiration_date") || "").trim() || null;
  const imssPatronalRegistry = String(formData.get("imss_patronal_registry") || "").trim().toUpperCase();
  const approximateWorkers = Number(formData.get("approximate_workers")) || 1;
  const siteSupervisorName = String(formData.get("site_supervisor_name") || "").trim();
  const siteSupervisorPhone = String(formData.get("site_supervisor_phone") || "").trim();

  // 3. Datos Bancarios
  const bankName = String(formData.get("bank_name") || "").trim();
  const bankClabe = String(formData.get("bank_clabe") || "").trim().replace(/\s/g, "");
  const bankAccountHolder = String(formData.get("bank_account_holder") || "").trim();

  // 4. Documentación y Firma
  const signatureData = String(formData.get("signature_data") || "").trim();
  const ineFrontData = String(formData.get("ine_front_data") || "").trim();
  const ineBackData = String(formData.get("ine_back_data") || "").trim();
  const taxConstancyData = String(formData.get("tax_constancy_data") || "").trim();

  // 5. Geolocalización
  const geoLatStr = String(formData.get("geo_lat") || "").trim();
  const geoLngStr = String(formData.get("geo_lng") || "").trim();
  const geoAccuracyStr = String(formData.get("geo_accuracy") || "").trim();

  const geoLat = geoLatStr ? Number(geoLatStr) : null;
  const geoLng = geoLngStr ? Number(geoLngStr) : null;
  const geoAccuracy = geoAccuracyStr ? Number(geoAccuracyStr) : null;

  // 6. Consentimientos
  const termsAccepted = formData.get("terms_accepted") === "on" || formData.get("terms_accepted") === "true";
  const ndaAccepted = formData.get("nda_accepted") === "on" || formData.get("nda_accepted") === "true";
  const dataPrivacyAccepted = formData.get("data_privacy_accepted") === "on" || formData.get("data_privacy_accepted") === "true";
  const laborLiabilityAccepted = formData.get("labor_liability_accepted") === "on" || formData.get("labor_liability_accepted") === "true";

  // Validaciones
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
  if (!bankName || !bankClabe || bankClabe.length !== 18) {
    throw new Error("La CLABE interbancaria debe tener exactamente 18 dígitos y el banco es obligatorio.");
  }
  if (!bankAccountHolder) {
    throw new Error("El titular de la cuenta bancaria es obligatorio.");
  }
  if (!ineFrontData) {
    throw new Error("Es obligatorio adjuntar la fotografía de tu Identificación Oficial (INE / Pasaporte) de frente.");
  }
  if (!signatureData || !signatureData.startsWith("data:image/")) {
    throw new Error("Es necesario estampar la firma autógrafa en el recuadro digital.");
  }
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
      ine_front_data: ineFrontData,
      ine_back_data: ineBackData || null,
      tax_constancy_data: taxConstancyData || null,
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

  // Actualizar datos del contratista en la base de datos principal si están vacíos
  try {
    await admin
      .from("contractors")
      .update({
        name: legalBusinessName || signerName,
        phone: signerPhone,
        email: signerEmail,
      })
      .eq("id", portalUser.contractor_id);
  } catch (e) {
    console.debug("[ContractorAgreement] Optional contractor profile update skipped:", e);
  }

  revalidatePath("/portal");
  revalidatePath(`/portal/services`);
  revalidatePath(`/contractors/${portalUser.contractor_id}`);
  revalidatePath(`/contractors/${portalUser.contractor_id}/portal-users`);

  return { ok: true };
}
