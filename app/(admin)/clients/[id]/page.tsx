import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import AddClientProjectButton from "./AddClientProjectButton";
import EditOpportunityButton from "./EditOpportunityButton";
import ProjectStageSelect from "./ProjectStageSelect";

type Client = {
  id: number;
  client_number: number | null;
  name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

type ClientProject = {
  id: number;
  project_number: number | null;
  name: string | null;
  description: string | null;
  status: string | null;
  sales_stage?: string | null;
  estimated_value_mxn?: number | null;
  probability_percent?: number | null;
  expected_close_date?: string | null;
  lost_reason?: string | null;
  created_at: string | null;
};

function formatClientNumber(value: number | null) {
  return value ? String(value).padStart(3, "0") : "Sin número";
}

function formatProjectNumber(value: number | null) {
  return value ? String(value).padStart(3, "0") : "Sin número";
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX");
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !client) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] text-white p-10">
        <Link href="/clients" className="text-[#B3B3B8] hover:text-white">
          Volver a clientes
        </Link>
        <h1 className="text-3xl font-bold mt-8">Cliente no encontrado</h1>
      </main>
    );
  }

  const projectsResult = await supabase
    .from("client_projects")
    .select(
      "id, project_number, name, description, status, sales_stage, estimated_value_mxn, probability_percent, expected_close_date, lost_reason, created_at"
    )
    .eq("client_id", id)
    .order("project_number", { ascending: true });
  let projects = projectsResult.data as ClientProject[] | null;
  const projectsError = projectsResult.error;

  if (
    projectsError &&
    (projectsError.message.includes("sales_stage") ||
      projectsError.message.includes("estimated_value_mxn") ||
      projectsError.message.includes("probability_percent") ||
      projectsError.message.includes("expected_close_date") ||
      projectsError.message.includes("lost_reason"))
  ) {
    const fallback = await supabase
      .from("client_projects")
      .select("id, project_number, name, description, status, created_at")
      .eq("client_id", id)
      .order("project_number", { ascending: true });

    projects = fallback.data as ClientProject[] | null;
  }

  const clientData = client as Client;
  const projectList = (projects || []) as ClientProject[];

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-white p-10">
      <div className="flex items-start justify-between mb-10">
        <div>
          <Link
            href="/clients"
            className="inline-block text-[#B3B3B8] hover:text-white mb-6"
          >
            Volver a clientes
          </Link>

          <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
            CLIENTE {formatClientNumber(clientData.client_number)}
          </p>

          <h1 className="text-4xl font-bold mb-3">
            {clientData.name || "Sin nombre"}
          </h1>

          <p className="text-[#B3B3B8]">
            {clientData.company_name || "Sin empresa"}
          </p>
        </div>

        <Link
          href={`/clients/${clientData.id}/edit`}
          className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl px-5 py-3 font-semibold"
        >
          Editar cliente
        </Link>
      </div>

      <section className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Email</p>
          <p className="font-semibold">{clientData.email || "Sin email"}</p>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Teléfono</p>
          <p className="font-semibold">{clientData.phone || "Sin teléfono"}</p>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6 col-span-2">
          <p className="text-[#B3B3B8] mb-2">Dirección</p>
          <p className="font-semibold">{clientData.address || "Sin dirección"}</p>
        </div>
      </section>

      <section className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6 mb-10">
        <h2 className="text-2xl font-semibold mb-3">Notas</h2>
        <p className="text-[#B3B3B8] whitespace-pre-wrap">
          {clientData.notes || "Sin notas"}
        </p>
      </section>

      <section className="bg-[#151518] border border-[#1F1F24] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A30]">
          <div>
            <h2 className="text-2xl font-semibold">
              Proyectos / oportunidades
            </h2>
            <p className="text-[#B3B3B8] text-sm mt-1">
              Base para futuros folios CT-cliente-proyecto-versión.
            </p>
          </div>

          <AddClientProjectButton clientId={clientData.id} />
        </div>

        <div className="grid min-w-[1280px] grid-cols-[110px_1.1fr_1.4fr_180px_150px_100px_140px_170px] gap-4 px-5 py-4 border-b border-[#2A2A30] text-[#B3B3B8] text-sm font-semibold">
          <p>Número</p>
          <p>Nombre</p>
          <p>Descripción</p>
          <p>Etapa comercial</p>
          <p>Valor estimado</p>
          <p>Prob.</p>
          <p>Cierre esperado</p>
          <p>Acciones</p>
        </div>

        {projectList.length === 0 ? (
          <div className="p-8 text-[#B3B3B8]">
            No hay proyectos u oportunidades para este cliente.
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A30] overflow-x-auto">
            {projectList.map((project) => (
              <div
                key={project.id}
                className="grid min-w-[1280px] grid-cols-[110px_1.1fr_1.4fr_180px_150px_100px_140px_170px] gap-4 px-5 py-4 items-center text-sm"
              >
                <p className="font-semibold text-[#9E1B32]">
                  {formatProjectNumber(project.project_number)}
                </p>
                <p className="font-semibold">{project.name || "Sin nombre"}</p>
                <p className="text-[#B3B3B8] truncate">
                  {project.description || "Sin descripción"}
                </p>
                <ProjectStageSelect
                  projectId={project.id}
                  currentStage={project.sales_stage || null}
                />
                <p className="font-semibold">
                  {formatCurrency(project.estimated_value_mxn, "MXN")}
                </p>
                <p className="text-[#B3B3B8]">
                  {project.probability_percent ?? 0}%
                </p>
                <p className="text-[#B3B3B8]">
                  {formatDate(project.expected_close_date || null)}
                </p>
                <EditOpportunityButton project={project} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
