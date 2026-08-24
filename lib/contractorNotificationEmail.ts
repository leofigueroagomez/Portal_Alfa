import "server-only";

import { getAppBaseUrl } from "@/lib/appUrl";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export interface ContractorServiceEmailParams {
  serviceId: number;
  contractorId: number;
  recipientEmail?: string;
  recipientName?: string;
}

export async function sendContractorServiceAssignmentEmail({
  serviceId,
  contractorId,
  recipientEmail,
  recipientName,
}: ContractorServiceEmailParams) {
  const admin = createSupabaseAdminClient();

  // 1. Fetch service details
  const { data: service, error: serviceError } = await admin
    .from("service_reports")
    .select(
      `
      id,
      service_number,
      service_date,
      scheduled_time_start,
      scheduled_time_end,
      is_remote,
      service_location,
      google_maps_url,
      requester_name,
      requester_phone,
      background,
      diagnosis,
      status,
      clients (name),
      client_projects (name)
    `
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (serviceError || !service) {
    throw new Error("No se encontró el servicio para notificar.");
  }

  // 2. Fetch contractor details
  const { data: contractor, error: contractorError } = await admin
    .from("contractors")
    .select("id, name, email, phone")
    .eq("id", contractorId)
    .maybeSingle();

  if (contractorError || !contractor) {
    throw new Error("No se encontró el subcontratista asignado.");
  }

  // 3. Resolve recipient emails (direct parameter, contractor.email, or contractor_portal_users)
  const targetEmails = new Set<string>();
  if (recipientEmail && recipientEmail.includes("@")) {
    targetEmails.add(recipientEmail.trim().toLowerCase());
  }
  if (contractor.email && contractor.email.includes("@")) {
    targetEmails.add(contractor.email.trim().toLowerCase());
  }

  // Also look up active contractor_portal_users
  const { data: portalUsers } = await admin
    .from("contractor_portal_users")
    .select("user_id")
    .eq("contractor_id", contractorId)
    .eq("is_active", true);

  if (portalUsers && portalUsers.length > 0) {
    const { data: authUsers } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authUsers?.users) {
      for (const pu of portalUsers) {
        const matchingAuth = authUsers.users.find((u) => u.id === pu.user_id);
        if (matchingAuth?.email) {
          targetEmails.add(matchingAuth.email.trim().toLowerCase());
        }
      }
    }
  }

  const emailList = Array.from(targetEmails);
  if (emailList.length === 0) {
    return {
      ok: false,
      error: "El contratista no tiene ningún correo electrónico registrado.",
    };
  }

  const appBaseUrl = getAppBaseUrl() || "https://www.alfait.com.mx";
  const portalServiceUrl = `${appBaseUrl}/portal/services/${service.id}`;
  const folio = service.service_number || `SRV-${service.id}`;
  const clientName = (service.clients as any)?.name || "Cliente ALFA";
  const projectName = (service.client_projects as any)?.name || "Proyecto Residencial / Comercial";
  const formattedDate = service.service_date
    ? new Date(service.service_date + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Por definir";

  const scheduleText =
    service.scheduled_time_start && service.scheduled_time_end
      ? `${service.scheduled_time_start} a ${service.scheduled_time_end}`
      : service.scheduled_time_start || "Horario por coordinar";

  const mapsButtonHtml = service.google_maps_url
    ? `
      <div style="margin: 16px 0;">
        <a href="${service.google_maps_url}" target="_blank" style="background-color: #27272A; color: #FFFFFF; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; display: inline-block; border: 1px solid #3F3F46;">
          📍 Abrir ubicación en Google Maps
        </a>
      </div>
    `
    : "";

  const subject = `Asignación de Servicio: ${folio} - ${clientName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F0F0F; color: #FFFFFF; margin: 0; padding: 24px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #18181B; border-radius: 12px; border: 1px solid #27272A; overflow: hidden;">
        
        <!-- Header -->
        <tr>
          <td style="padding: 28px 32px; background-color: #121214; border-bottom: 1px solid #27272A;">
            <div style="font-size: 11px; font-weight: 700; color: #B84A5A; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 4px;">
              ALFA OS · Asignación Técnica
            </div>
            <h1 style="font-size: 20px; font-weight: 600; color: #FFFFFF; margin: 0;">
              Nuevo Servicio Asignado: <span style="color: #F0B8C0;">${folio}</span>
            </h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 32px;">
            <p style="font-size: 15px; line-height: 24px; color: #D4D4D8; margin-top: 0; margin-bottom: 20px;">
              Hola <strong>${recipientName || contractor.name}</strong>, se te ha asignado la ejecución del siguiente servicio técnico en ALFA OS:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #27272A; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #A1A1AA;" width="35%"><strong>Cliente / Sitio:</strong></td>
                <td style="padding: 6px 0; font-size: 14px; color: #FFFFFF; font-weight: 500;">${clientName} (${projectName})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #A1A1AA;"><strong>Fecha Programada:</strong></td>
                <td style="padding: 6px 0; font-size: 14px; color: #FFFFFF; font-weight: 500;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #A1A1AA;"><strong>Horario Estimado:</strong></td>
                <td style="padding: 6px 0; font-size: 14px; color: #FFFFFF; font-weight: 500;">${scheduleText}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #A1A1AA;"><strong>Modalidad:</strong></td>
                <td style="padding: 6px 0; font-size: 14px; color: #FFFFFF; font-weight: 500;">${service.is_remote ? "Remoto" : "Presencial en Sitio"}</td>
              </tr>
              ${
                service.service_location
                  ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #A1A1AA;"><strong>Dirección:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #FFFFFF;">${service.service_location}</td>
                </tr>
              `
                  : ""
              }
              ${
                service.requester_name || service.requester_phone
                  ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #A1A1AA;"><strong>Contacto en Sitio:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #FFFFFF;">${service.requester_name || "Contacto"} ${
                      service.requester_phone ? `(${service.requester_phone})` : ""
                    }</td>
                </tr>
              `
                  : ""
              }
            </table>

            ${mapsButtonHtml}

            <!-- Background / Issue description -->
            ${
              service.background || service.diagnosis
                ? `
              <div style="margin-bottom: 24px; padding: 16px; background-color: #1F1F23; border-left: 3px solid #7A1F2B; border-radius: 4px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #F0B8C0; margin-bottom: 6px;">
                  Descripción del Requerimiento / Falla:
                </div>
                <div style="font-size: 14px; line-height: 22px; color: #E4E4E7; white-space: pre-wrap;">${
                  service.background || service.diagnosis
                }</div>
              </div>
            `
                : ""
            }

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0 16px 0;">
              <a href="${portalServiceUrl}" target="_blank" style="background-color: #7A1F2B; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(122, 31, 43, 0.4);">
                Ver Servicio y Subir Evidencias en ALFA OS →
              </a>
            </div>

            <p style="font-size: 12px; color: #71717A; text-align: center; margin-top: 24px;">
              Accede a la plataforma para registrar la hora de llegada, ingresar la solución técnica y subir las fotos de evidencia.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 20px 32px; background-color: #121214; border-top: 1px solid #27272A; text-align: center; font-size: 11px; color: #71717A;">
            ALFA High End Services · Sistema de Control Operativo ALFA OS<br>
            Zapopan y Guadalajara, Jalisco
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Send via Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.debug("[ContractorEmail] No RESEND_API_KEY found, mock sending to:", emailList);
    return { ok: true, mocked: true, emails: emailList };
  }

  const fromEmail = process.env.EMAIL_FROM || "ALFA OS <notificaciones@alfait.com.mx>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: emailList,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[ContractorEmail] Resend error:", errText);
      return { ok: false, error: errText };
    }

    const json = await res.json();
    return { ok: true, emailId: json.id, emails: emailList };
  } catch (err: any) {
    console.error("[ContractorEmail] Exception sending email:", err);
    return { ok: false, error: err.message };
  }
}
