"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type ProjectRow = {
  id: number;
  name: string | null;
  clientName: string;
  approvedQuoteId: number | null;
  approvedQuoteNumber: string | null;
  displayTotal: number;
  referenceDateLabel: string;
};

type Props = {
  projects: ProjectRow[];
};

function normalize(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ProjectsListClient({ projects }: Props) {
  const [search, setSearch] = useState("");
  const normalizedSearch = normalize(search);

  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;

    return projects.filter((project) => {
      const haystack = [
        project.name,
        project.clientName,
        project.approvedQuoteNumber,
        `proyecto ${project.id}`,
      ]
        .map(normalize)
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, projects]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
      <div className="border-b border-[#1F1F24] bg-[#101114] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-xl">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77777D]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente o proyecto..."
              className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] py-3 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-[#77777D] focus:border-[#9E1B32]"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#B3B3B8] hover:bg-[#222228] hover:text-white"
                aria-label="Limpiar busqueda"
              >
                <X size={16} />
              </button>
            ) : null}
          </label>
          <p className="text-sm text-[#B3B3B8]">
            {filteredProjects.length} de {projects.length} proyectos
          </p>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="p-8 text-[#B3B3B8]">
          <p>No encontramos proyectos que coincidan con tu busqueda.</p>
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-4 inline-flex rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A2A30]"
            >
              Limpiar busqueda
            </button>
          ) : null}
        </div>
      ) : (
        <>
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
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="grid grid-cols-1 gap-4 px-5 py-5 text-sm transition hover:bg-[#19191F] xl:grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_1fr_130px] xl:items-center"
              >
                <div>
                  <p className="mb-1 text-xs text-[#77777D] xl:hidden">Cliente</p>
                  <p className="font-semibold">{project.clientName}</p>
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
                  {project.approvedQuoteId ? (
                    <Link
                      href={`/quotes/${project.approvedQuoteId}`}
                      className="text-[#D7A8FF] hover:text-white"
                    >
                      {project.approvedQuoteNumber || `#${project.approvedQuoteId}`}
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
                    {project.displayTotal > 0
                      ? formatCurrency(project.displayTotal, "MXN")
                      : "Sin monto"}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs text-[#77777D] xl:hidden">Fecha</p>
                  <p>{project.referenceDateLabel}</p>
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
            ))}
          </div>
        </>
      )}
    </section>
  );
}
