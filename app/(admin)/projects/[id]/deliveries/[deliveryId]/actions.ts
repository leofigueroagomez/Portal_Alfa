"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
import { getProjectDeliverySystemsForDisplay } from "@/lib/projectDeliverySystems";
import { addMonthsToMexicoDate, getMexicoDate } from "@/lib/mexicoDate";
import { generateProjectDeliveryPdf, generateWarrantyLetterPdf } from "@/lib/postSalePdf";

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
  deliveryPdfUrl: string;
  warrantyUrl: string | null;
  warrantyPdfUrl: string | null;
  warrantyId: number | null;
  warrantyCreateUrl: string;
  warrantyMissing: boolean;
  warrantyEndDate: string | null;
  nextMaintenanceDate: string | null;
};

function addMonths(value: string | null | undefined, months: number | null | undefined) {
  if (!value || !months) return null;
  return addMonthsToMexicoDate(value, months);
}

function getDateOrToday(value: string | null | undefined) {
  return value || getMexicoDate();
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

function requireAppUrl() {
  if (!process.env.APP_URL) {
    throw new Error("APP_URL debe estar configurado para enviar documentos publicos.");
  }

  return process.env.APP_URL.replace(/\/+$/, "");
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

async function getOrCreatePublicDocumentLink({
  supabase,
  projectId,
  documentType,
  deliveryId,
  warrantyId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  projectId: number;
  documentType: "project_delivery" | "project_warranty";
  deliveryId?: number;
  warrantyId?: number;
}) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const query = supabase
    .from("public_document_links")
    .select("token, revoked_at")
    .eq("document_type", documentType)
    .eq("client_project_id", projectId)
    .gt("expires_at", now)
    .is("revoked_at", null)
    .limit(1);

  const existingResult =
    documentType === "project_delivery"
      ? await query.eq("project_delivery_id", deliveryId)
      : await query.eq("project_warranty_id", warrantyId);

  if (existingResult.error && existingResult.error.code === "42703") {
    const fallbackQuery = supabase
      .from("public_document_links")
      .select("token")
      .eq("document_type", documentType)
      .eq("client_project_id", projectId)
      .gt("expires_at", now)
      .limit(1);

    const fallbackResult =
      documentType === "project_delivery"
        ? await fallbackQuery.eq("project_delivery_id", deliveryId)
        : await fallbackQuery.eq("project_warranty_id", warrantyId);

    if (fallbackResult.error) throw fallbackResult.error;
    const fallbackExisting = fallbackResult.data?.[0] as { token: string } | undefined;
    if (fallbackExisting?.token) return fallbackExisting.token;
    const token = crypto.randomBytes(32).toString("base64url");
    const { error } = await supabase.from("public_document_links").insert({
      token,
      document_type: documentType,
      client_project_id: projectId,
      project_delivery_id: deliveryId || null,
      project_warranty_id: warrantyId || null,
      expires_at: expiresAt,
    });

    if (error) throw error;
    return token;
  }

  if (existingResult.error) throw existingResult.error;
  const existing = existingResult.data?.[0] as { token: string } | undefined;
  if (existing?.token) return existing.token;

  const token = crypto.randomBytes(32).toString("base64url");
  const { error } = await supabase.from("public_document_links").insert({
    token,
    document_type: documentType,
    client_project_id: projectId,
    project_delivery_id: deliveryId || null,
    project_warranty_id: warrantyId || null,
    expires_at: expiresAt,
  });

  if (error) throw error;
  return token;
}

function validatePdfBuffer(pdf: Buffer, label: string) {
  if (!pdf || pdf.length < 12_000) {
    throw new Error(`No se pudo generar un PDF formal valido para ${label}.`);
  }
}

async function validatePublicUrl(url: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`El enlace publico no responde correctamente: ${url}`);
  }
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
  let baseUrl = "";
  try {
    baseUrl = requireAppUrl();
  } catch (error) {
    logDeliveryEmailError(projectId, deliveryId, "resolve app base url", error);
    return { error: "APP_URL debe estar configurado para generar enlaces publicos." };
  }

  const deliveryDate = getDateOrToday(deliveryData.delivery_date);
  let deliveryToken = "";
  let warrantyToken = "";
  try {
    deliveryToken = await getOrCreatePublicDocumentLink({
      supabase,
      projectId,
      documentType: "project_delivery",
      deliveryId,
    });
    if (warrantyData) {
      warrantyToken = await getOrCreatePublicDocumentLink({
        supabase,
        projectId,
        documentType: "project_warranty",
        warrantyId: warrantyData.id,
      });
    }
  } catch (error) {
    logDeliveryEmailError(projectId, deliveryId, "create public document links", error);
    return {
      error:
        "No se pudieron crear enlaces publicos. Ejecuta la migracion public_document_links.",
    };
  }

  const deliveryUrl = `${baseUrl}/public/documents/${deliveryToken}`;
  const deliveryPdfUrl = `${deliveryUrl}/pdf`;
  const warrantyUrl = warrantyData && warrantyToken
    ? `${baseUrl}/public/documents/${warrantyToken}`
    : null;
  const warrantyPdfUrl = warrantyUrl ? `${warrantyUrl}/pdf` : null;
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
             <p style="color:#666">Se adjuntan PDFs formales del acta de entrega y carta de garantia. Los enlaces publicos funcionan sin iniciar sesion.</p>`
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
    deliveryPdfUrl,
    warrantyUrl,
    warrantyPdfUrl,
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
    if ("error" in draft) {
      return { ok: false, error: draft.error, message: draft.error };
    }

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
        deliveryPdfUrl: draft.deliveryPdfUrl,
        warrantyUrl: draft.warrantyUrl,
        warrantyPdfUrl: draft.warrantyPdfUrl,
        warrantyCreateUrl: draft.warrantyCreateUrl,
        warrantyMissing: draft.warrantyMissing,
        warrantyEndDate: draft.warrantyEndDate,
        nextMaintenanceDate: draft.nextMaintenanceDate,
      },
    };
  } catch (error) {
    logDeliveryEmailError(projectId, deliveryId, "preview email", error);
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "No se pudo generar la vista previa del correo.";

    return { ok: false, error: message, message };
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

    const deliveryPdf = await generateProjectDeliveryPdf(supabase, projectId, deliveryId);
    const warrantyPdf = await generateWarrantyLetterPdf(
      supabase,
      projectId,
      emailDraft.warrantyId
    );
    validatePdfBuffer(Buffer.from(deliveryPdf), "acta de entrega");
    validatePdfBuffer(Buffer.from(warrantyPdf), "carta garantia");

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
    if (!emailDraft.warrantyUrl || !emailDraft.warrantyPdfUrl) {
      throw new Error("No se generaron enlaces publicos de garantia.");
    }
    await Promise.all([
      validatePublicUrl(emailDraft.deliveryUrl),
      validatePublicUrl(emailDraft.deliveryPdfUrl),
      validatePublicUrl(emailDraft.warrantyUrl),
      validatePublicUrl(emailDraft.warrantyPdfUrl),
    ]);

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
