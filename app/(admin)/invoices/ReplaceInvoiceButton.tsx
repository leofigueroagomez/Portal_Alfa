"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReplacementInvoiceDraft } from "./actions";

type Props = {
  invoiceId: number;
  status: string | null | undefined;
  facturamaId: string | null | undefined;
  satUuid: string | null | undefined;
  internalFolio: string | null | undefined;
  /** Si ya existe un borrador/factura de reemplazo vivo, no ofrecemos crear otro. */
  hasLiveReplacement?: boolean;
  canReplace: boolean;
};

export default function ReplaceInvoiceButton({
  invoiceId,
  status,
  facturamaId,
  satUuid,
  internalFolio,
  hasLiveReplacement,
  canReplace,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isStamped =
    ["issued", "paid"].includes(String(status)) &&
    Boolean(facturamaId) &&
    Boolean(satUuid);

  if (!isStamped || !canReplace || hasLiveReplacement) return null;

  async function handleReplace() {
    setWorking(true);
    setFeedback(null);
    const result = await createReplacementInvoiceDraft(invoiceId);
    setWorking(false);

    if (!result.ok) {
      setFeedback(`Error: ${result.error}`);
      return;
    }

    setShowModal(false);
    setFeedback(
      `Borrador de reemplazo creado (#${result.invoiceId}). Revisalo, timbralo y luego cancela esta con motivo 01.`
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => {
          setFeedback(null);
          setShowModal(true);
        }}
        disabled={working}
        title="Crear una factura de reemplazo (sustitucion, relacion SAT 04)"
        className="rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white disabled:opacity-50"
      >
        {working ? "Creando..." : "Corregir y reemplazar"}
      </button>

      {feedback ? (
        <p className="max-w-[220px] text-[10px] leading-relaxed text-[#B3B3B8]">
          {feedback}
        </p>
      ) : null}

      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md space-y-5 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B3B3B8]">
                Sustitucion de CFDI
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">
                Corregir y reemplazar {internalFolio || `#${invoiceId}`}
              </h3>
              <p className="mt-2 text-sm text-[#B3B3B8]">
                Se crea un <strong className="text-white">borrador nuevo</strong>{" "}
                copiado de esta factura (mismos importes y conceptos), ligado
                como sustituto con relacion SAT 04. Ajusta datos fiscales y uso
                de CFDI en el borrador, timbralo, y despues cancela esta factura
                con motivo 01.
              </p>
              <p className="mt-2 text-xs text-[#77777D]">
                No cancela nada por si solo. No cambia esta factura.
              </p>
            </div>

            {feedback ? (
              <p className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs leading-relaxed text-[#B3B3B8]">
                {feedback}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={handleReplace}
                disabled={working}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#9E1B32] py-3 text-sm font-bold text-white transition hover:bg-[#B91C3C] disabled:opacity-50"
              >
                {working ? "Creando..." : "Crear borrador de reemplazo"}
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
