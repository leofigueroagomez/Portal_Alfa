import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, Phone, UserRound } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
};

type MaterialDelivery = {
  id: number;
  delivered_to_name: string | null;
  delivered_to_phone: string | null;
  delivered_by_name: string | null;
  delivery_date: string | null;
  notes: string | null;
  evidence_photo_url: string | null;
  signature_image_url: string | null;
};

type MaterialDeliveryItem = {
  id: number;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  quantity_delivered: number | null;
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

export default async function MaterialDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string; deliveryId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, deliveryId } = await params;

  const { data: delivery, error } = await supabase
    .from("project_material_deliveries")
    .select(
      "id, delivered_to_name, delivered_to_phone, delivered_by_name, delivery_date, notes, evidence_photo_url, signature_image_url"
    )
    .eq("id", deliveryId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !delivery) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link
          href={`/projects/${id}/material-deliveries`}
          className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
        >
          <ArrowLeft size={18} />
          Volver a entregas
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Entrega no encontrada.
        </section>
      </main>
    );
  }

  const deliveryData = delivery as MaterialDelivery;
  const [{ data: project }, { data: items }] = await Promise.all([
    supabase.from("client_projects").select("id, name, client_id").eq("id", id).maybeSingle(),
    supabase
      .from("project_material_delivery_items")
      .select("id, product_brand, product_model, product_name, quantity_delivered")
      .eq("delivery_id", deliveryId)
      .order("id", { ascending: true }),
  ]);

  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase.from("clients").select("name").eq("id", projectData.client_id).maybeSingle()
    : { data: null };
  const clientData = client as Client | null;
  const itemList = (items || []) as MaterialDeliveryItem[];
  const [evidenceDisplayUrl, signatureDisplayUrl] = await Promise.all([
    resolvePhotoUrl(supabase.storage, deliveryData.evidence_photo_url),
    resolvePhotoUrl(supabase.storage, deliveryData.signature_image_url),
  ]);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/material-deliveries`}
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
          <h1 className="text-3xl font-bold sm:text-4xl">Entrega de material</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {clientData?.name || "Sin cliente"} / {projectData?.name || "Sin proyecto"}
          </p>
        </div>

        <Link
          href={`/projects/${id}/material-deliveries/${deliveryId}/print`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <FileText size={18} />
          Imprimir
        </Link>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
            <CalendarDays size={16} />
            Fecha
          </p>
          <p className="text-xl font-semibold">{formatDate(deliveryData.delivery_date)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
            <UserRound size={16} />
            Recibido por
          </p>
          <p className="text-xl font-semibold">
            {deliveryData.delivered_to_name || "Sin receptor"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
            <Phone size={16} />
            Telefono
          </p>
          <p className="text-xl font-semibold">
            {deliveryData.delivered_to_phone || "Sin telefono"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Partidas</p>
          <p className="text-xl font-semibold">{itemList.length}</p>
        </div>
      </section>

      {deliveryData.notes?.trim() ? (
        <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-3 text-2xl font-semibold">Notas</h2>
          <p className="whitespace-pre-line leading-relaxed text-[#B3B3B8]">
            {deliveryData.notes}
          </p>
        </section>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Foto de evidencia</h2>
          {evidenceDisplayUrl ? (
            <img
              src={evidenceDisplayUrl}
              alt="Evidencia de entrega"
              className="max-h-[520px] w-full rounded-xl border border-[#2A2A30] object-contain"
            />
          ) : (
            <p className="text-[#77777D]">Sin evidencia disponible.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Firma</h2>
          {signatureDisplayUrl ? (
            <img
              src={signatureDisplayUrl}
              alt="Firma del receptor"
              className="max-h-[300px] w-full rounded-xl border border-[#2A2A30] bg-white object-contain"
            />
          ) : (
            <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-[#F4C66A]">
              Se guardo sin firma del receptor.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Equipos entregados</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                <th className="px-3 py-2 font-semibold">Marca</th>
                <th className="px-3 py-2 font-semibold">Modelo</th>
                <th className="px-3 py-2 font-semibold">Descripcion</th>
                <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {itemList.map((item) => (
                <tr key={item.id} className="border-b border-[#222228]">
                  <td className="px-3 py-2">{item.product_brand || "Sin marca"}</td>
                  <td className="px-3 py-2 font-semibold">{item.product_model || "-"}</td>
                  <td className="px-3 py-2 text-[#B3B3B8]">
                    {item.product_name || "Sin descripcion"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(item.quantity_delivered)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
