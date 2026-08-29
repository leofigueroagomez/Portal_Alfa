"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight, ShieldCheck, Check, Sparkles } from "lucide-react";
import { Brand, CatalogProduct } from "@/lib/catalog";
import { brandLineLabel, brandSearchPlaceholder } from "@/lib/catalogBrandUi";

type Props = {
  brand: Brand;
  products: CatalogProduct[];
};

type CategoryTab = { id: string; label: string };

// Tabs curados para Lutron RadioRA 3 (agrupación por familia de producto).
const LUTRON_TABS: CategoryTab[] = [
  { id: "all", label: "Todos los Modelos" },
  { id: "dimmers", label: "Atenuadores & Apagadores Sunnata" },
  { id: "keypads", label: "Botoneras & Teclados de Escena" },
  { id: "hubs", label: "Procesadores & Hubs" },
  { id: "lumaris", label: "Lumaris Tiras LED & Downlights" },
  { id: "accessories", label: "Accesorios & Montaje" },
];

// Para el resto de marcas los tabs se derivan del campo `category` de cada producto.
function buildCategoryTabs(brand: Brand, products: CatalogProduct[]): CategoryTab[] {
  if (brand.slug === "lutron") return LUTRON_TABS;
  const cats: string[] = [];
  for (const p of products) {
    if (p.category && !cats.includes(p.category)) cats.push(p.category);
  }
  return [{ id: "all", label: "Todos los Modelos" }, ...cats.map((c) => ({ id: c, label: c }))];
}

