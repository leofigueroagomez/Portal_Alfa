"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Pencil, Plus, Truck, X } from "lucide-react";
import { supabase } from "@/services/supabase";

export type PurchaseLineAction = {
  id: number;
  supplier: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  quantity_required: number;
  quantity_purchased: number;
  cost_currency: string;
  unit_cost: number;
  total_required_cost: number;
  total_purchased_cost: number;
  total_pending_cost: number;
  exchange_rate: number | null;
  child_lines?: PurchaseLineAllocation[];
};

export type PurchaseEventAction = {
  id: number;
  project_purchase_line_id: number;
  purchase_date?: string | null;
  quantity?: number | null;
  unit_cost?: number | null;
  cost_currency?: string | null;
  exchange_rate?: number | null;
  supplier?: string | null;
  invoice_reference?: string | null;
  warehouse_status: string | null;
  notes?: string | null;
};

type PurchaseLineAllocation = {
  id: number;
  supplier: string | null;
  quantity_required: number;
  quantity_purchased: number;
  unit_cost: number;
  total_required_cost: number;
  total_purchased_cost: number;
};

type Props = {
  lines: PurchaseLineAction[];
  events: PurchaseEventAction[];
  triggerLineId?: number;
  triggerLabel?: string;
};

type Currency = "USD" | "MXN";

