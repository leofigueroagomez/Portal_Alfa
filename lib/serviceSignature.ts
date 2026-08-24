import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getAlfaBankAccounts, formatBankTransferInstructions } from "@/lib/bankAccounts";
import { resolveServicePhotoUrl } from "@/lib/serviceReports";
import { getServiceProposalTotals, type ServiceProposalQuoteItem } from "@/lib/serviceProposal";
import { getOrCreateServiceStripeCheckout } from "@/lib/stripe";

export type ServiceSigningContext = {
  serviceReport: {
    id: number;
    service_number: string | null;
    service_location: string | null;
    google_maps_url: string | null;
    performed_by_name: string | null;
    service_date: string | null;
    background: string | null;
    diagnosis: string | null;
    solution_status: string | null;
    solution_description: string | null;
    recommendations: string | null;
    requires_parts: boolean | null;
    required_parts_notes: string | null;
    labor_sale_mxn: number | null;
    status: string | null;
    payment_status: string | null;
    paid_at: string | null;
    payment_method: string | null;
    payment_reference: string | null;
    payment_link_url: string | null;
    client_signer_name: string | null;
    client_signer_email: string | null;
    client_signer_phone: string | null;
    client_signed_at: string | null;
    client_signature_image_url: string | null;
    client_ine_front_url: string | null;
    client_ine_back_url: string | null;
  };
  client: {
    name: string | null;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  project: {
    name: string | null;
    site_address?: string | null;
  } | null;
  photos: Array<{
    id: number;
    image_url: string | null;
    caption: string | null;
    displayUrl: string;
  }>;
  financials: {
    laborMxn: number;
    partsMxn: number;
    discountMxn: number;
    subtotalMxn: number;
    ivaMxn: number;
    totalMxn: number;
  };
  bankAccounts: ReturnType<typeof getAlfaBankAccounts>;
  isAlreadySigned: boolean;
  token: string;
};

export async function getServiceSigningContext(token: string): Promise<ServiceSigningContext> {
  const supabase = createSupabaseAdminClient();

  const { data: link, error: linkError } = await supabase
    .from("public_document_links")
    .select("id, token, document_type, service_report_id, client_project_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (linkError || !link) {
    throw new Error("El enlace de firma es inválido o no existe.");
  }

  if (link.revoked_at) {
    throw new Error("Este enlace de firma ha sido revocado.");
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new Error("Este enlace de firma ha expirado. Por favor solicita uno nuevo.");
  }

  if (!link.service_report_id) {
    throw new Error("El enlace no tiene un reporte de servicio asociado.");
  }

  const { data: report, error: reportError } = await supabase
    .from("service_reports")
    .select(`
      id, service_number, client_id, client_project_id, service_location, google_maps_url,
      performed_by_name, service_date, background, diagnosis, solution_status,
      solution_description, recommendations, requires_parts, required_parts_notes,
      labor_sale_mxn, service_discount_mxn, service_discount_percent, service_discount_type,
      status, payment_status, paid_at, payment_method, payment_reference, payment_link_url,
      client_signer_name, client_signer_email, client_signer_phone, client_signed_at,
      client_signature_image_url, client_ine_front_url, client_ine_back_url,
      related_quote_id,
      clients (name, company_name, email, phone),
      client_projects (name, site_address)
    `)
    .eq("id", link.service_report_id)
    .maybeSingle();

  if (reportError || !report) {
    throw new Error("Reporte de servicio no encontrado.");
  }

  // Cargar fotos de evidencias
  const { data: rawPhotos } = await supabase
    .from("service_report_photos")
    .select("id, image_url, caption, sort_order")
    .eq("service_report_id", report.id)
    .order("sort_order", { ascending: true });

  const photos = await Promise.all(
    (rawPhotos || []).map(async (photo) => ({
      ...photo,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, photo.image_url),
    }))
  );

  // Calcular refacciones si hay cotización relacionada
  let quoteItems: ServiceProposalQuoteItem[] = [];
  if (report.related_quote_id) {
    const { data: items } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", report.related_quote_id);
    if (items) quoteItems = items as ServiceProposalQuoteItem[];
  }

  const totals = getServiceProposalTotals(
    {
      labor_sale_mxn: report.labor_sale_mxn || 0,
      service_discount_type: report.service_discount_type,
      service_discount_percent: report.service_discount_percent,
      service_discount_mxn: report.service_discount_mxn,
    },
    quoteItems
  );

  const clientObj = Array.isArray(report.clients)
    ? report.clients[0] || null
    : (report.clients as { name: string | null; company_name?: string | null; email?: string | null; phone?: string | null } | null);

  const projectObj = Array.isArray(report.client_projects)
    ? report.client_projects[0] || null
    : (report.client_projects as { name: string | null; site_address?: string | null } | null);

  let paymentLinkUrl = report.payment_link_url;
  if (!paymentLinkUrl && totals.total > 0) {
    paymentLinkUrl = await getOrCreateServiceStripeCheckout({
      serviceId: report.id,
      serviceNumber: report.service_number || `SERV-${String(report.id).padStart(4, "0")}`,
      amountMxn: totals.total,
      clientName: clientObj?.company_name || clientObj?.name || "Cliente",
      clientEmail: clientObj?.email || null,
      token,
    });
  }

  const isAlreadySigned = Boolean(report.client_signed_at && report.client_signature_image_url);

  return {
    serviceReport: {
      ...report,
      payment_link_url: paymentLinkUrl,
    },
    client: clientObj,
    project: projectObj,
    photos,
    financials: {
      laborMxn: totals.serviceSubtotal,
      partsMxn: totals.partsSubtotal,
      discountMxn: totals.discount,
      subtotalMxn: totals.subtotal,
      ivaMxn: totals.iva,
      totalMxn: totals.total,
    },
    bankAccounts: getAlfaBankAccounts(),
    isAlreadySigned,
    token,
  };
}

