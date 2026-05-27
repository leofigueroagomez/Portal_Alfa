import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FileText,
  HardHat,
  MapPin,
  Pencil,
  UserRound,
} from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import {
  normalizeSalesStage,
  salesStageClasses,
  salesStageLabels,
} from "@/lib/salesStages";
import PrintOperationalEquipmentButton from "./PrintOperationalEquipmentButton";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  sales_stage?: string | null;
  estimated_value_mxn?: number | null;
  expected_close_date?: string | null;
  site_contact_name?: string | null;
  site_contact_phone?: string | null;
  site_address?: string | null;
  site_google_maps_url?: string | null;
  crew_lead_name?: string | null;
  crew_lead_phone?: string | null;
};

type Client = {
  id: number;
  name: string | null;
};

type Quote = {
  id: number;
  quote_number: string | null;
  total_mxn?: number | null;
  grand_total?: number | null;
  notes?: string | null;
  created_at: string | null;
};

type QuoteSection = {
  id: number;
  name: string | null;
  sort_order: number | null;
};

type QuoteItem = {
  id: number;
  quote_section_id: number;
  quantity: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
};

type QuoteTermsSettings = {
  includes_conduit: boolean | null;
  includes_cabling: boolean | null;
};

const pendingText = "En espera de llenado";

const futureModules = [
  "Listado de equipos",
  "Visitas de obra",
  "Estado de cuenta",
  "Compras",
  "Agenda",
  "Control de cambios",
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX");
}

function isPendingValue(value: string | null | undefined) {
  return !value?.trim() || value.trim().toLowerCase() === pendingText.toLowerCase();
}

function FieldValue({ value }: { value: string | null | undefined }) {
  if (isPendingValue(value)) {
    return <span className="text-[#77777D]">{pendingText}</span>;
  }

  return <span>{value}</span>;
}

function PendingBadge() {
  return (
    <span className="inline-flex w-fit rounded-full border border-[#614620] bg-[#322514] px-3 py-1 text-xs font-semibold text-[#F4C66A]">
      Datos pendientes
    </span>
  );
}

