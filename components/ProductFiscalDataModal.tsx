"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/services/supabase";
import {
  SatProductServiceSelect,
  SatUnitSelect,
  TaxObjectSelect,
} from "@/components/SatCatalogSelect";
import {
  getMissingProductFiscalFields,
  getProductFiscalObject,
  getProductSatProductCode,
  getProductSatUnitCode,
  getProductSatUnitName,
  type ProductFiscalData,
} from "@/lib/productFiscalData";

type EditableProduct = ProductFiscalData & {
  missing?: string[];
};

type Props = {
  open: boolean;
  products: EditableProduct[];
  onClose: () => void;
  onSaved?: (products: ProductFiscalData[]) => void;
};

export default function ProductFiscalDataModal({
  open,
  products,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<EditableProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setRows(
      products.map((product) => ({
        ...product,
        sat_product_service_code: getProductSatProductCode(product),
        sat_unit_code: getProductSatUnitCode(product),
        sat_unit_name: getProductSatUnitName(product),
        fiscal_object: getProductFiscalObject(product),
      }))
    );
    setErrorMessage(null);
  }, [open, products]);

  function updateRow(id: number, patch: Partial<EditableProduct>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function isActiveCatalogCode(endpoint: string, code: string) {
    if (!code.trim()) return false;

    const response = await fetch(`${endpoint}?code=${encodeURIComponent(code.trim())}`);
    const payload = (await response.json()) as {
      items?: Array<{ code: string; is_active: boolean }>;
    };
    const item = payload.items?.[0];

    return Boolean(response.ok && item?.is_active);
  }

  async function validateRows() {
    const messages: string[] = [];

    for (const row of rows) {
      const rowMissing = getMissingProductFiscalFields(row);
      const [validProductCode, validUnitCode, validTaxObject] = await Promise.all([
        isActiveCatalogCode(
          "/api/sat-catalogs/product-services",
          row.sat_product_service_code || ""
        ),
        isActiveCatalogCode("/api/sat-catalogs/units", row.sat_unit_code || ""),
        isActiveCatalogCode("/api/sat-catalogs/tax-objects", row.fiscal_object || ""),
      ]);

      if (!validProductCode) {
        rowMissing.push("Codigo SAT producto/servicio requiere actualizacion");
      }
      if (!validUnitCode) {
        rowMissing.push("Clave unidad SAT requiere actualizacion");
      }
      if (!validTaxObject) {
        rowMissing.push("Objeto de impuesto requiere actualizacion");
      }

      if (rowMissing.length > 0) {
        messages.push(
          `${row.name || `Producto #${row.id}`}: ${[...new Set(rowMissing)].join(", ")}`
        );
      }
    }

    return messages;
  }

  async function handleSave() {
    const missing = await validateRows();

    if (missing.length > 0) {
      setErrorMessage(missing.join(" | "));
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    for (const row of rows) {
      const { error } = await supabase
        .from("products")
        .update({
          sat_product_service_code: row.sat_product_service_code,
          sat_unit_code: row.sat_unit_code,
          sat_unit_name: row.sat_unit_name,
          fiscal_object: row.fiscal_object || "02",
          sat_product_key: row.sat_product_service_code,
          sat_unit_key: row.sat_unit_code,
          unit_name: row.sat_unit_name,
        })
        .eq("id", row.id);

      if (error) {
        setSaving(false);
        setErrorMessage(error.message);
        return;
      }
    }

    setSaving(false);
    onSaved?.(rows);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Faltan datos fiscales en estos productos</h2>
            <p className="mt-2 text-sm text-[#B3B3B8]">
              Completa codigo SAT, clave unidad y objeto de impuesto para poder facturar.
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

        {errorMessage ? (
          <div className="mb-5 rounded-xl border border-[#6A2A2A] bg-[#351818] p-4 text-sm text-[#FFB4B4]">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold">{row.name || `Producto #${row.id}`}</p>
                  {row.missing?.length ? (
                    <p className="mt-1 text-sm text-[#F4C66A]">
                      Faltante: {row.missing.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SatProductServiceSelect
                  label="Codigo SAT Producto/Servicio"
                  value={row.sat_product_service_code || ""}
                  onChange={(value) => updateRow(row.id, { sat_product_service_code: value })}
                />
                <SatUnitSelect
                  label="Clave Unidad SAT"
                  value={row.sat_unit_code || ""}
                  onChange={(value, unitName) =>
                    updateRow(row.id, {
                      sat_unit_code: value,
                      sat_unit_name: unitName || row.sat_unit_name,
                    })
                  }
                />
                <TaxObjectSelect
                  label="Objeto de impuesto"
                  value={row.fiscal_object || "02"}
                  onChange={(value) => updateRow(row.id, { fiscal_object: value })}
                />
              </div>
            </div>
          ))}
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
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
          >
            {saving ? "Guardando..." : "Guardar productos"}
          </button>
        </div>
      </section>
    </div>
  );
}
