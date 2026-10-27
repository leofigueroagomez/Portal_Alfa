"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, PackageOpen, X } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { DEFAULT_INVENTORY_LOCATION } from "@/lib/inventoryContract";
import { getMexicoDate } from "@/lib/mexicoDate";
import {
  consumeInventoryToProjectAction,
  registerPurchaseLeftoverAction,
} from "../../../inventory/actions";

const inputClass =
  "w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none";

function Modal({
  title,
  subtitle,
  onClose,
  onSubmit,
  error,
  isPending,
  submitLabel,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  error: string | null;
  isPending: boolean;
  submitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 text-left sm:items-center sm:justify-center">
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-sm text-white shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-1 text-[#B3B3B8]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">{children}</div>
        {error ? (
          <p className="mt-4 rounded-xl border border-[#7A2E1F] bg-[#3D1C14] px-4 py-3 text-[#FFB19C]">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#2A2A30] px-4 py-2.5 text-[#B3B3B8] hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#9E1B32] px-4 py-2.5 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
          >
            {isPending ? "Guardando..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

type LeftoverProps = {
  projectId: number;
  purchaseEventId: number;
  chargedQuantity: number;
  unitCostMxn: number | null;
  alreadyInWarehouse: number;
};

/** Sobrante de una compra: entra al almacen sin tocar el costo ya cargado al proyecto. */
export function LeftoverToInventoryButton({
  projectId,
  purchaseEventId,
  chargedQuantity,
  unitCostMxn,
  alreadyInWarehouse,
}: LeftoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [location, setLocation] = useState(DEFAULT_INVENTORY_LOCATION);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerPurchaseLeftoverAction({
        projectId,
        purchaseEventId,
        quantity,
        unitCostMxn: cost,
        location,
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
          setQuantity("");
          setCost(unitCostMxn != null ? String(Number(unitCostMxn.toFixed(4))) : "");
          setLocation(DEFAULT_INVENTORY_LOCATION);
          setNotes("");
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-[#2A2A30] bg-[#222228] px-2 py-1 text-[11px] font-semibold text-[#B3B3B8] hover:text-white"
      >
        <ArchiveRestore size={12} />
        Sobrante a almacén
      </button>
      {alreadyInWarehouse > 0 ? (
        <span className="text-[11px] text-[#AFCBFF]">
          {formatNumber(alreadyInWarehouse)} ya en almacén
        </span>
      ) : null}

      {open ? (
        <Modal
          title="Sobrante a almacén"
          subtitle={`Compra #${purchaseEventId}: al proyecto se cargaron ${formatNumber(
            chargedQuantity
          )}. Ese costo no cambia.`}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
          error={error}
          isPending={isPending}
          submitLabel="Dar de alta"
        >
          {alreadyInWarehouse > 0 ? (
            <p className="rounded-xl border border-[#345A9E] bg-[#172D53] px-4 py-3 text-[#AFCBFF]">
              Ya registraste {formatNumber(alreadyInWarehouse)} de esta compra en almacén.
              Revisa que no sea doble captura.
            </p>
          ) : null}
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">Cantidad sobrante</span>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              className={inputClass}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">Costo MXN por unidad</span>
            <input
              type="number"
              step="0.0001"
              min="0"
              className={inputClass}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder={unitCostMxn == null ? "La compra en USD no tiene TC" : undefined}
            />
          </label>
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">Ubicación</span>
            <input
              className={inputClass}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">Notas</span>
            <textarea
              className={`${inputClass} min-h-16`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {Number(quantity) > 0 && Number(cost) >= 0 && cost !== "" ? (
            <p className="text-[#B3B3B8]">
              Entra a almacén: {formatCurrency(Number(quantity) * Number(cost), "MXN")}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}

export type ConsumableLine = {
  id: number;
  label: string;
  pendingQuantity: number;
};

export type ConsumableStock = {
  inventory_item_id: number;
  location: string;
  quantity_available: number;
  average_cost_mxn: number;
};

type ConsumeProps = {
  projectId: number;
  lines: ConsumableLine[];
  stock: ConsumableStock[];
};

/** Consumo de almacen: salida + compra en MXN al costo promedio (costo real para Vigia). */
export function ConsumeFromInventoryButton({ projectId, lines, stock }: ConsumeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lineId, setLineId] = useState(String(lines[0]?.id || ""));
  const [itemId, setItemId] = useState(String(stock[0]?.inventory_item_id || ""));
  const [quantity, setQuantity] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getMexicoDate());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const selectedLine = lines.find((line) => String(line.id) === lineId);
  const selectedStock = stock.find((row) => String(row.inventory_item_id) === itemId);
  const totalAvailable = stock.reduce((sum, row) => sum + row.quantity_available, 0);

  function suggestedQuantity(line?: ConsumableLine, row?: ConsumableStock) {
    if (!line || !row) return "";
    return String(Math.min(line.pendingQuantity, row.quantity_available));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await consumeInventoryToProjectAction({
        projectId,
        purchaseLineId: lineId,
        inventoryItemId: itemId,
        quantity,
        purchaseDate,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.warning) {
        setWarning(result.warning);
        router.refresh();
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
          setLineId(String(lines[0]?.id || ""));
          setItemId(String(stock[0]?.inventory_item_id || ""));
          setQuantity(suggestedQuantity(lines[0], stock[0]));
          setPurchaseDate(getMexicoDate());
          setNotes("");
          setError(null);
          setWarning(null);
          setOpen(true);
        }}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#345A9E] bg-[#172D53] px-3 py-2 text-xs font-semibold text-[#AFCBFF] hover:text-white"
      >
        <PackageOpen size={14} />
        Consumir de almacén ({formatNumber(totalAvailable)})
      </button>

      {open ? (
        <Modal
          title="Consumir de almacén"
          subtitle="Se registra como compra en MXN al costo promedio del almacén."
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
          error={error}
          isPending={isPending}
          submitLabel="Consumir"
        >
          {warning ? (
            <p className="rounded-xl border border-[#614620] bg-[#322514] px-4 py-3 text-[#F4C66A]">
              {warning}
            </p>
          ) : null}
          {lines.length > 1 ? (
            <label className="space-y-2">
              <span className="text-[#B3B3B8]">Partida</span>
              <select
                className={inputClass}
                value={lineId}
                onChange={(event) => {
                  setLineId(event.target.value);
                  setQuantity(
                    suggestedQuantity(
                      lines.find((line) => String(line.id) === event.target.value),
                      selectedStock
                    )
                  );
                }}
              >
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.label} · pendiente {formatNumber(line.pendingQuantity)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">Ubicación</span>
            <select
              className={inputClass}
              value={itemId}
              onChange={(event) => {
                setItemId(event.target.value);
                setQuantity(
                  suggestedQuantity(
                    selectedLine,
                    stock.find((row) => String(row.inventory_item_id) === event.target.value)
                  )
                );
              }}
            >
              {stock.map((row) => (
                <option key={row.inventory_item_id} value={row.inventory_item_id}>
                  {row.location} · {formatNumber(row.quantity_available)} a{" "}
                  {formatCurrency(row.average_cost_mxn, "MXN")}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">
              Cantidad (pendiente {formatNumber(selectedLine?.pendingQuantity || 0)})
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">Fecha</span>
            <input
              type="date"
              className={inputClass}
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-[#B3B3B8]">Notas</span>
            <textarea
              className={`${inputClass} min-h-16`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {selectedStock && Number(quantity) > 0 ? (
            <p className="text-[#B3B3B8]">
              Costo al proyecto:{" "}
              {formatCurrency(
                Number(quantity) * Math.round(selectedStock.average_cost_mxn * 100) / 100,
                "MXN"
              )}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