function getScopeLabel(terms: QuoteTermsSettings | null) {
  const includesConduit = Boolean(terms?.includes_conduit);
  const includesCabling = Boolean(terms?.includes_cabling);

  if (includesConduit && includesCabling) return "Cableado y canalizaciones";
  if (includesCabling) return "Cableado";
  if (includesConduit) return "Canalizaciones";
  return "Sin cableado ni canalizaciones";
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  let { data: project, error } = (await supabase
    .from("client_projects")
    .select(
      "id, client_id, name, sales_stage, estimated_value_mxn, expected_close_date, site_contact_name, site_contact_phone, site_address, site_google_maps_url, crew_lead_name, crew_lead_phone"
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
      error.message.includes("site_google_maps_url") ||
      error.message.includes("crew_lead_name") ||
      error.message.includes("crew_lead_phone") ||
      error.message.includes("sales_stage") ||
      error.message.includes("estimated_value_mxn") ||
      error.message.includes("expected_close_date"))
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
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link
          href="/projects"
          className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
        >
          <ArrowLeft size={18} />
          Volver a proyectos
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Proyecto no encontrado.
        </section>
      </main>
    );
  }

  const projectData = project as ClientProject;
  const [{ data: client }, { data: approvedQuotes }] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("id, name")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("quotes")
      .select("id, quote_number, total_mxn, grand_total, notes, created_at")
      .eq("client_project_id", projectData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const clientData = client as Client | null;
  const approvedQuote = ((approvedQuotes || []) as Quote[])[0] || null;
  const [{ data: quoteSections }, { data: quoteItems }, { data: quoteTerms }] =
    approvedQuote
      ? await Promise.all([
          supabase
            .from("quote_sections")
            .select("id, name, sort_order")
            .eq("quote_id", approvedQuote.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("quote_items")
            .select(
              "id, quote_section_id, quantity, product_brand, product_model, product_name, product_image_url"
            )
            .eq("quote_id", approvedQuote.id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("quote_terms_settings")
            .select("includes_conduit, includes_cabling")
            .eq("quote_id", approvedQuote.id)
            .maybeSingle(),
        ])
      : [{ data: [] }, { data: [] }, { data: null }];
  const sections = (quoteSections || []) as QuoteSection[];
  const items = (quoteItems || []) as QuoteItem[];
  const terms = quoteTerms as QuoteTermsSettings | null;
  const approvedTotal = Number(
    approvedQuote?.total_mxn ??
      approvedQuote?.grand_total ??
      projectData.estimated_value_mxn ??
      0
  );
  const stage = normalizeSalesStage(projectData.sales_stage);
  const hasPendingSiteData =
    isPendingValue(projectData.site_contact_name) ||
    isPendingValue(projectData.site_contact_phone) ||
    isPendingValue(projectData.site_address) ||
    isPendingValue(projectData.site_google_maps_url);
  const hasCrew =
    !isPendingValue(projectData.crew_lead_name) ||
    !isPendingValue(projectData.crew_lead_phone);

  function getSectionItems(sectionId: number) {
    return items.filter((item) => item.quote_section_id === sectionId);
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 12mm;
          }

          html,
          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .operational-print-area,
          .operational-print-area * {
            visibility: visible;
          }

          .operational-print-area {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100% !important;
            margin: 0 !important;
            border: 0 !important;
            background: white !important;
            color: #111318 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .project-screen-only {
            display: none !important;
          }

          .operational-print-area section,
          .operational-print-area article,
          .operational-equipment-row {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .operational-print-area h2 {
            color: #111318 !important;
            font-size: 16px !important;
          }

          .operational-print-area h3 {
            color: #111318 !important;
            font-size: 13px !important;
          }

          .operational-print-area p,
          .operational-print-area span,
          .operational-print-area li {
            color: #333842 !important;
          }
        }
      `}</style>
      <Link
        href="/projects"
        className="project-screen-only mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a proyectos
      </Link>

      <section className="project-screen-only mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA OS
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {projectData.name || "Proyecto operativo"}
          </h1>
          <p className="mt-3 max-w-3xl text-[#B3B3B8]">
            Centro operativo para datos de obra, cuadrilla, plano autorizado y modulos de ejecucion.
          </p>
        </div>

        <Link
          href={projectData.client_id ? `/clients/${projectData.client_id}` : "/projects"}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Pencil size={18} />
          Editar datos de obra
        </Link>
      </section>

      <section className="project-screen-only mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cliente</p>
          <p className="text-xl font-semibold">{clientData?.name || "Sin cliente"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Proyecto/Oportunidad</p>
          <p className="text-xl font-semibold">{projectData.name || "Sin proyecto"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Etapa comercial</p>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs ${salesStageClasses[stage]}`}
          >
            {salesStageLabels[stage]}
          </span>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cotizacion aprobada</p>
          {approvedQuote ? (
            <Link
              href={`/quotes/${approvedQuote.id}`}
              className="inline-flex items-center gap-2 text-xl font-semibold text-[#D7A8FF] hover:text-white"
            >
              {approvedQuote.quote_number || `#${approvedQuote.id}`}
              <ExternalLink size={16} />
            </Link>
          ) : (
            <p className="text-xl font-semibold text-[#77777D]">Sin cotizacion</p>
          )}
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Total aprobado</p>
          <p className="text-xl font-semibold text-[#9E1B32]">
            {approvedTotal > 0 ? formatCurrency(approvedTotal, "MXN") : "Sin monto"}
          </p>
        </div>
      </section>

      <section className="project-screen-only grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Datos de obra</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Contacto, direccion y enlace de ubicacion para arranque.
                </p>
              </div>
              {hasPendingSiteData ? <PendingBadge /> : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
                  <UserRound size={16} />
                  Contacto en sitio
                </p>
                <p className="font-semibold">
                  <FieldValue value={projectData.site_contact_name} />
                </p>
              </div>
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <p className="mb-2 text-sm text-[#B3B3B8]">Telefono contacto</p>
                <p className="font-semibold">
                  <FieldValue value={projectData.site_contact_phone} />
                </p>
              </div>
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4 md:col-span-2">
                <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
                  <MapPin size={16} />
                  Direccion de obra
                </p>
                <p className="font-semibold">
                  <FieldValue value={projectData.site_address} />
                </p>
              </div>
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4 md:col-span-2">
                <p className="mb-2 text-sm text-[#B3B3B8]">Google Maps</p>
                {isPendingValue(projectData.site_google_maps_url) ? (
                  <p className="font-semibold text-[#77777D]">{pendingText}</p>
                ) : (
                  <Link
                    href={projectData.site_google_maps_url || "#"}
                    target="_blank"
                    className="inline-flex items-center gap-2 break-all font-semibold text-[#D7A8FF] hover:text-white"
                  >
                    {projectData.site_google_maps_url}
                    <ExternalLink size={16} />
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Plano autorizado</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Seccion preparada para el archivo validado de ejecucion.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-[#3A3A42] bg-[#222228] px-3 py-1 text-xs text-[#B3B3B8]">
                No cargado
              </span>
            </div>

            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#77777D]"
            >
              <FileText size={18} />
              Subir plano
            </button>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
            <h2 className="mb-4 text-2xl font-semibold">Cuadrilla asignada</h2>
            {hasCrew ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
                    <HardHat size={16} />
                    Responsable
                  </p>
                  <p className="font-semibold">
                    <FieldValue value={projectData.crew_lead_name} />
                  </p>
                </div>
                <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                  <p className="mb-2 text-sm text-[#B3B3B8]">Telefono</p>
                  <p className="font-semibold">
                    <FieldValue value={projectData.crew_lead_phone} />
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-[#F4C66A]">
                Sin cuadrilla asignada
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
            <h2 className="mb-4 text-2xl font-semibold">Referencia</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
                  <CalendarDays size={16} />
                  Fecha estimada
                </p>
                <p className="font-semibold">
                  {formatDate(projectData.expected_close_date || approvedQuote?.created_at)}
                </p>
              </div>
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
                  <ClipboardList size={16} />
                  Estado operativo
                </p>
                <p className="font-semibold text-[#F4C66A]">
                  Pendiente de asignar
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="operational-print-area mt-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#9E1B32]">
              Listado operativo
            </p>
            <h2 className="text-2xl font-semibold">Equipos para instalacion</h2>
            <p className="mt-2 text-sm text-[#B3B3B8]">
              {clientData?.name || "Sin cliente"} / {projectData.name || "Sin proyecto"}
            </p>
            {approvedQuote ? (
              <p className="mt-1 text-xs text-[#77777D]">
                Cotizacion aprobada: {approvedQuote.quote_number || `#${approvedQuote.id}`}
              </p>
            ) : null}
          </div>

          <PrintOperationalEquipmentButton />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-[#274B63] bg-[#142B3A] px-3 py-1 text-xs text-[#8ED8FF]">
            {getScopeLabel(terms)}
          </span>
          {terms?.includes_cabling ? (
            <span className="inline-flex rounded-full border border-[#1F7A4D] bg-[#143D2A] px-3 py-1 text-xs text-[#8CE0B6]">
              Incluye cableado
            </span>
          ) : null}
          {terms?.includes_conduit ? (
            <span className="inline-flex rounded-full border border-[#1F7A4D] bg-[#143D2A] px-3 py-1 text-xs text-[#8CE0B6]">
              Incluye canalizaciones
            </span>
          ) : null}
        </div>

        {!approvedQuote ? (
          <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-[#F4C66A]">
            No hay cotizacion aprobada relacionada para generar listado operativo.
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-[#B3B3B8]">
            La cotizacion aprobada no tiene secciones registradas.
          </div>
        ) : (
          <div className="space-y-5">
            {sections.map((section) => {
              const sectionItems = getSectionItems(section.id);

              return (
                <section
                  key={section.id}
                  className="rounded-xl border border-[#2A2A30] bg-[#101114] p-4"
                >
                  <div className="mb-4 flex flex-col gap-1 border-b border-[#2A2A30] pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold">
                      {section.name || "Sistema sin nombre"}
                    </h3>
                    <span className="text-xs text-[#77777D]">
                      {sectionItems.length} partidas
                    </span>
                  </div>

                  {sectionItems.length === 0 ? (
                    <p className="text-sm text-[#77777D]">Sin equipos en esta seccion.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {sectionItems.map((item) => (
                        <article
                          key={item.id}
                          className="operational-equipment-row grid grid-cols-[52px_1fr_auto] gap-3 rounded-xl border border-[#1F1F24] bg-[#151518] p-3 sm:grid-cols-[60px_1fr_90px]"
                        >
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-[#222228] sm:h-14 sm:w-14">
                            {item.product_image_url ? (
                              <img
                                src={item.product_image_url}
                                alt={item.product_name || "Equipo"}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] text-[#77777D]">
                                Sin img
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <p className="font-semibold">
                                {item.product_brand || "Sin marca"}
                              </p>
                              <p className="text-[#B3B3B8]">
                                {item.product_model || "Sin modelo"}
                              </p>
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-[#B3B3B8]">
                              {item.product_name || "Sin descripcion"}
                            </p>
                          </div>

                          <div className="flex items-start justify-end">
                            <span className="inline-flex rounded-full border border-[#3A3A42] bg-[#222228] px-3 py-1 text-sm font-semibold">
                              x{Number(item.quantity || 0)}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {approvedQuote?.notes?.trim() ? (
          <section className="mt-6 rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
            <h3 className="mb-3 text-lg font-semibold">Notas/aclaraciones</h3>
            <div className="whitespace-pre-line text-sm leading-relaxed text-[#B3B3B8]">
              {approvedQuote.notes}
            </div>
          </section>
        ) : null}
      </section>

      <section className="project-screen-only mt-8">
        <h2 className="mb-4 text-2xl font-semibold">Modulos futuros</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {futureModules.map((module) => (
            <div
              key={module}
              className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 opacity-60"
            >
              <p className="text-lg font-semibold">{module}</p>
              <p className="mt-2 text-sm text-[#77777D]">Proximamente</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
