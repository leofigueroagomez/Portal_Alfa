"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getAlfaBankAccounts, formatBankTransferInstructions } from "@/lib/bankAccounts";
import { getOrCreateServiceSigningLink, getOrCreateServiceReportPublicLink } from "@/lib/publicDocumentLinks";
import { generateServiceReportPdf } from "@/lib/serviceReportPdf";
import { getOrCreateServiceStripeCheckout } from "@/lib/stripe";

export async function markServiceAsPaidAction(
  serviceId: number,
  data: {
    paymentMethod: string;
    paymentReference?: string;
    paidAt?: string;
  }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado. Inicia sesión para continuar." };
  }

  const adminClient = createSupabaseAdminClient();
  const paidAt = data.paidAt || new Date().toISOString();

  const { error } = await adminClient
    .from("service_reports")
    .update({
      payment_status: "paid",
      paid_at: paidAt,
      payment_method: data.paymentMethod || "transfer",
      payment_reference: data.paymentReference?.trim() || null,
    })
    .eq("id", serviceId);

  if (error) {
    console.error("Error registrando pago de servicio:", error);
    return { ok: false, error: "No se pudo registrar el pago." };
  }

  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/services");

  return { ok: true, message: "Pago registrado exitosamente." };
}

export async function sendServicePaymentReminderEmailAction(
  serviceId: number,
  customMessage?: string
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: report, error } = await adminClient
    .from("service_reports")
    .select(`
      id, service_number, service_date, labor_sale_mxn, client_signer_name,
      client_signer_email, payment_status, payment_link_url, payment_reminders_count,
      clients (name, company_name, email),
      client_projects (name)
    `)
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !report) {
    return { ok: false, error: "Reporte de servicio no encontrado." };
  }

  const recipientEmail =
    report.client_signer_email ||
    (report.clients as { email?: string } | null)?.email;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return { ok: false, error: "El cliente no tiene un correo electrónico válido registrado." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ALFA IT <direccion@alfait.com.mx>";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurado." };
  }

  const folio = report.service_number || `SERV-${String(report.id).padStart(4, "0")}`;
  const clientName =
    report.client_signer_name ||
    (report.clients as { company_name?: string; name?: string } | null)?.company_name ||
    (report.clients as { name?: string } | null)?.name ||
    "Cliente";
  const bank = getAlfaBankAccounts();
  const formattedAmount = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(report.labor_sale_mxn || 0);

  try {
    const pdfBuffer = await generateServiceReportPdf(adminClient, serviceId);
    const pdfFilename = `Reporte_Servicio_${folio}.pdf`;

    let stripeButtonHtml = "";
    if (report.payment_link_url) {
      stripeButtonHtml = `
        <div style="text-align: center; margin: 16px 0;">
          <a href="${report.payment_link_url}" style="display: inline-block; background-color: #25D366; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 14px;">
            💳 Pagar en Línea con Tarjeta de Crédito / Débito
          </a>
        </div>
      `;
    }

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
            .bank-card { background-color: #22180C; border-radius: 12px; border: 1px solid #614620; padding: 16px; margin: 16px 0; }
            .highlight { color: #F4C66A; font-weight: bold; }
            .footer { padding: 16px 24px; background-color: #101114; color: #77777D; font-size: 11px; text-align: center; border-top: 1px solid #222228; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">ALFA IT • Ingeniería y Soluciones Tecnológicas</div>
              <div class="title">Recordatorio de Pago de Servicio 📋</div>
            </div>
            <div class="content">
              <p>Estimado(a) <strong>${clientName}</strong>,</p>
              <p>
                Le enviamos un cordial saludo. Le recordamos amablemente que se encuentra pendiente de liquidación el servicio técnico <strong>${folio}</strong> realizado en sus instalaciones.
              </p>

              <div class="bank-card">
                <div style="font-size: 11px; text-transform: uppercase; color: #F4C66A; font-weight: bold; margin-bottom: 8px;">Cuentas Bancarias para Transferencia (SPEI)</div>
                <div>• <strong>Banco:</strong> ${bank.bankName}</div>
                <div>• <strong>Beneficiario:</strong> ${bank.beneficiary}</div>
                <div>• <strong>CLABE Interbancaria:</strong> <span class="highlight" style="font-family: monospace; font-size: 15px;">${bank.clabe}</span></div>
                <div>• <strong>Importe a Liquidar:</strong> <span class="highlight">${formattedAmount}</span> (+ IVA)</div>
                <div>• <strong>Concepto / Referencia:</strong> ${folio}</div>
              </div>

              ${stripeButtonHtml}

              ${customMessage ? `<p style="font-style: italic; background-color: #1C1D22; padding: 12px; border-radius: 8px; border-left: 3px solid #9E1B32;">${customMessage}</p>` : ""}

              <p>
                Adjuntamos a este correo el <strong>Reporte de Servicio Técnico en PDF</strong> con el detalle y constancia de los trabajos ejecutados.
              </p>

              <p>
                Una vez realizada su transferencia o pago, por favor compártanos su comprobante por este medio o vía WhatsApp para conciliar su cuenta y emitir su factura fiscal.
              </p>

              <p style="margin-top: 24px;">
                Agradecemos su preferencia.<br>
                <span style="color: #77777D; font-size: 12px;">Administración y Cobranza ALFA IT</span>
              </p>
            </div>
            <div class="footer">
              ALFA IT • Soluciones de Alto Nivel • Contacto: direccion@alfait.com.mx
            </div>
          </div>
        </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail.trim()],
        subject: `💳 Recordatorio de Pago: Servicio Técnico ${folio} - ALFA IT`,
        html,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer.toString("base64"),
          },
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      throw new Error(`Error en Resend: ${errText}`);
    }

    // Actualizar fecha y contador de recordatorio
    const nowIso = new Date().toISOString();
    await adminClient
      .from("service_reports")
      .update({
        last_payment_reminder_sent_at: nowIso,
        payment_reminders_count: (report.payment_reminders_count || 0) + 1,
      })
      .eq("id", serviceId);

    revalidatePath(`/services/${serviceId}`);
    return { ok: true, message: `Recordatorio enviado a ${recipientEmail} con PDF adjunto.` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error enviando recordatorio.";
    return { ok: false, error: msg };
  }
}

