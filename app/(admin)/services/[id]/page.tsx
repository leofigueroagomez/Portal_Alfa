import Link from "next/link";
import { ArrowLeft, Download, Edit, FileText, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  formatServiceDate,
  getSolutionLabel,
  resolveServicePhotoUrl,
} from "@/lib/serviceReports";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import SendServiceCompletedEmailButton from "./SendServiceCompletedEmailButton";
import { getServiceDispatchContext } from "./actions";
import ServiceCollectionPanel from "./ServiceCollectionPanel";

type ServiceReport = {
  id: number;
  service_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  is_remote?: boolean | null;
  requester_name?: string | null;
  requester_phone?: string | null;
  scheduled_time_start?: string | null;
  scheduled_time_end?: string | null;
  technician_phone?: string | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  recommendations: string | null;
  requires_parts: boolean | null;
  required_parts_notes: string | null;
  technician_cost_mxn: number | null;
  labor_sale_mxn: number | null;
  status: string | null;
  completed_at: string | null;
  payment_status: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  client_signer_name: string | null;
  client_signer_email: string | null;
  client_signer_phone: string | null;
  client_signed_at: string | null;
  client_signature_image_url: string | null;
  client_signature_ip: string | null;
  client_ine_front_url: string | null;
  client_ine_back_url: string | null;
  last_payment_reminder_sent_at: string | null;
  payment_reminders_count: number | null;
  service_email_sent_at: string | null;
  service_email_sent_to: string | null;
  service_email_status: string | null;
  service_email_error: string | null;
  related_quote_id: number | null;
  clients: { name: string | null } | null;
  client_projects: { name: string | null } | null;
  quotes: { quote_number: string | null } | null;
};

