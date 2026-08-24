"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/services/supabase";
import { canManagePricingSettings } from "@/lib/permissions";

export default function PricingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [indirectCostPercent, setIndirectCostPercent] = useState("0");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        setCanEdit(canManagePricingSettings(profile?.role || null));
      }

      const { data, error } = await supabase
        .from("company_settings")
        .select("indirect_cost_percent")
        .eq("id", true)
        .maybeSingle();

      if (error) {
        console.error("Error cargando configuracion de precios:", error);
      } else if (data) {
        setIndirectCostPercent(String(data.indirect_cost_percent ?? 0));
      }

      setLoading(false);
    }

    load();
  }, []);

  async function handleSave() {
    setSaving(true);

    const { error } = await supabase
      .from("company_settings")
      .update({
        indirect_cost_percent: Number(indirectCostPercent) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    setSaving(false);

    if (error) {
      alert("Error guardando configuracion: " + error.message);
      return;
    }

    alert("Configuracion guardada");
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link
            href="/settings"
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#B3B3B8] hover:text-white"
          >
            <ArrowLeft size={16} />
            Volver a Configuración
          </Link>

          <h1 className="text-3xl font-bold">Costos y precios</h1>
          <p className="mt-2 text-[#B3B3B8]">
            Parámetros de empresa que se aplican automáticamente a toda
            cotización nueva.
          </p>
        </div>

        {loading ? (
          <p className="text-[#B3B3B8]">Cargando...</p>
        ) : (
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
            <label className="mb-2 block text-sm font-semibold text-[#B3B3B8]">
              Costo indirecto (%)
            </label>
            <p className="mb-4 text-sm text-[#77777D]">
              Se suma sobre el total de equipos y mano de obra de cada
              cotización nueva, para recuperar los costos indirectos de la
              empresa en el proyecto.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={!canEdit}
                value={indirectCostPercent}
                onChange={(e) => setIndirectCostPercent(e.target.value)}
                className="w-32 rounded-xl bg-[#222228] p-4 text-right outline-none disabled:opacity-50"
              />
              <span className="text-[#B3B3B8]">%</span>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-6 rounded-xl bg-[#9E1B32] px-6 py-3 font-semibold hover:bg-[#B91C3C] disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            ) : (
              <p className="mt-6 text-sm text-[#77777D]">
                No tienes permisos para editar este valor.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
