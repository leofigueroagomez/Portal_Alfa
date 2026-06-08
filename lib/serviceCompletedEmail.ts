import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCurrency } from "@/lib/format";
import { resolveServicePhotoUrl } from "@/lib/serviceReports";

type ServiceReport = {
  id: number;
  service_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  performed_by_name: string | null;
  service_date: string | null;
  solution_description: string | null;
  recommendations: string | null;
  required_parts_notes: string | null;
  completed_at: string | null;
  service_email_sent_at: string | null;
  clients:
    | {
        name: string | null;
        email?: string | null;
        billing_email?: string | null;
      }
    | null;
  client_projects: { name: string | null } | null;
};

type ServicePhoto = {
  id: number;
  image_url: string | null;
  caption: string | null;
};

type PendingInvoice = {
  id: number;
  internal_folio: string | null;
  invoice_date: string | null;
  total_mxn: number | null;
  total?: number | null;
  status: string | null;
};

export type ServiceCompletedEmailDraft = {
  service: ServiceReport;
  to: string;
  cc: string[];
  subject: string;
  html: string;
  attachmentNames: string[];
  pendingInvoices: PendingInvoice[];
  pendingTotalMxn: number;
  portalUrl: string;
};

export type EmailAttachment = {
  filename: string;
  content: string;
};

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function invoiceTotal(invoice: PendingInvoice) {
  return Number(invoice.total_mxn ?? invoice.total ?? 0);
}

function invoiceStatusLabel(status: string | null | undefined) {
  if (status === "issued") return "Emitida";
  if (status === "paid") return "Pagada";
  if (status === "cancelled") return "Cancelada";
  return "Borrador";
}

