import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  sales_stage: string | null;
};

type Client = {
  id: number;
  name: string | null;
};

type Delivery = {
  id: number;
  client_project_id: number;
  delivery_date: string | null;
  status: string | null;
};

type Warranty = {
  id: number;
  client_project_id: number;
  equipment_warranty_end_date: string | null;
  installation_warranty_end_date: string | null;
  preventive_maintenance_frequency_months: number | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function addMonths(value: string | null | undefined, months: number | null | undefined) {
  if (!value || !months) return null;
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

export default async function PostSalePage() {
  const supabase = await createSupabaseServerClient();

  const { data: projects, error } = await supabase
    .from("client_projects")
    .select("id, client_id, name, sales_stage")
    .in("sales_stage", ["delivered", "warranty", "installed", "closed"])
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <section className="rounded-2xl border border-[#6A2A2A] bg-[#351818] p-6 text-[#FFB4B4]">
          Error cargando postventa: {error.message}
        </section>
      </main>
    );
  }

  const projectList = (projects || []) as ClientProject[];
  const projectIds = projectList.map((project) => project.id);
  const clientIds = [
    ...new Set(projectList.map((project) => project.client_id).filter(Boolean)),
  ] as number[];

  const [{ data: clients }, { data: deliveries }, { data: warranties }] =
    await Promise.all([
      clientIds.length
        ? supabase.from("clients").select("id, name").in("id", clientIds)
        : Promise.resolve({ data: [] as Client[] }),
      projectIds.length
        ? supabase
            .from("project_deliveries")
            .select("id, client_project_id, delivery_date, status")
            .in("client_project_id", projectIds)
            .order("delivery_date", { ascending: false })
        : Promise.resolve({ data: [] as Delivery[] }),
      projectIds.length
        ? supabase
            .from("project_warranties")
            .select(
              "id, client_project_id, equipment_warranty_end_date, installation_warranty_end_date, preventive_maintenance_frequency_months"
            )
            .in("client_project_id", projectIds)
            .order("warranty_date", { ascending: false })
        : Promise.resolve({ data: [] as Warranty[] }),
    ]);

  const deliveryList = (deliveries || []) as Delivery[];
  const warrantyList = (warranties || []) as Warranty[];
  const financialRows = await Promise.all(
    projectList.map(async (project) => ({
      projectId: project.id,
      summary: await getProjectFinancialSummary(supabase, project.id),
    }))
  );
  const financialByProject = new Map(
    financialRows.map((row) => [row.projectId, row.summary])
  );

  function getClientName(clientId: number | null) {
    return clients?.find((client) => client.id === clientId)?.name || "Sin cliente";
  }

  function getLatestDelivery(projectId: number) {
    return deliveryList.find((delivery) => delivery.client_project_id === projectId) || null;
  }

  function getLatestWarranty(projectId: number) {
    return warrantyList.find((warranty) => warranty.client_project_id === projectId) || null;
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA OS
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Postventa</h1>
          <p className="mt-3 max-w-3xl text-[#B3B3B8]">
            Proyectos entregados, garantias, historial de entrega, mantenimiento sugerido y saldos pendientes.
          </p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-1 text-sm text-[#B3B3B8]">Proyectos postventa</p>
          <p className="text-2xl font-bold text-[#9E1B32]">{projectList.length}</p>
        </div>
      </section>

      {projectList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          Aun no hay proyectos entregados o en garantia.
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
          <div className="hidden grid-cols-[1.1fr_1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_110px] gap-4 border-b border-[#1F1F24] bg-[#101114] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#77777D] xl:grid">
            <span>Cliente</span>
            <span>Proyecto</span>
            <span>Estado</span>
            <span>Entrega</span>
            <span>Vence garantia</span>
            <span>Prox. mantenimiento</span>
            <span>Saldo</span>
          </div>
          <div className="divide-y divide-[#1F1F24]">
            {projectList.map((project) => {
              const delivery = getLatestDelivery(project.id);
              const warranty = getLatestWarranty(project.id);
              const warrantyEnd =
                warranty?.installation_warranty_end_date ||
                warranty?.equipment_warranty_end_date ||
                null;
              const nextMaintenance = addMonths(
                delivery?.delivery_date,
                warranty?.preventive_maintenance_frequency_months
              );
              const financial = financialByProject.get(project.id);

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="grid grid-cols-1 gap-4 px-5 py-5 text-sm transition hover:bg-[#19191F] xl:grid-cols-[1.1fr_1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_110px] xl:items-center"
                >
                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Cliente</p>
                    <p className="font-semibold">{getClientName(project.client_id)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Proyecto</p>
                    <p>{project.name || "Sin proyecto"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Estado</p>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#1F7A4D] bg-[#143D2A] px-3 py-1 text-xs text-[#8CE0B6]">
                      <ShieldCheck size={13} />
                      {project.sales_stage === "warranty" ? "En garantía" : "Entregado"}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Entrega</p>
                    <p>{formatDate(delivery?.delivery_date)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Vence garantia</p>
                    <p>{formatDate(warrantyEnd)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-[#77777D] xl:hidden">Prox. mantenimiento</p>
                    <p>{formatDate(nextMaintenance)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#F4C66A]">
                      {formatCurrency(Number(financial?.pendingTotalMxn || 0), "MXN")}
                    </p>
                    <ArrowRight size={16} className="text-[#77777D]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
