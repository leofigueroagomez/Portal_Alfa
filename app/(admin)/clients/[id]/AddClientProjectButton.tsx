"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import { salesStageLabels, salesStages } from "@/lib/salesStages";

type Props = {
  clientId: number;
};

export default function AddClientProjectButton({ clientId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "opportunity",
    sales_stage: "lead",
    estimated_value_mxn: "",
    probability_percent: "0",
    expected_close_date: "",
  });

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function reportError(step: string, error: unknown) {
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? ` ${error.message}`
        : "";

    console.error(`Error en ${step}:`, error);
    alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
  }

  async function getNextProjectNumber() {
    const { data, error } = await supabase
      .from("client_projects")
      .select("project_number")
      .eq("client_id", clientId)
      .order("project_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      reportError("calcular número de proyecto", error);
      return null;
    }

    return Number(data?.project_number || 0) + 1;
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert("Agrega el nombre del proyecto u oportunidad");
      return;
    }

    setSaving(true);

    const projectNumber = await getNextProjectNumber();

    if (!projectNumber) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("client_projects")
      .insert({
        client_id: clientId,
        project_number: projectNumber,
        name: form.name,
        description: form.description,
        status: form.status,
        sales_stage: form.sales_stage,
        estimated_value_mxn: Number(form.estimated_value_mxn) || 0,
        probability_percent: Number(form.probability_percent) || 0,
        expected_close_date: form.expected_close_date || null,
      });

    setSaving(false);

    if (error) {
      reportError("crear proyecto de cliente", error);
      return;
    }

    setOpen(false);
    setForm({
      name: "",
      description: "",
      status: "opportunity",
      sales_stage: "lead",
      estimated_value_mxn: "",
      probability_percent: "0",
      expected_close_date: "",
    });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl px-5 py-3 font-semibold"
      >
        Nuevo proyecto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">
                  Nuevo proyecto
                </h3>
                <p className="text-[#B3B3B8] text-sm mt-1">
                  Oportunidad preliminar del cliente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#B3B3B8] hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <input className="w-full bg-[#222228] rounded-xl p-4 outline-none" placeholder="Nombre del proyecto" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              <select className="w-full bg-[#222228] rounded-xl p-4 outline-none" value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                <option value="opportunity">Oportunidad</option>
                <option value="proposal">Propuesta</option>
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="closed">Cerrado</option>
              </select>
              <select className="w-full bg-[#222228] rounded-xl p-4 outline-none" value={form.sales_stage} onChange={(e) => updateField("sales_stage", e.target.value)}>
                {salesStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {salesStageLabels[stage]}
                  </option>
                ))}
              </select>
              <input className="w-full bg-[#222228] rounded-xl p-4 outline-none" placeholder="Valor estimado MXN" value={form.estimated_value_mxn} onChange={(e) => updateField("estimated_value_mxn", e.target.value)} />
              <input className="w-full bg-[#222228] rounded-xl p-4 outline-none" placeholder="Probabilidad %" value={form.probability_percent} onChange={(e) => updateField("probability_percent", e.target.value)} />
              <input className="w-full bg-[#222228] rounded-xl p-4 outline-none" type="date" value={form.expected_close_date} onChange={(e) => updateField("expected_close_date", e.target.value)} />
              <textarea className="w-full bg-[#222228] rounded-xl p-4 outline-none min-h-32" placeholder="Descripción" value={form.description} onChange={(e) => updateField("description", e.target.value)} />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 bg-[#222228] hover:bg-[#2A2A30] rounded-xl py-3 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-3 font-semibold"
              >
                {saving ? "Guardando..." : "Guardar proyecto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
