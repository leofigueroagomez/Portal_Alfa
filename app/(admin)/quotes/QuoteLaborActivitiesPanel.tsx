"use client";

import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getLaborActivityInternalTotal,
  getLaborActivitySaleTotal,
  type LaborActivityCatalogOption,
  type QuoteItemLaborActivity,
} from "@/lib/quoteLaborActivities";

type Props = {
  activities: QuoteItemLaborActivity[];
  catalog: LaborActivityCatalogOption[];
  onChange: (activities: QuoteItemLaborActivity[]) => void;
  disabled?: boolean;
};

function emptyActivity(): QuoteItemLaborActivity {
  return {
    id: crypto.randomUUID(),
    labor_activity_id: null,
    name_snapshot: "Actividad",
    quantity: 1,
    unit: "pieza",
    internal_unit_cost_mxn: 0,
    sale_unit_price_mxn: 0,
    assigned_role: "",
    notes: "",
  };
}

export default function QuoteLaborActivitiesPanel({
  activities,
  catalog,
  onChange,
  disabled = false,
}: Props) {
  const saleTotal = activities.reduce(
    (sum, activity) => sum + getLaborActivitySaleTotal(activity),
    0
  );
  const internalTotal = activities.reduce(
    (sum, activity) => sum + getLaborActivityInternalTotal(activity),
    0
  );

  function updateActivity(
    activityId: string,
    patch: Partial<QuoteItemLaborActivity>
  ) {
    onChange(
      activities.map((activity) =>
        activity.id === activityId ? { ...activity, ...patch } : activity
      )
    );
  }

  function applyCatalogActivity(activityId: string, catalogId: string) {
    const catalogActivity = catalog.find(
      (activity) => String(activity.id) === catalogId
    );

    if (!catalogActivity) {
      updateActivity(activityId, {
        labor_activity_id: null,
      });
      return;
    }

    updateActivity(activityId, {
      labor_activity_id: catalogActivity.id,
      name_snapshot: catalogActivity.name,
      unit: catalogActivity.default_unit || "pieza",
      internal_unit_cost_mxn: Number(
        catalogActivity.default_internal_cost_mxn || 0
      ),
      sale_unit_price_mxn: Number(catalogActivity.default_sale_price_mxn || 0),
    });
  }

  return (
    <details className="mt-3 rounded-xl border border-[#2A2A30] bg-[#151518] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[#B3B3B8]">
          Actividades de mano de obra
        </span>
        <span className="text-[#8CE0B6]">{formatCurrency(saleTotal, "MXN")}</span>
      </summary>

      <div className="mt-4 space-y-3">
        {activities.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#2A2A30] px-3 py-2 text-xs text-[#77777D]">
            Sin actividades. Se puede dejar vacio.
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="grid grid-cols-1 gap-2 rounded-lg border border-[#2A2A30] bg-[#222228] p-3 lg:grid-cols-[1.3fr_80px_80px_110px_110px_1fr_36px]"
            >
              <select
                value={activity.labor_activity_id || ""}
                disabled={disabled}
                onChange={(event) =>
                  applyCatalogActivity(activity.id, event.target.value)
                }
                className="min-w-0 rounded-lg bg-[#151518] px-3 py-2 text-sm outline-none"
              >
                <option value="">Actividad manual</option>
                {catalog.map((catalogActivity) => (
                  <option key={catalogActivity.id} value={catalogActivity.id}>
                    {catalogActivity.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                value={activity.quantity}
                disabled={disabled}
                onChange={(event) =>
                  updateActivity(activity.id, {
                    quantity: Number(event.target.value) || 0,
                  })
                }
                className="rounded-lg bg-[#151518] px-3 py-2 text-sm outline-none"
                aria-label="Cantidad actividad"
              />

              <input
                value={activity.unit}
                disabled={disabled}
                onChange={(event) =>
                  updateActivity(activity.id, { unit: event.target.value })
                }
                className="rounded-lg bg-[#151518] px-3 py-2 text-sm outline-none"
                aria-label="Unidad actividad"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={activity.internal_unit_cost_mxn}
                disabled={disabled}
                onChange={(event) =>
                  updateActivity(activity.id, {
                    internal_unit_cost_mxn: Number(event.target.value) || 0,
                  })
                }
                className="rounded-lg bg-[#151518] px-3 py-2 text-sm outline-none"
                aria-label="Costo interno actividad"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={activity.sale_unit_price_mxn}
                disabled={disabled}
                onChange={(event) =>
                  updateActivity(activity.id, {
                    sale_unit_price_mxn: Number(event.target.value) || 0,
                  })
                }
                className="rounded-lg bg-[#151518] px-3 py-2 text-sm outline-none"
                aria-label="Precio venta actividad"
              />

              <input
                value={activity.notes || ""}
                disabled={disabled}
                onChange={(event) =>
                  updateActivity(activity.id, { notes: event.target.value })
                }
                placeholder="Notas"
                className="rounded-lg bg-[#151518] px-3 py-2 text-sm outline-none"
              />

              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(activities.filter((item) => item.id !== activity.id))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#151518] text-[#B3B3B8] hover:bg-[#2A2A30] disabled:text-[#77777D]"
                aria-label="Quitar actividad"
              >
                <Trash2 size={15} />
              </button>

              <div className="text-xs text-[#77777D] lg:col-span-7">
                Total venta {formatCurrency(getLaborActivitySaleTotal(activity), "MXN")} / costo interno{" "}
                {formatCurrency(getLaborActivityInternalTotal(activity), "MXN")}
              </div>
            </div>
          ))
        )}

        <div className="flex flex-col gap-2 text-xs text-[#77777D] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Venta {formatCurrency(saleTotal, "MXN")} / costo interno{" "}
            {formatCurrency(internalTotal, "MXN")} / margen{" "}
            {formatNumber(saleTotal - internalTotal)}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([...activities, emptyActivity()])}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white disabled:text-[#77777D]"
          >
            <Plus size={14} />
            Agregar actividad
          </button>
        </div>
      </div>
    </details>
  );
}
