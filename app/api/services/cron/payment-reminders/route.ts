import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAlfaBankAccounts } from "@/lib/bankAccounts";
import { generateServiceReportPdf } from "@/lib/serviceReportPdf";
import { getOrCreateServiceStripeCheckout } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  return handleCronPaymentReminders(request);
}

export async function POST(request: Request) {
  return handleCronPaymentReminders(request);
}

async function handleCronPaymentReminders(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Si hay CRON_SECRET configurado, verificar token
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const url = new URL(request.url);
    const keyParam = url.searchParams.get("key");
    if (keyParam !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ALFA IT <direccion@alfait.com.mx>";

  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured in environment" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const bank = getAlfaBankAccounts();

  // Buscar servicios completados/firmados con pago pendiente que no hayan recibido recordatorio en las últimas 20 horas
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  const { data: pendingServices, error } = await supabase
    .from("service_reports")
    .select(`
      id, service_number, service_date, labor_sale_mxn, client_signer_name,
      client_signer_email, payment_status, payment_link_url, payment_reminders_count,
      last_payment_reminder_sent_at,
      clients (name, company_name, email),
      client_projects (name)
    `)
    .eq("payment_status", "pending_payment")
    .neq("status", "cancelled")
    .or(`last_payment_reminder_sent_at.is.null,last_payment_reminder_sent_at.lt.${twentyHoursAgo}`)
    .limit(25);

  if (error) {
    console.error("Error consultando servicios pendientes de cobranza:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = {
    totalPendingFound: pendingServices?.length || 0,
    sentCount: 0,
    skippedCount: 0,
    errors: [] as Array<{ serviceId: number; error: string }>,
  };

  if (!pendingServices || pendingServices.length === 0) {
    return NextResponse.json({
      message: "No hay servicios con recordatorios pendientes para hoy.",
      results,
    });
  }

  for (const report of pendingServices) {
    const recipientEmail =
      report.client_signer_email ||
      (report.clients as { email?: string } | null)?.email;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      results.skippedCount++;
      continue;
    }

    const folio = report.service_number || `SERV-${String(report.id).padStart(4, "0")}`;
    const clientName =
      report.client_signer_name ||
      (report.clients as { company_name?: string; name?: string } | null)?.company_name ||
      (report.clients as { name?: string } | null)?.name ||
      "Cliente";
    const formattedAmount = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(report.labor_sale_mxn || 0);

    let paymentLinkUrl = report.payment_link_url;
    if (!paymentLinkUrl && (report.labor_sale_mxn || 0) > 0) {
      paymentLinkUrl = await getOrCreateServiceStripeCheckout({
        serviceId: report.id,
        serviceNumber: folio,
        amountMxn: report.labor_sale_mxn || 0,
        clientName,
        clientEmail: recipientEmail,
      });
    }

    let stripeButtonHtml = "";
    if (paymentLinkUrl) {
      stripeButtonHtml = `
        <div style="text-align: center; margin: 16px 0;">
          <a href="${paymentLinkUrl}" style="display: inline-block; background-color: #25D366; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 14px;">
            💳 Pagar en Línea con Tarjeta de Crédito / Débito
          </a>
        </div>
      `;
    }

    try {
      const pdfBuffer = await generateServiceReportPdf(supabase, report.id);
      const pdfFilename = `Reporte_Servicio_${folio}.pdf`;

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
              .bank-card { background-color: #22180C; border-radius: 12px; border: 1px solid #614620; padding: 16px; margin: 16px 0; }
              .highlight { color: #F4C66A; font-weight: bold; }
              .footer { padding: 16px 24px; background-color: #101114; color: #77777D; font-size: 11px; text-align: center; border-top: 1px solid #222228; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="brand">ALFA IT • Soluciones de Alto Nivel</div>
                <div class="title">Recordatorio Diario de Pago 💳</div>
              </div>
              <div class="content">
                <p>Estimado(a) <strong>${clientName}</strong>,</p>
                <p>
                  Le enviamos un cordial saludo. Le recordamos que continúa pendiente de pago el servicio técnico <strong>${folio}</strong> realizado en sus instalaciones.
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

                <p>
                  Adjuntamos a este correo su <strong>Reporte de Servicio Técnico en PDF</strong> para su control y archivo.
                </p>

                <p>
                  En caso de haber realizado su transferencia o pago recientemente, por favor envíenos su comprobante respondiendo a este correo o al WhatsApp de atención para registrarlo en el sistema.
                </p>

                <p style="margin-top: 24px;">
                  Agradecemos su atención y preferencia.<br>
                  <span style="color: #77777D; font-size: 12px;">Departamento de Cobranza ALFA IT</span>
                </p>
              </div>
              <div class="footer">
                ALFA IT • Ingeniería y Soluciones • Contacto: direccion@alfait.com.mx
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
        throw new Error(`Resend Error: ${errText}`);
      }

      await supabase
        .from("service_reports")
        .update({
          last_payment_reminder_sent_at: new Date().toISOString(),
          payment_reminders_count: (report.payment_reminders_count || 0) + 1,
        })
        .eq("id", report.id);

      results.sentCount++;
    } catch (err) {
      console.error(`Error enviando recordatorio automático para servicio ${report.id}:`, err);
      results.errors.push({
        serviceId: report.id,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
