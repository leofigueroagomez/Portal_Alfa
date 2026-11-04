"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import {
  normalizeSalesStage,
  salesStageClasses,
  salesStageLabels,
  salesStages,
} from "@/lib/salesStages";
import { getProjectPartnerSuggestion } from "@/lib/partnerBilling";

type PartnerOption = {
  id: number;
  commercial_name: string;
  is_active: boolean | null;
};

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
  // Aliado comercial del proyecto (facturar al aliado). null = sin cargar o
  // migracion 20261104130000 pendiente: no se muestra ni se guarda.
  const [partnerOptions, setPartnerOptions] = useState<PartnerOption[] | null>(null);
  const [savedPartnerId, setSavedPartnerId] = useState<number | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [quotePartnerId, setQuotePartnerId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadPartnerContext() {
      const projectResult = await supabase
        .from("client_projects")
        .select("id, commercial_partner_id")
        .eq("id", project.id)
        .maybeSingle();

      if (cancelled || projectResult.error) return;

      const [partnersResult, quotesResult] = await Promise.all([
        supabase
          .from("commercial_partners")
          .select("id, commercial_name, is_active")
          .order("commercial_name", { ascending: true }),
        supabase
          .from("quotes")
          .select("id, commercial_partner_id")
          .eq("client_project_id", project.id)
          .eq("is_latest", true)
          .not("commercial_partner_id", "is", null),
      ]);

      if (cancelled || partnersResult.error) return;

      const current =
        (projectResult.data as { commercial_partner_id: number | null } | null)
          ?.commercial_partner_id ?? null;
      const quotePartners = [
        ...new Set(
          ((quotesResult.data || []) as { commercial_partner_id: number }[]).map(
            (quote) => quote.commercial_partner_id
          )
        ),
      ];

      setPartnerOptions((partnersResult.data || []) as PartnerOption[]);
      setSavedPartnerId(current);
      setPartnerId(current ? String(current) : "");
      // Solo se propone si las cotizaciones vigentes coinciden en un aliado.
      setQuotePartnerId(quotePartners.length === 1 ? quotePartners[0] : null);
    }

    loadPartnerContext();
    return () => {
      cancelled = true;
    };
  }, [open, project.id]);
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
    const nextPartnerId = partnerId ? Number(partnerId) : null;
    const partnerPatch =
      partnerOptions && nextPartnerId !== savedPartnerId
        ? { commercial_partner_id: nextPartnerId }
        : {};
    const { error } = await supabase
      .from("client_projects")
      .update({
        ...partnerPatch,
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
  const partnerSuggestion = getProjectPartnerSuggestion(
    partnerId ? Number(partnerId) : null,
    quotePartnerId
  );
  const suggestedPartner = partnerSuggestion
    ? partnerOptions?.find((partner) => partner.id === partnerSuggestion.partnerId) || null
    : null;

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

              {partnerOptions ? (
                <div>
                  <label className="mb-2 block text-sm text-[#B3B3B8]">
                    Aliado comercial
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 outline-none"
                    value={partnerId}
                    onChange={(event) => setPartnerId(event.target.value)}
                  >
                    <option value="">Venta directa (sin aliado)</option>
                    {partnerOptions
                      .filter(
                        (partner) =>
                          partner.is_active !== false || String(partner.id) === partnerId
                      )
                      .map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.commercial_name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-2 text-xs text-[#8A8A90]">
                    Si el proyecto se vende via aliado, sus facturas se preparan a nombre del
                    receptor fiscal del aliado. El cliente final no cambia.
                  </p>
                  {suggestedPartner ? (
                    <button
                      type="button"
                      onClick={() => setPartnerId(String(suggestedPartner.id))}
                      className="mt-3 rounded-xl border border-[#9E1B32]/50 px-3 py-2 text-xs font-semibold text-[#F2B8C2] hover:bg-[#9E1B32]/10"
                    >
                      La cotizacion vigente es via {suggestedPartner.commercial_name}: usar este
                      aliado
                    </button>
                  ) : null}
                </div>
              ) : null}

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
