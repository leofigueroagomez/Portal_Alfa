"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getAppBaseUrl } from "@/lib/appUrl";
import { formatCurrency } from "@/lib/format";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
import { getProjectDeliverySystemsForDisplay } from "@/lib/projectDeliverySystems";
import { renderPrintRouteToPdf } from "@/lib/serverPdf";

type Delivery = {
  id: number;
  client_project_id: number;
  delivery_date: string | null;
  delivered_to_name: string | null;
  observations: string | null;
};

type Project = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
  email?: string | null;
  billing_email?: string | null;
};

type Warranty = {
  id: number;
  equipment_warranty_months: number | null;
  installation_warranty_months: number | null;
  equipment_warranty_end_date: string | null;
  installation_warranty_end_date: string | null;
  preventive_maintenance_frequency_months: number | null;
};

type Attachment = {
  filename: string;
  content: string;
};

type EmailDraft = {
  to: string;
  cc: string[];
  subject: string;
  html: string;
  attachmentNames: string[];
  pdfGenerationPending: boolean;
  pendingBalanceMxn: number;
  deliveryUrl: string;
  warrantyUrl: string | null;
  warrantyId: number | null;
  warrantyCreateUrl: string;
  warrantyMissing: boolean;
  warrantyEndDate: string | null;
  nextMaintenanceDate: string | null;
};