export default function BrandCatalogClient({ brand, products }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  const categoryTabs = useMemo(() => buildCategoryTabs(brand, products), [brand, products]);
  const lineLabel = brandLineLabel(brand.slug);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      // Filter by search query
      const matchesSearch =
        !q ||
        (p.model || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.short_description || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filter by tab
      if (selectedTab === "all") return true;

      // Marcas sin tabs curados: el tab es el nombre exacto de la categoría.
      if (brand.slug !== "lutron") {
        return p.category === selectedTab;
      }

      const modelUpper = (p.model || "").toUpperCase();
      const nameUpper = (p.name || "").toUpperCase();

      if (selectedTab === "dimmers") {
        return (
          modelUpper.includes("PRON") ||
          modelUpper.includes("8ANS") ||
          modelUpper.includes("STRD") ||
          modelUpper.includes("STRS") ||
          modelUpper.includes("ST6ANS") ||
          nameUpper.includes("ATENUADOR") ||
          nameUpper.includes("APAGADOR") ||
          nameUpper.includes("INTERRUPTOR")
        );
      }

      if (selectedTab === "keypads") {
        return (
          modelUpper.includes("STW") ||
          modelUpper.includes("STHN") ||
          nameUpper.includes("BOTONERA") ||
          nameUpper.includes("TECLADO")
        );
      }

      if (selectedTab === "hubs") {
        return modelUpper.includes("PROC3") || nameUpper.includes("PROCESADOR");
      }

      if (selectedTab === "lumaris") {
        return (
          modelUpper.includes("LUT05") ||
          modelUpper.includes("LUT30") ||
          modelUpper.includes("RRLCD") ||
          modelUpper.includes("RRLTLK") ||
          modelUpper.includes("RRLTWC") ||
          nameUpper.includes("LUMARIS") ||
          nameUpper.includes("CINTA LED") ||
          nameUpper.includes("DOWNLIGHT")
        );
      }

      if (selectedTab === "accessories") {
        return (
          modelUpper.includes("LUBP1") ||
          modelUpper.includes("LUCK1") ||
          modelUpper.includes("LUMK1") ||
          modelUpper.includes("LUPH3A") ||
          modelUpper.includes("LUWK1") ||
          modelUpper.includes("STANF") ||
          nameUpper.includes("ADAPTADOR") ||
          nameUpper.includes("CONECTOR") ||
          nameUpper.includes("CLIP") ||
          nameUpper.includes("CABLE") ||
          nameUpper.includes("VENTILADOR")
        );
      }

      return true;
    });
  }, [products, search, selectedTab, brand.slug]);

  return (
    <div className="space-y-10">
      {/* Search & Tabs Controls */}
      <div className="rounded-2xl border border-white/10 bg-[#121216] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={brandSearchPlaceholder(brand.slug, brand.name)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#9E1B32] transition"
            />
          </div>

          <div className="text-xs text-zinc-400">
            Mostrando <span className="font-semibold text-white">{filteredProducts.length}</span> modelos oficiales
          </div>
        </div>

        {/* Tab categories */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/5">
          {categoryTabs.map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#9E1B32] text-white shadow-md shadow-[#9E1B32]/30"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121216] p-12 text-center">
          <p className="text-base text-zinc-400">
            No se encontraron modelos con la búsqueda &quot;{search}&quot;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedTab("all");
            }}
            className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#E07A8B] hover:underline"
          >
            Limpiar filtros y ver todos los modelos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const whatsappMsg = encodeURIComponent(
              `Hola ALFA, me interesa cotizar el equipo oficial ${product.brand_name} ${product.model} (${product.name}) para mi proyecto.`
            );
            const whatsappUrl = `https://wa.me/523318574884?text=${whatsappMsg}`;

            return (
              <div
                key={product.id}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121216] p-5 transition duration-300 hover:border-[#9E1B32]/50 hover:bg-[#16161B] hover:shadow-xl hover:shadow-[#9E1B32]/10"
              >
                <div>
                  {/* Image container */}
                  <div className="relative aspect-square w-full rounded-xl bg-gradient-to-b from-white/[0.06] to-black/40 border border-white/10 p-2 flex items-center justify-center overflow-hidden mb-4 group-hover:border-[#9E1B32]/40 transition duration-300">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={`${product.brand_name} ${product.model}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain p-2 rounded-lg transition duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const currentSrc = target.src;
                          if (currentSrc.endsWith('.avif')) {
                            target.src = currentSrc.replace(/\.avif$/, '.png');
                          } else if (currentSrc.endsWith('.png')) {
                            target.src = currentSrc.replace(/\.png$/, '.jpg');
                          } else if (currentSrc.endsWith('.jpg')) {
                            target.src = currentSrc.replace(/\.jpg$/, '.jpeg');
                          } else if (currentSrc.endsWith('.jpeg')) {
                            target.src = currentSrc.replace(/\.jpeg$/, '.webp');
                          } else {
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.placeholder-msg')) {
                              const placeholder = document.createElement('div');
                              placeholder.className = 'placeholder-msg flex h-full w-full items-center justify-center text-center p-3 text-[11px] text-zinc-500';
                              placeholder.innerText = 'Foto oficial en calibración';
                              parent.appendChild(placeholder);
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#18181D] text-xs text-zinc-600 rounded-lg">
                        Fotografía en calibración
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider text-zinc-200 border border-white/15">
                        {product.model}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="mb-2">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-[#E07A8B]">
                      {product.brand_name}
                      {lineLabel
                        ? ` • ${lineLabel}`
                        : product.category
                        ? ` • ${product.category}`
                        : ""}
                    </span>
                    <h3 className="mt-1 text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-white">
                      {product.name}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-2 mb-4">
                    {product.short_description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                      <Check className="h-3.5 w-3.5 text-[#E07A8B] shrink-0" />
                      <span>Garantía Oficial {product.brand_name} México</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                      <Check className="h-3.5 w-3.5 text-[#E07A8B] shrink-0" />
                      <span>Integración & Soporte ALFA OS</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <Link
                    href={`/marcas/${brand.slug}/${product.slug}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition"
                  >
                    <span>Ver Ficha Técnica</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </Link>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center rounded-lg bg-[#9E1B32] hover:bg-[#B91C3C] py-2 text-[11px] font-semibold uppercase tracking-wider text-white transition shadow-sm"
                  >
                    Cotizar este modelo
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
