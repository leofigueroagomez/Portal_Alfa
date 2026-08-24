"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import { invoiceStatusLabels, normalizeInvoiceStatus } from "@/lib/invoices";

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

    const { error } = await supabase
      .from("project_invoices")
      .update({ status: nextStatus })
      .eq("id", invoiceId);

    setSaving(false);

    if (error) {
      setErrorMessage(`Error actualizando factura: ${error.message}`);
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
