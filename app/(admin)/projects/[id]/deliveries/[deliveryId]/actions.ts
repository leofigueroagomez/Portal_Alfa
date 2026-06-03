"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";

type Delivery = {
  id: number;
  client_project_id: number;
  delivery_date: string | null;
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
    process.env.VERCEL_URL?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string;
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

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend rechazo el correo: ${body}`);
  }
}

export async function sendProjectDeliveryEmail(projectId: number, deliveryId: number) {
  const supabase = await createSupabaseServerClient();

  const { data: delivery } = await supabase
    .from("project_deliveries")
    .select("id, client_project_id, delivery_date")
    .eq("id", deliveryId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (!delivery) {
    return { ok: false, message: "Entrega no encontrada." };
  }

  const deliveryData = delivery as Delivery;
  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();
  const projectData = project as Project | null;

  if (!projectData) {
    return { ok: false, message: "Proyecto no encontrado." };
  }

  const { data: client } = projectData.client_id
    ? await supabase
        .from("clients")
        .select("name, email, billing_email")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const clientData = client as Client | null;
  const recipient = clientData?.billing_email || clientData?.email || "";

  if (!recipient) {
    const message = "El cliente no tiene correo de facturacion ni correo principal.";
    await supabase
      .from("project_deliveries")
      .update({
        delivery_email_status: "error",
        delivery_email_error: message,
      })
      .eq("id", deliveryId);
    return { ok: false, message };
  }

  const { data: warranty } = await supabase
    .from("project_warranties")
    .select(
      "id, equipment_warranty_end_date, installation_warranty_end_date, preventive_maintenance_frequency_months"
    )
    .eq("client_project_id", projectId)
    .order("warranty_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const warrantyData = warranty as Warranty | null;
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
  const pendingText =
    financialSummary.pendingTotalMxn > 0
      ? `Existe un saldo pendiente de: ${formatCurrency(financialSummary.pendingTotalMxn, "MXN")}.`
      : "No existe saldo pendiente registrado.";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111318; line-height: 1.6;">
      <h1 style="font-size: 22px;">Entrega de proyecto ALFA IT</h1>
      <p>Gracias por confiar en ALFA IT para el proyecto <strong>${projectData.name || "Proyecto"}</strong>.</p>
      <p><strong>Fecha de entrega:</strong> ${formatDate(deliveryData.delivery_date)}</p>
      <p>${pendingText}</p>
      <p><strong>Acta de entrega:</strong> <a href="${deliveryUrl}">${deliveryUrl}</a></p>
      ${
        warrantyUrl
          ? `<p><strong>Carta de garantia:</strong> <a href="${warrantyUrl}">${warrantyUrl}</a></p>`
          : "<p><strong>Carta de garantia:</strong> pendiente de generar.</p>"
      }
      <p><strong>Vencimiento de garantia:</strong> ${formatDate(warrantyEndDate)}</p>
      <p><strong>Proximo mantenimiento sugerido:</strong> ${formatDate(nextMaintenanceDate)}</p>
      <p>Contacto de soporte: ${process.env.ALFA_SUPPORT_EMAIL || "soporte@alfait.com"}</p>
      <p style="color:#666">TODO: crear enlaces publicos firmados o adjuntar PDFs para clientes sin acceso al portal.</p>
    </div>
  `;

  try {
    await sendResendEmail({
      to: recipient,
      subject: `Entrega de proyecto - ${projectData.name || "ALFA IT"}`,
      html,
    });

    await supabase
      .from("project_deliveries")
      .update({
        delivery_email_sent_at: new Date().toISOString(),
        delivery_email_sent_to: recipient,
        delivery_email_status: "sent",
        delivery_email_error: null,
      })
      .eq("id", deliveryId);

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

    revalidatePath(`/projects/${projectId}/deliveries/${deliveryId}`);
    return { ok: false, message };
  }
}
