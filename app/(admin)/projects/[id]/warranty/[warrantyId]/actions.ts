"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";
import { generateWarrantyLetterPdf } from "@/lib/postSalePdf";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
import { getOrCreateWarrantyPublicLink } from "@/lib/publicDocumentLinks";

type SendWarrantyEmailInput = {
  projectId: number;
  warrantyId: number;
  recipientEmail: string;
  ccEmails?: string[];
  customMessage?: string;
};

export async function sendProjectWarrantyEmailAction(input: SendWarrantyEmailInput) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado. Inicia sesión para continuar." };
  }

  const { data: warranty, error: warrantyError } = await supabase
    .from("project_warranties")
    .select("id, warranty_date, support_email, alfa_representative_name, client_project_id")
    .eq("id", input.warrantyId)
    .eq("client_project_id", input.projectId)
    .maybeSingle();

  if (warrantyError || !warranty) {
    return { ok: false, error: "Carta de garantía no encontrada." };
  }

  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name, client_id, clients(name, company_name, email)")
    .eq("id", input.projectId)
    .maybeSingle();

  const clientName =
    (project as { clients?: { name?: string; company_name?: string } | null })?.clients
      ?.company_name ||
    (project as { clients?: { name?: string; company_name?: string } | null })?.clients
      ?.name ||
    "Cliente";

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ALFA IT <soporte@alfait.com.mx>";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no está configurado en las variables de entorno." };
  }

  try {
    // 1. Generar el archivo PDF formal de la garantía
    const pdfBuffer = await generateWarrantyLetterPdf(
      adminClient,
      input.projectId,
      input.warrantyId
    );

    const folioText = `GAR-${String(input.warrantyId).padStart(4, "0")}`;
    const pdfFilename = `Carta_Garantia_ALFA_${folioText}_${(project?.name || "Proyecto").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0B0D0F; color: #FFFFFF; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #151518; border-radius: 16px; border: 1px solid #2A2A30; overflow: hidden; }
            .header { background-color: #121316; padding: 24px; border-bottom: 1px solid #2A2A30; text-align: center; }
            .brand { color: #9E1B32; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
            .title { color: #FFFFFF; font-size: 20px; font-weight: bold; margin: 8px 0 0 0; }
            .content { padding: 24px; line-height: 1.6; font-size: 14px; color: #D1D1D6; }
            .card { background-color: #1C1D22; border-radius: 12px; border: 1px solid #2A2A30; padding: 16px; margin: 16px 0; }
            .highlight { color: #8CE0B6; font-weight: bold; }
            .footer { padding: 16px 24px; background-color: #101114; color: #77777D; font-size: 11px; text-align: center; border-top: 1px solid #222228; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">ALFA IT • Ingeniería y Soluciones Tecnológicas</div>
              <div class="title">Carta de Garantía Oficial</div>
            </div>
            <div class="content">
              <p>Estimado(a) <strong>${clientName}</strong>,</p>
              <p>
                Por medio del presente le hacemos entrega de la <strong>Carta de Garantía Oficial</strong> correspondiente a la conclusión de los trabajos y sistemas instalados para el proyecto <strong>${project?.name || "Proyecto"}</strong> (Folio <strong>${folioText}</strong>).
              </p>

              <div class="card">
                <div style="font-size: 11px; text-transform: uppercase; color: #9E1B32; font-weight: bold; margin-bottom: 8px;">Resumen de Cobertura</div>
                <div>• <strong>Vigencia:</strong> 1 Año (12 Meses) a partir de la entrega.</div>
                <div>• <strong>Mantenimiento Preventivo Obligatorio:</strong> Cada 6 meses para conservar la vigencia de garantía.</div>
                <div>• <strong>Documento Oficial:</strong> Archivo PDF formal adjunto a este correo.</div>
              </div>

              ${input.customMessage ? `<p style="font-style: italic; background-color: #1C1D22; padding: 12px; border-radius: 8px; border-left: 3px solid #9E1B32;">${input.customMessage}</p>` : ""}

              <p>
                El archivo PDF oficial se encuentra debidamente adjunto a este correo para su consulta, archivo o impresión formal.
              </p>

              <p style="margin-top: 24px;">
                Agradecemos su confianza en <strong>ALFA IT</strong>.<br>
                <span style="color: #77777D; font-size: 12px;">Departamento de Ingeniería y Posventa</span>
              </p>
            </div>
            <div class="footer">
              ALFA IT • Soluciones de Alto Nivel • Soporte: ${warranty.support_email || "soporte@alfait.com"}
            </div>
          </div>
        </body>
      </html>
    `;

    const resendPayload = {
      from,
      to: [input.recipientEmail.trim()],
      cc: input.ccEmails && input.ccEmails.length > 0 ? input.ccEmails : undefined,
      subject: `🛡️ Carta de Garantía Oficial: ${project?.name || "Proyecto"} (Folio ${folioText}) - ALFA IT`,
      html,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString("base64"),
        },
      ],
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendBody = await resendResponse.text();
    if (!resendResponse.ok) {
      throw new Error(`Resend rechazó el envío del correo: ${resendBody}`);
    }

    // Actualizar estado de la garantía a 'issued'
    await adminClient
      .from("project_warranties")
      .update({ status: "issued" })
      .eq("id", input.warrantyId);

    revalidatePath(`/projects/${input.projectId}/warranty/${input.warrantyId}`);
    revalidatePath(`/projects/${input.projectId}/warranty`);

    return { ok: true, message: "Carta de garantía enviada exitosamente con el PDF adjunto." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error enviando correo de garantía.";
    console.error("Error en sendProjectWarrantyEmailAction:", error);
    return { ok: false, error: msg };
  }
}

