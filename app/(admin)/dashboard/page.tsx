import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
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
  probability_percent?: number | null;
  expected_close_date?: string | null;
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
  client_id: number | null;
  client_project_id?: number | null;
  status: string | null;
  total_mxn: number | null;
};

type QuoteItem = {
  product_name: string | null;
  product_brand: string | null;
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
    .select(
      "id, name, sales_stage, estimated_value_mxn, probability_percent, expected_close_date, client_id, created_at"
    )
    .order("expected_close_date", { ascending: true, nullsFirst: false });
  let projectData = projectsResult.data as ClientProject[] | null;
  const projectsError = projectsResult.error;

  if (
    projectsError &&
    (projectsError.message.includes("sales_stage") ||
      projectsError.message.includes("estimated_value_mxn") ||
      projectsError.message.includes("probability_percent") ||
      projectsError.message.includes("expected_close_date"))
  ) {
    const fallback = await supabase
      .from("client_projects")
      .select("id, client_id, name, created_at")
      .order("created_at", { ascending: false });

    projectData = fallback.data as ClientProject[] | null;
  }

  const [{ data: clients }, { data: quotes }, { data: engineeringQuotes }, { data: quoteItems }] =
    await Promise.all([
      supabase.from("clients").select("id, name"),
      supabase
        .from("quotes")
        .select("id, client_id, client_project_id, status, total_mxn, grand_total"),
      supabase
        .from("engineering_quotes")
        .select("id, client_id, client_project_id, status, total_mxn"),
      supabase.from("quote_items").select("product_name, product_brand"),
    ]);

  const projects = (projectData || []) as ClientProject[];

  const clientList = (clients || []) as Client[];
  const quoteList = (quotes || []) as Quote[];
  const engineeringList = (engineeringQuotes || []) as EngineeringQuote[];
  const itemList = (quoteItems || []) as QuoteItem[];

  function getQuoteValue(quote: Quote) {
    return Number(quote.total_mxn ?? quote.grand_total ?? 0);
  }

  function getEngineeringValue(quote: EngineeringQuote) {
    return Number(quote.total_mxn || 0);
  }

  function getProjectDashboardValue(project: ClientProject) {
    const estimatedValue = Number(project.estimated_value_mxn || 0);

    if (estimatedValue > 0) {
      return estimatedValue;
    }

    const quoteValue = quoteList
      .filter((quote) => quote.client_project_id === project.id)
      .reduce((sum, quote) => sum + getQuoteValue(quote), 0);
    const engineeringValue = engineeringList
      .filter((quote) => quote.client_project_id === project.id)
      .reduce((sum, quote) => sum + getEngineeringValue(quote), 0);

    return quoteValue + engineeringValue;
  }

  const stageSummaries = salesStages.map((stage) => {
    const stageProjects = projects.filter(
      (project) => normalizeSalesStage(project.sales_stage) === stage
    );
    const value = stageProjects.reduce(
      (sum, project) => sum + getProjectDashboardValue(project),
      0
    );

    return {
      stage,
      count: stageProjects.length,
      value,
    };
  });

  const activePipelineStages = new Set([
    "lead",
    "site_visit",
    "engineering",
    "quoted",
    "negotiation",
  ]);
  const pipelineValue = projects.reduce((sum, project) => {
    const stage = normalizeSalesStage(project.sales_stage);
    return activePipelineStages.has(stage)
      ? sum + getProjectDashboardValue(project)
      : sum;
  }, 0);
  const openQuotes = quoteList.filter((quote) => isOpenStatus(quote.status));
  const openEngineeringQuotes = engineeringList.filter((quote) =>
    isOpenStatus(quote.status)
  );
  const wonThisMonth = projects.filter(
    (project) =>
      normalizeSalesStage(project.sales_stage) === "won" &&
      isThisMonth(project.updated_at || project.created_at)
  );
  const wonValues = projects
    .filter((project) => normalizeSalesStage(project.sales_stage) === "won")
    .map((project) => getProjectDashboardValue(project))
    .filter((value) => value > 0);
  const averageTicket =
    wonValues.length > 0
      ? wonValues.reduce((sum, value) => sum + value, 0) / wonValues.length
      : 0;

  const topClients = clientList
    .map((client) => {
      const projectValue = projects
        .filter((project) => project.client_id === client.id)
        .reduce(
          (sum, project) => sum + getProjectDashboardValue(project),
          0
        );
      const quoteValue = quoteList
        .filter((quote) => quote.client_id === client.id)
        .reduce(
          (sum, quote) =>
            sum + getQuoteValue(quote),
          0
        );

      return {
        id: client.id,
        name: client.name || "Sin cliente",
        value: Math.max(projectValue, quoteValue),
      };
    })
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
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA OS
          </p>
          <h1 className="text-4xl font-bold">Dashboard comercial</h1>
          <p className="mt-3 text-[#B3B3B8]">
            Vista operativa de pipeline, cotizaciones y oportunidades.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/clients"
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30]"
          >
            Clientes
          </Link>
          <Link
            href="/quotes/new"
            className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            Nueva cotización
          </Link>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 xl:col-span-2">
          <p className="mb-2 text-sm text-[#B3B3B8]">Valor total pipeline</p>
          <h2 className="text-3xl font-bold text-[#9E1B32]">
            {formatCurrency(pipelineValue, "MXN")}
          </h2>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cotizaciones abiertas</p>
          <h2 className="text-3xl font-bold">{openQuotes.length}</h2>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Ingenierías abiertas</p>
          <h2 className="text-3xl font-bold">{openEngineeringQuotes.length}</h2>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Ganados este mes</p>
          <h2 className="text-3xl font-bold">{wonThisMonth.length}</h2>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Ticket promedio</p>
          <h2 className="text-2xl font-bold">
            {formatCurrency(averageTicket, "MXN")}
          </h2>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
        <h2 className="mb-5 text-2xl font-semibold">Pipeline por etapa</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {stageSummaries.map((summary) => (
            <div
              key={summary.stage}
              className="rounded-xl border border-[#2A2A30] bg-[#1A1A1F] p-4"
            >
              <span
                className={`mb-4 inline-flex rounded-full border px-3 py-1 text-xs ${salesStageClasses[summary.stage]}`}
              >
                {salesStageLabels[summary.stage]}
              </span>
              <div className="flex items-end justify-between gap-3">
                <p className="text-3xl font-bold">{summary.count}</p>
                <p className="text-right text-sm text-[#B3B3B8]">
                  {formatCurrency(summary.value, "MXN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
          <h2 className="mb-5 text-2xl font-semibold">Top clientes</h2>
          <div className="space-y-3">
            {topClients.length === 0 ? (
              <p className="text-[#77777D]">Sin clientes para mostrar.</p>
            ) : (
              topClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[#222228] px-4 py-3 text-sm"
                >
                  <p className="font-semibold">{client.name}</p>
                  <p className="text-[#B3B3B8]">
                    {formatCurrency(client.value, "MXN")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
          <h2 className="mb-5 text-2xl font-semibold">Sistemas más cotizados</h2>
          <div className="space-y-3">
            {quotedSystems.length === 0 ? (
              <p className="text-[#77777D]">Sin partidas cotizadas todavía.</p>
            ) : (
              quotedSystems.map((system) => (
                <div
                  key={system.name}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[#222228] px-4 py-3 text-sm"
                >
                  <p className="font-semibold">{system.name}</p>
                  <p className="text-[#B3B3B8]">{system.count} partidas</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
