import { createSupabaseServerClient } from "@/services/supabaseServer";

type NotificationEventType =
  | "quote_approved"
  | "authorized_plan_uploaded"
  | "site_visit_created";

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
};

type NotificationRecipient = {
  id: number;
  name: string;
  phone: string;
  channel: string;
  is_active: boolean;
};

type EventPayload = {
  eventType: NotificationEventType;
  projectId: number;
  title: string;
  resourcePath: string;
};

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function hasWhatsAppConfig() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_PROVIDER
  );
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

async function getProjectContext(projectId: number) {
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();

  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase
        .from("clients")
        .select("name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };

  return {
    projectName: projectData?.name || "Proyecto sin nombre",
    clientName: (client as Client | null)?.name || "Cliente sin nombre",
  };
}

async function sendWhatsAppMessage(phone: string, message: string) {
  const provider = process.env.WHATSAPP_PROVIDER || "mock";

  if (provider !== "cloud_api") {
    return {
      mocked: true,
      provider,
      reason: "unsupported_provider",
      phone,
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(phone),
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      }),
    }
  );

  const body = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

async function notifyInternalUsers(payload: EventPayload) {
  const supabase = await createSupabaseServerClient();
  const { projectName, clientName } = await getProjectContext(payload.projectId);
  const resourceUrl = `${getSiteUrl()}${payload.resourcePath}`;
  const message = [
    payload.title,
    `Cliente: ${clientName}`,
    `Proyecto: ${projectName}`,
    `Link: ${resourceUrl}`,
  ].join("\n");

  const { data: recipients, error: recipientsError } = await supabase
    .from("notification_recipients")
    .select("id, name, phone, channel, is_active")
    .eq("is_active", true)
    .eq("channel", "whatsapp")
    .order("name", { ascending: true });

  if (recipientsError) {
    console.error("Error leyendo notification_recipients:", recipientsError);
  }

  const activeRecipients = ((recipients || []) as NotificationRecipient[]).filter(
    (recipient) => recipient.phone.trim()
  );

  let status = "pending";
  let providerResponse: unknown = null;

  if (activeRecipients.length === 0) {
    status = "skipped_no_recipients";
    providerResponse = { reason: "no_active_whatsapp_recipients" };
    console.log("[notifications] skipped: no active WhatsApp recipients", {
      eventType: payload.eventType,
      projectId: payload.projectId,
    });
  } else if (!hasWhatsAppConfig()) {
    status = "skipped_missing_config";
    providerResponse = {
      reason: "missing_whatsapp_env",
      recipient_count: activeRecipients.length,
    };
    console.log("[notifications] WhatsApp mock/skipped missing config", {
      eventType: payload.eventType,
      projectId: payload.projectId,
      recipientCount: activeRecipients.length,
      message,
    });
  } else if (process.env.WHATSAPP_PROVIDER !== "cloud_api") {
    status = "mocked";
    providerResponse = {
      provider: process.env.WHATSAPP_PROVIDER,
      recipient_count: activeRecipients.length,
      reason: "provider_not_implemented",
    };
    console.log("[notifications] WhatsApp mocked provider", {
      eventType: payload.eventType,
      projectId: payload.projectId,
      provider: process.env.WHATSAPP_PROVIDER,
      recipientCount: activeRecipients.length,
      message,
    });
  } else {
    const responses = [];

    for (const recipient of activeRecipients) {
      try {
        const response = await sendWhatsAppMessage(recipient.phone, message);
        responses.push({
          recipient_id: recipient.id,
          ok: "ok" in response ? response.ok : true,
          response,
        });
      } catch (error) {
        responses.push({
          recipient_id: recipient.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    status = responses.every((response) => response.ok) ? "sent" : "failed";
    providerResponse = responses;
  }

  const { error: eventError } = await supabase
    .from("notification_events")
    .insert({
      event_type: payload.eventType,
      client_project_id: payload.projectId,
      title: payload.title,
      message,
      status,
      provider_response: providerResponse,
    });

  if (eventError) {
    console.error("Error guardando notification_events:", eventError);
  }

  // TODO: filtrar destinatarios por usuarios involucrados en el proyecto.
  return { status, message };
}

export async function notifyQuoteApproved(projectId: number, quoteId: number) {
  return notifyInternalUsers({
    eventType: "quote_approved",
    projectId,
    title: "Nueva cotizacion aprobada",
    resourcePath: `/quotes/${quoteId}`,
  });
}

export async function notifyAuthorizedPlanUploaded(
  projectId: number,
  documentId: number
) {
  return notifyInternalUsers({
    eventType: "authorized_plan_uploaded",
    projectId,
    title: "Nuevo plano autorizado cargado",
    resourcePath: `/projects/${projectId}?document=${documentId}`,
  });
}

export async function notifySiteVisitCreated(
  projectId: number,
  visitId: number
) {
  return notifyInternalUsers({
    eventType: "site_visit_created",
    projectId,
    title: "Nueva visita de obra",
    resourcePath: `/projects/${projectId}/site-visits/${visitId}`,
  });
}
