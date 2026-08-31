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
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isStamped =
    ["issued", "paid"].includes(String(status)) &&
    Boolean(facturamaId) &&
    Boolean(satUuid);

  if (!isStamped || !canReplace || hasLiveReplacement) return null;

  async function handleReplace() {
    const confirmed = window.confirm(
      `Se creara un borrador nuevo copiado de ${internalFolio || `#${invoiceId}`}, ligado como sustituto (relacion SAT 04). Al timbrarlo podras cancelar la original con motivo 01. ¿Continuar?`
    );
    if (!confirmed) return;

    setWorking(true);
    setFeedback(null);
    const result = await createReplacementInvoiceDraft(invoiceId);
    setWorking(false);

    if (!result.ok) {
      setFeedback(`Error: ${result.error}`);
      return;
    }

    setFeedback(
      `Borrador de reemplazo creado (#${result.invoiceId}). Revisa datos fiscales y uso de CFDI, timbralo y luego cancela esta con motivo 01.`
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleReplace}
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
    </div>
  );
}
