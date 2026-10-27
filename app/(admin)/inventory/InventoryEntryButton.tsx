"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_INVENTORY_LOCATION } from "@/lib/inventoryContract";
import {
  registerInventoryEntryAction,
  searchInventoryProductsAction,
  type InventoryProductOption,
} from "./actions";

type SupplierOption = { id: number; name: string };

type Props = {
  suppliers: SupplierOption[];
  locations: string[];
};

const inputClass =
  "w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]";

function productLabel(product: InventoryProductOption) {
  return [product.brand, product.model].filter(Boolean).join(" ") || `Producto #${product.id}`;
}

export default function InventoryEntryButton({ suppliers, locations }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InventoryProductOption[]>([]);
  const [product, setProduct] = useState<InventoryProductOption | null>(null);
  const [location, setLocation] = useState(DEFAULT_INVENTORY_LOCATION);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [costCurrency, setCostCurrency] = useState<"USD" | "MXN">("MXN");
  const [exchangeRate, setExchangeRate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || product || query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const options = await searchInventoryProductsAction(query);
      if (!cancelled) setResults(options);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, product, query]);

  function reset() {
    setQuery("");
    setResults([]);
    setProduct(null);
    setLocation(DEFAULT_INVENTORY_LOCATION);
    setQuantity("");
    setUnitCost("");
    setCostCurrency("MXN");
    setExchangeRate("");
    setSupplierId("");
    setInvoiceReference("");
    setNotes("");
    setError(null);
  }

  function selectProduct(option: InventoryProductOption) {
    setProduct(option);
    setResults([]);
    setUnitCost(option.cost_price != null ? String(Number(option.cost_price)) : "");
    setCostCurrency(option.cost_currency === "USD" ? "USD" : "MXN");
    setSupplierId(option.supplier_id ? String(option.supplier_id) : "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) {
      setError("Selecciona un producto del catalogo.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await registerInventoryEntryAction({
        productId: product.id,
        location,
        quantity,
        unitCost,
        costCurrency,
        exchangeRate,
        supplierId,
        invoiceReference,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-4 py-2.5 text-sm font-semibold hover:bg-[#B91C3C]"
      >
        <Plus size={18} />
        Alta de entrada
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Alta de entrada</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Material que entra al almacén. El costo promedio se recalcula en MXN.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Producto</span>
                {product ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{productLabel(product)}</p>
                      <p className="truncate text-xs text-[#B3B3B8]">{product.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProduct(null)}
                      className="text-xs text-[#B3B3B8] hover:text-white"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77777D]"
                    />
                    <input
                      autoFocus
                      className={`${inputClass} pl-10`}
                      placeholder="Busca por modelo, marca o nombre"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        if (event.target.value.trim().length < 2) setResults([]);
                      }}
                    />
                    {results.length > 0 ? (
                      <ul className="absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#2A2A30] bg-[#151518] shadow-2xl">
                        {results.map((option) => (
                          <li key={option.id}>
                            <button
                              type="button"
                              onClick={() => selectProduct(option)}
                              className="w-full px-4 py-3 text-left hover:bg-[#222228]"
                            >
                              <p className="text-sm font-semibold">{productLabel(option)}</p>
                              <p className="truncate text-xs text-[#B3B3B8]">{option.name}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              </div>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Ubicación</span>
                <input
                  className={inputClass}
                  list="inventory-locations"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
                <datalist id="inventory-locations">
                  {locations.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">
                  Cantidad{product?.unit_name ? ` (${product.unit_name})` : ""}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Costo unitario</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  className={inputClass}
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Moneda</span>
                <select
                  className={inputClass}
                  value={costCurrency}
                  onChange={(event) => setCostCurrency(event.target.value as "USD" | "MXN")}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Tipo de cambio</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  disabled={costCurrency === "MXN"}
                  className={inputClass}
                  value={exchangeRate}
                  onChange={(event) => setExchangeRate(event.target.value)}
                  placeholder="Requerido si es USD"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Proveedor</span>
                <select
                  className={inputClass}
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Factura / orden</span>
                <input
                  className={inputClass}
                  value={invoiceReference}
                  onChange={(event) => setInvoiceReference(event.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Notas</span>
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>

            {costCurrency === "USD" && Number(unitCost) > 0 && Number(exchangeRate) > 0 ? (
              <p className="mt-4 text-sm text-[#B3B3B8]">
                Entra a {formatCurrency(Number(unitCost) * Number(exchangeRate), "MXN")} por unidad.
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-xl border border-[#7A2E1F] bg-[#3D1C14] px-4 py-3 text-sm text-[#FFB19C]">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] px-4 py-2.5 text-sm text-[#B3B3B8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#9E1B32] px-4 py-2.5 text-sm font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {isPending ? "Guardando..." : "Registrar entrada"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
