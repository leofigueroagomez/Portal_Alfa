import Link from "next/link";
import type React from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  IdCard,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getProjectDeliverySystemsForDisplay } from "@/lib/projectDeliverySystems";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
import { getOrCreateDeliverySigningLink } from "@/lib/publicDocumentLinks";
import DeliveryPhotoManager from "./DeliveryPhotoManager";
import SendDeliveryEmailButton from "./SendDeliveryEmailButton";
import WhatsAppDeliverySignButton from "./WhatsAppDeliverySignButton";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
  phone?: string | null;
  email?: string | null;
  billing_email?: string | null;
};

type ProjectDelivery = {
  id: number;
  delivery_date: string | null;
  status: string | null;
  delivered_to_name: string | null;
  delivered_to_role: string | null;
  delivered_by_name: string | null;
  site_attended_by_name?: string | null;
  site_attended_by_role?: string | null;
  client_signer_name?: string | null;
  client_signer_phone?: string | null;
  client_signer_email?: string | null;
  client_signed_at?: string | null;
  signature_method?: string | null;
  client_ine_front_url?: string | null;
  client_ine_back_url?: string | null;
  signature_latitude?: number | null;
  signature_longitude?: number | null;
  signature_geo_accuracy_meters?: number | null;
  signature_geo_timestamp?: string | null;
  privacy_consent_accepted?: boolean | null;
  privacy_consent_accepted_at?: string | null;
  client_signature_ip?: string | null;
  client_signature_user_agent?: string | null;
  observations: string | null;
  client_signature_image_url: string | null;
  alfa_signature_image_url: string | null;
  delivery_email_sent_at: string | null;
  delivery_email_sent_to: string | null;
  delivery_email_status: string | null;
  delivery_email_error: string | null;
};

type Evidence = {
  id: number;
  file_url: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  caption: string | null;
  displayUrl: string;
};

type PendingItem = {
  id: number;
  description: string | null;
  status: string | null;
};

type Warranty = {
  id: number;
};

type EmailHistory = {
  id: number;
  sent_to: string | null;
  cc: string | null;
  subject: string | null;
  attachment_names: string[] | null;
  status: string | null;
  error_message: string | null;
  sent_at: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value + (value.includes("T") ? "" : "T12:00:00")).toLocaleDateString("es-MX");
}

function logDeliveryPageError(
  projectId: string,
  deliveryId: string,
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

  console.error("[project-delivery-detail]", {
    projectId,
    deliveryId,
    step,
    message,
  });
}

async function resolvePhotoUrl(storage: ServerSupabaseStorage, imageUrl: string | null) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  try {
    const bucket = storage.from("project-photos");
    const { data: signedData } = await bucket.createSignedUrl(imageUrl, 60 * 60);

    if (signedData?.signedUrl) return signedData.signedUrl;

    const { data: publicData } = bucket.getPublicUrl(imageUrl);
    return publicData.publicUrl || imageUrl;
  } catch {
    return "";
  }
}

