"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";

const canManageProductTaxonomy = true;

type Category = {
  id: number;
  name: string;
  slug: string | null;
  is_active: boolean;
  sort_order: number | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, slug, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando categorias:", error);
      alert("Error cargando categorias: " + JSON.stringify(error));
      return;
    }

    setCategories((data || []) as Category[]);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function createCategory() {
    if (!canManageProductTaxonomy || !name.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("product_categories").insert({
      name: name.trim(),
      slug: slugify(name),
      is_active: true,
      sort_order: categories.length,
    });
    setSaving(false);

    if (error) {
      console.error("Error creando categoria:", error);
      alert("Error creando categoria: " + JSON.stringify(error));
      return;
    }

    setName("");
    loadCategories();
  }

  async function toggleActive(category: Category) {
    const { error } = await supabase
      .from("product_categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      console.error("Error actualizando categoria:", error);
      alert("Error actualizando categoria: " + JSON.stringify(error));
      return;
    }

    loadCategories();
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <Link href="/products" className="inline-block text-[#B3B3B8] hover:text-white mb-6">
          Volver a productos
        </Link>
        <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">ALFA OS</p>
        <h1 className="text-4xl font-bold mb-3">Categorias de producto</h1>
        <p className="text-[#B3B3B8]">
          Taxonomia controlada para catalogo y biblioteca de cotizaciones.
        </p>
      </section>

      {canManageProductTaxonomy ? (
        <section className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6 mb-8">
          <div className="flex gap-3">
            <input
              className="flex-1 bg-[#222228] rounded-xl p-4 outline-none"
              placeholder="Nueva categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              disabled={saving}
              onClick={createCategory}
              className="bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl px-6 py-3 font-semibold"
            >
              {saving ? "Guardando..." : "Crear"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="grid min-w-[640px] grid-cols-[1fr_1fr_120px_120px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
          <p>Nombre</p>
          <p>Slug</p>
          <p>Status</p>
          <p>Accion</p>
        </div>

        <div className="divide-y divide-[#2A2A30]">
          {categories.map((category) => (
            <div key={category.id} className="grid min-w-[640px] grid-cols-[1fr_1fr_120px_120px] items-center gap-4 px-5 py-4 text-sm">
              <p className="font-semibold">{category.name}</p>
              <p className="text-[#B3B3B8]">{category.slug}</p>
              <span className={`w-fit rounded-full px-3 py-1 text-xs ${category.is_active ? "bg-[#143D2A] text-[#8CE0B6]" : "bg-[#222228] text-[#77777D]"}`}>
                {category.is_active ? "Activa" : "Inactiva"}
              </span>
              <button type="button" onClick={() => toggleActive(category)} className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl px-4 py-2 font-semibold">
                {category.is_active ? "Pausar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
