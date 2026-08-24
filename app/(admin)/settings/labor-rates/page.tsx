"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  DollarSign,
  Edit2,
  Hammer,
  Layers,
  Plus,
  Power,
  SlidersHorizontal,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { supabase } from "@/services/supabase";
import { formatCurrency } from "@/lib/format";

type LaborRateItem = {
  id: number;
  name: string;
  category: string;
  default_unit: string;
  subcontractor_unit_cost_mxn: number;
  default_sale_price_mxn: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type FormState = {
  id?: number;
  name: string;
  category: string;
  default_unit: string;
  subcontractor_unit_cost_mxn: string;
  default_sale_price_mxn: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  category: "instalacion",
  default_unit: "equipo",
  subcontractor_unit_cost_mxn: "150",
  default_sale_price_mxn: "300",
  description: "",
};

export default function LaborRatesSettingsPage() {
  const [rates, setRates] = useState<LaborRateItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  async function loadRates() {
    const { data, error } = await supabase
      .from("labor_activity_catalog")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando tabulador:", error);
      return;
    }

    setRates(
      (data || []).map((r) => ({
        ...r,
        category: r.category || "instalacion",
        default_unit: r.default_unit || "pieza",
        subcontractor_unit_cost_mxn: Number(
          r.subcontractor_unit_cost_mxn || r.default_internal_cost_mxn || 0
        ),
        default_sale_price_mxn: Number(r.default_sale_price_mxn || 0),
      }))
    );
  }

  useEffect(() => {
    loadRates();
  }, []);

  function handleOpenCreate() {
    setForm(emptyForm);
    setShowModal(true);
  }

  function handleOpenEdit(item: LaborRateItem) {
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      default_unit: item.default_unit,
      subcontractor_unit_cost_mxn: String(item.subcontractor_unit_cost_mxn),
      default_sale_price_mxn: String(item.default_sale_price_mxn),
      description: item.description || "",
    });
    setShowModal(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    startTransition(async () => {
      const subCost = Number(form.subcontractor_unit_cost_mxn) || 0;
      const salePrice = Number(form.default_sale_price_mxn) || subCost * 2;

      const payload = {
        name: form.name.trim(),
        category: form.category,
        default_unit: form.default_unit,
        subcontractor_unit_cost_mxn: subCost,
        default_internal_cost_mxn: subCost,
        default_sale_price_mxn: salePrice,
        description: form.description.trim() || null,
        is_active: true,
      };

      if (form.id) {
        const { error } = await supabase
          .from("labor_activity_catalog")
          .update(payload)
          .eq("id", form.id);

        if (error) {
          alert("Error actualizando tabulador: " + error.message);
          return;
        }
      } else {
        const maxSort =
          rates.length > 0
            ? Math.max(...rates.map((r) => r.sort_order || 0)) + 10
            : 10;

        const { error } = await supabase
          .from("labor_activity_catalog")
          .insert({
            ...payload,
            sort_order: maxSort,
          });

        if (error) {
          alert("Error creando actividad: " + error.message);
          return;
        }
      }

      setShowModal(false);
      loadRates();
    });
  }

  function handleToggleActive(item: LaborRateItem) {
    startTransition(async () => {
      const { error } = await supabase
        .from("labor_activity_catalog")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) {
        alert("Error actualizando estado: " + error.message);
        return;
      }

      loadRates();
    });
  }

  const filteredRates = rates.filter((r) => {
    if (selectedCategory === "all") return true;
    return r.category === selectedCategory;
  });

  const categoriesCount = {
    all: rates.length,
    cableado: rates.filter((r) => r.category === "cableado").length,
    instalacion: rates.filter((r) => r.category === "instalacion").length,
    configuracion: rates.filter((r) => r.category === "configuracion").length,
  };

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
                ALFA OS • COSTOS OPERATIVOS
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Tabulador de Mano de Obra para Subcontratistas
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#8E8E93]">
                Catálogo homologado de tarifas estándar por actividad. Al aprobarse un proyecto, ALFA OS genera automáticamente las 3 órdenes de trabajo (Cableado, Instalaciones y Configuraciones) liquidando los importes exactos según este tabulador.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg shrink-0"
            >
              <Plus size={16} />
              Nueva Tarifa / Actividad
            </button>
          </div>
        </div>

        {/* Filtros de Categoría */}
        <div className="flex flex-wrap gap-2 border-b border-[#2A2A30] pb-4">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedCategory === "all"
                ? "bg-[#9E1B32] text-white shadow-lg"
                : "border border-[#2A2A30] bg-[#151518] text-[#8E8E93] hover:text-white"
            }`}
          >
            Todas las Especialidades ({categoriesCount.all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("cableado")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === "cableado"
                ? "bg-[#9E1B32] text-white shadow-lg"
                : "border border-[#2A2A30] bg-[#151518] text-[#8E8E93] hover:text-white"
            }`}
          >
            <Zap size={13} className="text-[#F4C66A]" />
            1. Cableado y Trayectorias ({categoriesCount.cableado})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("instalacion")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === "instalacion"
                ? "bg-[#9E1B32] text-white shadow-lg"
                : "border border-[#2A2A30] bg-[#151518] text-[#8E8E93] hover:text-white"
            }`}
          >
            <Hammer size={13} className="text-[#8CE0B6]" />
            2. Instalaciones Físicas y Montaje ({categoriesCount.instalacion})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("configuracion")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === "configuracion"
                ? "bg-[#9E1B32] text-white shadow-lg"
                : "border border-[#2A2A30] bg-[#151518] text-[#8E8E93] hover:text-white"
            }`}
          >
            <Cpu size={13} className="text-[#8AB4F8]" />
            3. Configuraciones y Puesta a Punto ({categoriesCount.configuracion})
          </button>
        </div>

        {/* Grid de Tarifas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRates.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-4 shadow-xl transition hover:border-[#9E1B32]/40 ${
                !item.is_active ? "opacity-50 bg-black/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.category === "cableado"
                          ? "bg-[#322514] text-[#F4C66A]"
                          : item.category === "configuracion"
                          ? "bg-[#1A2E40] text-[#8AB4F8]"
                          : "bg-[#143D2A] text-[#8CE0B6]"
                      }`}
                    >
                      {item.category === "cableado"
                        ? "Cableado"
                        : item.category === "configuracion"
                        ? "Configuración"
                        : "Instalación"}
                    </span>
                    <span className="text-[11px] font-mono text-[#8E8E93]">
                      por {item.default_unit}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {item.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white transition"
                    title="Editar tarifa"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white transition"
                    title={item.is_active ? "Desactivar" : "Activar"}
                  >
                    <Power size={13} />
                  </button>
                </div>
              </div>

              {item.description && (
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2A2A30]">
                <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                  <span className="text-[10px] uppercase font-bold text-[#F4C66A]">
                    Pago al Subcontratista
                  </span>
                  <p className="text-base font-bold text-white mt-0.5">
                    {formatCurrency(item.subcontractor_unit_cost_mxn, "MXN")}
                    <span className="text-[10px] font-normal text-[#8E8E93] ml-1">
                      /{item.default_unit}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                  <span className="text-[10px] uppercase font-bold text-[#8CE0B6]">
                    Venta Sugerida Cliente
                  </span>
                  <p className="text-base font-bold text-white mt-0.5">
                    {formatCurrency(item.default_sale_price_mxn, "MXN")}
                    <span className="text-[10px] font-normal text-[#8E8E93] ml-1">
                      /{item.default_unit}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Alta / Edición */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 space-y-5 shadow-2xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#2A2A30] pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench size={18} className="text-[#9E1B32]" />
                  {form.id ? "Editar Tarifa de Mano de Obra" : "Nueva Tarifa de Tabulador"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-xs text-[#8E8E93] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <label className="block space-y-1">
                  <span className="text-[#B3B3B8] font-semibold">
                    Nombre de la Actividad / Partida *:
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Cableado de punto A a punto B"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    required
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">Especialidad (Fase ODT):</span>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    >
                      <option value="cableado">1. Cableado y Trayectorias</option>
                      <option value="instalacion">2. Instalaciones y Montaje</option>
                      <option value="configuracion">3. Configuraciones y Pruebas</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">Unidad de Cobro:</span>
                    <select
                      value={form.default_unit}
                      onChange={(e) => setForm({ ...form, default_unit: e.target.value })}
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    >
                      <option value="punto">punto (tirada / nodo)</option>
                      <option value="equipo">equipo</option>
                      <option value="dispositivo">dispositivo</option>
                      <option value="servicio">servicio</option>
                      <option value="pieza">pieza</option>
                      <option value="metro">metro lineal</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[#F4C66A] font-semibold">
                      Pago al Subcontratista (MXN) *:
                    </span>
                    <input
                      type="number"
                      value={form.subcontractor_unit_cost_mxn}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          subcontractor_unit_cost_mxn: e.target.value,
                        })
                      }
                      placeholder="300"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                      required
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#8CE0B6] font-semibold">
                      Venta Sugerida Cliente (MXN):
                    </span>
                    <input
                      type="number"
                      value={form.default_sale_price_mxn}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          default_sale_price_mxn: e.target.value,
                        })
                      }
                      placeholder="600"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[#B3B3B8] font-semibold">Descripción del Alcance:</span>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Instrucciones técnicas de lo que incluye la actividad."
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-xs text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>

                <div className="flex justify-end gap-3 border-t border-[#2A2A30] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-[#9E1B32] px-6 py-2 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg disabled:opacity-50"
                  >
                    {isPending ? "Guardando..." : "Guardar Tarifa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
