import Link from "next/link";
import { ArrowLeft, FileText, Plus, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";

type ClientProject = {
  id: number;
  name: string | null;
};

type ProjectWarranty = {
  id: number;
  warranty_date: string | null;
  status: string | null;
  equipment_warranty_months: number | null;
  installation_warranty_months: number | null;
  preventive_maintenance_required: boolean | null;
  maintenance_policy_active: boolean | null;
  preventive_maintenance_cost_mxn: number | null;
  created_at: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function statusClasses(status: string | null | undefined) {
  return status === "issued"
    ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
    : "border-[#614620] bg-[#322514] text-[#F4C66A]";
}

function statusLabel(status: string | null | undefined) {
  return status === "issued" ? "Emitida" : "Borrador";
}

export default async function ProjectWarrantyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  const projectData = project as ClientProject | null;
  const { data: warranties, error } = await supabase
    .from("project_warranties")
    .select(
      "id, warranty_date, status, equipment_warranty_months, installation_warranty_months, preventive_maintenance_required, maintenance_policy_active, preventive_maintenance_cost_mxn, created_at"
    )
    .eq("client_project_id", id)
    .order("warranty_date", { ascending: false })
    .order("created_at", { ascending: false });

  const warrantyList = (warranties || []) as ProjectWarranty[];

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver al proyecto
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA IT
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Carta de garantia</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {projectData?.name || "Proyecto operativo"}
          </p>
        </div>

        <Link
          href={`/projects/${id}/warranty/new`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nueva carta
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar garantias. Ejecuta `sql/20260603_project_warranties.sql`.
        </section>
      ) : warrantyList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          Aun no hay cartas de garantia para este proyecto.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Equipos</th>
                  <th className="px-4 py-3 font-semibold">Instalacion</th>
                  <th className="px-4 py-3 font-semibold">Mantenimiento</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {warrantyList.map((warranty) => (
                  <tr
                    key={warranty.id}
                    className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F]"
                  >
                    <td className="px-4 py-3">{formatDate(warranty.warranty_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusClasses(warranty.status)}`}>
                        {statusLabel(warranty.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{warranty.equipment_warranty_months || 0} meses</td>
                    <td className="px-4 py-3">{warranty.installation_warranty_months || 0} meses</td>
                    <td className="px-4 py-3">
                      {warranty.maintenance_policy_active ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#1F7A4D] bg-[#143D2A] px-3 py-1 text-xs text-[#8CE0B6]">
                          <ShieldCheck size={13} />
                          Poliza vigente
                        </span>
                      ) : warranty.preventive_maintenance_required ? (
                        <span className="text-[#B3B3B8]">
                          {formatCurrency(Number(warranty.preventive_maintenance_cost_mxn || 0), "MXN")}
                        </span>
                      ) : (
                        <span className="text-[#77777D]">No requerido</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/projects/${id}/warranty/${warranty.id}`}
                          className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          Ver detalle
                        </Link>
                        <Link
                          href={`/projects/${id}/warranty/${warranty.id}/print`}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          <FileText size={14} />
                          PDF
                        </Link>
                      </div>
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
