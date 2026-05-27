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

type Props = {
  projectId: number;
  currentStage: string | null;
};

export default function ProjectStageSelect({
  projectId,
  currentStage,
}: Props) {
  const router = useRouter();
  const [stage, setStage] = useState(normalizeSalesStage(currentStage));
  const [saving, setSaving] = useState(false);

  async function handleChange(nextStage: string) {
    const normalizedStage = normalizeSalesStage(nextStage);
    setStage(normalizedStage);
    setSaving(true);

    const { error } = await supabase
      .from("client_projects")
      .update({ sales_stage: normalizedStage })
      .eq("id", projectId);

    setSaving(false);

    if (error) {
      console.error("Error actualizando etapa comercial:", error);
      alert(
        "Error actualizando etapa comercial: " +
          JSON.stringify(error) +
          (error.message ? ` ${error.message}` : "")
      );
      setStage(normalizeSalesStage(currentStage));
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <span
        className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs ${salesStageClasses[stage]}`}
      >
        {salesStageLabels[stage]}
      </span>
      <select
        className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-xs text-white outline-none"
        value={stage}
        disabled={saving}
        onChange={(event) => handleChange(event.target.value)}
      >
        {salesStages.map((salesStage) => (
          <option key={salesStage} value={salesStage}>
            {salesStageLabels[salesStage]}
          </option>
        ))}
      </select>
    </div>
  );
}
