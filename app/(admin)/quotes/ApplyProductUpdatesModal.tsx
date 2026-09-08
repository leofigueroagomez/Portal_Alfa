"use client";

import { useState } from "react";
import type {
  PendingProductUpdate,
  UpdatableProduct,
} from "@/lib/quoteProductUpdates";

type Props<P extends UpdatableProduct> = {
  open: boolean;
  updates: PendingProductUpdate<P>[];
  onClose: () => void;
  onApply: (productIds: number[]) => void;
};

export default function ApplyProductUpdatesModal<P extends UpdatableProduct>({
  open,
  updates,
  onClose,
  onApply,
}: Props<P>) {
  // null = todos seleccionados (estado inicial, sin efectos)
  const [selectedIds, setSelectedIds] = useState<number[] | null>(null);

  if (!open) return null;

  const allIds = updates.map((update) => update.product.id);
  const currentIds = selectedIds === null ? allIds : selectedIds;

  function isSelected(productId: number) {
    return currentIds.includes(productId);
  }

  function toggle(productId: number) {
    setSelectedIds(
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId]
    );
  }

  function handleClose() {
    setSelectedIds(null);
    onClose();
  }

  function handleApply() {
    if (currentIds.length === 0) return;

    onApply(currentIds);
    setSelectedIds(null);
  }

  const affectedItems = updates
    .filter((update) => isSelected(update.product.id))
    .reduce((sum, update) => sum + update.itemCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-6">
      <div className="max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Actualizar precios</h3>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Editaste estos productos en el catálogo. Elige cuáles aplicar a
              las partidas de esta cotización.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#B3B3B8] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {updates.map((update) => (
            <label
              key={update.product.id}
              className="flex cursor-pointer gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
            >
              <input
                type="checkbox"
                className="mt-1 self-start"
                checked={isSelected(update.product.id)}
                onChange={() => toggle(update.product.id)}
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {update.product.brand} {update.product.model}
                </p>
                <p className="mt-1 text-xs text-[#77777D]">
                  {update.itemCount === 1
                    ? "1 partida"
                    : `${update.itemCount} partidas`}
                </p>

                <div className="mt-3 space-y-1">
                  {update.changes.map((change) => (
                    <div
                      key={change.label}
                      className="flex flex-wrap gap-x-2 text-xs"
                    >
                      <span className="text-[#77777D]">{change.label}</span>
                      <span className="text-[#B3B3B8] line-through">
                        {change.from}
                      </span>
                      <span className="text-[#F4C66A]">→ {change.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            </label>
          ))}
        </div>

        <p className="mt-5 text-xs text-[#77777D]">
          No cambia cantidad, área, distribución por áreas, actividades de mano
          de obra ni notas.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl bg-[#222228] py-3 font-semibold hover:bg-[#2A2A30]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={currentIds.length === 0}
            className="flex-1 rounded-xl bg-[#9E1B32] py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
          >
            {affectedItems === 1
              ? "Aplicar a 1 partida"
              : `Aplicar a ${affectedItems} partidas`}
          </button>
        </div>
      </div>
    </div>
  );
}