function addMonths(value: string | null | undefined, months: number | null | undefined) {
  if (!value || !months) return null;
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

function getDateOrToday(value: string | null | undefined) {
  return value || new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function parseEmails(value: string | null | undefined) {
  return (value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function escapeHtml(value: string | null | undefined) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logDeliveryEmailError(
  projectId: number,
  deliveryId: number,
  step: string,
  error: unknown
) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : String(error || "Error desconocido");

  console.error("[project-delivery-email]", {
    projectId,
    deliveryId,
    step,
    message,
  });
}

async function getEmailDraft(projectId: number, deliveryId: number): Promise<EmailDraft | { error: string }> {
  const supabase = await createSupabaseServerClient();

  const { data: delivery, error: deliveryError } = await supabase
    .from("project_deliveries")
    .select("id, client_project_id, delivery_date, delivered_to_name, observations")
    .eq("id", deliveryId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (deliveryError) {
    logDeliveryEmailError(projectId, deliveryId, "load delivery", deliveryError);
    return { error: "No se pudo validar la entrega." };
  }

  if (!delivery) return { error: "Entrega no encontrada." };

  const deliveryData = delivery as Delivery;
  const { data: project, error: projectError } = await supabase
    .from("client_projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();
  const projectData = project as Project | null;

  if (projectError) {
    logDeliveryEmailError(projectId, deliveryId, "load project", projectError);
    return { error: "No se pudo cargar el proyecto de la entrega." };
  }

  if (!projectData) return { error: "Proyecto no encontrado." };

  const clientResult = projectData.client_id
    ? await supabase
        .from("clients")
        .select("name, email, billing_email")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null, error: null };

  if (clientResult.error) {
    logDeliveryEmailError(projectId, deliveryId, "load client", clientResult.error);
  }

  const warrantyResult = await supabase
    .from("project_warranties")
    .select(
      "id, equipment_warranty_months, installation_warranty_months, equipment_warranty_end_date, installation_warranty_end_date, preventive_maintenance_frequency_months"
    )
    .eq("client_project_id", projectId)
    .order("warranty_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (warrantyResult.error) {
    logDeliveryEmailError(projectId, deliveryId, "load warranty", warrantyResult.error);
  }

  const clientData = clientResult.data as Client | null;
  const warrantyData = warrantyResult.data as Warranty | null;
  let systemList: Awaited<ReturnType<typeof getProjectDeliverySystemsForDisplay>> = [];
  let financialSummary = { approvedTotalMxn: 0, paidTotalMxn: 0, pendingTotalMxn: 0 };

  try {
    systemList = await getProjectDeliverySystemsForDisplay(supabase, projectId, deliveryId);
  } catch (error) {
    logDeliveryEmailError(projectId, deliveryId, "load delivery systems", error);
  }

  try {
    financialSummary = await getProjectFinancialSummary(supabase, projectId);
  } catch (error) {
    logDeliveryEmailError(projectId, deliveryId, "load financial summary", error);
  }
  const baseUrl = getAppBaseUrl();
  const deliveryDate = getDateOrToday(deliveryData.delivery_date);
  const deliveryUrl = `${baseUrl}/projects/${projectId}/deliveries/${deliveryId}/print`;
  const warrantyUrl = warrantyData
    ? `${baseUrl}/projects/${projectId}/warranty/${warrantyData.id}/print`
    : null;
  const warrantyCreateUrl = `${baseUrl}/projects/${projectId}/warranty/new`;
  const warrantyMonths = Number(
    warrantyData?.installation_warranty_months ||
      warrantyData?.equipment_warranty_months ||
      12
  );
  const warrantyEndDate =
    warrantyData?.installation_warranty_end_date ||
    warrantyData?.equipment_warranty_end_date ||
    addMonths(deliveryDate, warrantyMonths) ||
    deliveryDate;
  const maintenanceFrequencyMonths = Number(
    warrantyData?.preventive_maintenance_frequency_months || 6
  );
  const nextMaintenanceDate =
    addMonths(deliveryDate, maintenanceFrequencyMonths) || deliveryDate;
  const to = clientData?.billing_email || clientData?.email || "";
  const cc = parseEmails(process.env.POSTSALE_CC_EMAILS);
  const pendingText =
    financialSummary.pendingTotalMxn > 0
      ? `Existe un saldo pendiente de: ${formatCurrency(financialSummary.pendingTotalMxn, "MXN")}.`
      : "No existe saldo pendiente registrado.";
  const subject = `Entrega y garantia - ${projectData.name || "Proyecto ALFA IT"}`;
  const systemsHtml =
    systemList.length > 0
      ? `<ul>${systemList
          .map((system) => `<li>${escapeHtml(system.system_name)}${system.notes ? ` - ${escapeHtml(system.notes)}` : ""}</li>`)
          .join("")}</ul>`
      : "<p>Sin sistemas seleccionados.</p>";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111318; line-height: 1.6;">
      <h1 style="font-size: 22px;">Entrega de proyecto ALFA IT</h1>
      <p>Gracias por confiar en ALFA IT para el proyecto <strong>${escapeHtml(projectData.name || "Proyecto")}</strong>.</p>
      <p><strong>Fecha de entrega:</strong> ${formatDate(deliveryDate)}</p>
      <p>${pendingText}</p>
      <p><strong>Sistemas entregados:</strong></p>
      ${systemsHtml}
      <p><strong>Vencimiento de garantia:</strong> ${formatDate(warrantyEndDate)}</p>
      <p><strong>Proximo mantenimiento sugerido:</strong> ${formatDate(nextMaintenanceDate)}</p>
      <p>Contacto de soporte: ${escapeHtml(process.env.ALFA_SUPPORT_EMAIL || "soporte@alfait.com")}</p>
      ${
        warrantyData
          ? `<p><strong>Acta de entrega:</strong> <a href="${deliveryUrl}">${deliveryUrl}</a></p>
             <p><strong>Carta de garantia:</strong> <a href="${warrantyUrl}">${warrantyUrl}</a></p>
             <p style="color:#666">Se adjuntan PDFs del acta de entrega y carta de garantia generados desde las vistas imprimibles. Los enlaces internos permanecen protegidos por login.</p>`
          : `<p style="color:#9E1B32"><strong>La garantia no ha sido generada todavia.</strong> Generala antes de enviar este correo: <a href="${warrantyCreateUrl}">${warrantyCreateUrl}</a></p>`
      }
    </div>
  `;

  return {
    to,
    cc,
    subject,
    html,
    attachmentNames: warrantyData
      ? [`Acta-de-entrega-${projectId}-${deliveryId}.pdf`, `Carta-garantia-${projectId}-${warrantyData.id}.pdf`]
      : [],
    pdfGenerationPending: false,
    pendingBalanceMxn: financialSummary.pendingTotalMxn,
    deliveryUrl,
    warrantyUrl,
    warrantyId: warrantyData?.id || null,
    warrantyCreateUrl,
    warrantyMissing: !warrantyData,
    warrantyEndDate,
    nextMaintenanceDate,
  };
}

async function sendResendEmail({
  to,
  cc,
  subject,
  html,
  attachments,
}: {
  to: string;
  cc: string[];
  subject: string;
  html: string;
  attachments: Attachment[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY y EMAIL_FROM deben estar configurados.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      cc: cc.length > 0 ? cc : undefined,
      subject,
      html,
      attachments,
    }),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Resend rechazo el correo: ${body}`);
  }

  return body ? JSON.parse(body) : null;
}

export async function previewProjectDeliveryEmail(projectId: number, deliveryId: number) {
  try {
    const draft = await getEmailDraft(projectId, deliveryId);
    if ("error" in draft) return { ok: false, message: draft.error };

    return {
      ok: true,
      draft: {
        to: draft.to,
        cc: draft.cc.join(", "),
        subject: draft.subject,
        html: draft.html,
        attachmentNames: draft.attachmentNames,
        pdfGenerationPending: draft.pdfGenerationPending,
        pendingBalanceMxn: draft.pendingBalanceMxn,
        deliveryUrl: draft.deliveryUrl,
        warrantyUrl: draft.warrantyUrl,
        warrantyCreateUrl: draft.warrantyCreateUrl,
        warrantyMissing: draft.warrantyMissing,
        warrantyEndDate: draft.warrantyEndDate,
        nextMaintenanceDate: draft.nextMaintenanceDate,
      },
    };
  } catch (error) {
    logDeliveryEmailError(projectId, deliveryId, "preview email", error);
    return { ok: false, message: "No se pudo generar la vista previa del correo." };
  }
}

export async function sendProjectDeliveryEmail(
  projectId: number,
  deliveryId: number,
  values: { to: string; cc: string; subject: string; html: string }
) {
  const supabase = await createSupabaseServerClient();
  const draft = await getEmailDraft(projectId, deliveryId);

  if ("error" in draft) return { ok: false, message: draft.error };
  const emailDraft = draft;

  const to = values.to.trim();
  const cc = parseEmails(values.cc);
  const subject = values.subject.trim();
  const html = values.html.trim();

  if (!to) return { ok: false, message: "Captura un destinatario." };
  if (!subject) return { ok: false, message: "Captura un asunto." };
  if (!html) return { ok: false, message: "El cuerpo del correo no puede estar vacio." };
  if (!emailDraft.warrantyUrl) {
    return {
      ok: false,
      message: "La garantia no ha sido generada todavia. Genera la garantia antes de enviar.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function createEmailAttachments() {
    if (!emailDraft.warrantyId) {
      throw new Error("La garantia no ha sido generada todavia.");
    }

    const cookieHeader = (await cookies()).toString();
    const deliveryPdf = await renderPrintRouteToPdf(
      `/projects/${projectId}/deliveries/${deliveryId}/print`,
      cookieHeader
    );
    const warrantyPdf = await renderPrintRouteToPdf(
      `/projects/${projectId}/warranty/${emailDraft.warrantyId}/print`,
      cookieHeader
    );

    return [
      {
        filename: `Acta-de-entrega-${projectId}-${deliveryId}.pdf`,
        content: Buffer.from(deliveryPdf).toString("base64"),
      },
      {
        filename: `Carta-garantia-${projectId}-${emailDraft.warrantyId}.pdf`,
        content: Buffer.from(warrantyPdf).toString("base64"),
      },
    ];
  }

  async function insertHistory(status: "sent" | "error", errorMessage: string | null, response: unknown) {
    await supabase.from("project_delivery_email_history").insert({
      project_delivery_id: deliveryId,
      sent_to: to,
      cc: cc.join(", ") || null,
      subject,
      body_html: html,
      attachment_names: emailDraft.attachmentNames,
      status,
      error_message: errorMessage,
      resend_response: response || null,
      created_by_user_id: user?.id || null,
    });
  }

  try {
    const attachments = await createEmailAttachments();
    const response = await sendResendEmail({
      to,
      cc,
      subject,
      html,
      attachments,
    });

    await supabase
      .from("project_deliveries")
      .update({
        delivery_email_sent_at: new Date().toISOString(),
        delivery_email_sent_to: to,
        delivery_email_status: "sent",
        delivery_email_error: null,
      })
      .eq("id", deliveryId);
    await insertHistory("sent", null, response);

    revalidatePath(`/projects/${projectId}/deliveries/${deliveryId}`);
    return { ok: true, message: "Correo enviado correctamente." };
  } catch (error) {
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "No se pudo enviar el correo.";

    await supabase
      .from("project_deliveries")
      .update({
        delivery_email_status: "error",
        delivery_email_error: message,
      })
      .eq("id", deliveryId);
    await insertHistory("error", message, null);

    revalidatePath(`/projects/${projectId}/deliveries/${deliveryId}`);
    return { ok: false, message };
  }
}
