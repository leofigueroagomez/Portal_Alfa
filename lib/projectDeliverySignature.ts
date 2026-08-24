import "server-only";

import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getPublicDocumentLink, recordPublicDocumentAccess } from "@/lib/publicDocuments";
import { getAppBaseUrl } from "@/lib/appUrl";

export type DeliverySigningContext = {
  isValid: boolean;
  isAlreadySigned: boolean;
  errorMessage?: string;
  delivery?: {
    id: number;
    deliveryDate: string;
    status: string;
    deliveredByName: string | null;
    observations: string | null;
    siteAttendedByName: string | null;
    siteAttendedByRole: string | null;
    clientSignerName: string | null;
    clientSignedAt: string | null;
    alfaSignatureUrl: string | null;
    clientSignatureUrl: string | null;
  };
  project?: {
    id: number;
    name: string;
    siteAddress: string | null;
  };
  client?: {
    id: number;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
  };
  systems: Array<{
    id: number;
    systemName: string;
    notes: string | null;
  }>;
  pendingItems: Array<{
    id: number;
    description: string;
    status: string;
  }>;
  evidences: Array<{
    id: number;
    caption: string | null;
    displayUrl: string;
  }>;
};

async function resolveSignedPhotoUrl(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  try {
    const { data } = await supabase.storage
      .from("project-photos")
      .createSignedUrl(path, 60 * 60); // 1 hora de vigencia
    return data?.signedUrl || null;
  } catch (error) {
    console.error("Error resolviendo signed URL de foto:", error);
    return null;
  }
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Formato de firma no válido (debe ser imagen en Base64)");
  }
  const mime = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  return { buffer, mime };
}

/**
 * Obtiene el contexto completo de una entrega para que el cliente la revise y firme desde su móvil.
 */
