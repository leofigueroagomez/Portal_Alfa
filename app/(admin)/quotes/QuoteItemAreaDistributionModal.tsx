"use client";

import { formatNumber } from "@/lib/format";
import {
  CLIENT_EXISTING_SUPPLY_TYPE,
  NEW_EQUIPMENT_SUPPLY_TYPE,
  doQuoteItemAllocationsMatchQuantity,
  getQuoteItemAllocationQuantityTotal,
  normalizeQuoteItemArea,
  type QuoteItemAreaAllocation,
  type QuoteItemSupplyType,
} from "@/lib/quoteItemPresentation";

type DistributionItem = {
  id: number;
  quantity: number;
  allocations: QuoteItemAreaAllocation[];
  existing_customer_equipment?: boolean | null;
};

type Props = {
  item: DistributionItem;
  areaSuggestions: string[];
  disabled?: boolean;
  isOpen: boolean;
  equipmentSubtotalText: string;
  laborSubtotalText: string;
  onOpen: () => void;
  onClose: () => void;
  onAdd: () => void;
  onUpdate: (
    allocationId: string | number | null | undefined,
    field: "area" | "quantity" | "supply_type" | "customer_visible_note",
    value: string | number
  ) => void;
  onRemove: (allocationId: string | number | null | undefined) => void;
};

function getDistributionSummary(item: DistributionItem) {
  if (!item.allocations.length) {
    return {
      newQuantity: item.existing_customer_equipment ? 0 : item.quantity,
      reusedQuantity: item.existing_customer_equipment ? item.quantity : 0,
      distributedQuantity: 0,
      areas: [],
    };
  }

  const areas = Array.from(
    new Set(
      item.allocations
        .map((allocation) => normalizeQuoteItemArea(allocation.area))
        .filter(Boolean)
    )
  );

  return {
    newQuantity: item.allocations.reduce(
      (sum, allocation) =>
        allocation.supply_type === CLIENT_EXISTING_SUPPLY_TYPE
          ? sum
          : sum + Number(allocation.quantity || 0),
      0
    ),
    reusedQuantity: item.allocations.reduce(
      (sum, allocation) =>
        allocation.supply_type === CLIENT_EXISTING_SUPPLY_TYPE
          ? sum + Number(allocation.quantity || 0)
          : sum,
      0
    ),
    distributedQuantity: getQuoteItemAllocationQuantityTotal(item.allocations),
    areas,
  };
}

export default function QuoteItemAreaDistributionModal({
  item,
  areaSuggestions,
  disabled = false,
  isOpen,
  equipmentSubtotalText,
  laborSubtotalText,
  onOpen,
  onClose,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const summary = getDistributionSummary(item);
  const isValid = doQuoteItemAllocationsMatchQuantity(
    item.quantity,
    item.allocations
  );

  return (
    <>
      <div className="mt-3 rounded-xl border border-[#2A2A30] bg-[#151518] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
            <div>
              <p className="text-xs text-[#77777D]">Cantidad total</p>
              <p className="font-semibold">{formatNumber(item.quantity)}</p>
            </div>
            <div>
              <p className="text-xs text-[#77777D]">Nueva</p>
              <p className="font-semibold">{formatNumber(summary.newQuantity)}</p>
            </div>
            <div>
              <p className="text-xs text-[#77777D]">Reutilizada</p>
              <p className="font-semibold">
                {formatNumber(summary.reusedQuantity)}
              </p>
            </div>
            <div className="md:col-span-2 xl:col-span-1">
              <p className="text-xs text-[#77777D]">Areas</p>
              <p className="truncate font-semibold">
                {summary.areas.length ? summary.areas.join(", ") : "Modo simple"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#77777D]">Equipo</p>
              <p className="font-semibold">{equipmentSubtotalText}</p>
            </div>
            <div>
              <p className="text-xs text-[#77777D]">Mano de obra</p>
              <p className="font-semibold">{laborSubtotalText}</p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onOpen}
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Distribuir por areas
          </button>
        </div>

        {item.allocations.length > 0 ? (
          <p
            className={`mt-3 text-sm ${
              isValid ? "text-[#8CE0B6]" : "text-[#F28B82]"
            }`}
          >
            Distribuido: {formatNumber(summary.distributedQuantity)} /{" "}
            {formatNumber(item.quantity)}
          </p>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 shadow-2xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  Distribucion por area
                </h3>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Define cuantas unidades son nuevas y cuantas reutiliza el cliente.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-sm font-semibold text-[#B3B3B8] hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={`text-sm ${
                  isValid ? "text-[#8CE0B6]" : "text-[#F28B82]"
                }`}
              >
                Distribuido: {formatNumber(summary.distributedQuantity)} /{" "}
                {formatNumber(item.quantity)}
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={onAdd}
                className="rounded-xl bg-[#9E1B32] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#2A2A30] disabled:text-[#77777D]"
              >
                Agregar distribucion
              </button>
            </div>

            <div className="space-y-3">
              {item.allocations.length === 0 ? (
                <p className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-sm text-[#B3B3B8]">
                  Sin distribucion avanzada. Se usara el modo simple de la partida.
                </p>
              ) : null}

              {item.allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="grid gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-3 md:grid-cols-[minmax(0,1fr)_110px_190px_minmax(0,1fr)_44px]"
                >
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77777D]">
                      Area / zona
                    </label>
                    <input
                      type="text"
                      list={`quote-allocation-areas-${item.id}`}
                      value={allocation.area || ""}
                      disabled={disabled}
                      onChange={(event) =>
                        onUpdate(allocation.id, "area", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none focus:border-[#9E1B32] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77777D]">
                      Cant.
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={allocation.quantity}
                      disabled={disabled}
                      onChange={(event) =>
                        onUpdate(allocation.id, "quantity", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none focus:border-[#9E1B32] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77777D]">
                      Suministro
                    </label>
                    <select
                      value={allocation.supply_type || NEW_EQUIPMENT_SUPPLY_TYPE}
                      disabled={disabled}
                      onChange={(event) =>
                        onUpdate(
                          allocation.id,
                          "supply_type",
                          event.target.value as QuoteItemSupplyType
                        )
                      }
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none focus:border-[#9E1B32] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <option value={NEW_EQUIPMENT_SUPPLY_TYPE}>Equipo nuevo</option>
                      <option value={CLIENT_EXISTING_SUPPLY_TYPE}>
                        Equipo existente del cliente
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77777D]">
                      Nota visible
                    </label>
                    <input
                      type="text"
                      value={allocation.customer_visible_note || ""}
                      disabled={disabled}
                      onChange={(event) =>
                        onUpdate(
                          allocation.id,
                          "customer_visible_note",
                          event.target.value
                        )
                      }
                      placeholder="Reutilizaremos el que tiene el cliente actualmente"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none focus:border-[#9E1B32] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(allocation.id)}
                    className="mt-5 h-10 rounded-xl bg-[#151518] text-[#B3B3B8] hover:bg-[#2A2A30] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <datalist id={`quote-allocation-areas-${item.id}`}>
              {areaSuggestions.map((area) => (
                <option key={area} value={area} />
              ))}
            </datalist>
          </div>
        </div>
      ) : null}
    </>
  );
}
