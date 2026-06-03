"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, X } from "lucide-react";
import {
  formatMissingFiscalFields,
  getFiscalValidationErrors,
  type FiscalClientData,
} from "@/lib/fiscalData";
import { supabase } from "@/services/supabase";

type ModalProps = {
  client: FiscalClientData | null;
  open: boolean;
  title?: string;
  intro?: string | null;
  missingFields?: string[];
  onClose: () => void;
  onSaved?: (client: FiscalClientData) => void;
};

type ButtonProps = {
  client: FiscalClientData;
  label?: string;
  title?: string;
  intro?: string | null;
  className?: string;
  onSaved?: (client: FiscalClientData) => void;
};

const emptyForm = {
  tax_rfc: "",
  tax_business_name: "",
  tax_regime: "",
  default_cfdi_use: "",
  tax_zip_code: "",
  billing_email: "",
};

export default function ClientFiscalDataModal({
  client,
  open,
  title = "Datos fiscales del cliente",
  intro,
  missingFields = [],
  onClose,
  onSaved,
}: ModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setForm({
      tax_rfc: client?.tax_rfc || "",
      tax_business_name: client?.tax_business_name || client?.name || "",
      tax_regime: client?.tax_regime || "",
      default_cfdi_use: client?.default_cfdi_use || "",
      tax_zip_code: client?.tax_zip_code || "",
      billing_email: client?.billing_email || "",
    });
    setErrors([]);
    setSaveError(null);
  }, [client, open]);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client?.id) {
      setSaveError("Selecciona un cliente antes de guardar datos fiscales.");
      return;
    }

    const nextClient: FiscalClientData = {
      id: client.id,
      name: client.name || null,
      tax_rfc: form.tax_rfc.trim().toUpperCase(),
      tax_business_name: form.tax_business_name.trim().toUpperCase(),
      tax_regime: form.tax_regime.trim(),
      default_cfdi_use: form.default_cfdi_use.trim().toUpperCase(),
      tax_zip_code: form.tax_zip_code.trim(),
      billing_email: form.billing_email.trim().toLowerCase(),
    };
    const nextErrors = getFiscalValidationErrors(nextClient);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors([]);
    setSaveError(null);

    const { error } = await supabase
      .from("clients")
      .update({
        tax_rfc: nextClient.tax_rfc,
        tax_business_name: nextClient.tax_business_name,
        tax_regime: nextClient.tax_regime,
        default_cfdi_use: nextClient.default_cfdi_use,
        tax_zip_code: nextClient.tax_zip_code,
        billing_email: nextClient.billing_email,
      })
      .eq("id", client.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    onSaved?.(nextClient);
    onClose();
    router.refresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {intro ? (
              <p className="mt-2 text-sm leading-6 text-[#F4C66A]">{intro}</p>
            ) : null}
            {missingFields.length > 0 ? (
              <p className="mt-2 text-sm leading-6 text-[#F4C66A]">
                Para timbrar esta factura faltan los siguientes datos:{" "}
                {formatMissingFiscalFields(missingFields)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {errors.length > 0 || saveError ? (
          <div className="mb-5 rounded-xl border border-[#6A2A2A] bg-[#351818] p-4 text-sm text-[#FFB4B4]">
            {saveError ? <p>{saveError}</p> : null}
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FiscalInput label="RFC" value={form.tax_rfc} onChange={(value) => updateField("tax_rfc", value)} />
          <FiscalInput label="Razon social" value={form.tax_business_name} onChange={(value) => updateField("tax_business_name", value)} />
          <FiscalInput label="Regimen fiscal" value={form.tax_regime} onChange={(value) => updateField("tax_regime", value)} />
          <FiscalInput label="Uso CFDI" value={form.default_cfdi_use} onChange={(value) => updateField("default_cfdi_use", value)} />
          <FiscalInput label="Codigo postal fiscal" value={form.tax_zip_code} onChange={(value) => updateField("tax_zip_code", value)} />
          <FiscalInput label="Correo de facturacion" value={form.billing_email} onChange={(value) => updateField("billing_email", value)} type="email" />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
          >
            {saving ? "Guardando..." : "Guardar datos fiscales"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClientFiscalDataButton({
  client,
  label = "Editar datos fiscales",
  title,
  intro,
  className,
  onSaved,
}: ButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
        }
      >
        <Edit3 size={17} />
        {label}
      </button>
      <ClientFiscalDataModal
        client={client}
        open={open}
        title={title}
        intro={intro}
        onClose={() => setOpen(false)}
        onSaved={onSaved}
      />
    </>
  );
}

function FiscalInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-[#B3B3B8]">{label}</span>
      <input
        type={type}
        className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
