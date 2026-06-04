"use server";

import { revalidatePath } from "next/cache";
import { canViewFinancials } from "@/lib/permissions";
import {
  calculateProjectProfitability,
  getLatestProfitabilityReport,
} from "@/lib/projectProfitability";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getAppBaseUrl } from "@/lib/appUrl";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";

function parseMoney(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function parseEmails(value: string | null | undefined) {
  return (value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

async function assertFinancialAccess() {
  const profile = await getCurrentUserProfile();
  if (!profile?.is_active || !canViewFinancials(profile.role)) {
    throw new Error("No tienes permisos para ver rentabilidad de proyectos.");
  }

  return profile;
}

async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
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
      subject,
      html,
    }),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Resend rechazo el correo: ${body}`);
  }

  return body ? JSON.parse(body) : null;
}

export async function generateProfitabilityReport(
  projectId: number,
  formData: FormData
) {
  const profile = await assertFinancialAccess();
  const supabase = await createSupabaseServerClient();
  const otherCostsMxn = parseMoney(formData.get("other_costs_mxn"));
  const notes = parseText(formData.get("notes"));
  const snapshot = await calculateProjectProfitability(
    supabase,
    projectId,
    otherCostsMxn
  );
  const existing = await getLatestProfitabilityReport(supabase, projectId);
  const payload = {
    client_project_id: projectId,
    generated_at: new Date().toISOString(),
    generated_by_user_id: profile.id,
    total_sold_mxn: snapshot.totalSoldMxn,
    equipment_purchase_total_mxn: snapshot.equipmentPurchaseTotalMxn,
    work_orders_total_mxn: snapshot.workOrdersTotalMxn,
    other_costs_mxn: snapshot.otherCostsMxn,
    operating_profit_mxn: snapshot.operatingProfitMxn,
    operating_margin_percent: snapshot.operatingMarginPercent,
    status: "generated",
    notes: notes || null,
  };

  const result = existing
    ? await supabase
        .from("project_profitability_reports")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("project_profitability_reports").insert(payload);

  if (result.error) {
    throw new Error(`No se pudo guardar el reporte: ${result.error.message}`);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/profitability`);
  revalidatePath(`/projects/${projectId}/profitability/print`);
}

export async function sendProfitabilityReportToDirector(projectId: number) {
  await assertFinancialAccess();
  const supabase = await createSupabaseServerClient();
  const directorEmails = parseEmails(process.env.DIRECTOR_EMAILS);

  if (directorEmails.length === 0) {
    return {
      ok: false,
      message: "Configura DIRECTOR_EMAILS para enviar este reporte.",
    };
  }

  const report = await getLatestProfitabilityReport(supabase, projectId);
  if (!report) {
    return {
      ok: false,
      message: "Genera el reporte antes de enviarlo a direccion.",
    };
  }

  const { data: project, error: projectError } = await supabase
    .from("client_projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, message: "Proyecto no encontrado." };
  }

  const { data: client } = project.client_id
    ? await supabase
        .from("clients")
        .select("name")
        .eq("id", project.client_id)
        .maybeSingle()
    : { data: null };
  const reportUrl = `${getAppBaseUrl()}/projects/${projectId}/profitability`;
  const subject = `Rentabilidad - ${project.name || `Proyecto ${projectId}`}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111318; line-height: 1.6;">
      <h1 style="font-size: 22px;">Reporte interno de rentabilidad</h1>
      <p><strong>Cliente:</strong> ${client?.name || "Sin cliente"}</p>
      <p><strong>Proyecto:</strong> ${project.name || `Proyecto ${projectId}`}</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 620px;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Total vendido</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(report.total_sold_mxn, "MXN")}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Compras de equipos</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(report.equipment_purchase_total_mxn, "MXN")}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Ordenes de trabajo</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(report.work_orders_total_mxn, "MXN")}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Otros costos</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(report.other_costs_mxn, "MXN")}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Utilidad operativa</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${formatCurrency(report.operating_profit_mxn, "MXN")}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Margen real</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${formatNumber(report.operating_margin_percent)}%</strong></td></tr>
      </table>
      <p><a href="${reportUrl}">Abrir reporte interno</a></p>
      <p style="color:#666">Este reporte es interno de direccion. No reenviar al cliente.</p>
    </div>
  `;

  try {
    const response = await sendResendEmail({
      to: directorEmails,
      subject,
      html,
    });

    const { error } = await supabase
      .from("project_profitability_reports")
      .update({
        status: "sent",
        director_email_sent_at: new Date().toISOString(),
        director_email_sent_to: directorEmails.join(", "),
        director_email_status: "sent",
        director_email_error: null,
      })
      .eq("id", report.id);

    if (error) throw error;

    revalidatePath(`/projects/${projectId}/profitability`);
    return { ok: true, message: "Reporte enviado a direccion.", response };
  } catch (error) {
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "No se pudo enviar el reporte a direccion.";

    await supabase
      .from("project_profitability_reports")
      .update({
        director_email_status: "error",
        director_email_error: message,
      })
      .eq("id", report.id);

    revalidatePath(`/projects/${projectId}/profitability`);
    return { ok: false, message };
  }
}