export async function getWarrantyDispatchContext(projectId: number, warrantyId: number) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const [
    { data: warranty },
    { data: project },
    { data: latestDelivery },
    financialSummary,
    publicLink,
  ] = await Promise.all([
    supabase
      .from("project_warranties")
      .select("id, warranty_date, preventive_maintenance_cost_mxn, status")
      .eq("id", warrantyId)
      .eq("client_project_id", projectId)
      .maybeSingle(),
    supabase
      .from("client_projects")
      .select("id, name, client_id, clients(name, company_name, email, phone)")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_deliveries")
      .select("id, client_signer_name, client_signer_email, client_signer_phone, client_signed_at")
      .eq("client_project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProjectFinancialSummary(adminClient, projectId),
    getOrCreateWarrantyPublicLink({
      clientProjectId: projectId,
      projectWarrantyId: warrantyId,
    }),
  ]);

  const clientObj = (project as { clients?: { name?: string; company_name?: string; email?: string; phone?: string } | null })?.clients;
  const clientName = clientObj?.company_name || clientObj?.name || latestDelivery?.client_signer_name || "Cliente";
  const recipientEmail = latestDelivery?.client_signer_email || clientObj?.email || "";
  const recipientPhone = latestDelivery?.client_signer_phone || clientObj?.phone || "";

  const baseUrl = getAppBaseUrl();
  const directPdfUrl = `${baseUrl}/public/documents/${publicLink.token}/pdf`;

  const cleanPhone = recipientPhone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const folioText = `GAR-${String(warrantyId).padStart(4, "0")}`;

  const waText = [
    `Hola *${clientName}*,`,
    `En *ALFA IT* te compartimos tu *Carta de Garantía Oficial* correspondiente al proyecto *${project?.name || "Proyecto"}* (Folio *${folioText}*).`,
    "",
    "📋 *Condiciones clave:*",
    "• Vigencia: 1 Año (12 meses).",
    "• Mantenimiento preventivo: Cada 6 meses para conservar la cobertura.",
    "",
    "Puedes descargar tu póliza formal en PDF directamente en el siguiente enlace:",
    directPdfUrl,
    "",
    "Agradecemos tu preferencia.",
  ].join("\n");

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`
    : `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return {
    warranty,
    project,
    clientName,
    recipientEmail,
    recipientPhone,
    directPdfUrl,
    waUrl,
    waText,
    financialSummary,
  };
}