function appBaseUrl() {
  const value = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

export async function buildServiceCompletedEmailDraft(
  supabase: SupabaseClient,
  serviceReportId: number
): Promise<ServiceCompletedEmailDraft | { error: string }> {
  const { data: service, error } = await supabase
    .from("service_reports")
    .select(
      "id, service_number, client_id, client_project_id, performed_by_name, service_date, solution_description, recommendations, required_parts_notes, completed_at, service_email_sent_at, clients(name, email, billing_email), client_projects(name)"
    )
    .eq("id", serviceReportId)
    .maybeSingle();

  if (error) return { error: `No se pudo cargar el servicio: ${error.message}` };
  if (!service) return { error: "Servicio no encontrado." };

  const serviceData = service as unknown as ServiceReport;
  if (!serviceData.client_id) return { error: "El servicio no tiene cliente asignado." };

  const to = serviceData.clients?.billing_email || serviceData.clients?.email || "";
  if (!to) return { error: "El cliente no tiene correo de contacto o facturacion." };

  const [{ data: invoiceRows }, { data: photos }] = await Promise.all([
    supabase
      .from("project_invoices")
      .select("id, internal_folio, invoice_date, total_mxn, total, status")
      .eq("client_id", serviceData.client_id)
      .eq("status", "issued")
      .order("invoice_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("service_report_photos")
      .select("id, image_url, caption")
      .eq("service_report_id", serviceReportId)
      .order("sort_order", { ascending: true })
      .limit(6),
  ]);

  const pendingInvoices = (invoiceRows || []) as PendingInvoice[];
  const pendingTotalMxn = pendingInvoices.reduce(
    (sum, invoice) => sum + invoiceTotal(invoice),
    0
  );
  const portalUrl = `${appBaseUrl() || ""}/portal`;
  const folio =
    serviceData.service_number || `SERV-${String(serviceData.id).padStart(4, "0")}`;
  const subject = `Servicio realizado - ALFA - ${folio}`;
  const attachmentNames = [`Reporte-servicio-${folio}.pdf`];
  const photoList = (photos || []) as ServicePhoto[];
  const photoItems = await Promise.all(
    photoList.map(async (photo) => {
      const url = await resolveServicePhotoUrl(supabase.storage, photo.image_url);
      if (!url) return "";
      return `<li><a href="${escapeHtml(url)}">${escapeHtml(photo.caption || "Evidencia fotografica")}</a></li>`;
    })
  );

  const invoicesHtml =
    pendingInvoices.length > 0
      ? `<p><strong>Saldo pendiente total:</strong> ${formatCurrency(pendingTotalMxn, "MXN")}</p>
        <table style="border-collapse:collapse;width:100%;margin-top:10px;font-size:14px;">
          <thead>
            <tr>
              <th style="border-bottom:1px solid #ddd;text-align:left;padding:8px;">Factura</th>
              <th style="border-bottom:1px solid #ddd;text-align:left;padding:8px;">Fecha</th>
              <th style="border-bottom:1px solid #ddd;text-align:right;padding:8px;">Monto</th>
              <th style="border-bottom:1px solid #ddd;text-align:left;padding:8px;">Estatus</th>
            </tr>
          </thead>
          <tbody>
            ${pendingInvoices
              .map(
                (invoice) => `<tr>
                  <td style="border-bottom:1px solid #eee;padding:8px;">${escapeHtml(invoice.internal_folio || `Factura #${invoice.id}`)}</td>
                  <td style="border-bottom:1px solid #eee;padding:8px;">${formatDate(invoice.invoice_date)}</td>
                  <td style="border-bottom:1px solid #eee;padding:8px;text-align:right;">${formatCurrency(invoiceTotal(invoice), "MXN")}</td>
                  <td style="border-bottom:1px solid #eee;padding:8px;">${invoiceStatusLabel(invoice.status)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : "<p>Actualmente no tienes adeudos pendientes con ALFA.</p>";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111318;line-height:1.6;">
      <h1 style="font-size:22px;margin-bottom:18px;">Servicio realizado</h1>
      <p>Hola ${escapeHtml(serviceData.clients?.name || "Cliente ALFA")},</p>
      <p>Te compartimos el resumen del servicio realizado por ALFA.</p>
      <p><strong>Folio:</strong> ${escapeHtml(folio)}</p>
      <p><strong>Fecha de realizacion:</strong> ${formatDate(serviceData.completed_at || serviceData.service_date)}</p>
      <p><strong>Proyecto relacionado:</strong> ${escapeHtml(serviceData.client_projects?.name || "No aplica")}</p>
      <p><strong>Tecnico o responsable:</strong> ${escapeHtml(serviceData.performed_by_name || "ALFA")}</p>
      <p><strong>Trabajo realizado:</strong></p>
      <p>${escapeHtml(serviceData.solution_description || "Servicio registrado como finalizado.")}</p>
      <p><strong>Recomendaciones:</strong></p>
      <p>${escapeHtml(serviceData.recommendations || serviceData.required_parts_notes || "Sin recomendaciones adicionales.")}</p>
      ${
        photoItems.filter(Boolean).length > 0
          ? `<p><strong>Evidencias:</strong></p><ul>${photoItems.join("")}</ul>`
          : "<p><strong>Evidencias:</strong> Sin evidencias adjuntas.</p>"
      }
      <h2 style="font-size:18px;margin-top:24px;">Estado de cuenta</h2>
      ${invoicesHtml}
      ${portalUrl ? `<p style="margin-top:22px;"><a href="${portalUrl}">Abrir Portal Cliente</a></p>` : ""}
    </div>
  `;

  return {
    service: serviceData,
    to,
    cc: parseEmails(process.env.POSTSALE_CC_EMAILS),
    subject,
    html,
    attachmentNames,
    pendingInvoices,
    pendingTotalMxn,
    portalUrl,
  };
}

export async function sendResendHtmlEmail(input: {
  to: string;
  cc: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
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
      to: input.to,
      cc: input.cc.length > 0 ? input.cc : undefined,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    }),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Resend rechazo el correo: ${body}`);
  }

  return body ? JSON.parse(body) : null;
}
