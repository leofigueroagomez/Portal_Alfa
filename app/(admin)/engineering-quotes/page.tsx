import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatDate, formatMoneyMXN } from "./constants";
import {
  normalizeSalesStage,
  salesStageClasses,
  salesStageLabels,
} from "@/lib/salesStages";

type EngineeringQuote = {
  id: number;
  quote_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  status: string | null;
  version_letter: string | null;
  project_name: string | null;
  total_mxn: number | null;
  is_latest: boolean | null;
  created_at: string | null;
};

type ClientProject = {
  id: number;
  name: string | null;
  sales_stage?: string | null;
};

export default async function EngineeringQuotesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: quotes } = await supabase
    .from("engineering_quotes")
    .select(
      "id, quote_number, client_id, client_project_id, status, version_letter, project_name, total_mxn, is_latest, created_at"
    )
    .order("created_at", { ascending: false });

  const quoteList = (quotes || []) as EngineeringQuote[];
  const clientIds = [
    ...new Set(quoteList.map((quote) => quote.client_id).filter(Boolean)),
  ] as number[];
  const projectIds = [
    ...new Set(
      quoteList.map((quote) => quote.client_project_id).filter(Boolean)
    ),
  ] as number[];

  const { data: clients } =
    clientIds.length > 0
      ? await supabase.from("clients").select("id, name").in("id", clientIds)
      : { data: [] };

  let projects: ClientProject[] | null = [];
  if (projectIds.length > 0) {
    const projectResult = await supabase
      .from("client_projects")
      .select("id, name, sales_stage")
      .in("id", projectIds);

    if (
      projectResult.error &&
      projectResult.error.message.includes("sales_stage")
    ) {
      const fallbackProjects = await supabase
        .from("client_projects")
        .select("id, name")
        .in("id", projectIds);

      projects = (fallbackProjects.data || []) as ClientProject[];
    } else {
      projects = (projectResult.data || []) as ClientProject[];
    }
  }

  function getClientName(clientId: number | null) {
    return clients?.find((client) => client.id === clientId)?.name || "Sin cliente";
  }

  function getProjectName(projectId: number | null) {
    return projects?.find((project) => project.id === projectId)?.name || "Sin proyecto";
  }

  function getProjectStage(projectId: number | null) {
    return normalizeSalesStage(
      projects?.find((project) => project.id === projectId)?.sales_stage
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Ingenierías</h1>
        </div>
        <Link href="/engineering-quotes/new" className="rounded-xl bg-[#9E1B32] px-6 py-3 font-semibold hover:bg-[#B91C3C]">
          Nueva ingeniería
        </Link>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="grid min-w-[1120px] grid-cols-[1fr_1fr_1fr_140px_120px_140px_140px_130px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
          <p>Folio</p>
          <p>Cliente</p>
          <p>Proyecto</p>
          <p>Etapa</p>
          <p>Versión</p>
          <p>Status</p>
          <p>Total</p>
          <p>Fecha</p>
        </div>

        {quoteList.length === 0 ? (
          <div className="p-8 text-[#B3B3B8]">
            No hay cotizaciones de ingeniería.
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A30]">
            {quoteList.map((quote) => (
              <Link
                key={quote.id}
                href={`/engineering-quotes/${quote.id}`}
                className="grid min-w-[1120px] grid-cols-[1fr_1fr_1fr_140px_120px_140px_140px_130px] gap-4 px-5 py-4 text-sm transition hover:bg-[#1A1A1F]"
              >
                <div>
                  <p className="font-semibold">{quote.quote_number || "Sin folio"}</p>
                  {quote.is_latest ? (
                    <span className="mt-1 inline-flex rounded-full bg-[#143D2A] px-2 py-1 text-[11px] text-[#8CE0B6]">
                      Última
                    </span>
                  ) : null}
                </div>
                <p className="text-[#B3B3B8]">{getClientName(quote.client_id)}</p>
                <p className="text-[#B3B3B8]">
                  {quote.project_name || getProjectName(quote.client_project_id)}
                </p>
                {(() => {
                  const stage = getProjectStage(quote.client_project_id);
                  return (
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs ${salesStageClasses[stage]}`}
                    >
                      {salesStageLabels[stage]}
                    </span>
                  );
                })()}
                <p>{quote.version_letter || "A"}</p>
                <span className={`w-fit rounded-full px-3 py-1 text-xs ${quote.status === "approved" ? "bg-[#143D2A] text-[#8CE0B6]" : "bg-[#222228] text-[#B3B3B8]"}`}>
                  {quote.status || "draft"}
                </span>
                <p className="font-semibold">{formatMoneyMXN(quote.total_mxn)}</p>
                <p className="text-[#B3B3B8]">{formatDate(quote.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
