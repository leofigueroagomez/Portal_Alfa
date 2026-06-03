"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { sendProjectDeliveryEmail } from "./actions";

type Props = {
  projectId: number;
  deliveryId: number;
  recipient: string;
  pendingBalanceMxn: number;
  deliveryLink: string;
  warrantyLink: string | null;
  alreadySentAt?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

export default function SendDeliveryEmailButton({
  projectId,
  deliveryId,
  recipient,
  pendingBalanceMxn,
  deliveryLink,
  warrantyLink,
  alreadySentAt,
  lastStatus,
  lastError,
}: Props) {
  const [message, setMessage] = useState(lastError || "");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!recipient) {
      setMessage("El cliente no tiene correo de facturacion ni correo principal.");
      return;
    }

    const confirmation = [
      "Enviar correo de entrega y garantia?",
      "",
      `Destinatario: ${recipient}`,
      `Saldo pendiente: ${formatCurrency(pendingBalanceMxn)}`,
      `Acta: ${deliveryLink}`,
      `Garantia: ${warrantyLink || "Sin carta de garantia generada"}`,
    ].join("\n");

    if (!window.confirm(confirmation)) return;

    setMessage("");
    startTransition(async () => {
      const result = await sendProjectDeliveryEmail(projectId, deliveryId);
      setMessage(result.message);
    });
  }

  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Correo de entrega y garantia</h2>
          <p className="mt-2 text-sm text-[#B3B3B8]">
            Destinatario: {recipient || "Sin correo disponible"}
          </p>
          <p className="mt-1 text-sm text-[#B3B3B8]">
            Saldo pendiente: {formatCurrency(pendingBalanceMxn)}
          </p>
          <p className="mt-1 text-xs text-[#77777D]">
            Links incluidos: acta de entrega{warrantyLink ? " y carta de garantia" : ""}.
          </p>
          {alreadySentAt ? (
            <p className="mt-2 text-xs text-[#8CE0B6]">
              Ultimo envio: {new Date(alreadySentAt).toLocaleString("es-MX")}
            </p>
          ) : null}
          {lastStatus === "error" || message ? (
            <p className={`mt-2 text-sm ${lastStatus === "error" ? "text-[#FFB4B4]" : "text-[#B3B3B8]"}`}>
              {message}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !recipient}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Mail size={18} />
          {isPending
            ? "Enviando..."
            : alreadySentAt
              ? "Reenviar correo"
              : "Enviar correo de entrega y garantia"}
        </button>
      </div>
    </div>
  );
}
