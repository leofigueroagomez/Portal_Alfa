import Link from "next/link";
import type React from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getProjectDeliverySystemsForDisplay } from "@/lib/projectDeliverySystems";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
import DeliveryPhotoManager from "./DeliveryPhotoManager";
import SendDeliveryEmailButton from "./SendDeliveryEmailButton";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
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
  return new Date(value).toLocaleDateString("es-MX");
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
      "id, delivery_date, status, delivered_to_name, delivered_to_role, delivered_by_name, observations, client_signature_image_url, alfa_signature_image_url, delivery_email_sent_at, delivery_email_sent_to, delivery_email_status, delivery_email_error"
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
  const [client, evidences, pendingItems, deliverySystems, warranty, emailHistory, financialSummary] =
    await Promise.all([
      safeLoad("load client", async () => {
        if (!projectData?.client_id) return null;
        const result = await supabase
          .from("clients")
          .select("name, email, billing_email")
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

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/deliveries`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a entregas
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            {formatDate(deliveryData.delivery_date)}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Entrega de proyecto</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {clientData?.name || "Sin cliente"} / {projectData?.name || "Sin proyecto"}
          </p>
        </div>
        <Link
          href={`/projects/${id}/deliveries/${deliveryId}/print`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <FileText size={18} />
          PDF de entrega
        </Link>
      </section>

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
          <p className="text-[#77777D]">Sin envios registrados.</p>
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
        <InfoCard icon={<UserRound size={16} />} label="Recibe" value={deliveryData.delivered_to_name || "Sin receptor"} />
        <InfoCard label="Cargo" value={deliveryData.delivered_to_role || "Sin cargo"} />
        <InfoCard label="Estado" value={deliveryData.status === "delivered" ? "Entregado" : "Borrador"} />
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
        <SignaturePanel title="Firma cliente" imageUrl={clientSignatureUrl} fallback="Sin firma del cliente." />
        <SignaturePanel title="Firma ALFA" imageUrl={alfaSignatureUrl} fallback="Sin firma ALFA." />
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
}: {
  title: string;
  imageUrl: string;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
      <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="max-h-[300px] w-full rounded-xl border border-[#2A2A30] bg-white object-contain"
        />
      ) : (
        <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-[#F4C66A]">
          {fallback}
        </div>
      )}
    </div>
  );
}
