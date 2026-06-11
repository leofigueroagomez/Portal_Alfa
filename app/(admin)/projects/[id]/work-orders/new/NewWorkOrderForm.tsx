"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { getMexicoDate } from "@/lib/mexicoDate";
import { supabase } from "@/services/supabase";

export type AvailableWorkActivity = {
  id: number;
  system_name: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  activity_name: string;
  quantity_total: number;
  quantity_assigned_previously: number;
  quantity_pending: number;
  unit: string;
  status: string | null;
};

type Props = {
  projectId: number;
  activities: AvailableWorkActivity[];
  contractors: ContractorOption[];
};

type ContractorOption = {
  id: number;
  name: string | null;
  phone: string | null;
  specialty: string | null;
};

type SelectedActivity = {
  selected: boolean;
  quantity: string;
};

function today() {
  return getMexicoDate();
}

function quantityInputValue(value: number) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, "");
}

function reportError(step: string, error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? ` ${error.message}`
      : "";
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  console.error(`Error en ${step}:`, error);

  if (
    code === "PGRST205" ||
    message.includes("Could not find the table")
  ) {
    alert(
      `Error en ${step}: falta aplicar el SQL de ordenes de trabajo en Supabase. Ejecuta sql/20260529_work_orders.sql y vuelve a intentar.`
    );
    return;
  }

  alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
}

