import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  estimated_value_mxn?: number | null;
  expected_close_date?: string | null;
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
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX");
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, client_id, name, estimated_value_mxn, expected_close_date")
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href="/projects" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
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
      .select("id, quote_number, total_mxn, grand_total")
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

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/projects" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a proyectos
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          {projectData.name || "Proyecto operativo"}
        </h1>
        <p className="mt-3 text-[#B3B3B8]">
          Base operativa para asignacion de cuadrilla, supervision y tareas.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cliente</p>
          <p className="text-xl font-semibold">{clientData?.name || "Sin cliente"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cotizacion aprobada</p>
          {approvedQuote ? (
            <Link href={`/quotes/${approvedQuote.id}`} className="text-xl font-semibold text-[#D7A8FF] hover:text-white">
              {approvedQuote.quote_number || `#${approvedQuote.id}`}
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
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Fecha referencia</p>
          <p className="text-xl font-semibold">
            {formatDate(projectData.expected_close_date)}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
        <h2 className="mb-4 text-2xl font-semibold">Operaciones</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-sm text-[#B3B3B8]">Cuadrilla</p>
            <p className="mt-2 font-semibold text-[#F4C66A]">Pendiente de asignar</p>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-sm text-[#B3B3B8]">Supervision</p>
            <p className="mt-2 font-semibold text-[#F4C66A]">Pendiente de asignar</p>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-sm text-[#B3B3B8]">Tareas</p>
            <p className="mt-2 font-semibold text-[#F4C66A]">Pendiente de crear</p>
          </div>
        </div>
      </section>
    </main>
  );
}
