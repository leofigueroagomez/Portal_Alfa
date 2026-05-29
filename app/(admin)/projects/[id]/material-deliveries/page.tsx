import Link from "next/link";
import { ArrowLeft, FileText, ImageIcon, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
};

type MaterialDelivery = {
  id: number;
  delivered_to_name: string | null;
  delivery_date: string | null;
  evidence_photo_url: string | null;
  created_at: string | null;
  evidenceDisplayUrl: string;
  itemCount: number;
};

type MaterialDeliveryItem = {
  delivery_id: number;
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

  if (signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = bucket.getPublicUrl(imageUrl);
  return publicData.publicUrl || imageUrl;
}

export default async function ProjectMaterialDeliveriesPage({
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
    .from("project_material_deliveries")
    .select("id, delivered_to_name, delivery_date, evidence_photo_url, created_at")
    .eq("client_project_id", id)
    .order("delivery_date", { ascending: false })
    .order("created_at", { ascending: false });

  const deliveryList = (deliveries || []) as Omit<
    MaterialDelivery,
    "evidenceDisplayUrl" | "itemCount"
  >[];
  const deliveryIds = deliveryList.map((delivery) => delivery.id);
  const { data: rawItems } = deliveryIds.length
    ? await supabase
        .from("project_material_delivery_items")
        .select("delivery_id")
        .in("delivery_id", deliveryIds)
    : { data: [] };

  const itemCounts = ((rawItems || []) as MaterialDeliveryItem[]).reduce(
    (map, item) => {
      map.set(item.delivery_id, Number(map.get(item.delivery_id) || 0) + 1);
      return map;
    },
    new Map<number, number>()
  );
  const enrichedDeliveries = await Promise.all(
    deliveryList.map(async (delivery) => ({
      ...delivery,
      evidenceDisplayUrl: await resolvePhotoUrl(supabase.storage, delivery.evidence_photo_url),
      itemCount: Number(itemCounts.get(delivery.id) || 0),
    }))
  );

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
          <h1 className="text-3xl font-bold sm:text-4xl">Entrega de material</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {projectData?.name || "Proyecto operativo"}
          </p>
        </div>

        <Link
          href={`/projects/${id}/material-deliveries/new`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nueva entrega
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar entregas. Ejecuta el SQL del modulo si aun no existe la tabla.
        </section>
      ) : enrichedDeliveries.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No hay entregas registradas para este proyecto.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Receptor</th>
                  <th className="px-4 py-3 text-center font-semibold">Partidas</th>
                  <th className="px-4 py-3 font-semibold">Evidencia</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {enrichedDeliveries.map((delivery) => (
                  <tr
                    key={delivery.id}
                    className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F]"
                  >
                    <td className="px-4 py-3">{formatDate(delivery.delivery_date)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {delivery.delivered_to_name || "Sin receptor"}
                    </td>
                    <td className="px-4 py-3 text-center">{delivery.itemCount}</td>
                    <td className="px-4 py-3">
                      {delivery.evidenceDisplayUrl ? (
                        <img
                          src={delivery.evidenceDisplayUrl}
                          alt="Evidencia de entrega"
                          className="h-14 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-2 text-[#77777D]">
                          <ImageIcon size={16} />
                          Sin imagen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/projects/${id}/material-deliveries/${delivery.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          Ver detalle
                        </Link>
                        <Link
                          href={`/projects/${id}/material-deliveries/${delivery.id}/print`}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          <FileText size={14} />
                          Imprimir
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
