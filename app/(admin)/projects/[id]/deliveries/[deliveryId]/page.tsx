import Link from "next/link";
import type React from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
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
  caption: string | null;
  displayUrl: string;
};

type PendingItem = {
  id: number;
  description: string | null;
  status: string | null;
};

type DeliverySystem = {
  id: number;
  system_name: string | null;
  delivered: boolean | null;
  notes: string | null;
};

type Warranty = {
  id: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

async function resolvePhotoUrl(storage: ServerSupabaseStorage, imageUrl: string | null) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const bucket = storage.from("project-photos");
  const { data: signedData } = await bucket.createSignedUrl(imageUrl, 60 * 60);

  if (signedData?.signedUrl) return signedData.signedUrl;

  const { data: publicData } = bucket.getPublicUrl(imageUrl);
  return publicData.publicUrl || imageUrl;
}

export default async function ProjectDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string; deliveryId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, deliveryId } = await params;

  const { data: delivery, error } = await supabase
    .from("project_deliveries")
    .select(
      "id, delivery_date, status, delivered_to_name, delivered_to_role, delivered_by_name, observations, client_signature_image_url, alfa_signature_image_url, delivery_email_sent_at, delivery_email_sent_to, delivery_email_status, delivery_email_error"
    )
    .eq("id", deliveryId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !delivery) {
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

  const deliveryData = delivery as ProjectDelivery;
  const [{ data: project }, { data: evidences }, { data: pendingItems }, { data: systems }, { data: warranty }] =
    await Promise.all([
      supabase.from("client_projects").select("id, name, client_id").eq("id", id).maybeSingle(),
      supabase
        .from("project_delivery_evidences")
        .select("id, file_url, caption")
        .eq("project_delivery_id", deliveryId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_delivery_pending_items")
        .select("id, description, status")
        .eq("project_delivery_id", deliveryId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_delivery_systems")
        .select("id, system_name, delivered, notes")
        .eq("project_delivery_id", deliveryId)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_warranties")
        .select("id")
        .eq("client_project_id", id)
        .order("warranty_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase.from("clients").select("name, email, billing_email").eq("id", projectData.client_id).maybeSingle()
    : { data: null };
  const clientData = client as Client | null;
  const recipient = clientData?.billing_email || clientData?.email || "";
  const deliverySystems = (systems || []) as DeliverySystem[];
  const latestWarranty = warranty as Warranty | null;
  const financialSummary = await getProjectFinancialSummary(supabase, Number(id));
  const evidenceList = await Promise.all(
    ((evidences || []) as Omit<Evidence, "displayUrl">[]).map(async (evidence) => ({
      ...evidence,
      displayUrl: await resolvePhotoUrl(supabase.storage, evidence.file_url),
    }))
  );
  const pendingList = (pendingItems || []) as PendingItem[];
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
          deliveryLink={`/projects/${id}/deliveries/${deliveryId}/print`}
          warrantyLink={latestWarranty ? `/projects/${id}/warranty/${latestWarranty.id}/print` : null}
          alreadySentAt={deliveryData.delivery_email_sent_at}
          lastStatus={deliveryData.delivery_email_status}
          lastError={deliveryData.delivery_email_error}
        />
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

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Evidencias</h2>
        {evidenceList.length === 0 ? (
          <p className="text-[#77777D]">Sin evidencias disponibles.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {evidenceList.map((evidence, index) => (
              <figure key={evidence.id} className="space-y-2">
                <img
                  src={evidence.displayUrl}
                  alt={evidence.caption || `Evidencia ${index + 1}`}
                  className="h-72 w-full rounded-xl border border-[#2A2A30] object-cover"
                />
                <figcaption className="text-sm text-[#B3B3B8]">
                  {evidence.caption || `Evidencia ${index + 1}`}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

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
