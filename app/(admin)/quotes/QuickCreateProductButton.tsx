"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { formatCurrency } from "@/lib/format";

type Product = {
  id: number;
  brand: string;
  model: string;
  name: string;
  category: string | null;
  category_id: number | null;
  image_url: string | null;
  cost_price: number | null;
  cost_currency: string | null;
  calculated_sale_price: number;
  sale_currency: string;
  labor_unit_cost: number | null;
  labor_unit_sale_price: number;
  is_favorite: boolean | null;
};

type TaxonomyOption = {
  id: number;
  name: string;
};

const LABOR_MULTIPLIER = 2;

const INITIAL_FORM = {
  brand: "",
  model: "",
  name: "",
  category: "",
  category_id: "",
  supplier: "",
  image_url: "",
  cost_price: "",
  cost_currency: "USD",
  pricing_method: "target_margin",
  target_margin: "30",
  public_price: "",
  calculated_sale_price: "",
  sale_currency: "USD",
  labor_unit_cost: "",
  sat_product_key: "",
  sat_unit_key: "",
  unit_name: "",
  tax_rate: "16",
  is_favorite: false,
};

type Props = {
  onProductCreated: (product: Product) => void;
};

export default function QuickCreateProductButton({
  onProductCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<TaxonomyOption[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetModalState() {
    setForm({ ...INITIAL_FORM });
    setSaving(false);
  }

  function openModal() {
    resetModalState();
    setOpen(true);
  }

  function closeModal() {
    resetModalState();
    setOpen(false);
  }

  const laborUnitSalePrice =
    (Number(form.labor_unit_cost) || 0) * LABOR_MULTIPLIER;

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `products/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error subiendo imagen:", uploadError);
      alert("Error subiendo imagen: " + JSON.stringify(uploadError));
      return;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    updateField("image_url", data.publicUrl);
  }

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error cargando categorias:", error);
        return;
      }

      setCategories((data || []) as TaxonomyOption[]);
    }

    loadCategories();
  }, []);

  useEffect(() => {
    const cost = Number(form.cost_price) || 0;
    const margin = Number(form.target_margin) || 0;

    if (form.pricing_method === "target_margin") {
      if (margin >= 100) return;

      const calculated = cost / (1 - margin / 100);
      updateField("calculated_sale_price", calculated.toFixed(2));
    }

    if (form.pricing_method === "public_price") {
      updateField("calculated_sale_price", form.public_price);
    }
  }, [
    form.cost_price,
    form.target_margin,
    form.public_price,
    form.pricing_method,
  ]);

  async function handleSave() {
    if (!form.brand.trim() || !form.model.trim() || !form.name.trim()) {
      alert("Agrega marca, modelo y nombre");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("products")
      .insert({
        sku: "",
        brand: form.brand,
        model: form.model,
        name: form.name,
        category: form.category,
        category_id: form.category_id ? Number(form.category_id) : null,
        supplier: form.supplier,
        description: "",
        image_url: form.image_url,
        cost_price: Number(form.cost_price) || 0,
        cost_currency: form.cost_currency,
        pricing_method: form.pricing_method,
        target_margin: Number(form.target_margin) || 0,
        public_price: Number(form.public_price) || 0,
        calculated_sale_price: Number(form.calculated_sale_price) || 0,
        sale_currency: form.sale_currency,
        labor_unit_cost: Number(form.labor_unit_cost) || 0,
        labor_sale_multiplier: LABOR_MULTIPLIER,
        labor_unit_sale_price: laborUnitSalePrice,
        sat_product_key: form.sat_product_key,
        sat_unit_key: form.sat_unit_key,
        unit_name: form.unit_name,
        tax_rate: Number(form.tax_rate) || 16,
        is_favorite: form.is_favorite,
        is_active: true,
      })
      .select(
        "id, brand, model, name, category, category_id, image_url, cost_price, cost_currency, calculated_sale_price, sale_currency, labor_unit_cost, labor_unit_sale_price, is_favorite"
      )
      .single();

    setSaving(false);

    if (error || !data) {
      const currentError = error || { message: "No se recibió producto" };
      console.error("Error creando producto rápido:", currentError);
      alert(
        "Error creando producto: " +
          JSON.stringify(currentError) +
          ("message" in currentError && currentError.message
            ? ` ${currentError.message}`
            : "")
      );
      return;
    }

    onProductCreated(data as Product);
    closeModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] text-[#B3B3B8] rounded-xl px-5 py-3 font-semibold"
      >
        Nuevo producto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-6">
          <div className="max-h-[calc(100vh-24px)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 md:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">Nuevo producto</h3>
                <p className="text-[#B3B3B8] text-sm mt-1">
                  Alta rápida para agregarlo a la cotización.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-[#B3B3B8] hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Marca" value={form.brand} onChange={(e) => updateField("brand", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Modelo" value={form.model} onChange={(e) => updateField("model", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Nombre" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.category_id} onChange={(e) => updateField("category_id", e.target.value)}>
                <option value="">Categoria oficial</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Proveedor" value={form.supplier} onChange={(e) => updateField("supplier", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Costo" value={form.cost_price} onChange={(e) => updateField("cost_price", e.target.value)} />
              <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.cost_currency} onChange={(e) => updateField("cost_currency", e.target.value)}>
                <option>USD</option>
                <option>MXN</option>
              </select>
              <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.pricing_method} onChange={(e) => updateField("pricing_method", e.target.value)}>
                <option value="target_margin">Margen objetivo</option>
                <option value="public_price">Precio público</option>
                <option value="manual">Manual</option>
              </select>
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="% margen" value={form.target_margin} onChange={(e) => updateField("target_margin", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Precio público" value={form.public_price} onChange={(e) => updateField("public_price", e.target.value)} />
              <input className="bg-[#1A1A1F] border border-[#2A2A30] rounded-xl p-4 outline-none" placeholder="Precio calculado" value={form.calculated_sale_price} onChange={(e) => updateField("calculated_sale_price", e.target.value)} readOnly={form.pricing_method !== "manual"} />
              <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.sale_currency} onChange={(e) => updateField("sale_currency", e.target.value)}>
                <option>USD</option>
                <option>MXN</option>
              </select>
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Costo MO" value={form.labor_unit_cost} onChange={(e) => updateField("labor_unit_cost", e.target.value)} />
              <div className="rounded-xl border border-[#2A2A30] bg-[#1A1A1F] p-4">
                <p className="text-xs text-[#77777D]">Venta MO auto</p>
                <p className="font-semibold">{formatCurrency(laborUnitSalePrice, "MXN")}</p>
              </div>
              <p className="rounded-xl bg-[#222228] p-4 text-sm text-[#B3B3B8]">
                Precio venta MO calculado automáticamente x{LABOR_MULTIPLIER}
              </p>
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Clave SAT producto" value={form.sat_product_key} onChange={(e) => updateField("sat_product_key", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Clave SAT unidad" value={form.sat_unit_key} onChange={(e) => updateField("sat_unit_key", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Unidad" value={form.unit_name} onChange={(e) => updateField("unit_name", e.target.value)} />
            </div>

            <label className="mb-6 flex items-center gap-3 rounded-xl bg-[#222228] p-4 text-[#B3B3B8]">
              <input
                type="checkbox"
                checked={form.is_favorite}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    is_favorite: e.target.checked,
                  }))
                }
              />
              Favorito ALFA
            </label>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-[#222228]">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center text-[#77777D]">
                    <p className="text-sm font-semibold">Sin imagen</p>
                    <p className="mt-1 text-xs">Foto real del producto</p>
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-sm font-semibold transition hover:bg-[#2A2A30]">
                Subir imagen
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 bg-[#222228] hover:bg-[#2A2A30] rounded-xl py-3 font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-3 font-semibold"
              >
                {saving ? "Guardando..." : "Guardar producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
