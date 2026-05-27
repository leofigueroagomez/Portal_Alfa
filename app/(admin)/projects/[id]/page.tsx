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
  created_at: string | null;
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
      .select("id, quote_number, total_mxn, grand_total, created_at")
      .eq("client_project_id", projectData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const clientData = client as Client | null;
  const approvedQuote = ((approvedQuotes || []) as Quote[])[0] || null;
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

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href="/projects"
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a proyectos
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
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

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
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

      <section className="mt-8">
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
