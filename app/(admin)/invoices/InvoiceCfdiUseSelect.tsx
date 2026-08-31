"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setInvoiceCfdiUse } from "./actions";

type Props = {
  invoiceId: number;
  status: string | null | undefined;
  /** Uso de CFDI capturado en la factura (project_invoices.cfdi_use). */
  invoiceCfdiUse: string | null | undefined;
  /** Uso de CFDI que se hereda del cliente si la factura no tiene uno propio. */
  clientCfdiUse: string | null | undefined;
  canEdit: boolean;
};

// Atajo para los dos que Leo pide seguido. Cualquier otro uso se elige en el
// formulario completo de la factura; el server action valida contra el catalogo.
const QUICK_OPTIONS = [
  { value: "", label: "Heredar del cliente" },
  { value: "G01", label: "G01 - Adquisicion de mercancias" },
  { value: "G03", label: "G03 - Gastos en general" },
];

function labelFor(code: string | null | undefined) {
  if (!code) return null;
  const known = QUICK_OPTIONS.find((option) => option.value === code);
  return known ? known.label : code;
}

export default function InvoiceCfdiUseSelect({
  invoiceId,
  status,
  invoiceCfdiUse,
  clientCfdiUse,
  canEdit,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState((invoiceCfdiUse || "").toUpperCase());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = String(status) === "draft";
  const effective = (invoiceCfdiUse || clientCfdiUse || "").toUpperCase();
  const effectiveLabel = labelFor(effective) || "Pendiente";

  if (!isDraft || !canEdit) {
    return (
      <span className="text-xs text-[#B3B3B8]" title="Uso de CFDI (tipo de gasto)">
        {effectiveLabel}
        {!invoiceCfdiUse && clientCfdiUse ? " (del cliente)" : ""}
      </span>
    );
  }

  // Si la factura o el cliente traen un uso fuera del atajo, lo agregamos como
  // opcion para no perderlo al abrir el selector.
  const options = [...QUICK_OPTIONS];
  for (const extra of [invoiceCfdiUse, clientCfdiUse]) {
    const code = (extra || "").toUpperCase();
    if (code && !options.some((option) => option.value === code)) {
      options.push({ value: code, label: labelFor(code) || code });
    }
  }

  async function save(next: string) {
    setValue(next);
    setSaving(true);
    setError(null);

    const result = await setInvoiceCfdiUse(invoiceId, next);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      setValue((invoiceCfdiUse || "").toUpperCase());
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-wide text-[#77777D]">
        Uso CFDI
      </label>
      <select
        className="w-full rounded-lg border border-[#2A2A30] bg-[#222228] px-2 py-1.5 text-xs outline-none disabled:text-[#77777D]"
        value={value}
        disabled={saving}
        onChange={(event) => save(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value || "inherit"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {!value && clientCfdiUse ? (
        <p className="text-[10px] text-[#77777D]">
          Se timbrara como {labelFor(clientCfdiUse.toUpperCase()) || clientCfdiUse}.
        </p>
      ) : null}
      {error ? <p className="text-[10px] text-[#FFB4B4]">{error}</p> : null}
    </div>
  );
}
