import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import {
  normalizeSalesStage,
  salesStageClasses,
  salesStageLabels,
} from "@/lib/salesStages";
import DeleteQuoteButton from "./DeleteQuoteButton";

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
};

type ClientProject = {
  id: number;
  name: string | null;
  sales_stage?: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX");
}

export default async function QuotesPage() {
  const supabase = await createSupabaseServerClient();
  // TODO: Replace with role-based visibility for admin/director users.
  const canDeleteQuotes = true;

  let { data: quotes, error: quotesError } = (await supabase
    .from("quotes")
    .select(
      "id, quote_number, client_id, client_project_id, status, currency, equipment_total, labor_total, grand_total, total_mxn, created_at"
    )
    .order("created_at", { ascending: false })) as {
    data: Quote[] | null;
    error: { code?: string; message: string } | null;
  };

  if (
    quotesError &&
    quotesError.code === "PGRST204" &&
    (quotesError.message.includes("client_project_id") ||
      quotesError.message.includes("total_mxn"))
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

        <Link
          href="/quotes/new"
          className="bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl px-6 py-3 font-semibold"
        >
          Nueva cotización
        </Link>
      </div>

      {quoteList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 lg:p-8">
          <p className="text-[#B3B3B8]">
            No hay cotizaciones guardadas.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {quoteList.map((quote) => (
            <div
              key={quote.id}
              className="bg-[#151518] border border-[#1F1F24] hover:border-[#9E1B32] rounded-2xl p-6 transition"
            >
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <Link href={`/quotes/${quote.id}`} className="block flex-1">
                  <div>
                    <p className="text-xs text-[#9E1B32] uppercase tracking-[0.2em] mb-2">
                      {quote.quote_number || "Sin folio"}
                    </p>

                    <h2 className="text-2xl font-semibold">
                      Cotización #{quote.id}
                    </h2>
                  </div>
                </Link>

                <div className="flex items-center gap-3">
                  <span className="bg-[#222228] border border-[#2A2A30] text-[#B3B3B8] rounded-full px-4 py-2 text-sm">
                    {quote.status || "Sin estado"}
                  </span>

                  {canDeleteQuotes && (
                    <DeleteQuoteButton quoteId={quote.id} />
                  )}
                </div>
              </div>

              <Link
                href={`/quotes/${quote.id}`}
                className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-8"
              >
                <div>
                  <p className="text-[#77777D] mb-1">Cliente</p>
                  <p>{getClientName(quote.client_id)}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Proyecto</p>
                  <p>{getProjectName(quote.client_project_id)}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Etapa</p>
                  {(() => {
                    const stage = getProjectStage(quote.client_project_id);
                    return (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${salesStageClasses[stage]}`}
                      >
                        {salesStageLabels[stage]}
                      </span>
                    );
                  })()}
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Moneda</p>
                  <p>{quote.currency || "USD"}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Equipos</p>
                  <p>{formatCurrency(quote.equipment_total, quote.currency)}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Mano de obra</p>
                  <p>{formatCurrency(quote.labor_total, quote.currency)}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Total</p>
                  <p className="font-semibold">
                    {formatCurrency(quote.total_mxn ?? quote.grand_total, "MXN")}
                  </p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Creada</p>
                  <p>{formatDate(quote.created_at)}</p>
                </div>
              </Link>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
