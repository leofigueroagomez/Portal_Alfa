import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  return handleContractDailyReminders(request);
}

export async function POST(request: Request) {
  return handleContractDailyReminders(request);
}

async function handleContractDailyReminders(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

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
      { error: "RESEND_API_KEY no configurado en entorno." },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const baseUrl = getAppBaseUrl();
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  // 1. Buscar contratos pendientes de Onboarding (datos del cliente)
  const { data: pendingOnboardingContracts } = await supabase
    .from("project_contracts")
    .select(`
      id, contract_number, onboarding_token, onboarding_reminders_count, last_onboarding_reminder_sent_at,
      legal_business_name, representative_name, representative_email,
      clients (name, company_name, email),
      client_projects (name)
    `)
    .eq("status", "pending_client_data")
    .or(`last_onboarding_reminder_sent_at.is.null,last_onboarding_reminder_sent_at.lt.${twentyHoursAgo}`)
    .limit(25);

  // 2. Buscar contratos pendientes de Firma Digital
  const { data: pendingSigningContracts } = await supabase
    .from("project_contracts")
    .select(`
      id, contract_number, signing_token, signing_reminders_count, last_signing_reminder_sent_at,
      legal_business_name, representative_name, representative_email,
      clients (name, company_name, email),
      client_projects (name)
    `)
    .eq("status", "pending_signatures")
    .or(`last_signing_reminder_sent_at.is.null,last_signing_reminder_sent_at.lt.${twentyHoursAgo}`)
    .limit(25);

  const results = {
    onboardingSent: 0,
    signingSent: 0,
    errors: [] as Array<{ contractId: number; error: string }>,
  };

  // Enviar recordatorios de Onboarding
  for (const c of pendingOnboardingContracts || []) {
    const recipientEmail =
      c.representative_email ||
      (c.clients as { email?: string } | null)?.email;

    if (!recipientEmail || !recipientEmail.includes("@")) continue;

    const clientName =
      c.legal_business_name ||
      c.representative_name ||
      (c.clients as { company_name?: string; name?: string } | null)?.company_name ||
      (c.clients as { name?: string } | null)?.name ||
      "Cliente";

    const projectName = (c.client_projects as { name?: string } | null)?.name || "Proyecto ALFA IT";
    const onboardingUrl = `${baseUrl}/public/contracts/${c.onboarding_token}/onboarding`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0b0d0f; padding: 24px; text-align: center; border-bottom: 3px solid #9e1b32;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase;">ALFA IT SOLUCIONES</h2>
          <p style="color: #9e1b32; margin: 4px 0 0 0; font-size: 11px; font-weight: bold; letter-spacing: 1px;">RECORDATORIO DE FORMALIZACIÓN CONTRACTUAL</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p style="font-size: 15px; line-height: 1.5;">Estimado(a) <strong>${clientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #444;">
            Te recordamos que para dar inicio a los trabajos y aprovisionamiento del proyecto <strong>${projectName}</strong> (Folio: <strong>${c.contract_number}</strong>), es indispensable completar los datos fiscales y del representante legal para emitir tu contrato oficial.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${onboardingUrl}" style="background-color: #9e1b32; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block;">
              Completar Datos del Contrato
            </a>
          </div>
          <p style="font-size: 12px; color: #777; line-height: 1.4;">
            El proceso toma menos de 2 minutos desde cualquier dispositivo. Puedes adjuntar tu Constancia de Situación Fiscal e identificación directamente.
          </p>
        </div>
        <div style="background-color: #f9f9fb; padding: 16px 24px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee;">
          ALFA IT Soluciones S.A. de C.V. • Franz Liszt 5160, Zapopan, Jal. • direccion@alfait.com.mx
        </div>
      </div>
    `;

    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [recipientEmail],
          subject: `[Recordatorio] Datos Pendientes para Contrato - ${projectName} (${c.contract_number}) | ALFA IT`,
          html,
        }),
      });

      if (emailRes.ok) {
        results.onboardingSent++;
        await supabase
          .from("project_contracts")
          .update({
            last_onboarding_reminder_sent_at: new Date().toISOString(),
            onboarding_reminders_count: (c.onboarding_reminders_count || 0) + 1,
          })
          .eq("id", c.id);
      } else {
        const errText = await emailRes.text();
        results.errors.push({ contractId: c.id, error: errText });
      }
    } catch (err) {
      results.errors.push({
        contractId: c.id,
        error: err instanceof Error ? err.message : "Error enviando correo",
      });
    }
  }

  // Enviar recordatorios de Firma Digital
  for (const c of pendingSigningContracts || []) {
    const recipientEmail =
      c.representative_email ||
      (c.clients as { email?: string } | null)?.email;

    if (!recipientEmail || !recipientEmail.includes("@")) continue;

    const clientName =
      c.legal_business_name ||
      c.representative_name ||
      (c.clients as { company_name?: string; name?: string } | null)?.company_name ||
      (c.clients as { name?: string } | null)?.name ||
      "Cliente";

    const projectName = (c.client_projects as { name?: string } | null)?.name || "Proyecto ALFA IT";
    const signingUrl = `${baseUrl}/public/contracts/${c.signing_token}/sign`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0b0d0f; padding: 24px; text-align: center; border-bottom: 3px solid #9e1b32;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase;">ALFA IT SOLUCIONES</h2>
          <p style="color: #9e1b32; margin: 4px 0 0 0; font-size: 11px; font-weight: bold; letter-spacing: 1px;">RECORDATORIO DE FIRMA DIGITAL</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p style="font-size: 15px; line-height: 1.5;">Estimado(a) <strong>${clientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #444;">
            Tu <strong>Contrato de Servicios e Integración Tecnológica</strong> para el proyecto <strong>${projectName}</strong> (${c.contract_number}) se encuentra listo y pendiente de tu firma digital de conformidad.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signingUrl}" style="background-color: #9e1b32; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block;">
              Revisar y Firmar Contrato Digitalmente
            </a>
          </div>
          <p style="font-size: 12px; color: #777; line-height: 1.4;">
            Este enlace es seguro y cuenta con validez legal conforme al Código de Comercio y la NOM-151-SCFI-2016.
          </p>
        </div>
        <div style="background-color: #f9f9fb; padding: 16px 24px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee;">
          ALFA IT Soluciones S.A. de C.V. • Franz Liszt 5160, Zapopan, Jal. • direccion@alfait.com.mx
        </div>
      </div>
    `;

    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [recipientEmail],
          subject: `[Recordatorio] Firma Digital de Contrato - ${projectName} (${c.contract_number}) | ALFA IT`,
          html,
        }),
      });

      if (emailRes.ok) {
        results.signingSent++;
        await supabase
          .from("project_contracts")
          .update({
            last_signing_reminder_sent_at: new Date().toISOString(),
            signing_reminders_count: (c.signing_reminders_count || 0) + 1,
          })
          .eq("id", c.id);
      } else {
        const errText = await emailRes.text();
        results.errors.push({ contractId: c.id, error: errText });
      }
    } catch (err) {
      results.errors.push({
        contractId: c.id,
        error: err instanceof Error ? err.message : "Error enviando correo",
      });
    }
  }

  return NextResponse.json({
    message: "Ejecución de recordatorios diarios de contratos finalizada.",
    results,
  });
}
