"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import { invoiceStatusLabels, invoiceStatuses, normalizeInvoiceStatus } from "@/lib/invoices";

type Props = {
  invoiceId: number;
  currentStatus: string | null | undefined;
};

export default function InvoiceStatusSelect({ invoiceId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(normalizeInvoiceStatus(currentStatus));
  const [saving, setSaving] = useState(false);

  async function updateStatus(nextStatus: string) {
    const normalized = normalizeInvoiceStatus(nextStatus);
    setStatus(normalized);
    setSaving(true);

    const { error } = await supabase
      .from("project_invoices")
      .update({ status: normalized, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    setSaving(false);

    if (error) {
      alert(`Error actualizando factura: ${error.message}`);
      setStatus(normalizeInvoiceStatus(currentStatus));
      return;
    }

    router.refresh();
  }

  return (
    <select
      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-sm outline-none disabled:text-[#77777D]"
      value={status}
      disabled={saving}
      onChange={(event) => updateStatus(event.target.value)}
    >
      {invoiceStatuses.map((option) => (
        <option key={option} value={option}>
          {invoiceStatusLabels[option]}
        </option>
      ))}
    </select>
  );
}
