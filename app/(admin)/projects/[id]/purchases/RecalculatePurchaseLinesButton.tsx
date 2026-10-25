"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import {
  getPurchaseBudgetEstimate,
  loadOriginalCostCurrencies,
} from "@/lib/projectPurchases";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
};

type Quote = {
  id: number;
};

type OperationalItem = {
  id: number;
  source_quote_item_id: number | null;
  product_id: number | null;
  quantity: number | null;
  original_quantity: number | null;
  original_unit_cost: number | null;
  operational_unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate: number | null;
};

type Product = {
  id: number;
  cost_price: number | null;
  cost_currency: string | null;
};

type PurchaseLine = {
  id: number;
  quote_item_id: number | null;
  project_operational_item_id: number | null;
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
      "Esto recalculara el costo estimado desde el presupuesto cotizado de cada partida (prorrateado entre la cantidad actual) y la moneda desde la base operativa. No borra compras registradas. Continuar?"
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

    const [{ data: operationalItems, error: itemsError }, { data: lines, error: linesError }] =
      await Promise.all([
        supabase
          .from("project_operational_items")
          .select(
            "id, source_quote_item_id, product_id, quantity, original_quantity, original_unit_cost, operational_unit_cost, cost_currency, exchange_rate"
          )
          .eq("client_project_id", projectId),
        supabase
          .from("project_purchase_lines")
          .select("id, quote_item_id, project_operational_item_id, quantity_required, quantity_purchased")
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

    const items = (operationalItems || []) as OperationalItem[];
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

    let originalCurrencies: Map<number, string>;
    try {
      originalCurrencies = await loadOriginalCostCurrencies(supabase, items);
    } catch (currencyError) {
      setRecalculating(false);
      reportError("leer moneda del presupuesto cotizado", currencyError);
      return;
    }

    const productsById = new Map(
      ((products || []) as Product[]).map((product) => [product.id, product])
    );
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const linesMissingExchangeRate: number[] = [];

    for (const line of purchaseLines) {
      if (!line.project_operational_item_id) continue;

      const item = itemsById.get(line.project_operational_item_id);
      const product = item?.product_id ? productsById.get(item.product_id) : null;
      const costCurrency =
        (item?.cost_currency || product?.cost_currency || "USD").toUpperCase() === "MXN"
          ? "MXN"
          : "USD";
      const quantityRequired = Number(line.quantity_required || item?.quantity || 0);
      const quantityPurchased = Number(line.quantity_purchased || 0);
      // Estimado = presupuesto cotizado prorrateado entre la cantidad actual; el
      // costo del producto actual solo aplica a partidas sin presupuesto.
      const estimate = getPurchaseBudgetEstimate({
        quantity: quantityRequired,
        original_quantity: item?.original_quantity,
        original_unit_cost: item?.original_unit_cost,
        original_cost_currency: item ? originalCurrencies.get(item.id) : null,
        operational_unit_cost: Number(item?.operational_unit_cost || product?.cost_price || 0),
        cost_currency: costCurrency,
        exchange_rate: item?.exchange_rate,
      });

      if (estimate.source === "missing_exchange_rate") {
        linesMissingExchangeRate.push(line.id);
        continue;
      }

      const unitCost = estimate.unit_cost;
      const totalRequiredCost = estimate.total_required_cost;
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
    if (linesMissingExchangeRate.length > 0) {
      alert(
        `No se recalcularon ${linesMissingExchangeRate.length} lineas (${linesMissingExchangeRate.join(
          ", "
        )}): su presupuesto cotizado esta en otra moneda y la partida no tiene tipo de cambio.`
      );
    }
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
      {recalculating ? "Recalculando..." : "Recalcular lineas desde base operativa"}
    </button>
  );
}
