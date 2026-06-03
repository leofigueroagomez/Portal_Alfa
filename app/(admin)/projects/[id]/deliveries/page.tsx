import Link from "next/link";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ClientProject = {
  id: number;
  name: string | null;
};

type ProjectDelivery = {
  id: number;
  delivery_date: string | null;
  status: string | null;
  delivered_to_name: string | null;
  delivered_by_name: string | null;
  created_at: string | null;
  pendingCount: number;
  evidenceCount: number;
};

type PendingItem = {
  project_delivery_id: number;
};

type EvidenceItem = {
  project_delivery_id: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function statusClasses(status: string | null | undefined) {
  return status === "delivered"
    ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
    : "border-[#614620] bg-[#322514] text-[#F4C66A]";
}

function statusLabel(status: string | null | undefined) {
  return status === "delivered" ? "Entregado" : "Borrador";
}

export default async function ProjectDeliveriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  const projectData = project as ClientProject | null;
  const { data: deliveries, error } = await supabase
    .from("project_deliveries")
    .select("id, delivery_date, status, delivered_to_name, delivered_by_name, created_at")
    .eq("client_project_id", id)
    .order("delivery_date", { ascending: false })
    .order("created_at", { ascending: false });

  const baseDeliveries = (deliveries || []) as Omit<
    ProjectDelivery,
    "pendingCount" | "evidenceCount"
  >[];
  const deliveryIds = baseDeliveries.map((delivery) => delivery.id);
  const [{ data: pendingItems }, { data: evidences }] = deliveryIds.length
    ? await Promise.all([
        supabase
          .from("project_delivery_pending_items")
          .select("project_delivery_id")
          .in("project_delivery_id", deliveryIds),
        supabase
          .from("project_delivery_evidences")
          .select("project_delivery_id")
          .in("project_delivery_id", deliveryIds),
      ])
    : [{ data: [] }, { data: [] }];

  const pendingCounts = ((pendingItems || []) as PendingItem[]).reduce(
    (map, item) =>
      map.set(item.project_delivery_id, Number(map.get(item.project_delivery_id) || 0) + 1),
    new Map<number, number>()
  );
  const evidenceCounts = ((evidences || []) as EvidenceItem[]).reduce(
    (map, item) =>
      map.set(item.project_delivery_id, Number(map.get(item.project_delivery_id) || 0) + 1),
    new Map<number, number>()
  );
  const deliveryList = baseDeliveries.map((delivery) => ({
    ...delivery,
    pendingCount: Number(pendingCounts.get(delivery.id) || 0),
    evidenceCount: Number(evidenceCounts.get(delivery.id) || 0),
  }));

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver al proyecto
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA OS
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Entrega de proyecto</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {projectData?.name || "Proyecto operativo"}
          </p>
        </div>

        <Link
          href={`/projects/${id}/deliveries/new`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nueva entrega
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar entregas. Ejecuta `sql/20260603_project_deliveries.sql`.
        </section>
      ) : deliveryList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          Aun no hay actas de entrega para este proyecto.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Recibe</th>
                  <th className="px-4 py-3 font-semibold">Entrega</th>
                  <th className="px-4 py-3 text-center font-semibold">Evidencias</th>
                  <th className="px-4 py-3 text-center font-semibold">Pendientes</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {deliveryList.map((delivery) => (
                  <tr
                    key={delivery.id}
                    className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F]"
                  >
                    <td className="px-4 py-3">{formatDate(delivery.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClasses(delivery.status)}`}>
                        {statusLabel(delivery.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {delivery.delivered_to_name || "Sin receptor"}
                    </td>
                    <td className="px-4 py-3 text-[#B3B3B8]">
                      {delivery.delivered_by_name || "ALFA"}
                    </td>
                    <td className="px-4 py-3 text-center">{delivery.evidenceCount}</td>
                    <td className="px-4 py-3 text-center">{delivery.pendingCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/projects/${id}/deliveries/${delivery.id}`}
                          className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          Ver detalle
                        </Link>
                        <Link
                          href={`/projects/${id}/deliveries/${delivery.id}/print`}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          <FileText size={14} />
                          PDF
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
