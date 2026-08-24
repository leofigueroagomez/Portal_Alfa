import "server-only";

import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getPublicDocumentLink, recordPublicDocumentAccess } from "@/lib/publicDocuments";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";

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
    clientSignerPhone?: string | null;
    clientSignerEmail?: string | null;
    clientSignedAt: string | null;
    alfaSignatureUrl: string | null;
    clientSignatureUrl: string | null;
    clientIneFrontUrl?: string | null;
    clientIneBackUrl?: string | null;
    signatureLatitude?: number | null;
    signatureLongitude?: number | null;
    signatureGeoAccuracyMeters?: number | null;
    privacyConsentAccepted?: boolean | null;
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
    throw new Error("Formato de imagen no válido (debe ser Base64)");
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
      "id, delivery_date, status, delivered_to_name, delivered_to_role, delivered_by_name, observations, client_signature_image_url, alfa_signature_image_url, site_attended_by_name, site_attended_by_role, client_signer_name, client_signer_phone, client_signer_email, client_signed_at, client_ine_front_url, client_ine_back_url, signature_latitude, signature_longitude, signature_geo_accuracy_meters, privacy_consent_accepted"
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
    clientIneFrontUrl,
    clientIneBackUrl,
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
    resolveSignedPhotoUrl(supabase, delivery.client_ine_front_url || null),
    resolveSignedPhotoUrl(supabase, delivery.client_ine_back_url || null),
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
      clientSignerPhone: delivery.client_signer_phone || clientData?.phone || null,
      clientSignerEmail: delivery.client_signer_email || clientData?.email || null,
      clientSignedAt: delivery.client_signed_at,
      alfaSignatureUrl,
      clientSignatureUrl,
      clientIneFrontUrl,
      clientIneBackUrl,
      signatureLatitude: delivery.signature_latitude,
      signatureLongitude: delivery.signature_longitude,
      signatureGeoAccuracyMeters: delivery.signature_geo_accuracy_meters,
      privacyConsentAccepted: delivery.privacy_consent_accepted,
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
  signerEmail?: string | null;
  signerPhone?: string | null;
  ineFrontDataUrl?: string | null;
  ineBackDataUrl?: string | null;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp?: string | null;
  } | null;
  privacyConsentAccepted?: boolean;
  privacyNoticeVersion?: string;
  ip?: string | null;
  userAgent?: string | null;
  request?: Request;
};