export type SubmitServiceSignatureInput = {
  token: string;
  signatureDataUrl: string;
  signerName: string;
  signerEmail: string;
  signerPhone: string;
  ineFrontDataUrl?: string | null;
  ineBackDataUrl?: string | null;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp?: string | null;
  } | null;
  privacyConsentAccepted: boolean;
  ip?: string | null;
  userAgent?: string | null;
  request?: Request;
};

export async function submitServiceSignature(input: SubmitServiceSignatureInput) {
  const supabase = createSupabaseAdminClient();

  const { data: link, error: linkError } = await supabase
    .from("public_document_links")
    .select("id, token, service_report_id, client_project_id, expires_at, revoked_at")
    .eq("token", input.token)
    .maybeSingle();

  if (linkError || !link || !link.service_report_id) {
    throw new Error("Enlace de firma inválido.");
  }

  if (link.revoked_at || (link.expires_at && new Date(link.expires_at) < new Date())) {
    throw new Error("El enlace de firma ha expirado o ha sido revocado.");
  }

  const { data: report, error: reportError } = await supabase
    .from("service_reports")
    .select("id, service_number, client_id, client_project_id, labor_sale_mxn, related_quote_id, clients(name, company_name, email), client_projects(name)")
    .eq("id", link.service_report_id)
    .maybeSingle();

  if (reportError || !report) {
    throw new Error("Reporte de servicio no encontrado.");
  }

  const timestamp = Date.now();
  const bucketName = "project-photos";

  // 1. Guardar firma en Storage
  const sigMatch = input.signatureDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!sigMatch) {
    throw new Error("Formato de firma no válido.");
  }
  const sigExt = sigMatch[1] === "jpeg" ? "jpg" : sigMatch[1];
  const sigBuffer = Buffer.from(sigMatch[2], "base64");
  const sigStoragePath = `signatures/services/${report.id}/client-sign-${timestamp}.${sigExt}`;

  const sigUpload = await supabase.storage
    .from(bucketName)
    .upload(sigStoragePath, sigBuffer, {
      contentType: `image/${sigExt}`,
      upsert: true,
    });

  if (sigUpload.error) {
    console.error("Error subiendo firma de servicio:", sigUpload.error);
    throw new Error("No se pudo almacenar la imagen de firma digital.");
  }

  // 2. Guardar INE Frontal si se adjuntó
  let ineFrontPath: string | null = null;
  if (input.ineFrontDataUrl) {
    const frontMatch = input.ineFrontDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (frontMatch) {
      const frontExt = frontMatch[1] === "jpeg" ? "jpg" : frontMatch[1];
      const frontBuffer = Buffer.from(frontMatch[2], "base64");
      const frontPath = `ine/services/${report.id}/ine-front-${timestamp}.${frontExt}`;
      const frontUpload = await supabase.storage
        .from(bucketName)
        .upload(frontPath, frontBuffer, { contentType: `image/${frontExt}`, upsert: true });
      if (!frontUpload.error) {
        ineFrontPath = frontPath;
      }
    }
  }

  // 3. Guardar INE Reverso si se adjuntó
  let ineBackPath: string | null = null;
  if (input.ineBackDataUrl) {
    const backMatch = input.ineBackDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (backMatch) {
      const backExt = backMatch[1] === "jpeg" ? "jpg" : backMatch[1];
      const backBuffer = Buffer.from(backMatch[2], "base64");
      const backPath = `ine/services/${report.id}/ine-back-${timestamp}.${backExt}`;
      const backUpload = await supabase.storage
        .from(bucketName)
        .upload(backPath, backBuffer, { contentType: `image/${backExt}`, upsert: true });
      if (!backUpload.error) {
        ineBackPath = backPath;
      }
    }
  }

  const signedAtIso = new Date().toISOString();

  // 4. Actualizar service_reports
  const { error: updateError } = await supabase
    .from("service_reports")
    .update({
      client_signature_image_url: sigStoragePath,
      client_signer_name: input.signerName.trim(),
      client_signer_email: input.signerEmail.trim(),
      client_signer_phone: input.signerPhone.trim(),
      client_signed_at: signedAtIso,
      signature_method: "whatsapp_link",
      client_signature_ip: input.ip || null,
      client_signature_user_agent: input.userAgent || null,
      client_ine_front_url: ineFrontPath,
      client_ine_back_url: ineBackPath,
      signature_latitude: input.geolocation?.latitude ?? null,
      signature_longitude: input.geolocation?.longitude ?? null,
      signature_geo_accuracy_meters: input.geolocation?.accuracy ?? null,
      privacy_consent_accepted: input.privacyConsentAccepted,
      status: "completed",
      completed_at: signedAtIso,
      payment_status: "pending_payment",
    })
    .eq("id", report.id);

  if (updateError) {
    console.error("Error actualizando service_report:", updateError);
    throw new Error("No se pudo registrar la firma en el reporte de servicio.");
  }

  // 5. Notificar a Dirección por correo sobre el servicio firmado y pendiente de cobro
  notifyManagementOfSignedService({
    serviceId: report.id,
    serviceNumber: report.service_number || `SERV-${String(report.id).padStart(4, "0")}`,
    clientName: (report.clients as { name?: string; company_name?: string } | null)?.company_name || (report.clients as { name?: string } | null)?.name || input.signerName,
    projectName: (report.client_projects as { name?: string } | null)?.name || "Servicio General",
    signerName: input.signerName,
    signerEmail: input.signerEmail,
    signerPhone: input.signerPhone,
    signedAt: signedAtIso,
    totalMxn: report.labor_sale_mxn || 0,
  }).catch((err) => console.error("Error notificando a dirección sobre servicio firmado:", err));

  return {
    success: true,
    serviceId: report.id,
    signedAt: signedAtIso,
    signerName: input.signerName,
  };
}

