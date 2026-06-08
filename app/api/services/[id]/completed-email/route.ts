import { NextResponse } from "next/server";
import {
  buildServiceCompletedEmailDraft,
  sendResendHtmlEmail,
} from "@/lib/serviceCompletedEmail";
import { generateServiceReportPdf } from "@/lib/serviceReportPdf";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type RequestBody = {
  force?: boolean;
};

function getErrorMessage(error: unknown) {
  return error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : "No se pudo enviar el correo de servicio.";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const serviceReportId = Number(id);
  if (!Number.isFinite(serviceReportId) || serviceReportId <= 0) {
    return NextResponse.json({ ok: false, message: "Servicio invalido." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const draft = await buildServiceCompletedEmailDraft(supabase, serviceReportId);
  if ("error" in draft) {
    return NextResponse.json({ ok: false, message: draft.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    draft: {
      to: draft.to,
      cc: draft.cc.join(", "),
      subject: draft.subject,
      html: draft.html,
      attachmentNames: draft.attachmentNames,
      pendingTotalMxn: draft.pendingTotalMxn,
      pendingInvoices: draft.pendingInvoices,
      portalUrl: draft.portalUrl,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  const profileId = profile.id;

  const { id } = await params;
  const serviceReportId = Number(id);
  if (!Number.isFinite(serviceReportId) || serviceReportId <= 0) {
    return NextResponse.json({ ok: false, message: "Servicio invalido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const force = Boolean(body.force);
  const supabase = await createSupabaseServerClient();

  const { data: service, error: serviceError } = await supabase
    .from("service_reports")
    .select("id, status, completed_at, service_email_sent_at")
    .eq("id", serviceReportId)
    .maybeSingle();

  if (serviceError) {
    return NextResponse.json(
      { ok: false, message: `No se pudo leer el servicio: ${serviceError.message}` },
      { status: 500 }
    );
  }

  if (!service) {
    return NextResponse.json({ ok: false, message: "Servicio no encontrado." }, { status: 404 });
  }

  if (service.status !== "completed") {
    return NextResponse.json(
      { ok: false, message: "El servicio debe estar finalizado para enviar el correo." },
      { status: 400 }
    );
  }

  if (service.service_email_sent_at && !force) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "El correo de servicio ya habia sido enviado.",
    });
  }

  if (!service.completed_at) {
    await supabase
      .from("service_reports")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", serviceReportId);
  }

  const draft = await buildServiceCompletedEmailDraft(supabase, serviceReportId);
  if ("error" in draft) {
    await supabase
      .from("service_reports")
      .update({
        service_email_status: "error",
        service_email_error: draft.error,
      })
      .eq("id", serviceReportId);

    return NextResponse.json({ ok: false, message: draft.error }, { status: 400 });
  }
  const emailDraft = draft;

  async function insertHistory(status: "sent" | "error", errorMessage: string | null, response: unknown) {
    await supabase.from("service_report_email_history").insert({
      service_report_id: serviceReportId,
      sent_to: emailDraft.to,
      cc: emailDraft.cc.join(", ") || null,
      subject: emailDraft.subject,
      body_html: emailDraft.html,
      attachment_names: emailDraft.attachmentNames,
      status,
      error_message: errorMessage,
      resend_response: response || null,
      created_by_user_id: profileId,
    });
  }

  try {
    const servicePdf = await generateServiceReportPdf(supabase, serviceReportId);
    const response = await sendResendHtmlEmail({
      to: emailDraft.to,
      cc: emailDraft.cc,
      subject: emailDraft.subject,
      html: emailDraft.html,
      attachments: [
        {
          filename: emailDraft.attachmentNames[0] || `Reporte-servicio-${serviceReportId}.pdf`,
          content: Buffer.from(servicePdf).toString("base64"),
        },
      ],
    });

    await supabase
      .from("service_reports")
      .update({
        service_email_sent_at: new Date().toISOString(),
        service_email_sent_to: emailDraft.to,
        service_email_status: "sent",
        service_email_error: null,
      })
      .eq("id", serviceReportId);
    await insertHistory("sent", null, response);

    return NextResponse.json({
      ok: true,
      message: force ? "Correo reenviado correctamente." : "Correo enviado correctamente.",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    await supabase
      .from("service_reports")
      .update({
        service_email_status: "error",
        service_email_error: message,
      })
      .eq("id", serviceReportId);
    await insertHistory("error", message, null);

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
