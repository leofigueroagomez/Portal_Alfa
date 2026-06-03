import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import { normalizeSalesStage } from "@/lib/salesStages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  sales_stage?: string | null;
  estimated_value_mxn?: number | null;
  expected_close_date?: string | null;
  created_at?: string | null;
};

type Client = {
  id: number;
  name: string | null;
};

type Quote = {
  id: number;
  quote_number: string | null;
  client_project_id?: number | null;
  status: string | null;
  total_mxn?: number | null;
  grand_total?: number | null;
  created_at: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX");
}

function getApprovedTotal(quote: Quote | null | undefined) {
  return Number(quote?.total_mxn ?? quote?.grand_total ?? 0);
}

export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();

  let { data: projects, error: projectsError } = (await supabase
    .from("client_projects")
    .select(
      "id, client_id, name, sales_stage, estimated_value_mxn, expected_close_date, created_at"
    )
    .order("expected_close_date", {
      ascending: true,
      nullsFirst: false,
    })) as {
    data: ClientProject[] | null;
    error: { message: string; code?: string } | null;
  };

  if (
    projectsError &&
    (projectsError.message.includes("sales_stage") ||
      projectsError.message.includes("estimated_value_mxn") ||
      projectsError.message.includes("expected_close_date"))
  ) {
    const fallback = (await supabase
      .from("client_projects")
      .select("id, client_id, name, created_at")
      .order("created_at", { ascending: false })) as {
      data: ClientProject[] | null;
      error: { message: string; code?: string } | null;
    };

    projects = fallback.data;
    projectsError = fallback.error;
  }

  if (projectsError) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <section className="rounded-2xl border border-[#6A2A2A] bg-[#351818] p-6 text-[#FFB4B4]">
          Error cargando proyectos: {projectsError.message}
        </section>
      </main>
    );
  }

  const projectList = (projects || []) as ClientProject[];
  const projectIds = projectList.map((project) => project.id);
  const clientIds = [
    ...new Set(projectList.map((project) => project.client_id).filter(Boolean)),
  ] as number[];

  const [{ data: clients }, quotesResult] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, name").in("id", clientIds)
      : Promise.resolve({ data: [] as Client[] }),
    projectIds.length > 0
      ? supabase
          .from("quotes")
          .select(
            "id, quote_number, client_project_id, status, total_mxn, grand_total, created_at"
          )
          .eq("status", "approved")
          .in("client_project_id", projectIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Quote[] }),
  ]);

  const approvedQuotes = (quotesResult.data || []) as Quote[];
  const approvedQuotesByProject = new Map<number, Quote>();

  for (const quote of approvedQuotes) {
    if (quote.client_project_id && !approvedQuotesByProject.has(quote.client_project_id)) {
      approvedQuotesByProject.set(quote.client_project_id, quote);
    }
  }

  const operationalProjects = projectList
    .filter((project) => {
      const stage = normalizeSalesStage(project.sales_stage);
      const hasApprovedQuote = approvedQuotesByProject.has(project.id);

      if (["lost", "installed", "delivered", "warranty", "closed"].includes(stage)) {
        return false;
      }

      return stage === "won" || hasApprovedQuote;
    })
    .sort((a, b) => {
      const aQuote = approvedQuotesByProject.get(a.id);
      const bQuote = approvedQuotesByProject.get(b.id);
      const aDate = a.expected_close_date || aQuote?.created_at || a.created_at || "";
      const bDate = b.expected_close_date || bQuote?.created_at || b.created_at || "";

      return aDate.localeCompare(bDate);
    });

  function getClientName(clientId: number | null) {
    return clients?.find((client) => client.id === clientId)?.name || "Sin cliente";
  }

  const totalApproved = operationalProjects.reduce((sum, project) => {
    const approvedQuote = approvedQuotesByProject.get(project.id);
    const approvedTotal = getApprovedTotal(approvedQuote);

    return (
      sum +
      (approvedTotal > 0
        ? approvedTotal
        : Number(project.estimated_value_mxn || 0))
    );
  }, 0);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA OS
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Proyectos</h1>
          <p className="mt-3 max-w-3xl text-[#B3B3B8]">
            Vista operativa de oportunidades ganadas y cotizaciones aprobadas listas para asignacion, supervision y seguimiento.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-1 text-sm text-[#B3B3B8]">Total aprobado</p>
          <p className="text-2xl font-bold text-[#9E1B32]">
            {formatCurrency(totalApproved, "MXN")}
          </p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Proyectos operativos</p>
          <p className="mt-2 text-3xl font-bold">{operationalProjects.length}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Con cotizacion aprobada</p>
          <p className="mt-2 text-3xl font-bold">{approvedQuotesByProject.size}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Estado operativo</p>
          <p className="mt-2 text-lg font-semibold text-[#F4C66A]">
            Pendiente de asignar
          </p>
        </div>
      </section>

      {operationalProjects.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No hay proyectos ganados o cotizaciones aprobadas listas para operacion.
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
          <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_1fr_130px] gap-4 border-b border-[#1F1F24] bg-[#101114] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#77777D] xl:grid">
            <span>Cliente</span>
            <span>Proyecto/Oportunidad</span>
            <span>Cotizacion aprobada</span>
            <span>Total aprobado</span>
            <span>Fecha</span>
            <span>Estado operativo</span>
            <span>Acciones</span>
          </div>

          <div className="divide-y divide-[#1F1F24]">
            {operationalProjects.map((project) => {
              const approvedQuote = approvedQuotesByProject.get(project.id);
              const total = getApprovedTotal(approvedQuote);
              const displayTotal =
                total > 0 ? total : Number(project.estimated_value_mxn || 0);
              const referenceDate =
                project.expected_close_date ||
                approvedQuote?.created_at ||
                project.created_at;

              return (
                <div
                  key={project.id}
                  className="grid grid-cols-1 gap-4 px-5 py-5 text-sm transition hover:bg-[#19191F] xl:grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_1fr_130px] xl:items-center"
                >
                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Cliente</p>
                    <p className="font-semibold">{getClientName(project.client_id)}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">
                      Proyecto/Oportunidad
                    </p>
                    <p>{project.name || "Sin proyecto"}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">
                      Cotizacion aprobada
                    </p>
                    {approvedQuote ? (
                      <Link
                        href={`/quotes/${approvedQuote.id}`}
                        className="text-[#D7A8FF] hover:text-white"
                      >
                        {approvedQuote.quote_number || `#${approvedQuote.id}`}
                      </Link>
                    ) : (
                      <span className="text-[#77777D]">Sin cotizacion</span>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">
                      Total aprobado
                    </p>
                    <p className="font-semibold">
                      {displayTotal > 0
                        ? formatCurrency(displayTotal, "MXN")
                        : "Sin monto"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Fecha</p>
                    <p>{formatDate(referenceDate)}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">
                      Estado operativo
                    </p>
                    <span className="inline-flex w-fit rounded-full border border-[#614620] bg-[#322514] px-3 py-1 text-xs text-[#F4C66A]">
                      Pendiente de asignar
                    </span>
                  </div>

                  <div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
                    >
                      <ClipboardList size={16} />
                      Ver proyecto
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
