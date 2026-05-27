import Link from "next/link";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ClientProject = {
  id: number;
  name: string | null;
};

type SiteVisit = {
  id: number;
  visit_date: string | null;
  title: string | null;
  general_notes: string | null;
  created_at: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export default async function ProjectSiteVisitsPage({
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
  const { data: visits, error } = await supabase
    .from("project_site_visits")
    .select("id, visit_date, title, general_notes, created_at")
    .eq("client_project_id", id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });

  const visitList = (visits || []) as SiteVisit[];

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
            ALFA OS
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Visitas de obra</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {projectData?.name || "Proyecto operativo"}
          </p>
        </div>

        <Link
          href={`/projects/${id}/site-visits/new`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nueva visita de obra
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar visitas de obra. Ejecuta el SQL del modulo si aun no existe la tabla.
        </section>
      ) : visitList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No hay visitas registradas para este proyecto.
        </section>
      ) : (
        <section className="space-y-4">
          {visitList.map((visit) => (
            <Link
              key={visit.id}
              href={`/projects/${id}/site-visits/${visit.id}`}
              className="block rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 transition hover:border-[#9E1B32]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#9E1B32]">
                    {formatDate(visit.visit_date)}
                  </p>
                  <h2 className="text-2xl font-semibold">
                    {visit.title || "Visita de obra"}
                  </h2>
                  {visit.general_notes?.trim() ? (
                    <p className="mt-2 line-clamp-2 text-sm text-[#B3B3B8]">
                      {visit.general_notes}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-sm text-[#B3B3B8]">
                  <ClipboardList size={16} />
                  Ver reporte
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
