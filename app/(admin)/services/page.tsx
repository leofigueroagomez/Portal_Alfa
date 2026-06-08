import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServiceReport = {
  id: number;
  service_number: string | null;
  service_location: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  solution_status: string | null;
  requires_parts: boolean | null;
  status: string | null;
  clients: { name: string | null } | null;
  client_projects: { name: string | null } | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function solutionLabel(status: string | null | undefined) {
  if (status === "solved") return "Solucionado";
  if (status === "not_solved") return "No solucionado";
  return "Pendiente";
}

function statusLabel(status: string | null | undefined) {
  if (status === "completed") return "Finalizado";
  if (status === "in_progress") return "En proceso";
  if (status === "pending") return "Pendiente";
  if (status === "cancelled") return "Cancelado";
  return "Borrador";
}

export default async function ServicesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: reports, error } = await supabase
    .from("service_reports")
    .select(
      "id, service_number, service_location, performed_by_name, service_date, solution_status, requires_parts, status, clients(name), client_projects(name)"
    )
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false });

  const reportList = (reports || []) as unknown as ServiceReport[];

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Servicios</h1>
          <p className="mt-3 text-[#B3B3B8]">
            Reportes de servicio tecnico, evidencias y refacciones.
          </p>
        </div>
        <Link
          href="/services/new"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nuevo servicio
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          Ejecuta el SQL de servicios para habilitar esta vista.
        </section>
      ) : reportList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No hay reportes de servicio.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-3 py-2 font-semibold">Folio</th>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Proyecto</th>
                  <th className="px-3 py-2 font-semibold">Ubicacion</th>
                  <th className="px-3 py-2 font-semibold">Tecnico</th>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Refacciones</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportList.map((report) => (
                  <tr key={report.id} className="border-b border-[#222228] hover:bg-[#1A1A1F]">
                    <td className="px-3 py-2 font-semibold">
                      {report.service_number || `SERV-${String(report.id).padStart(4, "0")}`}
                    </td>
                    <td className="px-3 py-2">{report.clients?.name || "Sin cliente"}</td>
                    <td className="px-3 py-2">{report.client_projects?.name || "-"}</td>
                    <td className="max-w-[240px] truncate px-3 py-2">
                      {report.service_location || "-"}
                    </td>
                    <td className="px-3 py-2">{report.performed_by_name || "-"}</td>
                    <td className="px-3 py-2">{formatDate(report.service_date)}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{statusLabel(report.status)}</div>
                      <div className="text-xs text-[#77777D]">
                        {solutionLabel(report.solution_status)}
                      </div>
                    </td>
                    <td className="px-3 py-2">{report.requires_parts ? "Si" : "No"}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/services/${report.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                      >
                        <FileText size={14} />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