async function notifyManagementOfSignedService(input: {
  serviceId: number;
  serviceNumber: string;
  clientName: string;
  projectName: string;
  signerName: string;
  signerEmail: string;
  signerPhone: string;
  signedAt: string;
  totalMxn: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ALFA IT <direccion@alfait.com.mx>";
  const to = "direccion@alfait.com.mx";

  if (!apiKey) return;

  const baseUrl = getAppBaseUrl();
  const serviceAdminUrl = `${baseUrl}/services/${input.serviceId}`;
  const formattedTotal = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(input.totalMxn);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0D0F; color: #FFFFFF; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #151518; border-radius: 16px; border: 1px solid #2A2A30; overflow: hidden; }
          .header { background-color: #121316; padding: 24px; border-bottom: 1px solid #2A2A30; text-align: center; }
          .brand { color: #9E1B32; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
          .title { color: #FFFFFF; font-size: 20px; font-weight: bold; margin: 8px 0 0 0; }
          .content { padding: 24px; line-height: 1.6; font-size: 14px; color: #D1D1D6; }
          .card { background-color: #1C1D22; border-radius: 12px; border: 1px solid #2A2A30; padding: 16px; margin: 16px 0; }
          .highlight { color: #F4C66A; font-weight: bold; }
          .btn { display: inline-block; background-color: #9E1B32; color: #FFFFFF; font-weight: bold; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-top: 16px; }
          .footer { padding: 16px 24px; background-color: #101114; color: #77777D; font-size: 11px; text-align: center; border-top: 1px solid #222228; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">ALFA IT • Control de Servicios y Cobranza</div>
            <div class="title">Servicio Firmado por el Cliente ✍️</div>
          </div>
          <div class="content">
            <p>Se ha recibido la <strong>firma de conformidad</strong> para el servicio técnico <strong>${input.serviceNumber}</strong>.</p>
            
            <div class="card">
              <div style="font-size: 11px; text-transform: uppercase; color: #9E1B32; font-weight: bold; margin-bottom: 8px;">Datos de Recepción</div>
              <div>• <strong>Cliente:</strong> ${input.clientName}</div>
              <div>• <strong>Proyecto / Sitio:</strong> ${input.projectName}</div>
              <div>• <strong>Firmante:</strong> ${input.signerName}</div>
              <div>• <strong>Correo de Cobranza:</strong> ${input.signerEmail}</div>
              <div>• <strong>Teléfono / WhatsApp:</strong> ${input.signerPhone}</div>
              <div>• <strong>Fecha / Hora:</strong> ${new Date(input.signedAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</div>
            </div>

            <div class="card" style="border-color: #614620; background-color: #22180C;">
              <div style="font-size: 11px; text-transform: uppercase; color: #F4C66A; font-weight: bold; margin-bottom: 8px;">Estado de Cobranza</div>
              <div style="font-size: 16px; margin: 4px 0;">Monto Pendiente de Cobro: <span class="highlight">${formattedTotal}</span></div>
              <div style="font-size: 12px; color: #B3B3B8;">El cliente ya recibió los datos bancarios para transferencia SPEI. Los recordatorios diarios automáticos están programados.</div>
            </div>

            <div style="text-align: center;">
              <a href="${serviceAdminUrl}" class="btn">Ver Servicio y Gestionar Cobro en ALFA OS</a>
            </div>
          </div>
          <div class="footer">
            ALFA OS • Sistema de Notificaciones Internas de Dirección
          </div>
        </div>
      </body>
    </html>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `🔔 Servicio Firmado [${input.serviceNumber}] - ${input.clientName} (Pendiente Cobro: ${formattedTotal})`,
      html,
    }),
  });
}
