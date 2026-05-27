"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
};

type Quote = {
  id: number;
};

type QuoteItem = {
  id: number;
  quote_id: number;
  product_id: number | null;
  quantity: number | null;
};

type Product = {
  id: number;
  cost_price: number | null;
  cost_currency: string | null;
};

type PurchaseLine = {
  id: number;
  quote_item_id: number | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
};

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

export default function RecalculatePurchaseLinesButton({ projectId }: Props) {
  const router = useRouter();
  const [recalculating, setRecalculating] = useState(false);

  async function handleRecalculate() {
    const confirmed = window.confirm(
      "Esto recalculara costo estimado y moneda desde productos/cotizaciones. No borra compras registradas. Continuar?"
    );

    if (!confirmed) return;

    setRecalculating(true);

    const { data: quotes, error: quotesError } = await supabase
      .from("quotes")
      .select("id")
      .eq("client_project_id", projectId)
      .eq("status", "approved");

    if (quotesError) {
      setRecalculating(false);
      reportError("leer cotizaciones aprobadas", quotesError);
      return;
    }

    const quoteIds = ((quotes || []) as Quote[]).map((quote) => quote.id);

    if (quoteIds.length === 0) {
      setRecalculating(false);
      alert("No hay cotizaciones aprobadas para recalcular.");
      return;
    }

    const [{ data: quoteItems, error: itemsError }, { data: lines, error: linesError }] =
      await Promise.all([
        supabase
          .from("quote_items")
          .select("id, quote_id, product_id, quantity")
          .in("quote_id", quoteIds),
        supabase
          .from("project_purchase_lines")
          .select("id, quote_item_id, quantity_required, quantity_purchased")
          .eq("client_project_id", projectId),
      ]);

    if (itemsError || linesError) {
      setRecalculating(false);
      reportError(
        "leer partidas de compra",
        itemsError || linesError || { message: "Error desconocido" }
      );
      return;
    }

    const items = (quoteItems || []) as QuoteItem[];
    const purchaseLines = (lines || []) as PurchaseLine[];
    const productIds = Array.from(
      new Set(items.map((item) => item.product_id).filter(Boolean) as number[])
    );
    const { data: products, error: productsError } = productIds.length
      ? await supabase
          .from("products")
          .select("id, cost_price, cost_currency")
          .in("id", productIds)
      : { data: [], error: null };

    if (productsError) {
      setRecalculating(false);
      reportError("leer costos de productos", productsError);
      return;
    }

    const productsById = new Map(
      ((products || []) as Product[]).map((product) => [product.id, product])
    );
    const itemsById = new Map(items.map((item) => [item.id, item]));

    for (const line of purchaseLines) {
      if (!line.quote_item_id) continue;

      const item = itemsById.get(line.quote_item_id);
      const product = item?.product_id ? productsById.get(item.product_id) : null;
      const unitCost = Number(product?.cost_price || 0);
      const costCurrency =
        (product?.cost_currency || "USD").toUpperCase() === "MXN" ? "MXN" : "USD";
      const quantityRequired = Number(line.quantity_required || item?.quantity || 0);
      const quantityPurchased = Number(line.quantity_purchased || 0);
      const totalRequiredCost = unitCost * quantityRequired;
      const totalPendingCost = Math.max(
        totalRequiredCost - unitCost * quantityPurchased,
        0
      );

      const { error: updateError } = await supabase
        .from("project_purchase_lines")
        .update({
          unit_cost: unitCost,
          cost_currency: costCurrency,
          total_required_cost: totalRequiredCost,
          total_pending_cost: totalPendingCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id);

      if (updateError) {
        setRecalculating(false);
        reportError(`recalcular linea ${line.id}`, updateError);
        return;
      }
    }

    setRecalculating(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRecalculate}
      disabled={recalculating}
      className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white disabled:text-[#77777D]"
    >
      <RefreshCw size={17} />
      {recalculating ? "Recalculando..." : "Recalcular lineas desde cotizacion/productos"}
    </button>
  );
}
