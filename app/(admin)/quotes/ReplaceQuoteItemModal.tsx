"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { isProductCostStale } from "@/lib/productFreshness";

type ReplaceableProduct = {
  id: number;
  sku: string | null;
  brand: string;
  model: string;
  name: string;
  image_url: string | null;
  category: string | null;
  category_id: number | null;
  cost_price: number | null;
  cost_currency: string | null;
  cost_updated_at?: string | null;
  calculated_sale_price: number;
  sale_currency: string;
  is_favorite: boolean | null;
  partner_discount_eligible: boolean | null;
};

type Target = {
  sectionId: string;
  item: { id: number; brand: string; model: string };
};

type Props<P extends ReplaceableProduct> = {
  target: Target | null;
  products: P[];
  occurrenceCount: number;
  onClose: () => void;
  onReplace: (newProduct: P, scope: "single" | "all") => void;
};

export default function ReplaceQuoteItemModal<P extends ReplaceableProduct>({
  target,
  products,
  occurrenceCount,
  onClose,
  onReplace,
}: Props<P>) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<P | null>(null);

  if (!target) return null;

  function handleClose() {
    setSearch("");
    setSelected(null);
    onClose();
  }

  function handlePick(product: P) {
    if (occurrenceCount > 1) {
      setSelected(product);
      return;
    }

    onReplace(product, "single");
    handleClose();
  }

  function handleScope(scope: "single" | "all") {
    if (!selected) return;

    onReplace(selected, scope);
    handleClose();
  }

  const query = search.trim().toLowerCase();
  const results = products
    .filter((product) => product.id !== target.item.id)
    .filter((product) => {
      if (!query) return true;

      return (
        (product.brand || "").trim().toLowerCase().includes(query) ||
        (product.model || "").trim().toLowerCase().includes(query) ||
        (product.name || "").trim().toLowerCase().includes(query) ||
        (product.sku || "").trim().toLowerCase().includes(query)
      );
    })
    .slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-6">
      <div className="max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Reemplazar producto</h3>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Sustituyendo {target.item.brand} {target.item.model} — se
              conserva cantidad, mano de obra, area y ubicacion.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#B3B3B8] hover:text-white"
          >
            ×
          </button>
        </div>

        {selected ? (
          <div className="space-y-4">
            <p className="text-sm text-[#B3B3B8]">
              {target.item.brand} {target.item.model} aparece en{" "}
              {occurrenceCount} partidas de esta cotizacion.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleScope("single")}
                className="flex-1 rounded-xl bg-[#222228] px-4 py-3 font-semibold hover:bg-[#2A2A30]"
              >
                Solo reemplazar aqui
              </button>
              <button
                type="button"
                onClick={() => handleScope("all")}
                className="flex-1 rounded-xl bg-[#9E1B32] px-4 py-3 font-semibold hover:bg-[#B91C3C]"
              >
                Reemplazar en las {occurrenceCount} partidas
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-[#77777D] hover:text-white"
            >
              ← Elegir otro producto
            </button>
          </div>
        ) : (
          <>
            <input
              autoFocus
              type="text"
              placeholder="Buscar producto de reemplazo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-4 w-full rounded-xl bg-[#222228] p-4 outline-none"
            />
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handlePick(product)}
                  className="flex w-full items-center gap-3 rounded-xl bg-[#222228] p-3 text-left hover:bg-[#2A2A30]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#151518]">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-[#77777D]">
                        Sin img
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {product.brand} {product.model}
                    </p>
                    <p className="truncate text-xs text-[#B3B3B8]">
                      {product.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold">
                    {formatCurrency(
                      product.calculated_sale_price,
                      product.sale_currency
                    )}
                    {isProductCostStale(product.cost_updated_at) ? (
                      <p className="text-xs font-normal text-[#F4A66A]">
                        Costo sin verificar
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
              {results.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#77777D]">
                  Sin resultados
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
