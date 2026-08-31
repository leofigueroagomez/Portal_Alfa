"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { dismissFindingAction } from "@/app/(admin)/vigia/actions";

type Props = {
  findingId: number;
  findingTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DismissFindingModal({
  findingId,
  findingTitle,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  async function handleDismiss() {
    if (!reason || reason.trim().length < 4) {
      setError("Por favor ingresa un motivo detallado (mínimo 4 caracteres).");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await dismissFindingAction(findingId, reason);
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Ocurrió un error al descartar el hallazgo.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-full p-1.5 text-black/40 hover:bg-black/5 hover:text-black"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9E1B32]/10 text-[#9E1B32]">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111111]">Descartar Hallazgo</h3>
            <p className="text-xs text-black/50">
              Esta acción no borrará la evidencia; quedará auditada con tu motivo.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-black/5 bg-[#F7F6F3] p-3 text-xs text-black/70">
          <span className="font-semibold text-black/90">Hallazgo:</span> {findingTitle}
        </div>

        <div className="mt-4">
          <label
            htmlFor="dismiss-reason"
            className="block text-xs font-semibold uppercase tracking-wider text-black/60"
          >
            Motivo razonado del descarte *
          </label>
          <textarea
            id="dismiss-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Ej. Es una compra de refacciones fuera de catálogo acordada directamente con el cliente..."
            className="mt-2 w-full rounded-xl border border-black/15 bg-white p-3 text-sm text-[#111111] placeholder:text-black/30 focus:border-[#9E1B32] focus:outline-none focus:ring-1 focus:ring-[#9E1B32]"
          />
        </div>

        {error && (
          <p className="mt-2 text-xs font-medium text-[#9E1B32]">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-black/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full px-4 py-2 text-xs font-semibold text-black/60 hover:bg-black/5 hover:text-black"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isPending || !reason.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[#9E1B32] px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#7A1F2B] disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Confirmar Descarte
          </button>
        </div>
      </div>
    </div>
  );
}
