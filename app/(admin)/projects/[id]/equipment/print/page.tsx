import Link from "next/link";
import { syncProjectOperationalItems } from "@/lib/projectOperationalItems";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import PrintEquipmentListButton from "./PrintEquipmentListButton";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  site_contact_name?: string | null;
  site_contact_phone?: string | null;
  site_address?: string | null;
  site_google_maps_url?: string | null;
};

type Client = {
  name: string | null;
  company_name: string | null;
};

type Quote = {
  id: number;
};

type OperationalItem = {
  id: number;
  system_name: string | null;
  quantity: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getField(value: string | null | undefined) {
  return value?.trim() || "En espera de llenado";
}

export default async function ProjectEquipmentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  let { data: project, error } = (await supabase
    .from("client_projects")
    .select(
      "id, client_id, name, site_contact_name, site_contact_phone, site_address, site_google_maps_url"
    )
    .eq("id", id)
    .maybeSingle()) as {
    data: ClientProject | null;
    error: { message: string; code?: string } | null;
  };

  if (
    error &&
    (error.message.includes("site_contact_name") ||
      error.message.includes("site_contact_phone") ||
      error.message.includes("site_address") ||
      error.message.includes("site_google_maps_url"))
  ) {
    const fallback = (await supabase
      .from("client_projects")
      .select("id, client_id, name")
      .eq("id", id)
      .maybeSingle()) as {
      data: ClientProject | null;
      error: { message: string; code?: string } | null;
    };

    project = fallback.data;
    error = fallback.error;
  }

  if (error || !project) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Proyecto no encontrado</h1>
      </main>
    );
  }

  const projectData = project as ClientProject;
  const [{ data: client }, { data: approvedQuotes }] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("name, company_name")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("quotes")
      .select("id")
      .eq("client_project_id", projectData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
  ]);

  const clientData = client as Client | null;
  const quotes = (approvedQuotes || []) as Quote[];
  let operationalError: string | null = null;

  try {
    await syncProjectOperationalItems(supabase, projectData.id);
  } catch (syncError) {
    operationalError =
      syncError &&
      typeof syncError === "object" &&
      "message" in syncError &&
      typeof syncError.message === "string"
        ? syncError.message
        : "No se pudo sincronizar la base operativa.";
  }

  const { data: items, error: itemsError } = operationalError
    ? { data: [], error: null }
    : await supabase
        .from("project_operational_items")
        .select("id, system_name, quantity, product_brand, product_model, product_name, product_image_url")
        .eq("client_project_id", projectData.id)
        .eq("status", "active")
        .order("system_name", { ascending: true })
        .order("product_brand", { ascending: true });

  if (itemsError) {
    operationalError = itemsError.message;
  }

  const operationalItems = (items || []) as OperationalItem[];
  const itemsBySystem = Array.from(
    operationalItems.reduce((map, item) => {
      const systemName = item.system_name?.trim() || "Sistema sin nombre";
      const existing = map.get(systemName) || [];
      map.set(systemName, [...existing, item]);
      return map;
    }, new Map<string, OperationalItem[]>())
  );

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page {
          size: letter;
          margin: 10mm;
        }

        .print-root {
          font-family: Arial, Helvetica, sans-serif;
        }

        .line-item-row,
        .quote-block,
        .section-heading,
        .notes-box,
        .scope-box {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        @media print {
          html,
          body {
            background: white !important;
            font-size: 10px !important;
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
            font-size: 10px !important;
            line-height: 1.35 !important;
          }

          .quote-print-header {
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }

          .quote-print-logo-wrap {
            height: 28px !important;
            margin-bottom: 6px !important;
          }

          .quote-print-logo {
            max-height: 28px !important;
            max-width: 112px !important;
          }

          .quote-print-kicker {
            font-size: 8.5px !important;
            letter-spacing: 0.12em !important;
          }

          .quote-print-meta {
            font-size: 9px !important;
            line-height: 1.35 !important;
          }

          .client-project-grid {
            gap: 8px !important;
            margin-bottom: 12px !important;
            font-size: 10px !important;
          }

          .client-project-card {
            padding: 8px 10px !important;
          }

          .equipment-table {
            font-size: 9px !important;
          }

          .equipment-table thead {
            display: table-header-group;
          }

          .equipment-table th,
          .equipment-table td {
            padding: 3px 5px !important;
            line-height: 1.25 !important;
          }

          .equipment-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .product-image-box {
            width: 36px !important;
            height: 36px !important;
          }

          .product-image {
            max-width: 36px !important;
            max-height: 36px !important;
          }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[816px] max-w-none items-center justify-between">
        <Link href={`/projects/${projectData.id}`} className="text-xs text-[#5F626A]">
          Volver al proyecto
        </Link>
        <PrintEquipmentListButton />
      </div>

      <article className="document mx-auto w-[816px] min-h-[1056px] max-w-none bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="quote-print-logo-wrap mb-3 flex h-11 items-center">
              <img
                src="/logo-print.png"
                alt="ALFA OS"
                className="quote-print-logo max-h-11 max-w-36"
              />
            </div>
            <p className="quote-print-kicker text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Listado operativo de equipos
            </p>
          </div>

          <div className="quote-print-meta text-right text-[11px] leading-5 text-[#555963]">
            <p>Fecha: {formatDate(new Date().toISOString())}</p>
            <p>Cotizaciones aprobadas: {quotes.length}</p>
          </div>
        </header>

        <section className="client-project-grid mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="client-project-card border border-[#E1DDD5] p-4">
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

          <div className="client-project-card border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Proyecto
            </p>
            <p className="text-base font-semibold">
              {projectData.name || "Sin proyecto"}
            </p>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Contacto en obra
            </p>
            <p>{getField(projectData.site_contact_name)}</p>
            <p className="mt-1 text-[#555963]">{getField(projectData.site_contact_phone)}</p>
          </div>

          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Direccion / ubicacion
            </p>
            <p>{getField(projectData.site_address)}</p>
            <p className="mt-1 break-all text-[#555963]">
              {getField(projectData.site_google_maps_url)}
            </p>
          </div>
        </section>

        {operationalError ? (
          <section className="border border-[#D6D1C8] bg-[#F7F5F1] p-4 text-sm">
            Ejecuta el SQL de base operativa para generar el listado. Detalle:{" "}
            {operationalError}
          </section>
        ) : quotes.length === 0 ? (
          <section className="border border-[#D6D1C8] bg-[#F7F5F1] p-4 text-sm">
            No hay cotizaciones aprobadas relacionadas para generar listado operativo.
          </section>
        ) : operationalItems.length === 0 ? (
          <section className="border border-[#D6D1C8] bg-[#F7F5F1] p-4 text-sm">
            No hay partidas en la base operativa del proyecto.
          </section>
        ) : (
          <section className="space-y-6">
            {itemsBySystem.map(([systemName, systemItems]) => (
              <section key={systemName} className="quote-block">
                <div className="section-heading mb-2 flex items-end justify-between border-b border-[#E1DDD5] pb-1">
                  <h2 className="text-sm font-semibold">{systemName}</h2>
                  <span className="text-[10px] text-[#555963]">
                    {systemItems.length} partidas
                  </span>
                </div>

                <table className="equipment-table w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#E1DDD5] bg-[#F7F5F1] text-left text-[#555963]">
                      <th className="w-12 px-2 py-2">Img</th>
                      <th className="px-2 py-2">Marca</th>
                      <th className="px-2 py-2">Modelo</th>
                      <th className="px-2 py-2">Descripcion</th>
                      <th className="w-14 px-2 py-2 text-center">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemItems.map((item) => (
                      <tr
                        key={item.id}
                        className="line-item-row border-b border-[#EFECE6]"
                      >
                        <td className="px-2 py-2">
                          <div className="product-image-box flex h-10 w-10 items-center justify-center bg-[#F7F5F1]">
                            {item.product_image_url ? (
                              <img
                                src={item.product_image_url}
                                alt={item.product_name || "Equipo"}
                                className="product-image max-h-10 max-w-10 object-contain"
                              />
                            ) : (
                              <span className="text-[8px] text-[#8A8D94]">
                                Sin img
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 font-semibold">
                          {item.product_brand || "Sin marca"}
                        </td>
                        <td className="px-2 py-2 font-semibold">
                          {item.product_model || "-"}
                        </td>
                        <td className="px-2 py-2 text-[#555963]">
                          {item.product_name || "Sin descripcion"}
                        </td>
                        <td className="px-2 py-2 text-center font-semibold">
                          {Number(item.quantity || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </section>
        )}
      </article>
    </main>
  );
}
