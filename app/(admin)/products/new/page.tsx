"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { formatCurrency } from "@/lib/format";

type TaxonomyOption = {
  id: number;
  name: string;
};

const LABOR_MULTIPLIER = 2;

type ProductForm = {
  sku: string;
  brand: string;
  model: string;
  name: string;
  category: string;
  category_id: string;
  supplier: string;
  description: string;
  image_url: string;
  cost_price: string;
  cost_currency: string;
  pricing_method: string;
  target_margin: string;
  public_price: string;
  calculated_sale_price: string;
  sale_currency: string;
  labor_unit_cost: string;
  sat_product_key: string;
  sat_unit_key: string;
  unit_name: string;
  tax_rate: string;
  is_favorite: boolean;
};

const emptyForm: ProductForm = {
  sku: "",
  brand: "",
  model: "",
  name: "",
  category: "",
  category_id: "",
  supplier: "",
  description: "",
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

export default function NewProductPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<TaxonomyOption[]>([]);
  const [tags, setTags] = useState<TaxonomyOption[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const laborUnitSalePrice =
    (Number(form.labor_unit_cost) || 0) * LABOR_MULTIPLIER;

  function updateField(field: keyof ProductForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  }

  function reportError(step: string, error: unknown) {
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? ` ${error.message}`
        : "";

    console.error(`Error en ${step}:`, error);
    alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
  }

  useEffect(() => {
    async function loadTaxonomy() {
      const [{ data: categoryData }, { data: tagData }] = await Promise.all([
        supabase
          .from("product_categories")
          .select("id, name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("product_tags")
          .select("id, name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      setCategories((categoryData || []) as TaxonomyOption[]);
      setTags((tagData || []) as TaxonomyOption[]);
    }

    loadTaxonomy();
  }, []);

  useEffect(() => {
    const cost = Number(form.cost_price) || 0;
    const margin = Number(form.target_margin) || 0;

    if (form.pricing_method === "target_margin") {
      if (margin >= 100) return;
      updateField("calculated_sale_price", (cost / (1 - margin / 100)).toFixed(2));
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

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `products/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);

    if (uploadError) {
      reportError("subir imagen", uploadError);
      return;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    updateField("image_url", data.publicUrl);
  }

  async function handleSave() {
    setLoading(true);
    setSuccessMessage("");

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        sku: form.sku,
        brand: form.brand,
        model: form.model,
        name: form.name,
        category: form.category,
        category_id: form.category_id ? Number(form.category_id) : null,
        supplier: form.supplier,
        description: form.description,
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
      .select("id")
      .single();

    if (error || !product) {
      setLoading(false);
      reportError("guardar producto", error || { message: "No se recibio producto" });
      return;
    }

    if (selectedTagIds.length > 0) {
      const { error: tagsError } = await supabase
        .from("product_tag_assignments")
        .insert(
          selectedTagIds.map((tagId) => ({
            product_id: product.id,
            tag_id: tagId,
          }))
        );

      if (tagsError) {
        setLoading(false);
        reportError("asignar tags", tagsError);
        return;
      }
    }

    setLoading(false);
    setForm({ ...emptyForm });
    setSelectedTagIds([]);
    setSuccessMessage("Producto creado correctamente");
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">ALFA OS</p>
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">Nuevo producto</h1>
        <p className="text-[#B3B3B8]">
          Alta de productos para cotizaciones, compras y facturacion.
        </p>

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-[#1F7A4D] bg-[#143D2A] px-5 py-4 text-[#8CE0B6]">
            {successMessage}
          </div>
        ) : null}
      </section>

      <form className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
            <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <h2 className="text-2xl font-semibold mb-6">Informacion general</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="SKU" value={form.sku} onChange={(e) => updateField("sku", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Marca" value={form.brand} onChange={(e) => updateField("brand", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Modelo" value={form.model} onChange={(e) => updateField("model", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Nombre comercial" value={form.name} onChange={(e) => updateField("name", e.target.value)} />

              <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.category_id} onChange={(e) => updateField("category_id", e.target.value)}>
                <option value="">Categoria oficial</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Proveedor" value={form.supplier} onChange={(e) => updateField("supplier", e.target.value)} />
            </div>

            <textarea className="w-full bg-[#222228] rounded-xl p-4 outline-none mt-4 min-h-32" placeholder="Descripcion" value={form.description} onChange={(e) => updateField("description", e.target.value)} />

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#B3B3B8] mb-3">
                Tags oficiales
              </p>
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 text-sm">
                    <input type="checkbox" checked={selectedTagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

            <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <h2 className="text-2xl font-semibold mb-6">Pricing y mano de obra</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Costo" value={form.cost_price} onChange={(e) => updateField("cost_price", e.target.value)} />
              <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.cost_currency} onChange={(e) => updateField("cost_currency", e.target.value)}>
                <option>USD</option>
                <option>MXN</option>
              </select>
              <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.pricing_method} onChange={(e) => updateField("pricing_method", e.target.value)}>
                <option value="target_margin">Margen objetivo</option>
                <option value="public_price">Precio publico</option>
                <option value="manual">Manual</option>
              </select>
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="% margen" value={form.target_margin} onChange={(e) => updateField("target_margin", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Precio publico" value={form.public_price} onChange={(e) => updateField("public_price", e.target.value)} />
              <input className="bg-[#1A1A1F] rounded-xl p-4 outline-none border border-[#2A2A30]" placeholder="Precio calculado" value={form.calculated_sale_price} onChange={(e) => updateField("calculated_sale_price", e.target.value)} readOnly={form.pricing_method !== "manual"} />
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
            </div>
          </div>

            <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <h2 className="text-2xl font-semibold mb-6">Datos SAT</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Clave SAT producto" value={form.sat_product_key} onChange={(e) => updateField("sat_product_key", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Clave SAT unidad" value={form.sat_unit_key} onChange={(e) => updateField("sat_unit_key", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Unidad" value={form.unit_name} onChange={(e) => updateField("unit_name", e.target.value)} />
              <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="IVA %" value={form.tax_rate} onChange={(e) => updateField("tax_rate", e.target.value)} />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Imagen</h2>
            <div className="space-y-4">
              <div className="h-56 bg-[#222228] rounded-xl overflow-hidden flex items-center justify-center">
                {form.image_url ? (
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-[#77777D]">
                    <p className="text-sm font-semibold">Sin imagen</p>
                    <p className="mt-1 text-xs">Sube una foto real del producto</p>
                  </div>
                )}
              </div>
              <label className="block w-full bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl py-3 text-center text-sm font-semibold cursor-pointer transition">
                Subir imagen
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Catalogo ALFA</h2>
            <label className="flex items-center gap-3 text-[#B3B3B8]">
              <input type="checkbox" checked={form.is_favorite} onChange={(e) => updateField("is_favorite", e.target.checked)} />
              Favorito ALFA
            </label>
          </div>

          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Resumen pricing</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between"><span className="text-[#77777D]">Metodo</span><span>{form.pricing_method}</span></div>
              <div className="flex justify-between"><span className="text-[#77777D]">Costo</span><span>{formatCurrency(form.cost_price, form.cost_currency)}</span></div>
              <div className="flex justify-between"><span className="text-[#77777D]">Venta calculada</span><span>{formatCurrency(form.calculated_sale_price, form.sale_currency)}</span></div>
              <div className="flex justify-between"><span className="text-[#77777D]">Costo MO</span><span>{formatCurrency(form.labor_unit_cost, "MXN")}</span></div>
              <div className="flex justify-between"><span className="text-[#77777D]">Venta MO</span><span>{formatCurrency(laborUnitSalePrice, "MXN")} auto</span></div>
              <div className="flex justify-between"><span className="text-[#77777D]">Margen objetivo</span><span>{form.target_margin || 0}%</span></div>
            </div>
          </div>

          <button type="button" onClick={handleSave} disabled={loading} className="w-full bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-4 font-semibold">
            {loading ? "Guardando..." : "Guardar y crear otro"}
          </button>
        </aside>
      </form>
    </main>
  );
}
