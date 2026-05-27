"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import {
  normalizeSalesStage,
  salesStageClasses,
  salesStageLabels,
  salesStages,
} from "@/lib/salesStages";

type Project = {
  id: number;
  name: string | null;
  sales_stage?: string | null;
  estimated_value_mxn?: number | null;
  probability_percent?: number | null;
  expected_close_date?: string | null;
  lost_reason?: string | null;
};

type Props = {
  project: Project;
};

export default function EditOpportunityButton({ project }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sales_stage: normalizeSalesStage(project.sales_stage),
    estimated_value_mxn: String(project.estimated_value_mxn || ""),
    probability_percent: String(project.probability_percent ?? 0),
    expected_close_date: project.expected_close_date || "",
    lost_reason: project.lost_reason || "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      sales_stage: normalizeSalesStage(project.sales_stage),
      estimated_value_mxn: String(project.estimated_value_mxn || ""),
      probability_percent: String(project.probability_percent ?? 0),
      expected_close_date: project.expected_close_date || "",
      lost_reason: project.lost_reason || "",
    });
    setSaving(false);
  }

  function closeModal() {
    resetForm();
    setOpen(false);
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

  async function handleSave() {
    const probability = Number(form.probability_percent) || 0;

    if (probability < 0 || probability > 100) {
      alert("La probabilidad debe estar entre 0 y 100.");
      return;
    }

    setSaving(true);

    const normalizedStage = normalizeSalesStage(form.sales_stage);
    const { error } = await supabase
      .from("client_projects")
      .update({
        sales_stage: normalizedStage,
        estimated_value_mxn: Number(form.estimated_value_mxn) || 0,
        probability_percent: probability,
        expected_close_date: form.expected_close_date || null,
        lost_reason:
          normalizedStage === "lost" ? form.lost_reason.trim() || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    setSaving(false);

    if (error) {
      reportError("guardar oportunidad", error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  const currentStage = normalizeSalesStage(form.sales_stage);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-sm font-semibold text-[#B3B3B8] transition hover:bg-[#2A2A30] hover:text-white"
      >
        Editar oportunidad
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
          <div className="max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm tracking-[0.25em] text-[#9E1B32]">
                  OPORTUNIDAD
                </p>
                <h3 className="text-2xl font-bold">
                  {project.name || "Sin nombre"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-[#B3B3B8] hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-[#B3B3B8]">
                  Etapa comercial
                </label>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 outline-none"
                  value={form.sales_stage}
                  onChange={(event) =>
                    updateField("sales_stage", event.target.value)
                  }
                >
                  {salesStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {salesStageLabels[stage]}
                    </option>
                  ))}
                </select>
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${salesStageClasses[currentStage]}`}
                >
                  {salesStageLabels[currentStage]}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-[#B3B3B8]">
                    Valor estimado MXN
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 outline-none"
                    value={form.estimated_value_mxn}
                    onChange={(event) =>
                      updateField("estimated_value_mxn", event.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#B3B3B8]">
                    Probabilidad %
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 outline-none"
                    value={form.probability_percent}
                    onChange={(event) =>
                      updateField("probability_percent", event.target.value)
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-[#B3B3B8]">
                  Fecha esperada de cierre
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 outline-none"
                  value={form.expected_close_date}
                  onChange={(event) =>
                    updateField("expected_close_date", event.target.value)
                  }
                />
              </div>

              {currentStage === "lost" ? (
                <div>
                  <label className="mb-2 block text-sm text-[#B3B3B8]">
                    Razón de pérdida
                  </label>
                  <textarea
                    className="min-h-28 w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 outline-none"
                    value={form.lost_reason}
                    onChange={(event) =>
                      updateField("lost_reason", event.target.value)
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl bg-[#222228] py-3 font-semibold hover:bg-[#2A2A30]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#9E1B32] py-3 font-semibold hover:bg-[#B91C3C]"
              >
                {saving ? "Guardando..." : "Guardar oportunidad"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