export default function NewWorkOrderForm({
  projectId,
  activities,
  contractors,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [assignedToName, setAssignedToName] = useState("");
  const [assignedToPhone, setAssignedToPhone] = useState("");
  const [contractorAmountMxn, setContractorAmountMxn] = useState("0");
  const [scheduledStart, setScheduledStart] = useState(today());
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [selection, setSelection] = useState<Record<number, SelectedActivity>>(() =>
    Object.fromEntries(
      activities.map((activity) => [
        activity.id,
        {
          selected: false,
          quantity: quantityInputValue(activity.quantity_pending),
        },
      ])
    )
  );
  const activityOptions = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.activity_name))).sort(),
    [activities]
  );
  const filteredActivities = useMemo(
    () =>
      activityFilter
        ? activities.filter((activity) => activity.activity_name === activityFilter)
        : activities,
    [activities, activityFilter]
  );
  const selectedActivities = useMemo(
    () =>
      activities
        .map((activity) => ({
          activity,
          selected: Boolean(selection[activity.id]?.selected),
          quantity: Number(selection[activity.id]?.quantity || 0),
        }))
        .filter((item) => item.selected),
    [activities, selection]
  );

  function setActivitySelected(activity: AvailableWorkActivity, selected: boolean) {
    setSelection((current) => ({
      ...current,
      [activity.id]: {
        selected,
        quantity:
          current[activity.id]?.quantity ||
          quantityInputValue(activity.quantity_pending),
      },
    }));
  }

  function setActivityQuantity(activityId: number, quantity: string) {
    setSelection((current) => ({
      ...current,
      [activityId]: {
        selected: current[activityId]?.selected || false,
        quantity,
      },
    }));
  }

  function handleContractorChange(value: string) {
    setContractorId(value);
    const contractor = contractors.find((item) => String(item.id) === value);
    if (contractor) {
      setAssignedToName(contractor.name || "");
      setAssignedToPhone(contractor.phone || "");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      alert("Captura el titulo de la orden de trabajo.");
      return;
    }

    if (selectedActivities.length === 0) {
      alert("Selecciona al menos una actividad.");
      return;
    }

    const contractorAmount = Number(contractorAmountMxn || 0);
    if (!Number.isFinite(contractorAmount) || contractorAmount < 0) {
      alert("El monto a pagar al contratista no puede ser negativo.");
      return;
    }

    for (const item of selectedActivities) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        alert("Todas las cantidades seleccionadas deben ser mayores a cero.");
        return;
      }

      if (item.quantity > item.activity.quantity_pending + 0.0001) {
        alert(`La cantidad de ${item.activity.activity_name} excede lo pendiente.`);
        return;
      }
    }

    setSaving(true);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSaving(false);
      reportError("leer usuario actual", userError);
      return;
    }

    const { data: workOrder, error: workOrderError } = await supabase
      .from("work_orders")
      .insert({
        client_project_id: projectId,
        contractor_id: contractorId ? Number(contractorId) : null,
        work_order_number: null,
        title: title.trim(),
        status: "assigned",
        assigned_to_name: assignedToName.trim() || null,
        assigned_to_phone: assignedToPhone.trim() || null,
        contractor_amount_mxn: contractorAmount,
        contractor_payment_status: "pending",
        scheduled_start: scheduledStart || null,
        scheduled_end: scheduledEnd || null,
        notes: notes.trim() || null,
        created_by_user_id: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (workOrderError || !workOrder) {
      setSaving(false);
      reportError("crear orden de trabajo", workOrderError || { message: "No se recibio orden" });
      return;
    }

    const workOrderNumber = `OT-${String(workOrder.id).padStart(4, "0")}`;
    const { error: numberError } = await supabase
      .from("work_orders")
      .update({ work_order_number: workOrderNumber })
      .eq("id", workOrder.id);

    if (numberError) {
      setSaving(false);
      reportError("asignar numero de orden", numberError);
      return;
    }

    const rows = selectedActivities.map((item) => ({
      work_order_id: workOrder.id,
      project_operational_item_labor_activity_id: item.activity.id,
      system_name: item.activity.system_name,
      product_brand: item.activity.product_brand,
      product_model: item.activity.product_model,
      product_name: item.activity.product_name,
      activity_name: item.activity.activity_name,
      quantity_assigned: item.quantity,
      quantity_completed: 0,
      status: "pending",
    }));
    const { error: activitiesError } = await supabase
      .from("work_order_activities")
      .insert(rows);

    if (activitiesError) {
      setSaving(false);
      reportError("crear actividades de orden", activitiesError);
      return;
    }

    for (const item of selectedActivities) {
      const pendingAfter = item.activity.quantity_pending - item.quantity;
      const { error: updateActivityError } = await supabase
        .from("project_operational_item_labor_activities")
        .update({
          status: pendingAfter <= 0.0001 ? "assigned" : item.activity.status || "pending",
          work_order_id: pendingAfter <= 0.0001 ? workOrder.id : null,
        })
        .eq("id", item.activity.id);

      if (updateActivityError) {
        setSaving(false);
        reportError("actualizar actividad operativa", updateActivityError);
        return;
      }
    }

    router.push(`/projects/${projectId}/work-orders/${workOrder.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Datos de la orden</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-[#B3B3B8]">Titulo</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Instalacion CCTV nivel 1"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Contratista</span>
            <select
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={contractorId}
              onChange={(event) => handleContractorChange(event.target.value)}
            >
              <option value="">Sin contratista</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name || "Contratista"}{contractor.specialty ? ` - ${contractor.specialty}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Asignado a</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={assignedToName}
              onChange={(event) => setAssignedToName(event.target.value)}
              placeholder="Responsable / contratista"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Monto contratista MXN</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={contractorAmountMxn}
              onChange={(event) => setContractorAmountMxn(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Telefono</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={assignedToPhone}
              onChange={(event) => setAssignedToPhone(event.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Fecha inicio</span>
            <input
              type="date"
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={scheduledStart}
              onChange={(event) => setScheduledStart(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Fecha fin</span>
            <input
              type="date"
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={scheduledEnd}
              onChange={(event) => setScheduledEnd(event.target.value)}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-[#B3B3B8]">Notas</span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Alcance, condiciones de acceso o indicaciones operativas."
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Actividades pendientes</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Selecciona actividades y cantidades a asignar.
            </p>
          </div>
          <select
            className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none sm:w-72"
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value)}
          >
            <option value="">Todas las actividades</option>
            {activityOptions.map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
          </select>
        </div>

        {activities.length === 0 ? (
          <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-[#F4C66A]">
            No hay actividades operativas disponibles. Sincroniza la base operativa del proyecto.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-3 py-2 font-semibold">Asignar</th>
                  <th className="px-3 py-2 font-semibold">Actividad</th>
                  <th className="px-3 py-2 font-semibold">Equipo</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 text-right font-semibold">Ya asignado</th>
                  <th className="px-3 py-2 text-right font-semibold">Pendiente</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => {
                  const row = selection[activity.id] || { selected: false, quantity: "" };

                  return (
                    <tr key={activity.id} className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F]">
                      <td className="px-3 py-2">
                        <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#2A2A30] bg-[#222228]">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={row.selected}
                            onChange={(event) => setActivitySelected(activity, event.target.checked)}
                          />
                          {row.selected ? <Check size={18} /> : null}
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold">{activity.activity_name}</p>
                        <p className="text-xs text-[#77777D]">{activity.system_name || "Sin sistema"}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold">
                          {activity.product_brand || "Sin marca"} {activity.product_model || ""}
                        </p>
                        <p className="text-xs text-[#B3B3B8]">
                          {activity.product_name || "Sin descripcion"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(activity.quantity_total)} {activity.unit}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(activity.quantity_assigned_previously)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-[#8CE0B6]">
                        {formatNumber(activity.quantity_pending)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={activity.quantity_pending}
                          disabled={!row.selected}
                          className="w-28 rounded-lg border border-[#2A2A30] bg-[#222228] px-3 py-2 text-right outline-none disabled:text-[#77777D]"
                          value={row.quantity}
                          onChange={(event) => setActivityQuantity(activity.id, event.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={saving || activities.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
      >
        <Save size={18} />
        {saving ? "Guardando..." : "Crear orden de trabajo"}
      </button>
    </form>
  );
}
