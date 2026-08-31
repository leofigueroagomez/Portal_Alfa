"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelPaymentComplement,
  checkPaymentComplementCancellationStatus,
} from "./paymentComplementActions";

type Props = {
  complementId: number;
  status: string | null | undefined;
  facturamaId: string | null | undefined;
  satUuid: string | null | undefined;
  partialityLabel: string;
  canCancel: boolean;
  cancellationStatus?: string | null;
  cancellationMotive?: string | null;
  hasAcuse?: boolean;
};

const MOTIVE_OPTIONS: { code: "01" | "02" | "03" | "04"; label: string }[] = [
  { code: "02", label: "02 - Comprobante emitido con errores sin relacion" },
  {
    code: "01",
    label: "01 - Con relacion (requiere UUID del complemento sustituto)",
  },
  { code: "03", label: "03 - No se llevo a cabo la operacion" },
  { code: "04", label: "04 - Operacion nominativa relacionada en factura global" },
];

export default function CancelPaymentComplementButton({
  complementId,
  status,
  facturamaId,
  satUuid,
  partialityLabel,
  canCancel,
  cancellationStatus,
  cancellationMotive,
  hasAcuse,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [motive, setMotive] = useState<"01" | "02" | "03" | "04">("02");
  const [uuidReplacement, setUuidReplacement] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isStamped =
    ["issued", "stamped"].includes(String(status)) &&
    Boolean(facturamaId) &&
    Boolean(satUuid);
  const isCancelled = String(status) === "cancelled";
  const isPending = cancellationStatus === "requested";
  const wasRejected = cancellationStatus === "rejected";

  if (!isStamped && !isCancelled) return null;

  async function handleCheckStatus() {
    setChecking(true);
    setFeedback(null);
    const result = await checkPaymentComplementCancellationStatus(complementId);
    setChecking(false);
    if (!result.ok) {
      setFeedback(`Error: ${result.error}`);
      return;
    }
    setFeedback(result.message);
    if (result.resolved) router.refresh();
  }

  async function handleCancel() {
    setCancelling(true);
    setFeedback(null);
    const result = await cancelPaymentComplement(
      complementId,
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
    <div className="flex flex-wrap items-center gap-2">
      {isCancelled ? (
        <span className="inline-flex rounded-full border border-[#6A2A2A] bg-[#351818] px-2 py-1 text-[10px] text-[#FFB4B4]">
          Complemento cancelado{cancellationMotive ? ` · motivo ${cancellationMotive}` : ""}
        </span>
      ) : null}

      {isPending ? (
        <span className="inline-flex rounded-full border border-[#614620] bg-[#322514] px-2 py-1 text-[10px] text-[#F4C66A]">
          Cancelacion pendiente ante el SAT
        </span>
      ) : null}

      {wasRejected ? (
        <span className="inline-flex rounded-full border border-[#6A2A2A] bg-[#351818] px-2 py-1 text-[10px] text-[#FFB4B4]">
          SAT rechazo la cancelacion
        </span>
      ) : null}

      {hasAcuse ? (
        <a
          href={`/api/payment-complements/${complementId}/cancellation-acuse`}
          className="text-[10px] text-[#D7A8FF] underline hover:text-white"
          title="Descargar acuse de cancelacion del SAT (XML)"
        >
          Acuse SAT
        </a>
      ) : null}

      {isStamped && canCancel ? (
        <button
          type="button"
          onClick={() => {
            setAcknowledged(false);
            setFeedback(null);
            setShowModal(true);
          }}
          className="rounded-lg border border-[#6A2A2A] bg-[#351818] px-3 py-2 text-xs font-semibold text-[#FFB4B4] hover:bg-[#4A2222]"
        >
          {wasRejected ? "Reintentar cancelacion" : "Cancelar complemento"}
        </button>
      ) : null}

      {isStamped && isPending && canCancel ? (
        <button
          type="button"
          onClick={handleCheckStatus}
          disabled={checking}
          className="rounded-lg border border-[#2A2A30] bg-[#222228] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white disabled:opacity-50"
        >
          {checking ? "Consultando..." : "Consultar estado SAT"}
        </button>
      ) : null}

      {feedback && !showModal ? (
        <p className="basis-full text-[10px] leading-relaxed text-[#B3B3B8]">
          {feedback}
        </p>
      ) : null}

      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg space-y-5 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FFB4B4]">
                Cancelacion de complemento de pago (REP)
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">
                Cancelar {partialityLabel}
              </h3>
              <p className="mt-2 text-sm text-[#B3B3B8]">
                Se envia al SAT a traves de Facturama. Al confirmarse, la factura
                PPD vuelve a quedar con complemento de pago pendiente.
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
                  UUID del complemento sustituto
                </label>
                <input
                  type="text"
                  value={uuidReplacement}
                  onChange={(event) => setUuidReplacement(event.target.value)}
                  placeholder="Ej. 3F3C5C1A-0000-0000-0000-000000000000"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                />
              </div>
            ) : null}

            {feedback ? (
              <p className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs leading-relaxed text-[#B3B3B8]">
                {feedback}
              </p>
            ) : null}

            <label className="flex items-start gap-2 text-xs text-[#B3B3B8]">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Entiendo que esto cancela el complemento ante el SAT y no se
                puede deshacer desde aqui.
              </span>
            </label>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling || !acknowledged}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#9E1B32] py-3 text-sm font-bold text-white transition hover:bg-[#B91C3C] disabled:opacity-50"
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
    </div>
  );
}
