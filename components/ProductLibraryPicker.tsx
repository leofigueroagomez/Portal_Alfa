"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import QuickCreateProductButton from "@/app/(admin)/quotes/QuickCreateProductButton";
import { supabase } from "@/services/supabase";

export type ProductLibraryProduct = {
  id: number;
  sku?: string | null;
  brand: string | null;
  model: string | null;
  name: string | null;
  description?: string | null;
  category?: string | null;
  category_id: number | null;
  image_url: string | null;
  cost_price: number | null;
  cost_currency: string | null;
  calculated_sale_price?: number | null;
  sale_currency?: string | null;
  labor_unit_cost?: number | null;
  labor_unit_sale_price?: number | null;
  is_favorite: boolean | null;
  partner_discount_eligible?: boolean | null;
  product_categories?:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
  product_tag_assignments?: {
    product_tags:
      | {
          id: number;
          name: string | null;
        }
      | {
          id: number;
          name: string | null;
        }[]
      | null;
  }[];
};

type TaxonomyOption = {
  id: number;
  name: string | null;
};

type Props = {
  products: ProductLibraryProduct[];
  onProductsChange?: (products: ProductLibraryProduct[]) => void;
  onSelectProduct: (product: ProductLibraryProduct) => void;
  selectLabel?: string;
  helperText?: string;
  priceMode?: "cost" | "sale";
};

function getProductTags(product: ProductLibraryProduct) {
  return (
    product.product_tag_assignments?.flatMap((assignment) => {
      if (!assignment.product_tags) return [];
      return Array.isArray(assignment.product_tags)
        ? assignment.product_tags
        : [assignment.product_tags];
    }) || []
  );
}

function getCategoryName(product: ProductLibraryProduct) {
  if (Array.isArray(product.product_categories)) {
    return product.product_categories[0]?.name || product.category || "Sin categoria";
  }

  return product.product_categories?.name || product.category || "Sin categoria";
}

export default function ProductLibraryPicker({
  products,
  onProductsChange,
  onSelectProduct,
  selectLabel = "Seleccionar",
  helperText,
  priceMode = "cost",
}: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [categories, setCategories] = useState<TaxonomyOption[]>([]);
  const [tags, setTags] = useState<TaxonomyOption[]>([]);

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

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const productTags = getProductTags(product);
      const matchesSearch =
        !query ||
        product.sku?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.model?.toLowerCase().includes(query) ||
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query);
      const matchesCategory =
        !categoryFilter || String(product.category_id || "") === categoryFilter;
      const matchesTag =
        !tagFilter || productTags.some((tag) => String(tag?.id) === tagFilter);
      const matchesFavorite = !favoritesOnly || Boolean(product.is_favorite);

      return matchesSearch && matchesCategory && matchesTag && matchesFavorite;
    });
  }, [categoryFilter, favoritesOnly, products, search, tagFilter]);

  function handleProductCreated(product: ProductLibraryProduct) {
    const nextProducts = [product, ...products].sort((a, b) => {
      const favoriteDelta = Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite));
      return (
        favoriteDelta ||
        (a.brand || "").localeCompare(b.brand || "") ||
        (a.model || "").localeCompare(b.model || "")
      );
    });

    onProductsChange?.(nextProducts);
  }

  return (
    <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
      <div className="border-b border-[#2A2A30] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Biblioteca de productos</h2>
            {helperText ? (
              <p className="mt-1 text-sm text-[#B3B3B8]">{helperText}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <QuickCreateProductButton onProductCreated={handleProductCreated} />
            <label className="flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3">
              <Search size={16} className="text-[#77777D]" />
              <input
                type="text"
                placeholder="Buscar sku, marca, modelo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent outline-none sm:w-72"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">Todas las categorias</option>
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

          <label className="flex items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
            />
            Favoritos ALFA
          </label>
        </div>
      </div>

      <div className="max-h-[58vh] overflow-auto">
        <table className="w-full min-w-[860px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-[#101114] text-left text-[#B3B3B8]">
            <tr className="border-b border-[#2A2A30]">
              <th className="w-20 px-3 py-2 font-semibold">Img</th>
              <th className="px-3 py-2 font-semibold">Producto</th>
              <th className="px-3 py-2 font-semibold">Categoria / tags</th>
              <th className="w-36 px-3 py-2 text-right font-semibold">
                {priceMode === "sale" ? "Precio" : "Costo"}
              </th>
              <th className="w-32 px-3 py-2 font-semibold">Accion</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const productTags = getProductTags(product);
              const price =
                priceMode === "sale"
                  ? product.calculated_sale_price
                  : product.cost_price;
              const currency =
                priceMode === "sale" ? product.sale_currency : product.cost_currency;

              return (
                <tr key={product.id} className="border-b border-[#222228] hover:bg-[#1A1A1F]">
                  <td className="px-3 py-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-[#222228]">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name || "Producto"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#77777D]">Sin img</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {product.brand || "Sin marca"} {product.model || ""}
                      </p>
                      {product.is_favorite ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#614620] bg-[#322514] px-2 py-0.5 text-[10px] text-[#F4C66A]">
                          <Star size={11} />
                          Favorito
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[#B3B3B8]">
                      {product.name || "Sin descripcion"}
                    </p>
                    {product.sku ? (
                      <p className="mt-1 text-[11px] text-[#77777D]">SKU {product.sku}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-2 py-1 text-[10px] text-[#B3B3B8]">
                        {getCategoryName(product)}
                      </span>
                      {productTags.map((tag) => (
                        <span
                          key={tag?.id}
                          className="rounded-full border border-[#2A2A30] bg-[#151518] px-2 py-1 text-[10px] text-[#77777D]"
                        >
                          {tag?.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatCurrency(price, currency)}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="rounded-lg bg-[#9E1B32] px-3 py-2 text-xs font-semibold hover:bg-[#B91C3C]"
                    >
                      {selectLabel}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#77777D]">
            No hay productos con esos filtros.
          </div>
        ) : null}
      </div>
    </section>
  );
}
