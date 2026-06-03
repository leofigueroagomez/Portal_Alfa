"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/services/supabase";
import { SatProductServiceSelect, SatUnitSelect } from "@/components/SatCatalogSelect";
import {
  getMissingProductFiscalFields,
  getProductFiscalObject,
  getProductSatProductCode,
  getProductSatUnitCode,
  getProductSatUnitName,
  type ProductFiscalCatalogs,
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
  const [catalogs, setCatalogs] = useState<ProductFiscalCatalogs>({
    productServices: [],
    units: [],
  });
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

  useEffect(() => {
    if (!open) return;

    async function loadCatalogs() {
      const [productServicesResult, unitsResult] = await Promise.all([
        supabase
          .from("sat_product_service_catalog")
          .select("code, description, is_active")
          .order("code"),
        supabase
          .from("sat_unit_catalog")
          .select("code, name, description, is_active")
          .order("code"),
      ]);

      if (productServicesResult.error || unitsResult.error) {
        setErrorMessage(
          productServicesResult.error?.message ||
            unitsResult.error?.message ||
            "No se pudieron cargar catalogos SAT."
        );
        return;
      }

      setCatalogs({
        productServices: productServicesResult.data || [],
        units: unitsResult.data || [],
      });
    }

    loadCatalogs();
  }, [open]);

  function updateRow(id: number, patch: Partial<EditableProduct>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function handleSave() {
    const missing = rows.flatMap((row) => {
      const rowMissing = getMissingProductFiscalFields(row, catalogs);
      return rowMissing.length > 0 ? [`${row.name || `Producto #${row.id}`}: ${rowMissing.join(", ")}`] : [];
    });

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
                <select
                  className="w-fit rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-sm outline-none"
                  value={row.fiscal_object || "02"}
                  onChange={(event) => updateRow(row.id, { fiscal_object: event.target.value })}
                >
                  <option value="02">02 - Si objeto de impuesto</option>
                  <option value="01">01 - No objeto de impuesto</option>
                  <option value="03">03 - Si objeto de impuesto y no obligado al desglose</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SatProductServiceSelect
                  label="Codigo SAT Producto/Servicio"
                  value={row.sat_product_service_code || ""}
                  options={catalogs.productServices}
                  onChange={(value) => updateRow(row.id, { sat_product_service_code: value })}
                />
                <SatUnitSelect
                  label="Clave Unidad SAT"
                  value={row.sat_unit_code || ""}
                  options={catalogs.units}
                  onChange={(value, unitName) =>
                    updateRow(row.id, {
                      sat_unit_code: value,
                      sat_unit_name: unitName || row.sat_unit_name,
                    })
                  }
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
