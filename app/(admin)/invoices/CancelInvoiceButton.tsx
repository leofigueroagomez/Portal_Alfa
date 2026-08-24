"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelProjectInvoice } from "./actions";

type Props = {
  invoiceId: number;
  status: string | null | undefined;
  facturamaId: string | null | undefined;
  satUuid: string | null | undefined;
  internalFolio: string | null | undefined;
  canCancel: boolean;
};

const MOTIVE_OPTIONS: { code: "01" | "02" | "03" | "04"; label: string }[] = [
  {
    code: "02",
    label: "02 - Comprobante emitido con errores sin relacion",
  },
  {
    code: "01",
    label: "01 - Comprobante emitido con errores con relacion (requiere UUID sustituto)",
  },
  { code: "03", label: "03 - No se llevo a cabo la operacion" },
  {
    code: "04",
    label: "04 - Operacion nominativa relacionada en una factura global",
  },
];

export default function CancelInvoiceButton({
  invoiceId,
  status,
  facturamaId,
  satUuid,
  internalFolio,
  canCancel,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [motive, setMotive] = useState<"01" | "02" | "03" | "04">("02");
  const [uuidReplacement, setUuidReplacement] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isCancellable =
    ["issued", "paid"].includes(String(status)) && Boolean(facturamaId) && Boolean(satUuid);

  if (!isCancellable) return null;

  if (!canCancel) {
    return (
      <span
        title="Solo Direccion puede cancelar facturas timbradas."
        className="rounded-xl border border-[#2A2A30] bg-[#151518] px-3 py-2 text-xs text-[#77777D]"
      >
        Cancelar
      </span>
    );
  }

  async function handleCancel() {
    if (motive === "01" && !uuidReplacement.trim()) {
      setFeedback("El motivo 01 requiere el UUID del CFDI que sustituye a este.");
      return;
    }

    const confirmed = window.confirm(
      `¿Cancelar la factura ${internalFolio || `#${invoiceId}`} ante el SAT? Esta accion tiene validez fiscal y no se puede deshacer desde aqui.`
    );
    if (!confirmed) return;

    setCancelling(true);
    setFeedback(null);
    const result = await cancelProjectInvoice(
      invoiceId,
      motive,
      uuidReplacement.trim() || undefined
    );
    setCancelling(false);

    if (!result.ok) {
      setFeedback(`Error: ${result.error}`);
      return;
    }

    setFeedback(result.message);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title="Cancelar factura ante el SAT"
        className="rounded-xl border border-[#6A2A2A] bg-[#351818] px-3 py-2 text-xs font-semibold text-[#FFB4B4] hover:bg-[#4A2222]"
      >
        Cancelar
      </button>

      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg space-y-5 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FFB4B4]">
                Cancelacion de CFDI
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">
                Cancelar {internalFolio || `#${invoiceId}`}
              </h3>
              <p className="mt-2 text-sm text-[#B3B3B8]">
                Esta accion se envia directo al SAT a traves de Facturama. Si
                la factura supera cierto monto o el receptor debe aceptarla,
                puede quedar pendiente hasta 72 horas.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#B3B3B8]">
                Motivo de cancelacion (SAT)
              </label>
              <select
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={motive}
                onChange={(event) =>
                  setMotive(event.target.value as "01" | "02" | "03" | "04")
                }
              >
                {MOTIVE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {motive === "01" ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#B3B3B8]">
                  UUID del CFDI sustituto
                </label>
                <input
                  type="text"
                  value={uuidReplacement}
                  onChange={(event) => setUuidReplacement(event.target.value)}
                  placeholder="Ej. 3F3C5C1A-0000-0000-0000-000000000000"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                />
                <p className="text-[11px] text-[#77777D]">
                  El SAT lo exige cuando el motivo es 01 — es el folio fiscal
                  de la factura que reemplaza a esta.
                </p>
              </div>
            ) : null}

            {feedback ? (
              <p className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs leading-relaxed text-[#B3B3B8]">
                {feedback}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-3 text-sm font-bold text-white transition hover:bg-[#B91C3C] disabled:opacity-50"
              >
                {cancelling ? "Cancelando..." : "Confirmar cancelacion"}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 text-sm font-semibold text-[#B3B3B8] transition hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