async function notifyManagementOfSignedDelivery(params: {
  projectId: number;
  deliveryId: number;
  clientName: string;
  projectName: string;
  signerName: string;
  signerEmail: string;
  signerPhone: string;
  signedAt: string;
  financialSummary: { approvedTotalMxn: number; paidTotalMxn: number; pendingTotalMxn: number };
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ALFA OS <notificaciones@alfait.com.mx>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurado. Se omite notificación a Dirección.");
    return;
  }

  const baseUrl = getAppBaseUrl();
  const reviewUrl = `${baseUrl}/projects/${params.projectId}/warranty/new?deliveryId=${params.deliveryId}`;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);

  const pendingFormatted = formatCurrency(params.financialSummary.pendingTotalMxn);
  const isPendingDebt = params.financialSummary.pendingTotalMxn > 1;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0B0D0F; color: #FFFFFF; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #151518; border-radius: 16px; border: 1px solid #2A2A30; overflow: hidden; }
          .header { background-color: #121316; padding: 24px; border-bottom: 1px solid #2A2A30; }
          .brand { color: #9E1B32; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
          .title { color: #FFFFFF; font-size: 20px; font-weight: bold; margin: 8px 0 0 0; }
          .content { padding: 24px; }
          .card { background-color: #1C1D22; border-radius: 12px; border: 1px solid #2A2A30; padding: 16px; margin-bottom: 16px; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; ${
            isPendingDebt
              ? "background-color: #351818; color: #FFB4B4; border: 1px solid #6A2A2A;"
              : "background-color: #143D2A; color: #8CE0B6; border: 1px solid #1F7A4D;"
          } }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .label { color: #8E8E93; }
          .value { color: #FFFFFF; font-weight: 600; text-align: right; }
          .cta-btn { display: block; background-color: #9E1B32; color: #FFFFFF; text-align: center; padding: 14px 20px; border-radius: 12px; font-weight: bold; text-decoration: none; margin-top: 20px; font-size: 14px; }
          .footer { padding: 16px 24px; background-color: #101114; color: #77777D; font-size: 11px; text-align: center; border-top: 1px solid #222228; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">ALFA OS • Notificación a Dirección</div>
            <div class="title">🔔 Proyecto Entregado: ${params.projectName}</div>
          </div>
          <div class="content">
            <p style="font-size: 14px; color: #D1D1D6; margin-top: 0;">
              El cliente titular ha firmado de conformidad la recepción del proyecto. Se requiere <strong>revisión de estado de cuenta</strong> previo a la emisión y envío de la Carta de Garantía.
            </p>

            <div class="card">
              <div style="font-size: 11px; text-transform: uppercase; color: #9E1B32; font-weight: bold; margin-bottom: 12px;">Datos de Contacto del Firmante (Posventa)</div>
              <div class="row"><span class="label">Cliente / Titular:</span><span class="value">${params.signerName}</span></div>
              <div class="row"><span class="label">Correo Electrónico:</span><span class="value">${params.signerEmail || "No proporcionado"}</span></div>
              <div class="row"><span class="label">Teléfono / WhatsApp:</span><span class="value">${params.signerPhone || "No proporcionado"}</span></div>
              <div class="row"><span class="label">Fecha y Hora de Firma:</span><span class="value">${new Date(params.signedAt).toLocaleString("es-MX")}</span></div>
            </div>

            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 11px; text-transform: uppercase; color: #9E1B32; font-weight: bold;">Estado de Cuenta Financiero</span>
                <span class="status-badge">${isPendingDebt ? "⚠️ Saldo Pendiente de Cobro" : "✓ Al Corriente ($0.00)"}</span>
              </div>
              <div class="row"><span class="label">Total Cotizado / Aprobado:</span><span class="value">${formatCurrency(params.financialSummary.approvedTotalMxn)}</span></div>
              <div class="row"><span class="label">Total Cobrado / Pagado:</span><span class="value">${formatCurrency(params.financialSummary.paidTotalMxn)}</span></div>
              <div class="row" style="border-top: 1px solid #2A2A30; padding-top: 8px; margin-top: 8px;">
                <span class="label" style="font-weight: bold; color: ${isPendingDebt ? "#FFB4B4" : "#8CE0B6"};">Saldo Pendiente:</span>
                <span class="value" style="font-size: 16px; color: ${isPendingDebt ? "#FFB4B4" : "#8CE0B6"};">${pendingFormatted}</span>
              </div>
            </div>

            <a href="${reviewUrl}" class="cta-btn">
              Revisar Estado de Cuenta y Emitir Garantía →
            </a>
          </div>
          <div class="footer">
            ALFA IT • Sistema Automatizado de Posventa y Garantías
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: ["direccion@alfait.com.mx"],
        subject: `🔔 Proyecto Entregado: ${params.projectName} - ${params.clientName} (${isPendingDebt ? "Saldo Pendiente: " + pendingFormatted : "Al Corriente"})`,
        html,
      }),
    });
  } catch (err) {
    console.error("Error enviando correo a Dirección:", err);
  }
}

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

  const timestamp = Date.now();

  // 1. Subir firma digital
  const { buffer: sigBuffer, mime: sigMime } = dataUrlToBuffer(input.signatureDataUrl);
  const signatureStoragePath = `project-deliveries/${projectId}/${deliveryId}/client-remote-signature-${timestamp}.png`;

  const { error: sigUploadError } = await supabase.storage
    .from("project-photos")
    .upload(signatureStoragePath, sigBuffer, {
      contentType: sigMime || "image/png",
      upsert: false,
      cacheControl: "3600",
    });

  if (sigUploadError) {
    console.error("Error subiendo firma de cliente a storage:", sigUploadError);
    throw new Error("No se pudo guardar la firma digital en el servidor.");
  }

  // 2. Subir INE Frontal si viene
  let ineFrontStoragePath: string | null = null;
  if (input.ineFrontDataUrl && input.ineFrontDataUrl.startsWith("data:image/")) {
    try {
      const { buffer: ineFrontBuffer, mime: ineFrontMime } = dataUrlToBuffer(input.ineFrontDataUrl);
      ineFrontStoragePath = `project-deliveries/${projectId}/${deliveryId}/client-ine-front-${timestamp}.png`;
      await supabase.storage
        .from("project-photos")
        .upload(ineFrontStoragePath, ineFrontBuffer, {
          contentType: ineFrontMime || "image/png",
          upsert: false,
          cacheControl: "3600",
        });
    } catch (e) {
      console.error("Error guardando foto INE frontal:", e);
    }
  }

  // 3. Subir INE Reverso si viene
  let ineBackStoragePath: string | null = null;
  if (input.ineBackDataUrl && input.ineBackDataUrl.startsWith("data:image/")) {
    try {
      const { buffer: ineBackBuffer, mime: ineBackMime } = dataUrlToBuffer(input.ineBackDataUrl);
      ineBackStoragePath = `project-deliveries/${projectId}/${deliveryId}/client-ine-back-${timestamp}.png`;
      await supabase.storage
        .from("project-photos")
        .upload(ineBackStoragePath, ineBackBuffer, {
          contentType: ineBackMime || "image/png",
          upsert: false,
          cacheControl: "3600",
        });
    } catch (e) {
      console.error("Error guardando foto INE reverso:", e);
    }
  }

  const signedAt = new Date().toISOString();
  const signerName = input.signerName.trim();
  const signerRole = input.signerRole?.trim() || "Cliente Titular";
  const signerEmail = input.signerEmail?.trim() || null;
  const signerPhone = input.signerPhone?.trim() || null;

  // Actualizar project_deliveries
  const { error: updateDeliveryError } = await supabase
    .from("project_deliveries")
    .update({
      client_signature_image_url: signatureStoragePath,
      client_ine_front_url: ineFrontStoragePath,
      client_ine_back_url: ineBackStoragePath,
      client_signer_name: signerName,
      delivered_to_name: signerName,
      delivered_to_role: signerRole,
      client_signer_email: signerEmail,
      client_signer_phone: signerPhone,
      client_signed_at: signedAt,
      client_signature_ip: input.ip || null,
      client_signature_user_agent: input.userAgent?.slice(0, 500) || null,
      signature_latitude: input.geolocation?.latitude || null,
      signature_longitude: input.geolocation?.longitude || null,
      signature_geo_accuracy_meters: input.geolocation?.accuracy || null,
      signature_geo_timestamp: input.geolocation?.timestamp || null,
      privacy_consent_accepted: Boolean(input.privacyConsentAccepted),
      privacy_consent_accepted_at: input.privacyConsentAccepted ? signedAt : null,
      privacy_notice_version: input.privacyNoticeVersion || "v1.0",
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

  // Cargar datos para notificación a Dirección
  const [{ data: project }, financialSummary] = await Promise.all([
    supabase
      .from("client_projects")
      .select("id, name, client_id, clients(name, company_name)")
      .eq("id", projectId)
      .maybeSingle(),
    getProjectFinancialSummary(supabase, projectId),
  ]);

  const clientName =
    (project as { clients?: { name?: string; company_name?: string } | null })?.clients
      ?.company_name ||
    (project as { clients?: { name?: string; company_name?: string } | null })?.clients
      ?.name ||
    signerName;

  // Enviar notificación a Dirección
  await notifyManagementOfSignedDelivery({
    projectId,
    deliveryId,
    clientName,
    projectName: project?.name || "Proyecto",
    signerName,
    signerEmail: signerEmail || "",
    signerPhone: signerPhone || "",
    signedAt,
    financialSummary,
  });

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
