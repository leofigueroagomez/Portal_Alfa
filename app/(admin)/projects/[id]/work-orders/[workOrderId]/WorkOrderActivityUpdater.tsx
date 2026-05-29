"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Save } from "lucide-react";
import { supabase } from "@/services/supabase";

export type EditableWorkOrderActivity = {
  id: number;
  quantity_assigned: number;
  quantity_completed: number;
  status: string;
  completion_notes: string | null;
  evidence_photo_url: string | null;
};

type Props = {
  projectId: number;
  workOrderId: number;
  activities: EditableWorkOrderActivity[];
};

type ActivityState = {
  quantity_completed: string;
  status: string;
  completion_notes: string;
  evidenceFile: File | null;
};

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

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export default function WorkOrderActivityUpdater({
  projectId,
  workOrderId,
  activities,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Record<number, ActivityState>>(() =>
    Object.fromEntries(
      activities.map((activity) => [
        activity.id,
        {
          quantity_completed: String(activity.quantity_completed || 0),
          status: activity.status || "pending",
          completion_notes: activity.completion_notes || "",
          evidenceFile: null,
        },
      ])
    )
  );

  function updateActivity(activityId: number, patch: Partial<ActivityState>) {
    setState((current) => ({
      ...current,
      [activityId]: {
        ...current[activityId],
        ...patch,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);

    for (const activity of activities) {
      const row = state[activity.id];
      const completed = Number(row.quantity_completed || 0);

      if (completed < 0 || completed > activity.quantity_assigned + 0.0001) {
        setSaving(false);
        alert("La cantidad completada no puede exceder la cantidad asignada.");
        return;
      }

      let evidencePath: string | null = activity.evidence_photo_url;
      if (row.evidenceFile) {
        evidencePath = `work-orders/${projectId}/${workOrderId}/activity-${activity.id}-${Date.now()}.${getExtension(
          row.evidenceFile
        )}`;
        const { error: uploadError } = await supabase.storage
          .from("project-photos")
          .upload(evidencePath, row.evidenceFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setSaving(false);
          reportError("subir evidencia", uploadError);
          return;
        }
      }

      const { error } = await supabase
        .from("work_order_activities")
        .update({
          quantity_completed: completed,
          status: row.status,
          completion_notes: row.completion_notes.trim() || null,
          evidence_photo_url: evidencePath,
          completed_at:
            row.status === "completed" || row.status === "validated"
              ? new Date().toISOString()
              : null,
        })
        .eq("id", activity.id);

      if (error) {
        setSaving(false);
        reportError("actualizar actividad", error);
        return;
      }
    }

    const statuses = Object.values(state).map((item) => item.status);
    const nextOrderStatus = statuses.every((status) => status === "validated")
      ? "validated"
      : statuses.every((status) => status === "completed" || status === "validated")
        ? "completed"
        : statuses.some((status) => status === "in_progress" || status === "completed" || status === "validated")
          ? "in_progress"
          : "assigned";

    const { error: orderError } = await supabase
      .from("work_orders")
      .update({ status: nextOrderStatus, updated_at: new Date().toISOString() })
      .eq("id", workOrderId);

    if (orderError) {
      setSaving(false);
      reportError("actualizar orden", orderError);
      return;
    }

    setSaving(false);
    router.refresh();
    alert("Orden actualizada.");
  }

  return (
    <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Actualizar avance</h2>
          <p className="mt-1 text-sm text-[#B3B3B8]">
            Captura cantidades completadas, estado, notas y evidencia.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
        >
          <Save size={18} />
          {saving ? "Guardando..." : "Guardar avance"}
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => {
          const row = state[activity.id];

          return (
            <div key={activity.id} className="grid grid-cols-1 gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-4 lg:grid-cols-[130px_150px_1fr_190px]">
              <label className="space-y-2">
                <span className="text-xs text-[#B3B3B8]">Completado</span>
                <input
                  type="number"
                  min="0"
                  max={activity.quantity_assigned}
                  step="0.01"
                  className="w-full rounded-lg bg-[#151518] px-3 py-2 outline-none"
                  value={row.quantity_completed}
                  onChange={(event) =>
                    updateActivity(activity.id, {
                      quantity_completed: event.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs text-[#B3B3B8]">Estado</span>
                <select
                  className="w-full rounded-lg bg-[#151518] px-3 py-2 outline-none"
                  value={row.status}
                  onChange={(event) => updateActivity(activity.id, { status: event.target.value })}
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En proceso</option>
                  <option value="completed">Completada</option>
                  <option value="validated">Validada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs text-[#B3B3B8]">Notas de cierre</span>
                <input
                  className="w-full rounded-lg bg-[#151518] px-3 py-2 outline-none"
                  value={row.completion_notes}
                  onChange={(event) =>
                    updateActivity(activity.id, { completion_notes: event.target.value })
                  }
                  placeholder="Opcional"
                />
              </label>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm text-[#B3B3B8] hover:text-white">
                <Camera size={16} />
                {row.evidenceFile ? row.evidenceFile.name : "Evidencia"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    updateActivity(activity.id, {
                      evidenceFile: event.target.files?.[0] || null,
                    })
                  }
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
