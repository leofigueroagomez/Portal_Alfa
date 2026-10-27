"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invoiceStatusLabels, normalizeInvoiceStatus } from "@/lib/invoices";
import { updateInvoiceStatusAction } from "./invoiceStatusActions";

type Props = {
  invoiceId: number;
  currentStatus: string | null | undefined;
};

const TOGGLEABLE_STATUSES = ["issued", "paid"] as const;

export default function InvoiceStatusSelect({ invoiceId, currentStatus }: Props) {
  const router = useRouter();
  const normalizedCurrent = normalizeInvoiceStatus(currentStatus);
  const [status, setStatus] = useState(normalizedCurrent);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (normalizedCurrent !== "issued" && normalizedCurrent !== "paid") {
    return (
      <span className="text-sm text-[#77777D]">
        {invoiceStatusLabels[normalizedCurrent]}
      </span>
    );
  }

  async function updateStatus(nextStatus: string) {
    if (nextStatus !== "issued" && nextStatus !== "paid") return;

    setStatus(nextStatus);
    setSaving(true);
    setErrorMessage(null);

    // Permisos y estados permitidos se validan en el servidor.
    const result = await updateInvoiceStatusAction(invoiceId, nextStatus).catch(() => ({
      ok: false as const,
      error: "No se pudo actualizar la factura.",
    }));

    setSaving(false);

    if (!result.ok) {
      setErrorMessage(`Error actualizando factura: ${result.error}`);
      setStatus(normalizedCurrent);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <select
        className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-sm outline-none disabled:text-[#77777D]"
        value={status}
        disabled={saving}
        onChange={(event) => updateStatus(event.target.value)}
      >
        {TOGGLEABLE_STATUSES.map((option) => (
          <option key={option} value={option}>
            {invoiceStatusLabels[option]}
          </option>
        ))}
      </select>
      {errorMessage ? (
        <p className="text-xs leading-5 text-[#FFB4B4]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
