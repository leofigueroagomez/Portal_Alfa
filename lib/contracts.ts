import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";

export type PaymentMilestone = {
  percentage: number;
  concept: string;
  trigger: "contract_signature" | "equipment_delivery" | "rough_in_completed" | "commissioning" | "final_handover" | "custom";
  amountMxn?: number;
};

export type ProjectContractRecord = {
  id: number;
  contract_number: string;
  quote_id: number | null;
  client_project_id: number | null;
  client_id: number | null;
  version: number;
  status: "draft" | "pending_client_data" | "pending_signatures" | "signed" | "cancelled";
  client_type: "b2b" | "b2c";
  contract_date: string;
  valid_from: string | null;
  valid_to: string | null;
  estimated_weeks: number;
  work_schedule: string;
  currency: string;
  exchange_rate: number;
  subtotal_mxn: number;
  iva_mxn: number;
  total_amount_mxn: number;
  payment_milestones: PaymentMilestone[];
  disciplines: string[];
  scope_summary: string | null;
  technical_prerequisites: string | null;
  technical_exclusions: string | null;
  warranty_labor_months: number;
  warranty_equipment_notes: string | null;
  
  // Cliente Legal
  legal_business_name: string | null;
  legal_rfc: string | null;
  legal_tax_regime: string | null;
  legal_tax_zip_code: string | null;
  legal_fiscal_address: string | null;
  
  // Notariales
  notary_deed_number: string | null;
  notary_deed_date: string | null;
  notary_number: string | null;
  notary_city_state: string | null;
  notary_name: string | null;
  public_registry_folio: string | null;
  
  // Representante
  representative_name: string | null;
  representative_title: string | null;
  representative_powers_deed: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  representative_curp: string | null;
  
  // Obra
  site_manager_name: string | null;
  site_manager_phone: string | null;
  site_manager_email: string | null;
  
  // Documentos
  client_tax_constancy_url: string | null;
  client_articles_of_incorporation_url: string | null;
  client_signer_ine_front_url: string | null;
  client_signer_ine_back_url: string | null;
  
  // ALFA
  alfa_business_name: string;
  alfa_rfc: string;
  alfa_address: string;
  alfa_notary_deed: string;
  alfa_representative_name: string;
  alfa_representative_title: string;
  
  // Firmas
  client_signature_image_url: string | null;
  client_signed_at: string | null;
  client_signature_ip: string | null;
  client_signature_latitude: number | null;
  client_signature_longitude: number | null;
  client_signer_name: string | null;
  
  alfa_signature_image_url: string | null;
  alfa_signed_at: string | null;
  alfa_signer_name: string | null;
  
  contract_pdf_url: string | null;
  onboarding_token: string | null;
  signing_token: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Deduce las disciplinas técnicas del proyecto según las partidas de la cotización
 */
export function inferDisciplinesFromQuoteItems(items: Array<{ category?: string | null; description?: string | null; title?: string | null }>): string[] {
  const categories = new Set<string>();
  
  for (const item of items) {
    const text = `${item.category || ""} ${item.description || ""} ${item.title || ""}`.toLowerCase();
    
    if (text.includes("audio") || text.includes("bocina") || text.includes("sonos") || text.includes("amplificador") || text.includes("bowers")) {
      categories.add("Audio Distribuido y Alta Fidelidad");
    }
    if (text.includes("video") || text.includes("pantalla") || text.includes("proyector") || text.includes("hdmi") || text.includes("display")) {
      categories.add("Video y Entretenimiento");
    }
    if (text.includes("cctv") || text.includes("camara") || text.includes("cámara") || text.includes("nvr") || text.includes("dvr") || text.includes("hikvision") || text.includes("unifi protect")) {
      categories.add("Videovigilancia y CCTV");
    }
    if (text.includes("red") || text.includes("wifi") || text.includes("wi-fi") || text.includes("switch") || text.includes("router") || text.includes("access point") || text.includes("ubiquiti") || text.includes("unifi")) {
      categories.add("Redes, Cableado Estructurado y WiFi");
    }
    if (text.includes("persiana") || text.includes("cortina") || text.includes("somfy") || text.includes("lutron sivoia") || text.includes("motor")) {
      categories.add("Persianas y Cortinas Motorizadas");
    }
    if (text.includes("luz") || text.includes("iluminacion") || text.includes("iluminación") || text.includes("dimmer") || text.includes("lutron") || text.includes("ra2") || text.includes("caseta") || text.includes("homeworks")) {
      categories.add("Control de Iluminación Arquitectónica");
    }
    if (text.includes("acceso") || text.includes("chapa") || text.includes("biometrico") || text.includes("interfon") || text.includes("videoportero")) {
      categories.add("Control de Accesos y Comunicación");
    }
  }

  if (categories.size === 0) {
    return ["Sistemas e Integración Tecnológica ALFA IT"];
  }

  return Array.from(categories);
}

/**
 * Deduce si el cliente es B2B (Persona Moral) o B2C (Persona Física)
 */
export function inferClientType(rfc?: string | null): "b2b" | "b2c" {
  if (!rfc) return "b2b";
  const cleanRfc = rfc.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  // En México: Persona Moral = 12 caracteres, Persona Física = 13 caracteres
  if (cleanRfc.length === 13) {
    return "b2c";
  }
  return "b2b";
}

/**
 * Genera tokens criptográficos seguros
 */
export function generateContractToken(prefix: string = "ctk"): string {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Mensaje estructurado de WhatsApp para invitar al cliente al Onboarding
 */
export function buildClientContractOnboardingWhatsAppMessage({
  clientName,
  contractNumber,
  projectName,
  onboardingUrl,
}: {
  clientName: string;
  contractNumber: string;
  projectName: string;
  onboardingUrl: string;
}) {
  const text = [
    `Hola *${clientName}*,`,
    `¡Un gusto saludarte de parte de *ALFA IT*!`,
    "",
    `Con motivo de la autorización de tu proyecto *${projectName}* (*${contractNumber}*), requerimos formalizar el *Contrato de Servicios e Integración Tecnológica*.`,
    "",
    "📋 *Completar Datos del Contrato:*",
    "Para preparar tu contrato oficial de forma ágil, por favor ingresa al siguiente enlace seguro desde tu celular y completa los datos fiscales y del representante legal:",
    onboardingUrl,
    "",
    "⏱️ Toma menos de 2 minutos y puedes adjuntar tu Constancia de Situación Fiscal e INE directamente.",
    "",
    "Quedamos a tus órdenes.",
    "*ALFA IT Soluciones*",
  ].join("\n");

  return { text };
}

/**
 * Mensaje estructurado de WhatsApp para enviar el Contrato a Firma Digital
 */
export function buildClientContractSigningWhatsAppMessage({
  clientName,
  contractNumber,
  projectName,
  signingUrl,
}: {
  clientName: string;
  contractNumber: string;
  projectName: string;
  signingUrl: string;
}) {
  const text = [
    `Estimado(a) *${clientName}*,`,
    `Tu *Contrato de Servicios e Integración Tecnológica* para el proyecto *${projectName}* (*${contractNumber}*) está listo para firma.`,
    "",
    "✍️ *Revisión y Firma Digital:*",
    "Puedes revisar el contrato marco, el alcance de las partidas y firmar de conformidad desde tu dispositivo en el siguiente enlace:",
    signingUrl,
    "",
    "🔒 Cuenta con validez jurídica y trazabilidad conforme a la legislación mercantil y NOM-151.",
    "",
    "¡Gracias por confiar en ALFA IT!",
  ].join("\n");

  return { text };
}
