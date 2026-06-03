import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import PrintMaterialDeliveryButton from "./PrintMaterialDeliveryButton";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
  company_name: string | null;
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

  if (signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = bucket.getPublicUrl(imageUrl);
  return publicData.publicUrl || imageUrl;
}

export default async function MaterialDeliveryPrintPage({
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
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Entrega no encontrada</h1>
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
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const clientData = client as Client | null;
  const itemList = (items || []) as MaterialDeliveryItem[];
  const [evidenceDisplayUrl, signatureDisplayUrl] = await Promise.all([
    resolvePhotoUrl(supabase.storage, deliveryData.evidence_photo_url),
    resolvePhotoUrl(supabase.storage, deliveryData.signature_image_url),
  ]);

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page {
          size: letter;
          margin: 12mm;
        }

        .print-root {
          font-family: Arial, Helvetica, sans-serif;
        }

        .summary-box,
        .line-row,
        .evidence-box,
        .signature-box,
        .confirmation-box {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        @media print {
          html,
          body {
            background: white !important;
            font-size: 10.5px !important;
          }

          body > div > aside,
          body aside,
          body header:not(.quote-print-header),
          nav,
          .admin-sidebar,
          .admin-nav,
          .mobile-admin-header,
          .admin-menu-button,
          .admin-menu-overlay,
          .admin-user-card,
          .no-print,
          .print-actions {
            display: none !important;
          }

          body > div,
          .admin-print-route,
          main {
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

          .quote-print-header {
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }

          .quote-print-logo {
            max-height: 28px !important;
            max-width: 112px !important;
          }

          .items-table {
            font-size: 9.5px !important;
          }

          .items-table thead {
            display: table-header-group;
          }

          .items-table th,
          .items-table td {
            padding: 4px 6px !important;
          }

          .evidence-photo {
            max-height: 230px !important;
          }

          .signature-image {
            max-height: 110px !important;
          }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[816px] max-w-none items-center justify-between">
        <Link
          href={`/projects/${id}/material-deliveries/${deliveryId}`}
          className="text-xs text-[#5F626A]"
        >
          Volver a entrega
        </Link>
        <PrintMaterialDeliveryButton />
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
              Comprobante de entrega de material
            </p>
          </div>

          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>Fecha: {formatDate(deliveryData.delivery_date)}</p>
            <p className="mt-2 text-xl font-semibold text-[#111318]">
              Entrega #{deliveryData.id}
            </p>
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
            <p className="mt-1 text-[#555963]">
              {clientData?.company_name || ""}
            </p>
          </div>

          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Proyecto
            </p>
            <p className="text-base font-semibold">
              {projectData?.name || "Sin proyecto"}
            </p>
            <p className="mt-1 text-[#555963]">
              Entrego: {deliveryData.delivered_by_name || "Usuario ALFA"}
            </p>
          </div>
        </section>

        <section className="summary-box mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Recibido por
            </p>
            <p className="text-base font-semibold">
              {deliveryData.delivered_to_name || "Sin receptor"}
            </p>
            <p className="mt-1 text-[#555963]">
              Telefono: {deliveryData.delivered_to_phone || "Sin telefono"}
            </p>
          </div>

          <div className="confirmation-box border border-[#E1DDD5] bg-[#F7F5F1] p-4">
            <p className="text-[11px] leading-5 text-[#555963]">
              El receptor confirma haber recibido los materiales enlistados en este documento.
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Equipos entregados
          </h2>
          <table className="items-table w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[#E1DDD5] bg-[#F7F5F1] text-left text-[#555963]">
                <th className="px-2 py-2">Marca</th>
                <th className="px-2 py-2">Modelo</th>
                <th className="px-2 py-2">Descripcion</th>
                <th className="w-20 px-2 py-2 text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {itemList.map((item) => (
                <tr key={item.id} className="line-row border-b border-[#EFECE6]">
                  <td className="px-2 py-2">{item.product_brand || "Sin marca"}</td>
                  <td className="px-2 py-2 font-semibold">{item.product_model || "-"}</td>
                  <td className="px-2 py-2 text-[#555963]">
                    {item.product_name || "Sin descripcion"}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {formatNumber(item.quantity_delivered)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {deliveryData.notes?.trim() ? (
          <section className="mb-6 border-t border-[#D6D1C8] pt-4 text-[11px]">
            <h2 className="mb-2 text-sm font-semibold">Notas</h2>
            <div className="whitespace-pre-line leading-5 text-[#555963]">
              {deliveryData.notes}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-4 text-xs">
          <div className="evidence-box border border-[#E1DDD5] p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Foto evidencia
            </p>
            {evidenceDisplayUrl ? (
              <img
                src={evidenceDisplayUrl}
                alt="Evidencia de entrega"
                className="evidence-photo max-h-[280px] w-full object-contain"
              />
            ) : (
              <p className="text-[#555963]">Sin evidencia disponible.</p>
            )}
          </div>

          <div className="signature-box border border-[#E1DDD5] p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Firma
            </p>
            {signatureDisplayUrl ? (
              <img
                src={signatureDisplayUrl}
                alt="Firma del receptor"
                className="signature-image max-h-[150px] w-full object-contain"
              />
            ) : (
              <div className="flex h-28 items-center justify-center border border-dashed border-[#D6D1C8] text-[#555963]">
                Sin firma capturada
              </div>
            )}
            <div className="mt-4 border-t border-[#D6D1C8] pt-2 text-center text-[10px] text-[#555963]">
              {deliveryData.delivered_to_name || "Nombre y firma del receptor"}
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