export async function getServiceDispatchContext(serviceId: number) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const { data: report, error } = await adminClient
    .from("service_reports")
    .select(`
      id, service_number, service_date, labor_sale_mxn, status, payment_status,
      paid_at, payment_method, payment_reference, payment_link_url,
      client_signer_name, client_signer_email, client_signer_phone, client_signed_at,
      last_payment_reminder_sent_at, payment_reminders_count,
      clients (name, company_name, email, phone),
      client_projects (name)
    `)
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !report) {
    throw new Error("Reporte de servicio no encontrado.");
  }

  const isSigned = Boolean(report.client_signed_at);
  const publicLink = isSigned
    ? await getOrCreateServiceReportPublicLink({ serviceReportId: serviceId })
    : await getOrCreateServiceSigningLink({ serviceReportId: serviceId });

  const baseUrl = getAppBaseUrl();
  const publicUrl = isSigned
    ? `${baseUrl}/public/documents/${publicLink.token}/pdf`
    : `${baseUrl}/public/service-sign/${publicLink.token}`;

  const clientName =
    report.client_signer_name ||
    (report.clients as { company_name?: string; name?: string } | null)?.company_name ||
    (report.clients as { name?: string } | null)?.name ||
    "Cliente";

  let paymentLinkUrl = report.payment_link_url;
  if (!paymentLinkUrl && (report.labor_sale_mxn || 0) > 0) {
    paymentLinkUrl = await getOrCreateServiceStripeCheckout({
      serviceId,
      serviceNumber: report.service_number || `SERV-${String(serviceId).padStart(4, "0")}`,
      amountMxn: report.labor_sale_mxn || 0,
      clientName,
      clientEmail: report.client_signer_email || (report.clients as { email?: string } | null)?.email || null,
      token: publicLink.token,
    });
  }

  const recipientPhone =
    report.client_signer_phone ||
    (report.clients as { phone?: string } | null)?.phone ||
    "";
  const cleanPhone = recipientPhone.replace(/[^\d+]/g, "").replace(/^\+/, "");

  const folio = report.service_number || `SERV-${String(report.id).padStart(4, "0")}`;
  const bank = getAlfaBankAccounts();
  const formattedAmount = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(report.labor_sale_mxn || 0);

  // Mensaje para Firma
  const waSignText = [
    `Hola *${clientName}*,`,
    `En *ALFA IT* hemos concluido los trabajos correspondientes a tu *Servicio Técnico ${folio}*.`,
    "",
    "📋 *Revisión y Firma Digital:*",
    "Puedes revisar el diagnóstico, fotos y firmar de conformidad desde tu celular en el siguiente enlace:",
    publicUrl,
    "",
    "Agradecemos tu preferencia.",
  ].join("\n");

  // Mensaje para Cobro / Recordatorio de Pago
  const waCollectText = [
    `Hola *${clientName}*,`,
    `Te compartimos el reporte y los datos para liquidar tu *Servicio Técnico ${folio}* en *ALFA IT*.`,
    "",
    `💰 *Monto a Liquidar:* ${formattedAmount} (+ IVA)`,
    "",
    "🏦 *Datos Bancarios para Transferencia (SPEI):*",
    `• Banco: *${bank.bankName}*`,
    `• Beneficiario: *${bank.beneficiary}*`,
    `• CLABE: *${bank.clabe}*`,
    `• Referencia: *${folio}*`,
    paymentLinkUrl ? `\n💳 *O Paga en Línea con Tarjeta:*\n${paymentLinkUrl}` : "",
    "",
    "📄 Puedes descargar tu reporte firmado aquí:",
    `${baseUrl}/public/documents/${publicLink.token}/pdf`,
    "",
    "Favor de enviar tu comprobante a direccion@alfait.com.mx.",
    "¡Gracias por tu confianza!",
  ]
    .filter(Boolean)
    .join("\n");

  const waSignUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waSignText)}`
    : `https://wa.me/?text=${encodeURIComponent(waSignText)}`;

  const waCollectUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waCollectText)}`
    : `https://wa.me/?text=${encodeURIComponent(waCollectText)}`;

  return {
    report: {
      ...report,
      payment_link_url: paymentLinkUrl,
    },
    clientName,
    recipientEmail: report.client_signer_email || (report.clients as { email?: string } | null)?.email || "",
    recipientPhone,
    publicUrl,
    waSignUrl,
    waSignText,
    waCollectUrl,
    waCollectText,
    isSigned,
    bankAccounts: bank,
  };
}
