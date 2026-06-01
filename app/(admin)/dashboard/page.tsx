import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  normalizeSalesStage,
  salesStageClasses,
  salesStageLabels,
  salesStages,
} from "@/lib/salesStages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  sales_stage?: string | null;
  estimated_value_mxn?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type Client = {
  id: number;
  name: string | null;
};

type Quote = {
  id: number;
  client_id: number | null;
  client_project_id?: number | null;
  status: string | null;
  total_mxn?: number | null;
  grand_total?: number | null;
};

type EngineeringQuote = {
  id: number;
  client_project_id?: number | null;
  status: string | null;
  total_mxn: number | null;
};

type QuoteItem = {
  product_name: string | null;
  product_brand: string | null;
};

type Lead = {
  id: number;
  name: string | null;
  interest: string | null;
  budget_range: string | null;
  timeline: string | null;
  status: string | null;
  created_at: string | null;
};

function isOpenStatus(status: string | null) {
  return !["approved", "archived", "lost", "closed"].includes(
    (status || "draft").toLowerCase()
  );
}

function isThisMonth(value: string | null | undefined) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const projectsResult = await supabase
    .from("client_projects")
    .select("id, client_id, name, sales_stage, estimated_value_mxn, updated_at, created_at")
    .order("updated_at", { ascending: false, nullsFirst: false });

  let projectData = projectsResult.data as ClientProject[] | null;

  if (
    projectsResult.error &&
    (projectsResult.error.message.includes("sales_stage") ||
      projectsResult.error.message.includes("estimated_value_mxn"))
  ) {
    const fallback = await supabase
      .from("client_projects")
      .select("id, client_id, name, created_at")
      .order("created_at", { ascending: false });

    projectData = fallback.data as ClientProject[] | null;
  }

  const [
    { data: clients },
    { data: quotes },
    { data: engineeringQuotes },
    { data: quoteItems },
    leadsResult,
  ] = await Promise.all([
    supabase.from("clients").select("id, name"),
    supabase
      .from("quotes")
      .select("id, client_id, client_project_id, status, total_mxn, grand_total"),
    supabase
      .from("engineering_quotes")
      .select("id, client_project_id, status, total_mxn"),
    supabase.from("quote_items").select("product_name, product_brand"),
    supabase
      .from("leads")
      .select("id, name, interest, budget_range, timeline, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const projects = (projectData || []) as ClientProject[];
  const clientList = (clients || []) as Client[];
  const quoteList = (quotes || []) as Quote[];
  const engineeringList = (engineeringQuotes || []) as EngineeringQuote[];
  const itemList = (quoteItems || []) as QuoteItem[];
  const leadList = leadsResult.error ? [] : ((leadsResult.data || []) as Lead[]);

  function getQuoteValue(quote: Quote) {
    return Number(quote.total_mxn ?? quote.grand_total ?? 0);
  }

  function getProjectValue(project: ClientProject) {
    const estimatedValue = Number(project.estimated_value_mxn || 0);

    if (estimatedValue > 0) return estimatedValue;

    const quoteValue = quoteList
      .filter((quote) => quote.client_project_id === project.id)
      .reduce((sum, quote) => sum + getQuoteValue(quote), 0);
    const engineeringValue = engineeringList
      .filter((quote) => quote.client_project_id === project.id)
      .reduce((sum, quote) => sum + Number(quote.total_mxn || 0), 0);

    return quoteValue + engineeringValue;
  }

  const activePipelineStages = new Set([
    "lead",
    "site_visit",
    "engineering",
    "quoted",
    "negotiation",
  ]);
  const openQuotes = quoteList.filter((quote) => isOpenStatus(quote.status));
  const openEngineeringQuotes = engineeringList.filter((quote) =>
    isOpenStatus(quote.status)
  );
  const newLeads = leadList.filter((lead) => (lead.status || "nuevo") === "nuevo");
  const activeProjects = projects.filter((project) =>
    activePipelineStages.has(normalizeSalesStage(project.sales_stage))
  );
  const wonThisMonth = projects.filter(
    (project) =>
      normalizeSalesStage(project.sales_stage) === "won" &&
      isThisMonth(project.updated_at || project.created_at)
  );
  const monthlyBilling = wonThisMonth.reduce(
    (sum, project) => sum + getProjectValue(project),
    0
  );
  const pipelineValue = activeProjects.reduce(
    (sum, project) => sum + getProjectValue(project),
    0
  );
  const stageSummaries = salesStages
    .map((stage) => {
      const stageProjects = projects.filter(
        (project) => normalizeSalesStage(project.sales_stage) === stage
      );

      return {
        stage,
        count: stageProjects.length,
        value: stageProjects.reduce(
          (sum, project) => sum + getProjectValue(project),
          0
        ),
      };
    })
    .filter((summary) => summary.count > 0);
  const featuredProjects = activeProjects
    .map((project) => ({ ...project, value: getProjectValue(project) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
  const topClients = clientList
    .map((client) => {
      const value = projects
        .filter((project) => project.client_id === client.id)
        .reduce((sum, project) => sum + getProjectValue(project), 0);

      return { id: client.id, name: client.name || "Sin cliente", value };
    })
    .filter((client) => client.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const quotedSystems = Object.entries(
    itemList.reduce<Record<string, number>>((accumulator, item) => {
      const label = item.product_brand || item.product_name || "Sin sistema";
      accumulator[label] = (accumulator[label] || 0) + 1;
      return accumulator;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const recentActivity = [
    ...leadList.slice(0, 3).map((lead) => ({
      key: `lead-${lead.id}`,
      label: "Lead nuevo",
      title: lead.name || "Contacto sin nombre",
      detail:
        [lead.interest, lead.timeline].filter(Boolean).join(" · ") ||
        "Solicitud recibida",
      date: lead.created_at,
    })),
    ...projects.slice(0, 4).map((project) => ({
      key: `project-${project.id}`,
      label: salesStageLabels[normalizeSalesStage(project.sales_stage)],
      title: project.name || `Proyecto #${project.id}`,
      detail: formatCurrency(getProjectValue(project), "MXN"),
      date: project.updated_at || project.created_at,
    })),
  ]
    .sort((a, b) => {
      const first = a.date ? new Date(a.date).getTime() : 0;
      const second = b.date ? new Date(b.date).getTime() : 0;

      return second - first;
    })
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
      <section className="border-b border-black/10 bg-white px-5 py-14 sm:px-8 lg:px-12 xl:py-16">
        <div className="mx-auto max-w-7xl text-center">
          <Image
            src="/logo-alfa-os.png"
            alt="ALFA OS"
            width={440}
            height={210}
            priority
            className="mx-auto h-auto w-[min(72vw,360px)] object-contain"
          />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.32em] text-[#7A1F2B]">
            Sistema Operativo Empresarial ALFA
          </p>
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-tight tracking-normal sm:text-6xl xl:text-7xl">
            Dirección clara para proyectos de alto estándar.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#666666] sm:text-lg">
            Una vista ejecutiva para priorizar oportunidades, avance operativo y
            resultados del mes sin perder elegancia ni foco.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ExecutiveCard
            label="Leads nuevos"
            value={formatNumber(newLeads.length)}
            detail={newLeads[0]?.interest || "Captura pública activa"}
          />
          <ExecutiveCard
            label="Cotizaciones pendientes"
            value={formatNumber(openQuotes.length + openEngineeringQuotes.length)}
            detail={`${formatCurrency(pipelineValue, "MXN")} en pipeline`}
          />
          <ExecutiveCard
            label="Proyectos activos"
            value={formatNumber(activeProjects.length)}
            detail="En etapas de oportunidad y ejecución comercial"
          />
          <ExecutiveCard
            label="Facturación del mes"
            value={formatCurrency(monthlyBilling, "MXN")}
            detail={`${formatNumber(wonThisMonth.length)} proyectos ganados`}
            accent
          />
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="bg-[#111111] p-6 text-white shadow-2xl shadow-black/[0.12] sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
                  Actividad reciente
                </p>
                <h2 className="mt-3 text-3xl font-semibold">Pulso ejecutivo</h2>
              </div>
              <Link
                href="/quotes/new"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#7A1F2B] px-5 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Nueva Cotización
              </Link>
            </div>

            <div className="space-y-5">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-white/50">Sin actividad para mostrar.</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.key} className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                      {activity.label}
                    </p>
                    <div className="border-l border-white/14 pl-5">
                      <h3 className="text-lg font-semibold">{activity.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/58">
                        {activity.detail}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-black/10 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Pipeline por etapa
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Prioridad comercial</h2>
            <div className="mt-7 space-y-4">
              {stageSummaries.length === 0 ? (
                <p className="text-sm text-[#666666]">Sin etapas activas para mostrar.</p>
              ) : (
                stageSummaries.slice(0, 6).map((summary) => (
                  <div key={summary.stage}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="font-semibold">
                        {salesStageLabels[summary.stage]}
                      </span>
                      <span className="text-[#666666]">
                        {formatCurrency(summary.value, "MXN")}
                      </span>
                    </div>
                    <div className="h-2 bg-black/[0.06]">
                      <div
                        className="h-full bg-[#7A1F2B]"
                        style={{
                          width: `${Math.min(100, Math.max(8, summary.count * 14))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                Proyectos destacados
              </p>
              <h2 className="mt-3 text-4xl font-semibold">Foco operativo</h2>
            </div>
            <Link
              href="/projects"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:border-[#7A1F2B] hover:text-[#7A1F2B]"
            >
              Ver proyectos
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredProjects.length === 0 ? (
              <div className="border border-black/10 bg-[#F7F6F3] p-6 text-sm text-[#666666] md:col-span-2 xl:col-span-4">
                Sin proyectos activos destacados por ahora.
              </div>
            ) : (
              featuredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group min-h-64 border border-black/10 bg-[#F7F6F3] p-6 transition hover:-translate-y-0.5 hover:border-[#7A1F2B]/40 hover:shadow-2xl hover:shadow-black/[0.06]"
                >
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs ${salesStageClasses[normalizeSalesStage(project.sales_stage)]}`}
                  >
                    {salesStageLabels[normalizeSalesStage(project.sales_stage)]}
                  </span>
                  <h3 className="mt-8 text-2xl font-semibold leading-tight">
                    {project.name || `Proyecto #${project.id}`}
                  </h3>
                  <p className="mt-5 text-sm text-[#666666]">Valor estimado</p>
                  <p className="mt-2 text-xl font-semibold text-[#7A1F2B]">
                    {formatCurrency(project.value, "MXN")}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
          <InsightPanel title="Clientes relevantes">
            {topClients.length === 0 ? (
              <p className="text-sm text-[#666666]">Sin clientes para mostrar.</p>
            ) : (
              topClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-4 border-t border-black/10 py-4"
                >
                  <span className="font-semibold">{client.name}</span>
                  <span className="text-sm text-[#666666]">
                    {formatCurrency(client.value, "MXN")}
                  </span>
                </div>
              ))
            )}
          </InsightPanel>

          <InsightPanel title="Sistemas más cotizados">
            {quotedSystems.length === 0 ? (
              <p className="text-sm text-[#666666]">
                Sin partidas cotizadas todavía.
              </p>
            ) : (
              quotedSystems.map((system) => (
                <div
                  key={system.name}
                  className="flex items-center justify-between gap-4 border-t border-black/10 py-4"
                >
                  <span className="font-semibold">{system.name}</span>
                  <span className="text-sm text-[#666666]">
                    {system.count} partidas
                  </span>
                </div>
              ))
            )}
          </InsightPanel>
        </div>
      </section>
    </main>
  );
}

function ExecutiveCard({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`min-h-44 border p-6 ${
        accent
          ? "border-[#7A1F2B] bg-[#7A1F2B] text-white"
          : "border-black/10 bg-white text-[#111111]"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.24em] ${
          accent ? "text-white/64" : "text-[#7A1F2B]"
        }`}
      >
        {label}
      </p>
      <p className="mt-7 text-4xl font-semibold leading-none tracking-normal">
        {value}
      </p>
      <p
        className={`mt-5 text-sm leading-6 ${
          accent ? "text-white/70" : "text-[#666666]"
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

function InsightPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-black/10 bg-white p-6 sm:p-8">
      <h2 className="mb-6 text-2xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}
