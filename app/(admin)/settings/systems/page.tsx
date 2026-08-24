"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Layers,
  Plus,
  Power,
  SlidersHorizontal,
  Trash2,
  Workflow,
} from "lucide-react";
import { supabase } from "@/services/supabase";

type QuotableSystem = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  default_prerequisites: string | null;
  default_exclusions: string | null;
  is_active: boolean;
  sort_order: number;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

export default function QuotableSystemsPage() {
  const [systems, setSystems] = useState<QuotableSystem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function loadSystems() {
    const { data, error } = await supabase
      .from("quotable_systems")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando sistemas cotizables:", error);
      return;
    }

    setSystems((data || []) as QuotableSystem[]);
  }

  useEffect(() => {
    loadSystems();
  }, []);

  function handleCreateSystem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const code = slugify(name.trim());
      const maxSortOrder = systems.length > 0 ? Math.max(...systems.map((s) => s.sort_order || 0)) + 10 : 10;

      const { error } = await supabase.from("quotable_systems").insert({
        name: name.trim(),
        code,
        description: description.trim() || null,
        default_prerequisites: prerequisites.trim() || null,
        default_exclusions: exclusions.trim() || null,
        is_active: true,
        sort_order: maxSortOrder,
      });

      if (error) {
        alert("Error creando sistema: " + error.message);
        return;
      }

      setName("");
      setDescription("");
      setPrerequisites("");
      setExclusions("");
      setShowAddForm(false);
      loadSystems();
    });
  }

  function handleToggleActive(system: QuotableSystem) {
    startTransition(async () => {
      const { error } = await supabase
        .from("quotable_systems")
        .update({ is_active: !system.is_active, updated_at: new Date().toISOString() })
        .eq("id", system.id);

      if (error) {
        alert("Error actualizando estado del sistema: " + error.message);
        return;
      }

      loadSystems();
    });
  }

  function handleDeleteSystem(system: QuotableSystem) {
    const confirmed = window.confirm(
      `¿Eliminar el sistema "${system.name}" del catálogo? Las cotizaciones existentes conservarán su historial, pero ya no podrá ser seleccionado en nuevas cotizaciones.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const { error } = await supabase
        .from("quotable_systems")
        .delete()
        .eq("id", system.id);

      if (error) {
        alert("No se pudo eliminar el sistema: " + error.message);
        return;
      }

      loadSystems();
    });
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Encabezado */}
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-[#B3B3B8] hover:text-white mb-6"
          >
            <ArrowLeft size={16} />
            Volver a Configuración
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2A2A30] pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9E1B32]">
                ALFA OS • CATÁLOGO CORPORATIVO
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Sistemas y Disciplinas Cotizables
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#8E8E93]">
                Catálogo homologado y cerrado de sistemas que la empresa comercializa. En las cotizaciones nuevas únicamente se podrá seleccionar de esta lista oficial para evitar nombres libres o duplicados.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg self-start sm:self-auto"
            >
              <Plus size={16} />
              {showAddForm ? "Cerrar Formulario" : "Agregar Nuevo Sistema"}
            </button>
          </div>
        </div>

        {/* Formulario de Alta de Sistema */}
        {showAddForm && (
          <form
            onSubmit={handleCreateSystem}
            className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 space-y-5 shadow-2xl animate-in fade-in duration-200"
          >
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#2A2A30] pb-3">
              <Layers size={18} className="text-[#9E1B32]" />
              Alta de Nuevo Sistema Homologado
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[#B3B3B8] font-semibold">Nombre Oficial del Sistema (como aparecerá en la cotización y contrato):</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Audio Distribuido y Alta Fidelidad"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[#B3B3B8] font-semibold">Descripción Técnica (Alcance General):</span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Sistemas de sonorización multizona, amplificación, bocinas arquitectónicas y alta fidelidad."
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8] font-semibold">Prerrequisitos de Obra Sugeridos (para Contratos):</span>
                <textarea
                  rows={2}
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  placeholder="Ej. Canalización para cable de bocina 14/16 AWG y acometida eléctrica para rack."
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8] font-semibold">Exclusiones Técnicas Sugeridas (para Contratos):</span>
                <textarea
                  rows={2}
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="Ej. Resanes, pintura y obra civil para perforación de plafones."
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs font-semibold text-[#B3B3B8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#9E1B32] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Guardar Sistema"}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Sistemas Homologados */}
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-[#2A2A30] flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Workflow size={18} className="text-[#9E1B32]" />
              Sistemas Activos en el Catálogo ({systems.length})
            </h2>
            <span className="text-xs text-[#8E8E93]">
              {systems.filter((s) => s.is_active).length} activos para cotizar
            </span>
          </div>

          <div className="divide-y divide-[#2A2A30]">
            {systems.map((sys, idx) => (
              <div
                key={sys.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-[#1C1D22] ${
                  !sys.is_active ? "opacity-50 bg-black/20" : ""
                }`}
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-[#8E8E93]">
                      #{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white">{sys.name}</h3>
                    {sys.code && (
                      <span className="text-[10px] font-mono bg-[#222228] text-[#8E8E93] px-2 py-0.5 rounded border border-[#2A2A30]">
                        {sys.code}
                      </span>
                    )}
                    {sys.is_active ? (
                      <span className="text-[10px] font-bold text-[#8CE0B6] bg-[#143D2A] px-2 py-0.5 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#F4C66A] bg-[#322514] px-2 py-0.5 rounded-full">
                        Desactivado
                      </span>
                    )}
                  </div>

                  {sys.description && (
                    <p className="text-xs text-[#B3B3B8] leading-relaxed">
                      {sys.description}
                    </p>
                  )}

                  {(sys.default_prerequisites || sys.default_exclusions) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-[#8E8E93]">
                      {sys.default_prerequisites && (
                        <div>
                          <strong className="text-[#B3B3B8]">Prerrequisito:</strong> {sys.default_prerequisites}
                        </div>
                      )}
                      {sys.default_exclusions && (
                        <div>
                          <strong className="text-[#B3B3B8]">Exclusión:</strong> {sys.default_exclusions}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(sys)}
                    disabled={isPending}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      sys.is_active
                        ? "border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                        : "border border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                    }`}
                  >
                    <Power size={13} />
                    {sys.is_active ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSystem(sys)}
                    disabled={isPending}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-[#2A2A30] bg-[#222228] text-[#77777D] hover:text-[#FFB4B4] hover:border-[#6A2A2A] transition"
                    title="Eliminar sistema"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {systems.length === 0 && (
              <div className="p-8 text-center text-xs text-[#8E8E93]">
                No hay sistemas dados de alta en el catálogo.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
