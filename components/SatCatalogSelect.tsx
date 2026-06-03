"use client";

import { useEffect, useState } from "react";
import type { PersonType } from "@/lib/fiscalData";

type CatalogOption = {
  code: string;
  name?: string | null;
  description?: string | null;
  applies_to_person_type?: "physical" | "moral" | "both";
  is_active: boolean;
};

type CatalogResponse<T extends CatalogOption> = {
  items?: T[];
  error?: string;
  minQueryLength?: number;
};

type RemoteCatalogSelectProps<T extends CatalogOption> = {
  label: string;
  value: string;
  endpoint: string;
  minQueryLength?: number;
  placeholder?: string;
  invalidText?: string;
  extraParams?: Record<string, string | undefined>;
  buildLabel: (option: T) => string;
  onChange: (value: string, option?: T) => void;
};

export function SatProductServiceSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <RemoteCatalogSelect
      label={label}
      value={value}
      endpoint="/api/sat-catalogs/product-services"
      placeholder="Buscar codigo o descripcion"
      invalidText="Requiere actualizacion fiscal"
      buildLabel={(option) => `${option.code} - ${option.description || ""}`}
      onChange={(nextValue) => onChange(nextValue)}
    />
  );
}

export function SatUnitSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string, unitName?: string) => void;
}) {
  return (
    <RemoteCatalogSelect
      label={label}
      value={value}
      endpoint="/api/sat-catalogs/units"
      placeholder="Buscar codigo, nombre o descripcion"
      invalidText="Requiere actualizacion fiscal"
      buildLabel={(option) =>
        `${option.code} - ${option.name || ""}${
          option.description ? ` / ${option.description}` : ""
        }`
      }
      onChange={(nextValue, option) => onChange(nextValue, option?.name || "")}
    />
  );
}

export function FiscalRegimeSelect({
  label,
  value,
  personType,
  onChange,
}: {
  label: string;
  value: string;
  personType: PersonType;
  onChange: (value: string) => void;
}) {
  return (
    <RemoteCatalogSelect
      label={label}
      value={value}
      endpoint="/api/sat-catalogs/fiscal-regimes"
      placeholder="Buscar codigo o regimen"
      extraParams={{
        person_type: personType === "unknown" ? undefined : personType,
      }}
      buildLabel={(option) => `${option.code} - ${option.name || ""}`}
      onChange={(nextValue) => onChange(nextValue)}
    />
  );
}

export function CfdiUseSelect({
  label,
  value,
  personType,
  onChange,
}: {
  label: string;
  value: string;
  personType: PersonType;
  onChange: (value: string) => void;
}) {
  return (
    <RemoteCatalogSelect
      label={label}
      value={value}
      endpoint="/api/sat-catalogs/cfdi-uses"
      placeholder="Buscar codigo o uso CFDI"
      extraParams={{
        person_type: personType === "unknown" ? undefined : personType,
      }}
      buildLabel={(option) => `${option.code} - ${option.name || ""}`}
      onChange={(nextValue) => onChange(nextValue)}
    />
  );
}

export function TaxObjectSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <RemoteCatalogSelect
      label={label}
      value={value}
      endpoint="/api/sat-catalogs/tax-objects"
      minQueryLength={1}
      placeholder="Buscar codigo u objeto"
      buildLabel={(option) => `${option.code} - ${option.name || ""}`}
      onChange={(nextValue) => onChange(nextValue)}
    />
  );
}

function buildUrl(
  endpoint: string,
  params: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

function RemoteCatalogSelect<T extends CatalogOption>({
  label,
  value,
  endpoint,
  minQueryLength = 2,
  placeholder = "Buscar por codigo o descripcion",
  invalidText = "Requiere actualizacion",
  extraParams = {},
  buildLabel,
  onChange,
}: RemoteCatalogSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<T[]>([]);
  const [selected, setSelected] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLoaded, setSelectedLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cleanQuery = query.trim();
  const extraParamsKey = Object.entries(extraParams)
    .filter(([, paramValue]) => Boolean(paramValue))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([paramKey, paramValue]) => `${paramKey}:${paramValue}`)
    .join("|");
  const selectedIsInvalid =
    Boolean(value) && selectedLoaded && (!selected || selected.is_active === false);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      setSelectedLoaded(true);
      return;
    }

    const controller = new AbortController();
    setSelectedLoaded(false);

    async function loadSelected() {
      try {
        const response = await fetch(
          buildUrl(endpoint, { code: value, ...extraParams }),
          { signal: controller.signal }
        );
        const payload = (await response.json()) as CatalogResponse<T>;

        if (!response.ok || payload.error) {
          throw new Error(payload.error || "No se pudo cargar el catalogo.");
        }

        setSelected(payload.items?.[0] || null);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSelected(null);
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!controller.signal.aborted) setSelectedLoaded(true);
      }
    }

    loadSelected();
    return () => controller.abort();
  }, [endpoint, extraParamsKey, value]);

  useEffect(() => {
    if (!open || cleanQuery.length < minQueryLength) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(
          buildUrl(endpoint, { q: cleanQuery, ...extraParams }),
          { signal: controller.signal }
        );
        const payload = (await response.json()) as CatalogResponse<T>;

        if (!response.ok || payload.error) {
          throw new Error(payload.error || "No se pudo buscar en el catalogo.");
        }

        setOptions(payload.items || []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setOptions([]);
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cleanQuery, endpoint, extraParamsKey, minQueryLength, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setOptions([]);
      setErrorMessage(null);
    }
  }, [open]);

  return (
    <div className="relative space-y-2">
      <span className="text-sm text-[#B3B3B8]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-left outline-none"
      >
        <span className={selected && !selectedIsInvalid ? "text-white" : "text-[#77777D]"}>
          {selected && !selectedIsInvalid
            ? buildLabel(selected)
            : value
              ? invalidText
              : "Seleccionar"}
        </span>
        <span className="text-[#77777D]">v</span>
      </button>

      {selectedIsInvalid ? (
        <p className="text-xs text-[#F4C66A]">Requiere actualizacion fiscal.</p>
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-[#2A2A30] bg-[#101114] p-2 shadow-2xl">
          <input
            className="mb-2 w-full rounded-lg border border-[#2A2A30] bg-[#222228] px-3 py-2 text-sm outline-none"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto">
            {cleanQuery.length < minQueryLength ? (
              <p className="px-3 py-3 text-sm text-[#77777D]">
                Escribe al menos {minQueryLength} caracteres.
              </p>
            ) : loading ? (
              <p className="px-3 py-3 text-sm text-[#77777D]">Buscando...</p>
            ) : errorMessage ? (
              <p className="px-3 py-3 text-sm text-[#FFB4B4]">{errorMessage}</p>
            ) : options.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[#77777D]">Sin resultados.</p>
            ) : (
              options.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setSelected(option);
                    onChange(option.code, option);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#222228] ${
                    option.code === value ? "bg-[#2A2A30] text-white" : "text-[#B3B3B8]"
                  }`}
                >
                  {buildLabel(option)}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
