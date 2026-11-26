import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { canDeleteQuotes as canDeleteQuotesForRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { normalizeSalesStage } from "@/lib/salesStages";
import QuotesFilterableList, {
  type EnrichedQuote,
} from "./QuotesFilterableList";

type Quote = {
  id: number;
  quote_number: string | null;
  client_id: number | null;
  client_project_id?: number | null;
  status: string | null;
  currency: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  grand_total: number | null;
  total_mxn?: number | null;
  created_at: string | null;
  quote_type?: "standard" | "blinds";
};

type ClientProject = {
  id: number;
  name: string | null;
  sales_stage?: string | null;
};

export default async function QuotesPage() {
  const supabase = await createSupabaseServerClient();
  const currentProfile = await getCurrentUserProfile();
  const canDeleteQuotes = canDeleteQuotesForRole(currentProfile?.role);

  let { data: quotes, error: quotesError } = (await supabase
    .from("quotes")
    .select(
      "id, quote_number, client_id, client_project_id, status, currency, equipment_total, labor_total, grand_total, total_mxn, created_at, quote_type"
    )
    .eq("quote_type", "standard")
    .order("created_at", { ascending: false })) as {
    data: Quote[] | null;
    error: { code?: string; message: string } | null;
  };

  if (
    quotesError &&
    quotesError.code === "PGRST204" &&
    (quotesError.message.includes("client_project_id") ||
      quotesError.message.includes("total_mxn") ||
      quotesError.message.includes("quote_type"))
  ) {
    const fallback = (await supabase
      .from("quotes")
      .select(
        "id, quote_number, client_id, status, currency, equipment_total, labor_total, grand_total, created_at"
      )
      .order("created_at", { ascending: false })) as {
      data: Quote[] | null;
      error: { code?: string; message: string } | null;
    };

    quotes = fallback.data;
    quotesError = fallback.error;
  }

  const quoteList = (quotes || []) as Quote[];
  const clientIds = [
    ...new Set(quoteList.map((quote) => quote.client_id).filter(Boolean)),
  ] as number[];
  const projectIds = [
    ...new Set(
      quoteList
        .map((quote) => quote.client_project_id)
        .filter(Boolean)
    ),
  ] as number[];

  const { data: clients } =
    clientIds.length > 0
      ? await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds)
      : { data: [] };

  let clientProjects: ClientProject[] | null = [];
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

      clientProjects = (fallbackProjects.data || []) as ClientProject[];
    } else {
      clientProjects = (projectResult.data || []) as ClientProject[];
    }
  }

  function getClientName(clientId: number | null) {
    return (
      clients?.find((client) => client.id === clientId)?.name ||
      "Sin cliente"
    );
  }

  function getProjectName(projectId?: number | null) {
    return (
      clientProjects?.find((project) => project.id === projectId)?.name ||
      "Sin proyecto"
    );
  }

  function getProjectStage(projectId?: number | null) {
    return normalizeSalesStage(
      clientProjects?.find((project) => project.id === projectId)?.sales_stage
    );
  }

  const enrichedQuotes: EnrichedQuote[] = quoteList.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quote_number,
    clientName: getClientName(quote.client_id),
    projectName: getProjectName(quote.client_project_id),
    stage: getProjectStage(quote.client_project_id),
    status: quote.status,
    currency: quote.currency,
    equipmentTotal: quote.equipment_total,
    laborTotal: quote.labor_total,
    total: quote.total_mxn ?? quote.grand_total,
    createdAt: quote.created_at,
  }));

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
            ALFA OS
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Cotizaciones
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/quotes/templates"
            className="rounded-xl border border-[#2A2A30] bg-[#151518] px-6 py-3 font-semibold text-[#B3B3B8] transition hover:border-[#9E1B32] hover:text-white"
          >
            Plantillas
          </Link>
          <Link
            href="/quotes/blinds"
            className="rounded-xl border border-[#2A2A30] bg-[#151518] px-6 py-3 font-semibold text-[#B3B3B8] transition hover:border-[#9E1B32] hover:text-white"
          >
            Cotizaciones de Persianas
          </Link>
          <Link
            href="/quotes/new"
            className="rounded-xl bg-[#9E1B32] px-6 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            Nueva cotización
          </Link>
        </div>
      </div>

      {quoteList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 lg:p-8">
          <p className="text-[#B3B3B8]">
            No hay cotizaciones guardadas.
          </p>
        </section>
      ) : (
        <QuotesFilterableList
          quotes={enrichedQuotes}
          canDeleteQuotes={canDeleteQuotes}
        />
      )}
    </main>
  );
}
