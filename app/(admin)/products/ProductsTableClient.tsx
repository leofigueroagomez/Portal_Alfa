"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

type ProductCategory = {
  id?: number | null;
  name: string | null;
};

type ProductTag = {
  id: number;
  name: string | null;
};

type ProductTagAssignment = {
  product_tags: ProductTag | null;
};

export type ProductForTable = {
  id: number;
  sku: string | null;
  brand: string | null;
  model: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  category_id: number | null;
  supplier: string | null;
  image_url: string | null;
  cost_currency: string | null;
  cost_price: number | null;
  sale_currency: string | null;
  calculated_sale_price: number | null;
  labor_unit_sale_price: number | null;
  is_active: boolean | null;
  is_favorite: boolean | null;
  product_categories: ProductCategory | null;
  product_tag_assignments: ProductTagAssignment[] | null;
};

type TaxonomyOption = {
  id: number;
  name: string | null;
};

type Props = {
  products: ProductForTable[];
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
};

function getTags(product: ProductForTable) {
  return (
    product.product_tag_assignments
      ?.map((assignment) => assignment.product_tags)
      .filter((tag): tag is ProductTag => Boolean(tag)) || []
  );
}

function includesSearch(value: string | null | undefined, search: string) {
  return (value || "").toLowerCase().includes(search);
}

export default function ProductsTableClient({
  products,
  categories,
  tags,
}: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const productTags = getTags(product);
      const officialCategoryName =
        product.product_categories?.name || product.category || "";
      const keywordText = productTags.map((tag) => tag.name || "").join(" ");

      const matchesSearch =
        !normalizedSearch ||
        includesSearch(product.sku, normalizedSearch) ||
        includesSearch(product.brand, normalizedSearch) ||
        includesSearch(product.model, normalizedSearch) ||
        includesSearch(product.name, normalizedSearch) ||
        includesSearch(product.description, normalizedSearch) ||
        includesSearch(product.supplier, normalizedSearch) ||
        includesSearch(product.category, normalizedSearch) ||
        includesSearch(officialCategoryName, normalizedSearch) ||
        keywordText.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        !categoryFilter || String(product.category_id || "") === categoryFilter;
      const matchesTag =
        !tagFilter ||
        productTags.some((tag) => String(tag.id) === tagFilter);
      const matchesFavorite = !favoritesOnly || Boolean(product.is_favorite);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(product.is_active)) ||
        (statusFilter === "inactive" && !product.is_active);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesTag &&
        matchesFavorite &&
        matchesStatus
      );
    });
  }, [categoryFilter, favoritesOnly, products, search, statusFilter, tagFilter]);

  function clearFilters() {
    setSearch("");
    setCategoryFilter("");
    setTagFilter("");
    setFavoritesOnly(false);
    setStatusFilter("all");
  }

  return (
    <>
      <section className="mb-6 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr_180px_160px_auto]">
          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            placeholder="Buscar por SKU, marca, modelo, nombre, descripción, proveedor o tags..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
          >
            <option value="">Todos los tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <label className="flex items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm text-[#B3B3B8]">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
            />
            Favoritos ALFA
          </label>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30]"
          >
            Limpiar filtros
          </button>
        </div>

        <p className="mt-4 text-sm text-[#77777D]">
          Mostrando {filteredProducts.length} de {products.length} productos.
        </p>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="grid min-w-[1280px] grid-cols-[80px_1.1fr_1.2fr_1fr_1fr_1fr_110px_130px_120px_95px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
          <p>Imagen</p>
          <p>Marca / Modelo</p>
          <p>Nombre</p>
          <p>Categoría</p>
          <p>Tags</p>
          <p>Proveedor</p>
          <p>Costo</p>
          <p>Precio venta</p>
          <p>Mano de obra</p>
          <p>Acciones</p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-8 text-[#B3B3B8]">
            No hay productos que coincidan con los filtros.
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A30]">
            {filteredProducts.map((product) => {
              const productTags = getTags(product);

              return (
                <div key={product.id} className="grid min-w-[1280px] grid-cols-[80px_1.1fr_1.2fr_1fr_1fr_1fr_110px_130px_120px_95px] items-center gap-4 px-5 py-4 text-sm">
                  <div className="w-14 h-14 bg-[#222228] rounded-xl overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name || "Producto"} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#77777D] text-xs">Sin img</span>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{product.brand || "Sin marca"}</p>
                      {product.is_favorite ? (
                        <span className="rounded-full bg-[#3B2D11] px-2 py-0.5 text-[10px] text-[#F4C66A]">
                          Favorito ALFA
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[#B3B3B8]">{product.model || "Sin modelo"}</p>
                    {product.sku ? (
                      <p className="mt-1 text-xs text-[#77777D]">SKU {product.sku}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-[#E5E5E8]">{product.name || "Sin nombre"}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] ${product.is_active ? "bg-[#143D2A] text-[#8CE0B6]" : "bg-[#222228] text-[#77777D]"}`}>
                      {product.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div>
                    <span className="inline-flex rounded-full bg-[#222228] px-2 py-1 text-[11px] text-[#B3B3B8]">
                      {product.product_categories?.name || product.category || "Sin categoría"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {productTags.length > 0 ? (
                      productTags.map((tag) => (
                        <span key={tag.id} className="rounded-full bg-[#222228] px-2 py-1 text-[11px] text-[#B3B3B8]">
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#77777D]">Sin tags</span>
                    )}
                  </div>

                  <p className="text-[#B3B3B8]">{product.supplier || "Sin proveedor"}</p>
                  <p>{formatCurrency(product.cost_price, product.cost_currency)}</p>
                  <p className="font-semibold">{formatCurrency(product.calculated_sale_price, product.sale_currency)}</p>
                  <p>{formatCurrency(product.labor_unit_sale_price, "MXN")}</p>

                  <Link href={`/products/${product.id}/edit`} className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl px-4 py-2 text-center font-semibold">
                    Editar
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