type ServicePhoto = {
  id: number;
  image_url: string | null;
  caption: string | null;
  sort_order: number | null;
  displayUrl: string;
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const [{ data: report, error }, dispatchContext] = await Promise.all([
    supabase
      .from("service_reports")
      .select(
        "*, clients(name, company_name, email, phone), client_projects(name), quotes:related_quote_id(quote_number)"
      )
      .eq("id", id)
      .maybeSingle(),
    getServiceDispatchContext(Number(id)),
  ]);

  if (error || !report) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href="/services" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a servicios
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Servicio no encontrado.
        </section>
      </main>
    );
  }

  const reportData = report as ServiceReport;
  const { data: rawPhotos } = await supabase
    .from("service_report_photos")
    .select("id, image_url, caption, sort_order")
    .eq("service_report_id", id)
    .order("sort_order", { ascending: true });

  const photos = await Promise.all(
    ((rawPhotos || []) as Omit<ServicePhoto, "displayUrl">[]).map(async (photo) => ({
      ...photo,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, photo.image_url),
    }))
  );

  const [clientSignatureUrl, ineFrontUrl, ineBackUrl] = await Promise.all([
    resolveServicePhotoUrl(supabase.storage, reportData.client_signature_image_url),
    resolveServicePhotoUrl(supabase.storage, reportData.client_ine_front_url),
    resolveServicePhotoUrl(supabase.storage, reportData.client_ine_back_url),
  ]);

  const quoteUrl = `/quotes/new?clientId=${reportData.client_id || ""}&projectId=${
    reportData.client_project_id || ""
  }&serviceReportId=${reportData.id}`;
  const isCompleted = reportData.status === "completed";
  const isSigned = Boolean(reportData.client_signed_at);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/services" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a servicios
      </Link>

      <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm tracking-[0.3em] text-[#9E1B32]">
              {reportData.service_number || `SERV-${String(reportData.id).padStart(4, "0")}`}
            </p>
            <span
              className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold ${
                reportData.payment_status === "paid"
                  ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                  : isSigned
                    ? "border-[#614620] bg-[#322514] text-[#F4C66A]"
                    : "border-[#2A2A30] bg-[#1C1D22] text-[#B3B3B8]"
              }`}
            >
              {reportData.payment_status === "paid"
                ? "Pagado"
                : isSigned
                  ? "Pendiente de Pago"
                  : "Borrador / Sin Firma"}
            </span>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Reporte de servicio</h1>
          <p className="mt-2 text-[#B3B3B8]">
            {dispatchContext.clientName} / {reportData.client_projects?.name || "Sin proyecto"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/services/${id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C] shadow-lg"
          >
            <Download size={18} />
            Descargar PDF Oficial
          </a>
          <Link
            href={`/services/${id}/proposal`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#151518] px-5 py-3 font-semibold text-white hover:bg-[#222228]"
          >
            <FileText size={18} />
            Ver propuesta
          </Link>
          {isCompleted ? (
            <SendServiceCompletedEmailButton
              serviceId={reportData.id}
              alreadySentAt={reportData.service_email_sent_at}
            />
          ) : null}
          {reportData.requires_parts && reportData.related_quote_id ? (
            <Link
              href={`/quotes/${reportData.related_quote_id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
            >
              <Wrench size={18} />
              Editar refacciones
            </Link>
          ) : null}
          <Link
            href={`/services/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
          >
            <Edit size={18} />
            Editar
          </Link>
        </div>
      </section>

      {/* Módulo de Cobranza, Agenda y Despacho Multicanal */}
      <div className="mb-8">
        <ServiceCollectionPanel
          serviceId={Number(id)}
          serviceNumber={reportData.service_number || `SERV-${String(reportData.id).padStart(4, "0")}`}
          clientName={dispatchContext.clientName}
          totalMxn={reportData.labor_sale_mxn || 0}
          paymentStatus={reportData.payment_status || "pending_payment"}
          paidAt={reportData.paid_at}
          paymentMethod={reportData.payment_method}
          paymentReference={reportData.payment_reference}
          isSigned={isSigned}
          signerName={reportData.client_signer_name}
          signedAt={reportData.client_signed_at}
          status={reportData.status || "draft"}
          recipientEmail={dispatchContext.recipientEmail}
          recipientPhone={dispatchContext.recipientPhone}
          publicUrl={dispatchContext.publicUrl}
          calendarUrl={dispatchContext.calendarUrl}
          waTechAssignUrl={dispatchContext.waTechAssignUrl}
          waTechAssignText={dispatchContext.waTechAssignText}
          isRemote={Boolean(reportData.is_remote)}
          requesterName={reportData.requester_name}
          requesterPhone={reportData.requester_phone}
          scheduledTimeStart={reportData.scheduled_time_start}
          scheduledTimeEnd={reportData.scheduled_time_end}
          performedByName={reportData.performed_by_name}
          serviceLocation={reportData.service_location}
          googleMapsUrl={reportData.google_maps_url}
          waSignUrl={dispatchContext.waSignUrl}
          waSignText={dispatchContext.waSignText}
          waCollectUrl={dispatchContext.waCollectUrl}
          waCollectText={dispatchContext.waCollectText}
          remindersCount={reportData.payment_reminders_count || 0}
          lastReminderSentAt={reportData.last_payment_reminder_sent_at}
        />
      </div>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Fecha de Servicio</p>
          <p className="mt-2 text-xl font-semibold">{formatServiceDate(reportData.service_date)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Técnico Responsable</p>
          <p className="mt-2 text-xl font-semibold">{reportData.performed_by_name || "-"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Resultado Técnico</p>
          <p className="mt-2 text-xl font-semibold">{getSolutionLabel(reportData.solution_status)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Total a Cobrar</p>
          <p className="mt-2 text-xl font-semibold text-[#8CE0B6]">
            {formatCurrency(reportData.labor_sale_mxn, "MXN")}
          </p>
        </div>
      </section>

      {/* Evidencia Legal y Firma si está firmado */}
      {isSigned && (
        <section className="mb-8 rounded-2xl border border-[#1F7A4D]/40 bg-[#12221A] p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Constancia de Firma y Recepción Legal</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Nombre del Firmante:</span>
              <p className="mt-1 font-bold text-white">{reportData.client_signer_name}</p>
              <p className="text-[11px] text-[#B3B3B8]">Correo: {reportData.client_signer_email}</p>
              <p className="text-[11px] text-[#B3B3B8]">Tel: {reportData.client_signer_phone}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Firma Digital Capturada:</span>
              {clientSignatureUrl ? (
                <div className="mt-1 bg-black/50 p-2 rounded-lg border border-white/10">
                  <img src={clientSignatureUrl} alt="Firma" className="h-14 object-contain mx-auto" />
                </div>
              ) : (
                <p className="mt-1 text-white">Firma registrada</p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Identificación Oficial (INE):</span>
              {ineFrontUrl ? (
                <div className="mt-1 flex gap-2">
                  <a href={ineFrontUrl} target="_blank" rel="noreferrer" className="text-[#8CE0B6] underline">
                    Ver Frente
                  </a>
                  {ineBackUrl && (
                    <a href={ineBackUrl} target="_blank" rel="noreferrer" className="text-[#8CE0B6] underline">
                      Ver Reverso
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[#77777D]">Sin foto de INE adjunta</p>
              )}
              <p className="mt-2 text-[10px] text-[#77777D]">
                IP de origen: {reportData.client_signature_ip || "Registrada"}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Diagnóstico</h2>
          <p className="mb-4 whitespace-pre-line text-[#B3B3B8]">{reportData.background || "Sin antecedentes"}</p>
          <p className="whitespace-pre-line">{reportData.diagnosis || "Sin diagnóstico"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Solución y Trabajos</h2>
          <p className="whitespace-pre-line text-[#B3B3B8]">
            {reportData.solution_description || "Sin descripción"}
          </p>
          <h3 className="mb-3 mt-6 text-xl font-semibold">Recomendaciones</h3>
          <p className="whitespace-pre-line text-[#B3B3B8]">
            {reportData.recommendations || "Sin recomendaciones"}
          </p>
        </div>
      </section>

      {reportData.requires_parts ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-5 text-[#F4C66A]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Requiere refacciones</h2>
              <p className="mt-2 whitespace-pre-line">{reportData.required_parts_notes || "Sin notas"}</p>
              {reportData.related_quote_id ? (
                <p className="mt-2 text-sm">
                  Cotización relacionada: {reportData.quotes?.quote_number || `#${reportData.related_quote_id}`}
                </p>
              ) : null}
            </div>
            {reportData.related_quote_id ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/services/${id}/proposal`}
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C]"
                >
                  <FileText size={18} />
                  Ver propuesta de reparación
                </Link>
                <Link
                  href={`/quotes/${reportData.related_quote_id}`}
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
                >
                  <FileText size={18} />
                  Ver cotización interna
                </Link>
              </div>
            ) : (
              <Link
                href={quoteUrl}
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C]"
              >
                <FileText size={18} />
                Crear cotización interna de refacciones
              </Link>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Evidencias Fotográficas</h2>
        {photos.length === 0 ? (
          <p className="text-[#77777D]">Sin fotos registradas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#222228]">
                <img src={photo.displayUrl} alt={photo.caption || "Evidencia"} className="h-56 w-full object-cover" />
                {photo.caption ? <figcaption className="p-3 text-sm text-[#B3B3B8]">{photo.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
