"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSatProductLabel,
  getSatUnitLabel,
  type SatProductServiceCatalogItem,
  type SatUnitCatalogItem,
} from "@/lib/productFiscalData";

type ProductSelectProps = {
  label: string;
  value: string;
  options: SatProductServiceCatalogItem[];
  onChange: (value: string) => void;
};

type UnitSelectProps = {
  label: string;
  value: string;
  options: SatUnitCatalogItem[];
  onChange: (value: string, unitName?: string) => void;
};

export function SatProductServiceSelect({
  label,
  value,
  options,
  onChange,
}: ProductSelectProps) {
  return (
    <SearchableSelect
      label={label}
      value={value}
      selectedLabel={getSatProductLabel(value, options)}
      options={options
        .filter((option) => option.is_active)
        .map((option) => ({
          code: option.code,
          label: `${option.code} - ${option.description}`,
          search: `${option.code} ${option.description}`,
        }))}
      onChange={onChange}
    />
  );
}

export function SatUnitSelect({ label, value, options, onChange }: UnitSelectProps) {
  return (
    <SearchableSelect
      label={label}
      value={value}
      selectedLabel={getSatUnitLabel(value, options)}
      options={options
        .filter((option) => option.is_active)
        .map((option) => ({
          code: option.code,
          label: `${option.code} - ${option.name}${
            option.description ? ` / ${option.description}` : ""
          }`,
          search: `${option.code} ${option.name} ${option.description || ""}`,
          unitName: option.name,
        }))}
      onChange={(code, option) => onChange(code, option?.unitName)}
    />
  );
}

function SearchableSelect({
  label,
  value,
  selectedLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  selectedLabel: string;
  options: { code: string; label: string; search: string; unitName?: string }[];
  onChange: (value: string, option?: { code: string; label: string; search: string; unitName?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.code === value);
  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return options;
    return options.filter((option) => option.search.toLowerCase().includes(clean));
  }, [options, query]);

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
          {selected ? selectedLabel : value ? "Requiere actualizacion" : "Seleccionar"}
        </span>
        <span className="text-[#77777D]">v</span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-[#2A2A30] bg-[#101114] p-2 shadow-2xl">
          <input
            className="mb-2 w-full rounded-lg border border-[#2A2A30] bg-[#222228] px-3 py-2 text-sm outline-none"
            placeholder="Buscar por codigo o descripcion"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[#77777D]">Sin opciones activas.</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    onChange(option.code, option);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#222228] ${
                    option.code === value ? "bg-[#2A2A30] text-white" : "text-[#B3B3B8]"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
