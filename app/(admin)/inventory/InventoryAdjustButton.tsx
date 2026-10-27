"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { adjustInventoryAction } from "./actions";

type Props = {
  inventoryItemId: number;
  productLabel: string;
  location: string;
  quantityAvailable: number;
  averageCostMxn: number;
  unitName: string | null;
};

const inputClass =
  "w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none";

export default function InventoryAdjustButton({
  inventoryItemId,
  productLabel,
  location,
  quantityAvailable,
  averageCostMxn,
  unitName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [countedQuantity, setCountedQuantity] = useState("");
  const [unitCostMxn, setUnitCostMxn] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const counted = Number(countedQuantity);
  const delta =
    countedQuantity.trim() !== "" && Number.isFinite(counted)
      ? Math.round((counted - quantityAvailable) * 100) / 100
      : 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (delta === 0) {
      setError("La cantidad contada es igual a la existencia; no hay nada que ajustar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adjustInventoryAction({
        inventoryItemId,
        quantityDelta: delta,
        unitCostMxn,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCountedQuantity(String(quantityAvailable));
          setUnitCostMxn("");
          setNotes("");
          setError(null);
          setOpen(true);
        }}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-sm font-semibold text-[#E5E5EA] hover:text-white"
      >
        <SlidersHorizontal size={16} />
        Ajustar
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Ajuste de inventario</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  {productLabel} · {location}
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

            <p className="mb-4 text-sm text-[#B3B3B8]">
              Existencia en sistema: {formatNumber(quantityAvailable)} {unitName || ""} a{" "}
              {formatCurrency(averageCostMxn, "MXN")} promedio.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Cantidad contada físicamente</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={countedQuantity}
                  onChange={(event) => setCountedQuantity(event.target.value)}
                />
              </label>

              {delta !== 0 ? (
                <p className={`text-sm ${delta > 0 ? "text-[#8CE0B6]" : "text-[#FFB19C]"}`}>
                  Ajuste de {delta > 0 ? "+" : ""}
                  {formatNumber(delta)} {unitName || ""} (
                  {formatCurrency(Math.abs(delta) * averageCostMxn, "MXN")} al promedio).
                </p>
              ) : null}

              {delta > 0 ? (
                <label className="space-y-2">
                  <span className="text-sm text-[#B3B3B8]">
                    Costo MXN por unidad (vacío = promedio actual)
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    className={inputClass}
                    value={unitCostMxn}
                    onChange={(event) => setUnitCostMxn(event.target.value)}
                  />
                </label>
              ) : null}

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Motivo (obligatorio)</span>
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Conteo físico, merma, material dañado..."
                />
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-[#7A2E1F] bg-[#3D1C14] px-4 py-3 text-sm text-[#FFB19C]">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] px-4 py-2.5 text-sm text-[#B3B3B8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#9E1B32] px-4 py-2.5 text-sm font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {isPending ? "Guardando..." : "Registrar ajuste"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