function today() {
  return new Date().toISOString().slice(0, 10);
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

function getStatus(quantityPurchased: number, quantityRequired: number) {
  if (quantityPurchased <= 0) return "pending";
  if (quantityPurchased >= quantityRequired) return "purchased";
  return "partial";
}

function getEstimatedUnitCost(line: PurchaseLineAllocation | PurchaseLineAction) {
  return Number(line.quantity_required || 0) > 0
    ? Number(line.total_required_cost || 0) / Number(line.quantity_required || 0)
    : Number(line.unit_cost || 0);
}

export default function ProjectPurchaseActions({
  lines,
  events,
  triggerLineId,
  triggerLabel = "Registrar compra",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState(
    lines[0]?.id ? String(lines[0].id) : ""
  );
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [costCurrency, setCostCurrency] = useState<Currency>("USD");
  const [exchangeRate, setExchangeRate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [notes, setNotes] = useState("");

  const selectedLine = lines.find((line) => String(line.id) === selectedLineId);

  function openForLine(line: PurchaseLineAction) {
    setSelectedLineId(String(line.id));
    setQuantity(
      Math.max(Number(line.quantity_required || 0) - Number(line.quantity_purchased || 0), 0)
        .toFixed(2)
        .replace(/\.00$/, "")
    );
    setUnitCost(String(Number(line.unit_cost || 0)));
    setCostCurrency((line.cost_currency || "USD").toUpperCase() as Currency);
    setExchangeRate(line.exchange_rate ? String(Number(line.exchange_rate).toFixed(4)) : "");
    setSupplier(line.supplier || "");
    setPurchaseDate(today());
    setInvoiceReference("");
    setNotes("");
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLine) {
      alert("Selecciona una linea de compra.");
      return;
    }

    const numericQuantity = Number(quantity);
    const numericUnitCost = Number(unitCost);
    const numericExchangeRate = costCurrency === "USD" ? Number(exchangeRate) : null;

    if (!purchaseDate) {
      alert("Selecciona la fecha de compra.");
      return;
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      alert("Captura una cantidad valida.");
      return;
    }

    if (!Number.isFinite(numericUnitCost) || numericUnitCost < 0) {
      alert("Captura un costo unitario valido.");
      return;
    }

    if (costCurrency === "USD" && (!numericExchangeRate || numericExchangeRate <= 0)) {
      alert("Captura el tipo de cambio para compras en USD.");
      return;
    }

    const targetLines =
      selectedLine.child_lines && selectedLine.child_lines.length > 0
        ? selectedLine.child_lines
        : [
            {
              id: selectedLine.id,
              supplier: selectedLine.supplier,
              quantity_required: selectedLine.quantity_required,
              quantity_purchased: selectedLine.quantity_purchased,
              unit_cost: selectedLine.unit_cost,
              total_required_cost: selectedLine.total_required_cost,
              total_purchased_cost: selectedLine.total_purchased_cost,
            },
          ];
    const totalPendingQuantity = targetLines.reduce(
      (sum, line) =>
        sum +
        Math.max(Number(line.quantity_required || 0) - Number(line.quantity_purchased || 0), 0),
      0
    );

    if (numericQuantity > totalPendingQuantity + 0.0001) {
      alert("La cantidad capturada excede la cantidad pendiente del grupo.");
      return;
    }

    let remainingQuantity = numericQuantity;
    const allocations = targetLines
      .map((line, index) => {
        const pendingQuantity = Math.max(
          Number(line.quantity_required || 0) - Number(line.quantity_purchased || 0),
          0
        );
        const isLast = index === targetLines.length - 1;
        const allocatedQuantity = Math.min(
          remainingQuantity,
          isLast ? remainingQuantity : pendingQuantity
        );
        remainingQuantity -= allocatedQuantity;

        return {
          line,
          quantity: allocatedQuantity,
        };
      })
      .filter((allocation) => allocation.quantity > 0);

    setSaving(true);

    const eventRows = allocations.map((allocation) => ({
      project_purchase_line_id: allocation.line.id,
      purchase_date: purchaseDate,
      quantity: allocation.quantity,
      unit_cost: numericUnitCost,
      cost_currency: costCurrency,
      exchange_rate: numericExchangeRate,
      supplier: supplier.trim() || selectedLine.supplier || allocation.line.supplier || null,
      invoice_reference: invoiceReference.trim() || null,
      warehouse_status: "pending",
      notes: notes.trim() || null,
    }));

    const { error: eventError } = await supabase
      .from("project_purchase_events")
      .insert(eventRows);

    if (eventError) {
      setSaving(false);
      reportError("registrar compra", eventError);
      return;
    }

    for (const allocation of allocations) {
      const targetLine = allocation.line;
      const estimatedUnitCost = getEstimatedUnitCost(targetLine);
      const nextQuantityPurchased =
        Number(targetLine.quantity_purchased || 0) + allocation.quantity;
      const nextPurchasedCost =
        Number(targetLine.total_purchased_cost || 0) +
        allocation.quantity * numericUnitCost;
      const estimatedPurchasedCost = nextQuantityPurchased * estimatedUnitCost;
      const nextPendingCost = Math.max(
        Number(targetLine.total_required_cost || 0) - estimatedPurchasedCost,
        0
      );

      const { error: lineError } = await supabase
        .from("project_purchase_lines")
        .update({
          supplier: supplier.trim() || selectedLine.supplier || targetLine.supplier || null,
          quantity_purchased: nextQuantityPurchased,
          total_purchased_cost: nextPurchasedCost,
          total_pending_cost: nextPendingCost,
          purchase_status: getStatus(
            nextQuantityPurchased,
            Number(targetLine.quantity_required || 0)
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetLine.id);

      if (lineError) {
        setSaving(false);
        reportError("actualizar linea de compra", lineError);
        return;
      }
    }

    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const targetLine = triggerLineId
            ? lines.find((line) => line.id === triggerLineId)
            : lines[0];
          if (targetLine) openForLine(targetLine);
        }}
        disabled={lines.length === 0}
        className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-4 py-2.5 text-sm font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
      >
        <Plus size={18} />
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Registrar compra</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  {/* TODO: Limitar edicion a admin/pm cuando se formalicen roles. */}
                  Compra interna de equipo por proyecto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Equipo</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={selectedLineId}
                  onChange={(event) => {
                    const nextLine = lines.find((line) => String(line.id) === event.target.value);
                    if (nextLine) openForLine(nextLine);
                  }}
                >
                  {lines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.supplier || "Sin proveedor"} - {line.product_brand || "Sin marca"}{" "}
                      {line.product_model || ""} / {line.product_name || "Sin descripcion"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Fecha</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={purchaseDate}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Cantidad comprada</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Costo unitario real</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Moneda</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={costCurrency}
                  onChange={(event) => setCostCurrency(event.target.value as Currency)}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Tipo de cambio</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  disabled={costCurrency === "MXN"}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={exchangeRate}
                  onChange={(event) => setExchangeRate(event.target.value)}
                  placeholder="Requerido si es USD"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Proveedor</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={supplier}
                  onChange={(event) => setSupplier(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Factura / orden</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={invoiceReference}
                  onChange={(event) => setInvoiceReference(event.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Notas</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {saving ? "Guardando..." : "Guardar compra"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {events.length > 0 ? null : null}
    </>
  );
}

export function EditPurchaseEventAction({
  projectId,
  event,
  line,
}: {
  projectId: number;
  event: PurchaseEventAction;
  line: PurchaseLineAction;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(event.purchase_date || today());
  const [quantity, setQuantity] = useState(String(Number(event.quantity || 0)));
  const [unitCost, setUnitCost] = useState(String(Number(event.unit_cost || 0)));
  const [costCurrency, setCostCurrency] = useState<Currency>(
    ((event.cost_currency || line.cost_currency || "USD").toUpperCase() === "MXN"
      ? "MXN"
      : "USD") as Currency
  );
  const [exchangeRate, setExchangeRate] = useState(
    event.exchange_rate ? String(Number(event.exchange_rate).toFixed(4)) : ""
  );
  const [supplier, setSupplier] = useState(event.supplier || line.supplier || "");
  const [invoiceReference, setInvoiceReference] = useState(event.invoice_reference || "");
  const [notes, setNotes] = useState(event.notes || "");

  async function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    const numericQuantity = Number(quantity);
    const numericUnitCost = Number(unitCost);
    const numericExchangeRate = costCurrency === "USD" ? Number(exchangeRate) : null;

    if (!purchaseDate) {
      alert("Selecciona la fecha de compra.");
      return;
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      alert("Captura una cantidad valida.");
      return;
    }

    if (!Number.isFinite(numericUnitCost) || numericUnitCost < 0) {
      alert("Captura un costo unitario valido.");
      return;
    }

    if (costCurrency === "USD" && (!numericExchangeRate || numericExchangeRate <= 0)) {
      alert("Captura el tipo de cambio para compras en USD.");
      return;
    }

    setSaving(true);

    const response = await fetch(
      `/api/projects/${projectId}/purchases/events/${event.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        purchase_date: purchaseDate,
        quantity: numericQuantity,
        unit_cost: numericUnitCost,
        cost_currency: costCurrency,
        exchange_rate: numericExchangeRate,
        supplier: supplier.trim() || line.supplier || null,
        invoice_reference: invoiceReference.trim() || null,
        notes: notes.trim() || null,
        }),
      }
    );
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      setSaving(false);
      reportError(
        "editar compra",
        new Error(responseBody?.error || "No se pudo editar la compra.")
      );
      return;
    }

    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs text-[#B3B3B8] hover:text-white"
      >
        <Pencil size={14} />
        Editar
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Editar compra</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Correccion administrativa de costo, cantidad y referencia.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-[#2A2A30] bg-[#101114] p-4 text-sm text-[#B3B3B8]">
              <p className="font-semibold text-white">
                {line.product_brand || "Sin marca"} {line.product_model || ""}
              </p>
              <p>{line.product_name || "Sin descripcion"}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Fecha</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={purchaseDate}
                  onChange={(inputEvent) => setPurchaseDate(inputEvent.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Cantidad comprada</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={quantity}
                  onChange={(inputEvent) => setQuantity(inputEvent.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Costo unitario real</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={unitCost}
                  onChange={(inputEvent) => setUnitCost(inputEvent.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Moneda</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={costCurrency}
                  onChange={(inputEvent) => setCostCurrency(inputEvent.target.value as Currency)}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Tipo de cambio</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  disabled={costCurrency === "MXN"}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                  value={exchangeRate}
                  onChange={(inputEvent) => setExchangeRate(inputEvent.target.value)}
                  placeholder="Requerido si es USD"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Proveedor</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={supplier}
                  onChange={(inputEvent) => setSupplier(inputEvent.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Factura / orden</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={invoiceReference}
                  onChange={(inputEvent) => setInvoiceReference(inputEvent.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Notas</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={notes}
                  onChange={(inputEvent) => setNotes(inputEvent.target.value)}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function WarehouseEventActions({
  eventId,
  lineId,
  currentStatus,
}: {
  eventId: number;
  lineId: number;
  currentStatus: string | null;
}) {
  const router = useRouter();

  async function updateWarehouseStatus(warehouseStatus: "received" | "delivered_to_site") {
    const { error } = await supabase
      .from("project_purchase_events")
      .update({ warehouse_status: warehouseStatus })
      .eq("id", eventId);

    if (error) {
      reportError("actualizar estado de bodega", error);
      return;
    }

    if (warehouseStatus === "delivered_to_site") {
      await supabase
        .from("project_purchase_lines")
        .update({
          purchase_status: "in_warehouse",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lineId);
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => updateWarehouseStatus("received")}
        disabled={currentStatus === "received" || currentStatus === "delivered_to_site"}
        className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs text-[#B3B3B8] hover:text-white disabled:text-[#77777D]"
      >
        <PackageCheck size={14} />
        Recibido
      </button>
      <button
        type="button"
        onClick={() => updateWarehouseStatus("delivered_to_site")}
        disabled={currentStatus === "delivered_to_site"}
        className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs text-[#B3B3B8] hover:text-white disabled:text-[#77777D]"
      >
        <Truck size={14} />
        Entregado a obra
      </button>
    </div>
  );
}