export async function getDeliverySigningContext(
  token: string,
  audit?: { request?: Request; requestId?: string }
): Promise<DeliverySigningContext> {
  const result = await getPublicDocumentLink(token, audit);

  if (!result || !result.link) {
    return {
      isValid: false,
      isAlreadySigned: false,
      errorMessage: "El enlace de firma no es válido o ha expirado.",
      systems: [],
      pendingItems: [],
      evidences: [],
    };
  }

  const { supabase, link } = result;

  if (
    link.document_type !== "project_delivery_sign" &&
    link.document_type !== "project_delivery"
  ) {
    return {
      isValid: false,
      isAlreadySigned: false,
      errorMessage: "El tipo de documento no corresponde a una entrega de proyecto.",
      systems: [],
      pendingItems: [],
      evidences: [],
    };
  }

  if (!link.project_delivery_id) {
    return {
      isValid: false,
      isAlreadySigned: false,
      errorMessage: "No se encontró el identificador de la entrega.",
      systems: [],
      pendingItems: [],
      evidences: [],
    };
  }

  const deliveryId = link.project_delivery_id;
  const projectId = link.client_project_id;

  const { data: delivery, error: deliveryError } = await supabase
    .from("project_deliveries")
    .select(
      "id, delivery_date, status, delivered_to_name, delivered_to_role, delivered_by_name, observations, client_signature_image_url, alfa_signature_image_url, site_attended_by_name, site_attended_by_role, client_signer_name, client_signed_at"
    )
    .eq("id", deliveryId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (deliveryError || !delivery) {
    return {
      isValid: false,
      isAlreadySigned: false,
      errorMessage: "La entrega solicitada no existe.",
      systems: [],
      pendingItems: [],
      evidences: [],
    };
  }

  const isAlreadySigned = Boolean(
    delivery.client_signature_image_url || delivery.client_signed_at
  );

  const [
    projectRes,
    systemsRes,
    pendingRes,
    evidencesRes,
    alfaSignatureUrl,
    clientSignatureUrl,
  ] = await Promise.all([
    supabase
      .from("client_projects")
      .select("id, name, site_address, client_id")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_delivery_systems")
      .select("id, system_name, notes")
      .eq("project_delivery_id", deliveryId),
    supabase
      .from("project_delivery_pending_items")
      .select("id, description, status")
      .eq("project_delivery_id", deliveryId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_delivery_evidences")
      .select("id, file_url, file_path, caption")
      .eq("project_delivery_id", deliveryId)
      .order("sort_order", { ascending: true }),
    resolveSignedPhotoUrl(supabase, delivery.alfa_signature_image_url),
    resolveSignedPhotoUrl(supabase, delivery.client_signature_image_url),
  ]);

  let clientData = null;
  if (projectRes.data?.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, company_name, phone, email")
      .eq("id", projectRes.data.client_id)
      .maybeSingle();
    clientData = client;
  }

  const evidenceItems = await Promise.all(
    (evidencesRes.data || []).map(async (item) => ({
      id: item.id,
      caption: item.caption,
      displayUrl:
        (await resolveSignedPhotoUrl(supabase, item.file_path || item.file_url)) || "",
    }))
  );

  return {
    isValid: true,
    isAlreadySigned,
    delivery: {
      id: delivery.id,
      deliveryDate: delivery.delivery_date,
      status: delivery.status,
      deliveredByName: delivery.delivered_by_name,
      observations: delivery.observations,
      siteAttendedByName: delivery.site_attended_by_name,
      siteAttendedByRole: delivery.site_attended_by_role,
      clientSignerName: delivery.client_signer_name || delivery.delivered_to_name,
      clientSignedAt: delivery.client_signed_at,
      alfaSignatureUrl,
      clientSignatureUrl,
    },
    project: projectRes.data
      ? {
          id: projectRes.data.id,
          name: projectRes.data.name || "Proyecto ALFA",
          siteAddress: projectRes.data.site_address,
        }
      : undefined,
    client: clientData
      ? {
          id: clientData.id,
          name: clientData.name,
          companyName: clientData.company_name || null,
          phone: clientData.phone,
          email: clientData.email,
        }
      : undefined,
    systems: (systemsRes.data || []).map((s) => ({
      id: s.id,
      systemName: s.system_name,
      notes: s.notes,
    })),
    pendingItems: (pendingRes.data || []).map((p) => ({
      id: p.id,
      description: p.description,
      status: p.status,
    })),
    evidences: evidenceItems.filter((e) => Boolean(e.displayUrl)),
  };
}

/**
 * Genera el texto formal y la URL wa.me para enviar al cliente por WhatsApp.
 */
export function generateDeliveryWhatsAppPayload(input: {
  phone: string;
  clientName: string;
  projectName: string;
  token: string;
  siteAttendedByName?: string | null;
}) {
  const baseUrl = getAppBaseUrl();
  const signingUrl = `${baseUrl}/public/delivery-sign/${input.token}`;
  const cleanPhone = input.phone.replace(/[^\d+]/g, "").replace(/^\+/, "");

  const siteInfo = input.siteAttendedByName?.trim()
    ? `\nEn sitio nos atendió: *${input.siteAttendedByName.trim()}*.`
    : "";

  const text = [
    `Hola *${input.clientName}*,`,
    `En *ALFA* hemos concluido los trabajos técnicos y pruebas de entrega para el proyecto *${input.projectName}*.${siteInfo}`,
    "",
    "Te compartimos el reporte digital con las evidencias fotográficas, sistemas instalados y notas para tu revisión y firma digital de conformidad:",
    signingUrl,
    "",
    "Agradecemos tu preferencia.",
  ].join("\n");

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  return {
    text,
    signingUrl,
    waUrl,
  };
}

export type SubmitDeliverySignatureInput = {
  token: string;
  signatureDataUrl: string;
  signerName: string;
  signerRole?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  request?: Request;
};

/**
 * Procesa la firma digital enviada por el cliente desde su smartphone o navegador.
 */
export async function submitDeliverySignature(input: SubmitDeliverySignatureInput) {
  const supabase = createSupabaseAdminClient();

  const { data: link, error: linkError } = await supabase
    .from("public_document_links")
    .select("id, client_project_id, project_delivery_id, expires_at, revoked_at")
    .eq("token", input.token)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error("El enlace de firma no es válido o ha expirado.");
  }

  if (link.revoked_at) {
    throw new Error("El enlace de firma fue revocado.");
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new Error("El enlace de firma ha expirado.");
  }

  if (!link.project_delivery_id) {
    throw new Error("El enlace no tiene una entrega asociada.");
  }

  const deliveryId = link.project_delivery_id;
  const projectId = link.client_project_id;

  // Verificar que la entrega no esté ya firmada
  const { data: currentDelivery, error: currentDeliveryError } = await supabase
    .from("project_deliveries")
    .select("id, client_signature_image_url, client_signed_at")
    .eq("id", deliveryId)
    .eq("client_project_id", projectId)
    .single();

  if (currentDeliveryError || !currentDelivery) {
    throw new Error("Entrega no encontrada.");
  }

  if (currentDelivery.client_signature_image_url || currentDelivery.client_signed_at) {
    throw new Error("Esta entrega ya fue firmada previamente.");
  }

  // Convertir firma y subir a storage
  const { buffer, mime } = dataUrlToBuffer(input.signatureDataUrl);
  const timestamp = Date.now();
  const signatureStoragePath = `project-deliveries/${projectId}/${deliveryId}/client-remote-signature-${timestamp}.png`;

  const { error: uploadError } = await supabase.storage
    .from("project-photos")
    .upload(signatureStoragePath, buffer, {
      contentType: mime || "image/png",
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("Error subiendo firma de cliente a storage:", uploadError);
    throw new Error("No se pudo guardar la firma digital en el servidor.");
  }

  const signedAt = new Date().toISOString();
  const signerName = input.signerName.trim();
  const signerRole = input.signerRole?.trim() || "Cliente Titular";

  // Actualizar project_deliveries
  const { error: updateDeliveryError } = await supabase
    .from("project_deliveries")
    .update({
      client_signature_image_url: signatureStoragePath,
      client_signer_name: signerName,
      delivered_to_name: signerName,
      delivered_to_role: signerRole,
      client_signed_at: signedAt,
      client_signature_ip: input.ip || null,
      client_signature_user_agent: input.userAgent?.slice(0, 500) || null,
      signature_method: "whatsapp_link",
      status: "delivered",
    })
    .eq("id", deliveryId);

  if (updateDeliveryError) {
    console.error("Error actualizando entrega con firma:", updateDeliveryError);
    throw new Error("No se pudo registrar la firma en la entrega.");
  }

  // Actualizar estado del proyecto a 'delivered'
  await supabase
    .from("client_projects")
    .update({ sales_stage: "delivered" })
    .eq("id", projectId)
    .in("sales_stage", ["won", "installed", "site_visit", "negotiation"]);

  // Registrar auditoría
  await recordPublicDocumentAccess(
    supabase,
    {
      id: link.id,
      token: input.token,
      document_type: "project_delivery_sign",
      client_project_id: projectId,
      project_delivery_id: deliveryId,
      project_warranty_id: null,
      quote_id: null,
      document_id: null,
      project_invoice_id: null,
      file_format: null,
      expires_at: link.expires_at,
    },
    "signed",
    { request: input.request }
  );

  return {
    success: true,
    deliveryId,
    projectId,
    signedAt,
    signerName,
  };
}