export default async function ProjectDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string; deliveryId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, deliveryId } = await params;

  const deliveryResult = await supabase
    .from("project_deliveries")
    .select(
      "id, delivery_date, status, delivered_to_name, delivered_to_role, delivered_by_name, site_attended_by_name, site_attended_by_role, client_signer_name, client_signer_phone, client_signer_email, client_signed_at, signature_method, client_ine_front_url, client_ine_back_url, signature_latitude, signature_longitude, signature_geo_accuracy_meters, signature_geo_timestamp, privacy_consent_accepted, privacy_consent_accepted_at, client_signature_ip, client_signature_user_agent, observations, client_signature_image_url, alfa_signature_image_url, delivery_email_sent_at, delivery_email_sent_to, delivery_email_status, delivery_email_error"
    )
    .eq("id", deliveryId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (deliveryResult.error || !deliveryResult.data) {
    if (deliveryResult.error) {
      logDeliveryPageError(id, deliveryId, "load delivery", deliveryResult.error);
    }

    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/projects/${id}/deliveries`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a entregas
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Entrega no encontrada.
        </section>
      </main>
    );
  }

  const deliveryData = deliveryResult.data as ProjectDelivery;

  async function safeLoad<T>(step: string, loader: () => Promise<T>, fallback: T) {
    try {
      return await loader();
    } catch (error) {
      logDeliveryPageError(id, deliveryId, step, error);
      return fallback;
    }
  }

  const project = await safeLoad("load project", async () => {
    const result = await supabase
      .from("client_projects")
      .select("id, name, client_id")
      .eq("id", id)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }, null);

  const projectData = project as ClientProject | null;
  const [
    client,
    evidences,
    pendingItems,
    deliverySystems,
    warranty,
    emailHistory,
    financialSummary,
    signingLink,
    ineFrontUrl,
    ineBackUrl,
  ] = await Promise.all([
    safeLoad("load client", async () => {
      if (!projectData?.client_id) return null;
      const result = await supabase
        .from("clients")
        .select("name, phone, email, billing_email")
        .eq("id", projectData.client_id)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    }, null),
    safeLoad("load evidences", async () => {
      const result = await supabase
        .from("project_delivery_evidences")
        .select("id, file_url, file_path, file_name, file_type, file_size, caption")
        .eq("project_delivery_id", deliveryId)
        .order("sort_order", { ascending: true });
      if (result.error) {
        const fallbackResult = await supabase
          .from("project_delivery_evidences")
          .select("id, file_url, caption")
          .eq("project_delivery_id", deliveryId)
          .order("sort_order", { ascending: true });
        if (fallbackResult.error) throw fallbackResult.error;
        return fallbackResult.data || [];
      }
      return result.data || [];
    }, []),
    safeLoad("load pending items", async () => {
      const result = await supabase
        .from("project_delivery_pending_items")
        .select("id, description, status")
        .eq("project_delivery_id", deliveryId)
        .order("sort_order", { ascending: true });
      if (result.error) throw result.error;
      return result.data || [];
    }, []),
    safeLoad("load delivery systems", () =>
      getProjectDeliverySystemsForDisplay(supabase, Number(id), deliveryId),
    []),
    safeLoad("load warranty", async () => {
      const result = await supabase
        .from("project_warranties")
        .select("id")
        .eq("client_project_id", id)
        .order("warranty_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    }, null),
    safeLoad("load email history", async () => {
      const result = await supabase
        .from("project_delivery_email_history")
        .select("id, sent_to, cc, subject, attachment_names, status, error_message, sent_at")
        .eq("project_delivery_id", deliveryId)
        .order("sent_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data || [];
    }, []),
    safeLoad("load financial summary", () =>
      getProjectFinancialSummary(supabase, Number(id)),
    { approvedTotalMxn: 0, paidTotalMxn: 0, pendingTotalMxn: 0 }),
    safeLoad("load signing link", () =>
      getOrCreateDeliverySigningLink({
        clientProjectId: Number(id),
        projectDeliveryId: Number(deliveryId),
      }),
    null),
    resolvePhotoUrl(supabase.storage, deliveryData.client_ine_front_url || null),
    resolvePhotoUrl(supabase.storage, deliveryData.client_ine_back_url || null),
  ]);

  const clientData = client as Client | null;
  const recipient = clientData?.billing_email || clientData?.email || "";
  const latestWarranty = warranty as Warranty | null;
  const evidenceList = await Promise.all(
    ((evidences || []) as Omit<Evidence, "displayUrl">[]).map(async (evidence) => ({
      ...evidence,
      displayUrl: await resolvePhotoUrl(supabase.storage, evidence.file_path || evidence.file_url),
    }))
  );
  const pendingList = (pendingItems || []) as PendingItem[];
  const emailHistoryList = (emailHistory || []) as EmailHistory[];
  const baseUrl = getAppBaseUrl();
  const deliveryPrintUrl = `${baseUrl}/projects/${id}/deliveries/${deliveryId}/print`;
  const warrantyPrintUrl = latestWarranty
    ? `${baseUrl}/projects/${id}/warranty/${latestWarranty.id}/print`
    : null;
  const [clientSignatureUrl, alfaSignatureUrl] = await Promise.all([
    resolvePhotoUrl(supabase.storage, deliveryData.client_signature_image_url),
    resolvePhotoUrl(supabase.storage, deliveryData.alfa_signature_image_url),
  ]);

  const isSigned = Boolean(deliveryData.client_signature_image_url || deliveryData.client_signed_at);
  const isPendingSignature = deliveryData.status === "pending_signature" || (!isSigned && deliveryData.status === "draft");

  const googleMapsUrl =
    deliveryData.signature_latitude && deliveryData.signature_longitude
      ? `https://maps.google.com/?q=${deliveryData.signature_latitude},${deliveryData.signature_longitude}`
      : null;

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/deliveries`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a entregas
      </Link>

      <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm tracking-[0.3em] text-[#9E1B32]">
              {formatDate(deliveryData.delivery_date)}
            </p>
            <span
              className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold ${
                isSigned
                  ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                  : "border-[#614620] bg-[#322514] text-[#F4C66A]"
              }`}
            >
              {isSigned ? "Firmado de conformidad" : "Pendiente de firma del cliente"}
            </span>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Entrega de proyecto</h1>
          <p className="mt-2 text-[#B3B3B8]">
            {clientData?.name || "Sin cliente"} / {projectData?.name || "Sin proyecto"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/projects/${id}/deliveries/${deliveryId}/print`}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            <FileText size={18} />
            PDF de entrega
          </Link>
        </div>
      </section>

      {/* Módulo de WhatsApp para Firma Remota */}
      {signingLink?.token && (
        <section className={`mb-8 rounded-2xl border p-5 sm:p-6 shadow-xl ${
          isSigned
            ? "border-[#1F1F24] bg-[#151518]"
            : "border-[#614620] bg-[#22180C]"
        }`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Smartphone size={20} className={isSigned ? "text-[#8CE0B6]" : "text-[#F4C66A]"} />
                <h2 className="text-xl font-bold text-white">
                  {isSigned ? "Enlace de Firma Remota Compartido" : "Enviar a Firma por WhatsApp"}
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#B3B3B8]">
                {isSigned
                  ? "El cliente ya firmó digitalmente este reporte desde su celular."
                  : "Envía el enlace al cliente titular para que revise fotos, sistemas y firme en su celular."}
              </p>
            </div>
            <WhatsAppDeliverySignButton
              projectId={Number(id)}
              deliveryId={Number(deliveryId)}
              token={signingLink.token}
              clientName={deliveryData.client_signer_name || clientData?.name || "Cliente"}
              projectName={projectData?.name || "Proyecto ALFA"}
              defaultPhone={deliveryData.client_signer_phone || clientData?.phone || ""}
              siteAttendedByName={deliveryData.site_attended_by_name}
              isAlreadySigned={isSigned}
            />
          </div>
        </section>
      )}

      {/* Bloque de Blindaje Legal y Trazabilidad LFPDPPP (Si ya firmó) */}
      {isSigned && (
        <section className="mb-8 rounded-2xl border border-[#1F7A4D]/40 bg-[#12221A] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#1F7A4D]/30 pb-3">
            <ShieldCheck size={22} className="text-[#8CE0B6]" />
            <div>
              <h2 className="text-lg font-bold text-white">
                Validación Jurídica y Trazabilidad Digital (LFPDPPP)
              </h2>
              <p className="text-xs text-[#8CE0B6]">
                Cadena de custodia y evidencias de validez contractual y no repudio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="rounded-xl border border-[#1F7A4D]/30 bg-[#0F1B14] p-3.5 space-y-1">
              <span className="text-[#77777D] font-medium">Método y Fecha</span>
              <p className="font-bold text-white">
                {deliveryData.signature_method === "whatsapp_link"
                  ? "Enlace WhatsApp / Celular"
                  : "Presencial en sitio"}
              </p>
              {deliveryData.client_signed_at && (
                <p className="text-[#8CE0B6]">
                  {new Date(deliveryData.client_signed_at).toLocaleString("es-MX")}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[#1F7A4D]/30 bg-[#0F1B14] p-3.5 space-y-1">
              <span className="text-[#77777D] font-medium">Geolocalización GPS</span>
              {deliveryData.signature_latitude && deliveryData.signature_longitude ? (
                <div>
                  <p className="font-bold text-white">
                    {deliveryData.signature_latitude.toFixed(5)}, {deliveryData.signature_longitude.toFixed(5)}
                  </p>
                  {deliveryData.signature_geo_accuracy_meters && (
                    <p className="text-[#77777D]">
                      Precisión: ±{Math.round(deliveryData.signature_geo_accuracy_meters)}m
                    </p>
                  )}
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-semibold text-[#8CE0B6] hover:underline"
                    >
                      <MapPin size={12} />
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[#77777D] italic">Ubicación satelital no provista</p>
              )}
            </div>

            <div className="rounded-xl border border-[#1F7A4D]/30 bg-[#0F1B14] p-3.5 space-y-1">
              <span className="text-[#77777D] font-medium">Consentimiento LFPDPPP</span>
              <p className="font-bold text-[#8CE0B6] flex items-center gap-1">
                <Lock size={13} />
                Otorgado expresamente
              </p>
              {deliveryData.privacy_consent_accepted_at && (
                <p className="text-[#77777D]">
                  {new Date(deliveryData.privacy_consent_accepted_at).toLocaleTimeString("es-MX")}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[#1F7A4D]/30 bg-[#0F1B14] p-3.5 space-y-1 truncate">
              <span className="text-[#77777D] font-medium">Dirección IP y Dispositivo</span>
              <p className="font-bold text-white truncate">
                {deliveryData.client_signature_ip || "IP no registrada"}
              </p>
              <p className="text-[10px] text-[#77777D] truncate" title={deliveryData.client_signature_user_agent || ""}>
                {deliveryData.client_signature_user_agent || "Navegador web"}
              </p>
            </div>
          </div>

          {/* Fotos de INE */}
          {(ineFrontUrl || ineBackUrl) && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-[#8CE0B6] flex items-center gap-1.5 mb-2">
                <IdCard size={15} />
                Identificación Oficial del Firmante (INE / Pasaporte)
              </span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ineFrontUrl && (
                  <a
                    href={ineFrontUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-[#1F7A4D]/40 bg-black group"
                  >
                    <img
                      src={ineFrontUrl}
                      alt="INE Anverso"
                      className="h-28 w-full object-cover group-hover:opacity-90 transition"
                    />
                    <span className="block p-1.5 text-center text-[10px] font-semibold text-[#B3B3B8]">
                      INE Anverso (Frontal)
                    </span>
                  </a>
                )}
                {ineBackUrl && (
                  <a
                    href={ineBackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-[#1F7A4D]/40 bg-black group"
                  >
                    <img
                      src={ineBackUrl}
                      alt="INE Reverso"
                      className="h-28 w-full object-cover group-hover:opacity-90 transition"
                    />
                    <span className="block p-1.5 text-center text-[10px] font-semibold text-[#B3B3B8]">
                      INE Reverso
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mb-8">
        <SendDeliveryEmailButton
          projectId={Number(id)}
          deliveryId={Number(deliveryId)}
          recipient={recipient}
          pendingBalanceMxn={financialSummary.pendingTotalMxn}
          deliveryLink={deliveryPrintUrl}
          warrantyLink={warrantyPrintUrl}
          alreadySentAt={deliveryData.delivery_email_sent_at}
          lastStatus={deliveryData.delivery_email_status}
          lastError={deliveryData.delivery_email_error}
        />
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Historial de correos</h2>
        {emailHistoryList.length === 0 ? (
          <p className="text-[#77777D]">Sin envíos registrados.</p>
        ) : (
          <div className="space-y-3">
            {emailHistoryList.map((email) => (
              <div key={email.id} className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{email.subject || "Sin asunto"}</p>
                    <p className="mt-1 text-sm text-[#B3B3B8]">Para: {email.sent_to || "-"}</p>
                    {email.cc ? <p className="mt-1 text-sm text-[#B3B3B8]">CC: {email.cc}</p> : null}
                    <p className="mt-1 text-xs text-[#77777D]">
                      Adjuntos: {Array.isArray(email.attachment_names) && email.attachment_names.length > 0
                        ? email.attachment_names.join(", ")
                        : "Sin adjuntos"}
                    </p>
                    {email.error_message ? (
                      <p className="mt-2 text-sm text-[#FFB4B4]">{email.error_message}</p>
                    ) : null}
                  </div>
                  <div className="text-left md:text-right">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                        email.status === "sent"
                          ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                          : "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]"
                      }`}
                    >
                      {email.status === "sent" ? "Enviado" : "Error"}
                    </span>
                    <p className="mt-2 text-xs text-[#77777D]">
                      {email.sent_at ? new Date(email.sent_at).toLocaleString("es-MX") : "Sin fecha"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <InfoCard icon={<CalendarDays size={16} />} label="Fecha entrega" value={formatDate(deliveryData.delivery_date)} />
        <InfoCard
          icon={<UserRound size={16} />}
          label="Cliente firmante"
          value={deliveryData.client_signer_name || deliveryData.delivered_to_name || "Sin titular"}
        />
        <InfoCard
          label="Atendió en obra"
          value={deliveryData.site_attended_by_name || "No especificado"}
        />
        <InfoCard
          label="Estado"
          value={isSigned ? "Entregado y Firmado" : "Pendiente de firma"}
        />
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Sistemas entregados</h2>
        {deliverySystems.length === 0 ? (
          <p className="text-[#77777D]">Sin sistemas seleccionados en esta entrega.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {deliverySystems.map((system) => (
              <div key={system.id} className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} className="text-[#8CE0B6]" />
                  {system.system_name || "Sistema"}
                </p>
                {system.notes ? (
                  <p className="mt-2 text-sm text-[#B3B3B8]">{system.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {deliveryData.observations?.trim() ? (
        <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-3 text-2xl font-semibold">Observaciones</h2>
          <p className="whitespace-pre-line leading-relaxed text-[#B3B3B8]">
            {deliveryData.observations}
          </p>
        </section>
      ) : null}

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Pendientes</h2>
        {pendingList.length === 0 ? (
          <p className="text-[#8CE0B6]">Sin pendientes registrados.</p>
        ) : (
          <div className="space-y-3">
            {pendingList.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <p className="font-semibold">{item.description}</p>
                <p className="mt-1 text-xs text-[#F4C66A]">
                  {item.status === "resolved" ? "Resuelto" : "Pendiente"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <DeliveryPhotoManager
        projectId={Number(id)}
        deliveryId={Number(deliveryId)}
        initialPhotos={evidenceList}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SignaturePanel
          title="Firma cliente"
          imageUrl={clientSignatureUrl}
          fallback={
            isPendingSignature
              ? "Pendiente de firma digital del cliente vía WhatsApp o enlace."
              : "Sin firma del cliente registrada."
          }
          signedAt={deliveryData.client_signed_at}
          signerName={deliveryData.client_signer_name || deliveryData.delivered_to_name}
        />
        <SignaturePanel
          title="Firma ALFA"
          imageUrl={alfaSignatureUrl}
          fallback="Sin firma ALFA."
          signerName={deliveryData.delivered_by_name || "Responsable ALFA"}
        />
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
      <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
        {icon}
        {label}
      </p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function SignaturePanel({
  title,
  imageUrl,
  fallback,
  signedAt,
  signerName,
}: {
  title: string;
  imageUrl: string;
  fallback: string;
  signedAt?: string | null;
  signerName?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {signedAt && (
          <span className="inline-flex items-center gap-1 text-xs text-[#8CE0B6]">
            <Clock size={13} />
            {new Date(signedAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
          </span>
        )}
      </div>

      {signerName && (
        <p className="text-xs text-[#B3B3B8]">
          Firmante: <strong className="text-white">{signerName}</strong>
        </p>
      )}

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="max-h-[300px] w-full rounded-xl border border-[#2A2A30] bg-white object-contain"
        />
      ) : (
        <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-xs text-[#F4C66A]">
          {fallback}
        </div>
      )}
    </div>
  );
}
