import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import PrintProjectDeliveryButton from "./PrintProjectDeliveryButton";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
  site_address?: string | null;
};

type Client = {
  name: string | null;
  company_name?: string | null;
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

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export default async function ProjectDeliveryPrintPage({
  params,
}: {
  params: Promise<{ id: string; deliveryId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, deliveryId } = await params;

  const { data: delivery, error } = await supabase
    .from("project_deliveries")
    .select(
      "id, delivery_date, status, delivered_to_name, delivered_to_role, delivered_by_name, observations, client_signature_image_url, alfa_signature_image_url"
    )
    .eq("id", deliveryId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !delivery) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Entrega no encontrada</h1>
      </main>
    );
  }

  const deliveryData = delivery as ProjectDelivery;
  const [{ data: project }, { data: evidences }, { data: pendingItems }, { data: systems }] =
    await Promise.all([
      supabase
        .from("client_projects")
        .select("id, name, client_id, site_address")
        .eq("id", id)
        .maybeSingle(),
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
    ]);

  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const clientData = client as Client | null;
  const evidenceList = await Promise.all(
    ((evidences || []) as Omit<Evidence, "displayUrl">[]).map(async (evidence) => ({
      ...evidence,
      displayUrl: await resolvePhotoUrl(supabase.storage, evidence.file_url),
    }))
  );
  const pendingList = (pendingItems || []) as PendingItem[];
  const deliverySystems = (systems || []) as DeliverySystem[];
  const [clientSignatureUrl, alfaSignatureUrl] = await Promise.all([
    resolvePhotoUrl(supabase.storage, deliveryData.client_signature_image_url),
    resolvePhotoUrl(supabase.storage, deliveryData.alfa_signature_image_url),
  ]);

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page { size: letter; margin: 12mm; }
        .print-root { font-family: Arial, Helvetica, sans-serif; }
        .summary-box, .evidence-box, .signature-box, .pending-row { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          html, body { background: white !important; font-size: 10.5px !important; }
          body > div > aside, body aside, body header:not(.quote-print-header), nav,
          .admin-sidebar, .admin-nav, .mobile-admin-header, .admin-menu-button,
          .admin-menu-overlay, .admin-user-card, .no-print, .print-actions {
            display: none !important;
          }
          body > div, .admin-print-route, main {
            display: block !important;
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
          .document {
            width: 816px !important;
            max-width: none !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .quote-print-logo { max-height: 28px !important; max-width: 112px !important; }
          .evidence-photo { max-height: 210px !important; }
          .signature-image { max-height: 105px !important; }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[816px] max-w-none items-center justify-between">
        <Link
          href={`/projects/${id}/deliveries/${deliveryId}`}
          className="text-xs text-[#5F626A]"
        >
          Volver a entrega
        </Link>
        <PrintProjectDeliveryButton />
      </div>

      <article className="document mx-auto w-[816px] min-h-[1056px] max-w-none bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="mb-3 flex h-11 items-center">
              <img
                src="/logo-print.png"
                alt="ALFA OS"
                className="quote-print-logo max-h-11 max-w-36"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Acta de entrega de proyecto
            </p>
          </div>
          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>Fecha: {formatDate(deliveryData.delivery_date)}</p>
            <p className="mt-2 text-xl font-semibold text-[#111318]">
              Entrega #{deliveryData.id}
            </p>
            <p>Estado: {deliveryData.status === "delivered" ? "Entregado" : "Borrador"}</p>
          </div>
        </header>

        <section className="summary-box mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Cliente
            </p>
            <p className="text-base font-semibold">
              {clientData?.name || "Sin cliente"}
            </p>
            <p className="mt-1 text-[#555963]">{clientData?.company_name || ""}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Proyecto
            </p>
            <p className="text-base font-semibold">
              {projectData?.name || "Sin proyecto"}
            </p>
            <p className="mt-1 text-[#555963]">{projectData?.site_address || ""}</p>
          </div>
        </section>

        <section className="summary-box mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Recibe
            </p>
            <p className="text-base font-semibold">
              {deliveryData.delivered_to_name || "Sin receptor"}
            </p>
            <p className="mt-1 text-[#555963]">
              {deliveryData.delivered_to_role || ""}
            </p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Entrega
            </p>
            <p className="text-base font-semibold">
              {deliveryData.delivered_by_name || "ALFA"}
            </p>
          </div>
        </section>

        <section className="mb-6 border-t border-[#D6D1C8] pt-4 text-[11px]">
          <h2 className="mb-2 text-sm font-semibold">Observaciones</h2>
          <div className="whitespace-pre-line leading-5 text-[#555963]">
            {deliveryData.observations || "Sin observaciones registradas."}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Sistemas entregados
          </h2>
          {deliverySystems.length === 0 ? (
            <p className="text-[11px] text-[#555963]">Sin sistemas seleccionados.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {deliverySystems.map((system) => (
                <div key={system.id} className="border border-[#E1DDD5] p-3">
                  <p className="font-semibold">✓ {system.system_name || "Sistema"}</p>
                  {system.notes ? (
                    <p className="mt-1 text-[#555963]">{system.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Pendientes
          </h2>
          {pendingList.length === 0 ? (
            <p className="text-[11px] text-[#555963]">Sin pendientes registrados.</p>
          ) : (
            <div className="space-y-2 text-[11px]">
              {pendingList.map((item, index) => (
                <div key={item.id} className="pending-row border border-[#E1DDD5] p-3">
                  <p className="font-semibold">
                    {index + 1}. {item.description}
                  </p>
                  <p className="mt-1 text-[#555963]">
                    Estado: {item.status === "resolved" ? "Resuelto" : "Pendiente"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Evidencias
          </h2>
          {evidenceList.length === 0 ? (
            <p className="text-[11px] text-[#555963]">Sin evidencias disponibles.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {evidenceList.map((evidence, index) => (
                <figure key={evidence.id} className="evidence-box border border-[#E1DDD5] p-3">
                  <img
                    src={evidence.displayUrl}
                    alt={evidence.caption || `Evidencia ${index + 1}`}
                    className="evidence-photo max-h-[260px] w-full object-contain"
                  />
                  <figcaption className="mt-2 text-[10px] text-[#555963]">
                    {evidence.caption || `Evidencia ${index + 1}`}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4 text-xs">
          <SignatureBox
            title="Firma cliente"
            imageUrl={clientSignatureUrl}
            fallback="Sin firma capturada"
            name={deliveryData.delivered_to_name || "Cliente"}
          />
          <SignatureBox
            title="Firma ALFA"
            imageUrl={alfaSignatureUrl}
            fallback="Sin firma capturada"
            name={deliveryData.delivered_by_name || "ALFA"}
          />
        </section>
      </article>
    </main>
  );
}

function SignatureBox({
  title,
  imageUrl,
  fallback,
  name,
}: {
  title: string;
  imageUrl: string;
  fallback: string;
  name: string;
}) {
  return (
    <div className="signature-box border border-[#E1DDD5] p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
        {title}
      </p>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="signature-image max-h-[150px] w-full object-contain"
        />
      ) : (
        <div className="flex h-28 items-center justify-center border border-dashed border-[#D6D1C8] text-[#555963]">
          {fallback}
        </div>
      )}
      <div className="mt-4 border-t border-[#D6D1C8] pt-2 text-center text-[10px] text-[#555963]">
        {name}
      </div>
    </div>
  );
}
