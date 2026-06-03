"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";

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
  equipment_warranty_end_date: string | null;
  installation_warranty_end_date: string | null;
  preventive_maintenance_frequency_months: number | null;
};

type DeliverySystem = {
  system_name: string | null;
  notes: string | null;
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
  attachments: Attachment[];
  attachmentNames: string[];
  pendingBalanceMxn: number;
  deliveryUrl: string;
  warrantyUrl: string | null;
  warrantyEndDate: string | null;
  nextMaintenanceDate: string | null;
};

function addMonths(value: string | null | undefined, months: number | null | undefined) {
  if (!value || !months) return null;
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  );
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

function escapePdfText(value: string | null | undefined) {
  return (value || "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createSimplePdf(title: string, lines: string[]) {
  const textLines = [title, "", ...lines].slice(0, 44);
  const stream = [
    "BT",
    "/F1 14 Tf",
    "72 744 Td",
    `(${escapePdfText(textLines[0])}) Tj`,
    "/F1 10 Tf",
    ...textLines.slice(1).flatMap((line) => ["0 -16 Td", `(${escapePdfText(line)}) Tj`]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, "utf8").toString("base64");
}

async function getEmailDraft(projectId: number, deliveryId: number): Promise<EmailDraft | { error: string }> {
  const supabase = await createSupabaseServerClient();

  const { data: delivery } = await supabase
    .from("project_deliveries")
    .select("id, client_project_id, delivery_date, delivered_to_name, observations")
    .eq("id", deliveryId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (!delivery) return { error: "Entrega no encontrada." };

  const deliveryData = delivery as Delivery;
  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();
  const projectData = project as Project | null;

  if (!projectData) return { error: "Proyecto no encontrado." };

  const [{ data: client }, { data: warranty }, { data: systems }] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("name, email, billing_email")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("project_warranties")
      .select(
        "id, equipment_warranty_end_date, installation_warranty_end_date, preventive_maintenance_frequency_months"
      )
      .eq("client_project_id", projectId)
      .order("warranty_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("project_delivery_systems")
      .select("system_name, notes")
      .eq("project_delivery_id", deliveryId),
  ]);

  const clientData = client as Client | null;
  const warrantyData = warranty as Warranty | null;
  const systemList = (systems || []) as DeliverySystem[];
  const financialSummary = await getProjectFinancialSummary(supabase, projectId);
  const baseUrl = getBaseUrl();
  const deliveryUrl = `${baseUrl}/projects/${projectId}/deliveries/${deliveryId}/print`;
  const warrantyUrl = warrantyData
    ? `${baseUrl}/projects/${projectId}/warranty/${warrantyData.id}/print`
    : null;
  const warrantyEndDate =
    warrantyData?.installation_warranty_end_date ||
    warrantyData?.equipment_warranty_end_date ||
    null;
  const nextMaintenanceDate = addMonths(
    deliveryData.delivery_date,
    warrantyData?.preventive_maintenance_frequency_months
  );
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
      <p><strong>Fecha de entrega:</strong> ${formatDate(deliveryData.delivery_date)}</p>
      <p>${pendingText}</p>
      <p><strong>Sistemas entregados:</strong></p>
      ${systemsHtml}
      <p><strong>Vencimiento de garantia:</strong> ${formatDate(warrantyEndDate)}</p>
      <p><strong>Proximo mantenimiento sugerido:</strong> ${formatDate(nextMaintenanceDate)}</p>
      <p>Contacto de soporte: ${escapeHtml(process.env.ALFA_SUPPORT_EMAIL || "soporte@alfait.com")}</p>
      <p style="color:#666">Se adjuntan PDFs del acta de entrega y carta de garantia. Los enlaces internos permanecen protegidos por login.</p>
    </div>
  `;
  const deliveryPdfLines = [
    `Proyecto: ${projectData.name || "Proyecto"}`,
    `Cliente: ${clientData?.name || "Cliente"}`,
    `Fecha de entrega: ${formatDate(deliveryData.delivery_date)}`,
    `Recibe: ${deliveryData.delivered_to_name || "-"}`,
    `Saldo pendiente: ${formatCurrency(financialSummary.pendingTotalMxn, "MXN")}`,
    "Sistemas entregados:",
    ...(systemList.length
      ? systemList.map((system) => `- ${system.system_name || "Sistema"}${system.notes ? `: ${system.notes}` : ""}`)
      : ["- Sin sistemas seleccionados"]),
  ];
  const warrantyPdfLines = [
    `Proyecto: ${projectData.name || "Proyecto"}`,
    `Cliente: ${clientData?.name || "Cliente"}`,
    `Vencimiento de garantia: ${formatDate(warrantyEndDate)}`,
    `Proximo mantenimiento sugerido: ${formatDate(nextMaintenanceDate)}`,
    `Soporte: ${process.env.ALFA_SUPPORT_EMAIL || "soporte@alfait.com"}`,
    warrantyUrl ? `Carta interna: ${warrantyUrl}` : "Carta de garantia pendiente de generar.",
  ];
  const attachments = [
    {
      filename: `acta-entrega-${deliveryId}.pdf`,
      content: createSimplePdf("Acta de entrega de proyecto", deliveryPdfLines),
    },
    {
      filename: `carta-garantia-${projectId}.pdf`,
      content: createSimplePdf("Carta de garantia ALFA IT", warrantyPdfLines),
    },
  ];

  return {
    to,
    cc,
    subject,
    html,
    attachments,
    attachmentNames: attachments.map((attachment) => attachment.filename),
    pendingBalanceMxn: financialSummary.pendingTotalMxn,
    deliveryUrl,
    warrantyUrl,
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
      pendingBalanceMxn: draft.pendingBalanceMxn,
      deliveryUrl: draft.deliveryUrl,
      warrantyUrl: draft.warrantyUrl,
      warrantyEndDate: draft.warrantyEndDate,
      nextMaintenanceDate: draft.nextMaintenanceDate,
    },
  };
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    const response = await sendResendEmail({
      to,
      cc,
      subject,
      html,
      attachments: emailDraft.attachments,
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
