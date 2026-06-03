"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, X } from "lucide-react";
import {
  formatMissingFiscalFields,
  getCatalogLabel,
  getCfdiUseCode,
  getClientPersonType,
  getFiscalValidationErrors,
  getFiscalRegimeCode,
  optionMatchesPersonType,
  type FiscalCatalogItem,
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
  fiscal_regime: "",
  cfdi_use: "",
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
  const [fiscalRegimes, setFiscalRegimes] = useState<FiscalCatalogItem[]>([]);
  const [cfdiUses, setCfdiUses] = useState<FiscalCatalogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const personType = getClientPersonType(form.tax_rfc);

  useEffect(() => {
    if (!open) return;

    setForm({
      tax_rfc: client?.tax_rfc || "",
      tax_business_name: client?.tax_business_name || client?.name || "",
      fiscal_regime: getFiscalRegimeCode(client),
      cfdi_use: getCfdiUseCode(client),
      tax_zip_code: client?.tax_zip_code || "",
      billing_email: client?.billing_email || "",
    });
    setErrors([]);
    setSaveError(null);
  }, [client, open]);

  useEffect(() => {
    if (!open) return;

    async function loadCatalogs() {
      setLoadingCatalogs(true);
      const [regimesResult, cfdiUsesResult] = await Promise.all([
        supabase
          .from("fiscal_regime_catalog")
          .select("code, name, applies_to_person_type, is_active")
          .order("code"),
        supabase
          .from("cfdi_use_catalog")
          .select("code, name, applies_to_person_type, is_active")
          .order("code"),
      ]);

      setLoadingCatalogs(false);

      if (regimesResult.error || cfdiUsesResult.error) {
        setSaveError(
          regimesResult.error?.message ||
            cfdiUsesResult.error?.message ||
            "No se pudieron cargar catalogos fiscales."
        );
        return;
      }

      setFiscalRegimes((regimesResult.data || []) as FiscalCatalogItem[]);
      setCfdiUses((cfdiUsesResult.data || []) as FiscalCatalogItem[]);
    }

    loadCatalogs();
  }, [open]);

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
      fiscal_regime: form.fiscal_regime.trim(),
      cfdi_use: form.cfdi_use.trim().toUpperCase(),
      tax_regime: form.fiscal_regime.trim(),
      default_cfdi_use: form.cfdi_use.trim().toUpperCase(),
      tax_zip_code: form.tax_zip_code.trim(),
      billing_email: form.billing_email.trim().toLowerCase(),
    };
    const nextErrors = getFiscalValidationErrors(nextClient, {
      fiscalRegimes,
      cfdiUses,
    });

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
        fiscal_regime: nextClient.fiscal_regime,
        cfdi_use: nextClient.cfdi_use,
        tax_regime: nextClient.fiscal_regime,
        default_cfdi_use: nextClient.cfdi_use,
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
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#77777D]">
              RFC sugiere:{" "}
              {personType === "moral"
                ? "Persona moral"
                : personType === "physical"
                  ? "Persona fisica"
                  : "Tipo de persona pendiente"}
            </p>
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
          <SearchableCatalogSelect
            label="Regimen fiscal"
            value={form.fiscal_regime}
            options={fiscalRegimes}
            personType={personType}
            loading={loadingCatalogs}
            onChange={(value) => updateField("fiscal_regime", value)}
          />
          <SearchableCatalogSelect
            label="Uso CFDI"
            value={form.cfdi_use}
            options={cfdiUses}
            personType={personType}
            loading={loadingCatalogs}
            onChange={(value) => updateField("cfdi_use", value)}
          />
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

function SearchableCatalogSelect({
  label,
  value,
  options,
  personType,
  loading,
  onChange,
}: {
  label: string;
  value: string;
  options: FiscalCatalogItem[];
  personType: ReturnType<typeof getClientPersonType>;
  loading: boolean;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.code === value);
  const activeOptions = options.filter((option) => option.is_active);
  const filteredOptions = activeOptions
    .filter((option) => optionMatchesPersonType(option, personType))
    .filter((option) => {
      const haystack = `${option.code} ${option.name}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className="relative space-y-2">
      <span className="text-sm text-[#B3B3B8]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-left outline-none"
      >
        <span className={selected ? "text-white" : "text-[#77777D]"}>
          {selected ? getCatalogLabel(selected.code, options) : "Seleccionar"}
        </span>
        <span className="text-[#77777D]">v</span>
      </button>

      {value && !selected ? (
        <p className="text-xs text-[#F4C66A]">Valor anterior requiere actualizacion.</p>
      ) : null}

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-[#2A2A30] bg-[#101114] p-2 shadow-2xl">
          <input
            className="mb-2 w-full rounded-lg border border-[#2A2A30] bg-[#222228] px-3 py-2 text-sm outline-none"
            placeholder="Buscar por codigo o nombre"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-3 text-sm text-[#77777D]">Cargando catalogo...</p>
            ) : filteredOptions.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[#77777D]">Sin opciones activas.</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    onChange(option.code);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#222228] ${
                    option.code === value ? "bg-[#2A2A30] text-white" : "text-[#B3B3B8]"
                  }`}
                >
                  {option.code} - {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
