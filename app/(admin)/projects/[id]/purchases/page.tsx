import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import { syncProjectOperationalItems } from "@/lib/projectOperationalItems";
import {
  getPurchaseProgressPercent,
  getPurchaseLineVariation,
  summarizePendingBySupplier,
  summarizePurchaseTotalsByCurrency,
  summarizePurchaseVariationMxn,
} from "@/lib/projectPurchases";
import ProjectPurchaseActions, {
  PurchaseEventAction,
  PurchaseLineAction,
  WarehouseEventActions,
} from "./ProjectPurchaseActions";
import RecalculatePurchaseLinesButton from "./RecalculatePurchaseLinesButton";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Client = {
  name: string | null;
};

type Quote = {
  id: number;
  quote_number: string | null;
  exchange_rate: number | null;
};

type OperationalItem = {
  id: number;
  source_quote_id: number | null;
  source_quote_item_id: number | null;
  system_name: string | null;
  product_id: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
  quantity: number | null;
  operational_unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate: number | null;
  status: string | null;
};

type Product = {
  id: number;
  supplier: string | null;
  cost_price: number | null;
  cost_currency: string | null;
  image_url: string | null;
};

type PurchaseLine = PurchaseLineAction & {
  client_project_id: number;
  quote_item_id: number | null;
  project_operational_item_id?: number | null;
  product_id: number | null;
  notes: string | null;
  purchase_status: string | null;
  product_image_url?: string | null;
  exchange_rate?: number | null;
  system_name?: string | null;
};

type PurchaseEvent = PurchaseEventAction & {
  purchase_date: string | null;
  quantity: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate: number | null;
  supplier: string | null;
  invoice_reference: string | null;
  notes: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function getSupplier(value: string | null | undefined) {
  return value?.trim() || "Sin proveedor";
}

function getStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    partial: "Parcial",
    purchased: "Comprado",
    in_warehouse: "En bodega",
    delivered_to_site: "Entregado obra",
  };

  return labels[status || "pending"] || "Pendiente";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "purchased") return "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]";
  if (status === "in_warehouse") return "border-[#345A9E] bg-[#172D53] text-[#AFCBFF]";
  if (status === "delivered_to_site") return "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]";
  if (status === "partial") return "border-[#614620] bg-[#322514] text-[#F4C66A]";
  return "border-[#3A3A42] bg-[#222228] text-[#B3B3B8]";
}

function getDisplayStatus(status: string | null | undefined, events: PurchaseEvent[]) {
  if (events.some((eventItem) => eventItem.warehouse_status === "delivered_to_site")) {
    return "delivered_to_site";
  }

  if (events.some((eventItem) => eventItem.warehouse_status === "received")) {
    return "in_warehouse";
  }

  return status || "pending";
}

function getWarehouseLabel(status: string | null | undefined) {
  if (status === "received") return "Recibido en bodega";
  if (status === "delivered_to_site") return "Entregado a obra";
  return "Pendiente de recibir";
}

function getVariationLabel(status: string) {
  if (status === "saving") return "Ahorro";
  if (status === "overrun") return "Sobrecosto";
  if (status === "no_purchases") return "Sin compras registradas";
  if (status === "missing_exchange_rate") return "Falta TC para calcular variacion";
  return "Sin variacion";
}

function getVariationClass(status: string) {
  if (status === "saving") return "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]";
  if (status === "overrun") return "border-[#7A2E1F] bg-[#3D1C14] text-[#FFB19C]";
  if (status === "missing_exchange_rate") return "border-[#614620] bg-[#322514] text-[#F4C66A]";
  return "border-[#3A3A42] bg-[#222228] text-[#B3B3B8]";
}

function getConsolidationKey(line: PurchaseLine) {
  if (line.product_id) return `product:${line.product_id}`;

  return [
    "manual",
    getSupplier(line.supplier).toLowerCase(),
    (line.product_brand || "").trim().toLowerCase(),
    (line.product_model || "").trim().toLowerCase(),
    (line.product_name || "").trim().toLowerCase(),
    (line.cost_currency || "USD").toUpperCase(),
    Number(line.unit_cost || 0).toFixed(4),
  ].join("|");
}

function combineVariations(
  childLines: Array<PurchaseLine & { variation: ReturnType<typeof getPurchaseLineVariation> }>
) {
  const purchasedQuantity = childLines.reduce(
    (sum, line) => sum + Number(line.variation.purchasedQuantity || 0),
    0
  );
  const estimated = childLines.reduce(
    (sum, line) => sum + Number(line.variation.estimated || 0),
    0
  );
  const real = childLines.reduce((sum, line) => sum + Number(line.variation.real || 0), 0);
  const variation = estimated - real;
  const missingExchangeRate = childLines.some((line) => line.variation.missingExchangeRate);
  const firstLine = childLines[0];

  return {
    currency: "MXN",
    estimatedCurrency: firstLine?.variation.estimatedCurrency || "USD",
    estimatedUnitCost: firstLine?.variation.estimatedUnitCost || 0,
    estimatedUnitCostMxn: firstLine?.variation.estimatedUnitCostMxn || 0,
    estimatedExchangeRate: firstLine?.variation.estimatedExchangeRate || 0,
    realUnitCostAverage: purchasedQuantity > 0 ? real / purchasedQuantity : 0,
    purchasedQuantity,
    estimated,
    real,
    variation,
    percent: estimated > 0 ? (variation / estimated) * 100 : 0,
    status:
      purchasedQuantity <= 0
        ? "no_purchases"
        : missingExchangeRate
          ? "missing_exchange_rate"
          : variation > 0
            ? "saving"
            : variation < 0
              ? "overrun"
              : "neutral",
    missingExchangeRate,
    skippedQuantity: childLines.reduce(
      (sum, line) => sum + Number(line.variation.skippedQuantity || 0),
      0
    ),
  };
}

export default async function ProjectPurchasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, client_id, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link
          href="/projects"
          className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
        >
          <ArrowLeft size={18} />
          Volver a proyectos
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Proyecto no encontrado.
        </section>
      </main>
    );
  }

  const projectData = project as ClientProject;
  const [{ data: client }, { data: approvedQuotes }] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("name")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("quotes")
      .select("id, quote_number, exchange_rate")
      .eq("client_project_id", projectData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
  ]);

  const clientData = client as Client | null;
  const quotes = (approvedQuotes || []) as Quote[];

  let purchaseSqlError: string | null = null;

  try {
    await syncProjectOperationalItems(supabase, projectData.id);
  } catch (syncError) {
    purchaseSqlError =
      syncError &&
      typeof syncError === "object" &&
      "message" in syncError &&
      typeof syncError.message === "string"
        ? syncError.message
        : "No se pudo sincronizar la base operativa.";
  }

  const [operationalItemsResult, existingLinesResult] = !purchaseSqlError
    ? await Promise.all([
        supabase
          .from("project_operational_items")
          .select(
            "id, source_quote_id, source_quote_item_id, system_name, product_id, product_brand, product_model, product_name, product_image_url, quantity, operational_unit_cost, cost_currency, exchange_rate, status"
          )
          .eq("client_project_id", projectData.id)
          .order("system_name", { ascending: true })
          .order("product_brand", { ascending: true }),
        supabase
          .from("project_purchase_lines")
          .select("id, quote_item_id, project_operational_item_id, quantity_purchased")
          .eq("client_project_id", projectData.id),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (operationalItemsResult.error) {
    purchaseSqlError = operationalItemsResult.error.message;
  }

  if (existingLinesResult.error) {
    purchaseSqlError = existingLinesResult.error.message;
  }

  const operationalItems = ((operationalItemsResult.data || []) as OperationalItem[]).filter(
    (item) => item.status !== "deleted"
  );
  const operationalItemsById = new Map(operationalItems.map((item) => [item.id, item]));
  const operationalItemsByQuoteItemId = new Map(
    operationalItems
      .filter((item) => item.source_quote_item_id)
      .map((item) => [item.source_quote_item_id as number, item])
  );
  const productIds = Array.from(
    new Set(
      operationalItems.map((item) => item.product_id).filter(Boolean) as number[]
    )
  );
  const { data: rawProducts } = productIds.length
    ? await supabase
        .from("products")
        .select("id, supplier, cost_price, cost_currency, image_url")
        .in("id", productIds)
    : { data: [] };

  const products = (rawProducts || []) as Product[];
  const productsById = new Map(products.map((productItem) => [productItem.id, productItem]));
  const existingPurchaseLines = (existingLinesResult.data || []) as {
    id: number;
    quote_item_id: number | null;
    project_operational_item_id: number | null;
    quantity_purchased: number | null;
  }[];
  const existingQuoteItemIds = new Set(
    existingPurchaseLines
      .map((line) => line.quote_item_id)
      .filter(Boolean) as number[]
  );
  const existingOperationalItemIds = new Set(
    existingPurchaseLines
      .map((line) => line.project_operational_item_id)
      .filter(Boolean) as number[]
  );

  if (!purchaseSqlError) {
    const linesToLink = existingPurchaseLines
      .filter((line) => !line.project_operational_item_id && line.quote_item_id)
      .map((line) => {
        const operationalItem = line.quote_item_id
          ? operationalItemsByQuoteItemId.get(line.quote_item_id)
          : null;

        return operationalItem
          ? { lineId: line.id, operationalItemId: operationalItem.id }
          : null;
      })
      .filter(Boolean) as { lineId: number; operationalItemId: number }[];

    for (const linkItem of linesToLink) {
      const { error: linkError } = await supabase
        .from("project_purchase_lines")
        .update({
          project_operational_item_id: linkItem.operationalItemId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", linkItem.lineId);

      if (linkError) {
        purchaseSqlError = linkError.message;
        break;
      }

      existingOperationalItemIds.add(linkItem.operationalItemId);
    }
  }

  if (!purchaseSqlError) {
    const activeOperationalItemIds = new Set(operationalItems.map((item) => item.id));
    const staleOpenLineIds = existingPurchaseLines
      .filter((line) => Number(line.quantity_purchased || 0) <= 0)
      .filter(
        (line) =>
          !line.project_operational_item_id ||
          !activeOperationalItemIds.has(line.project_operational_item_id)
      )
      .map((line) => line.id);

    if (staleOpenLineIds.length > 0) {
      const { error: staleDeleteError } = await supabase
        .from("project_purchase_lines")
        .delete()
        .in("id", staleOpenLineIds);

      if (staleDeleteError) {
        purchaseSqlError = staleDeleteError.message;
      }

      staleOpenLineIds.forEach((lineId) => {
        const staleLine = existingPurchaseLines.find((line) => line.id === lineId);
        if (staleLine?.project_operational_item_id) {
          existingOperationalItemIds.delete(staleLine.project_operational_item_id);
        }
      });
    }
  }

  if (!purchaseSqlError) {
    const linesToInsert = operationalItems
      .filter((item) => !existingOperationalItemIds.has(item.id))
      .filter(
        (item) =>
          !item.source_quote_item_id || !existingQuoteItemIds.has(item.source_quote_item_id)
      )
      .map((item) => {
        const productItem = item.product_id ? productsById.get(item.product_id) : null;
        const quantityRequired = Number(item.quantity || 0);
        const costCurrency = (item.cost_currency || productItem?.cost_currency || "USD").toUpperCase();
        const unitCost = Number(item.operational_unit_cost || productItem?.cost_price || 0);
        const totalRequiredCost = quantityRequired * unitCost;

        return {
          client_project_id: projectData.id,
          quote_item_id: item.source_quote_item_id,
          project_operational_item_id: item.id,
          product_id: item.product_id,
          supplier: productItem?.supplier || null,
          product_brand: item.product_brand,
          product_model: item.product_model,
          product_name: item.product_name,
          quantity_required: quantityRequired,
          quantity_purchased: 0,
          cost_currency: costCurrency === "MXN" ? "MXN" : "USD",
          unit_cost: unitCost,
          total_required_cost: totalRequiredCost,
          total_purchased_cost: 0,
          total_pending_cost: totalRequiredCost,
          purchase_status: "pending",
        };
      });

    if (linesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("project_purchase_lines")
        .insert(linesToInsert);

      if (insertError) {
        purchaseSqlError = insertError.message;
      }
    }
  }

  const { data: rawLines, error: linesError } = purchaseSqlError
    ? { data: [], error: null }
    : await supabase
        .from("project_purchase_lines")
        .select(
          "id, client_project_id, quote_item_id, project_operational_item_id, product_id, supplier, product_brand, product_model, product_name, quantity_required, quantity_purchased, cost_currency, unit_cost, total_required_cost, total_purchased_cost, total_pending_cost, purchase_status, notes"
        )
        .eq("client_project_id", projectData.id)
        .order("supplier", { ascending: true })
        .order("total_required_cost", { ascending: false });

  if (linesError) {
    purchaseSqlError = linesError.message;
  }

  const lines = ((rawLines || []) as PurchaseLine[]).map((line) => {
    const productItem = line.product_id ? productsById.get(line.product_id) : null;
    const operationalItem = line.project_operational_item_id
      ? operationalItemsById.get(line.project_operational_item_id)
      : line.quote_item_id
        ? operationalItemsByQuoteItemId.get(line.quote_item_id)
        : null;

    return {
      ...line,
      product_image_url:
        operationalItem?.product_image_url ||
        productItem?.image_url ||
        null,
      exchange_rate:
        operationalItem?.exchange_rate ||
        null,
      system_name: operationalItem?.system_name || null,
    };
  });

  const lineIds = lines.map((line) => line.id);
  const { data: rawEvents } =
    !purchaseSqlError && lineIds.length > 0
      ? await supabase
          .from("project_purchase_events")
          .select(
            "id, project_purchase_line_id, purchase_date, quantity, unit_cost, cost_currency, exchange_rate, supplier, invoice_reference, warehouse_status, notes"
          )
          .in("project_purchase_line_id", lineIds)
          .order("purchase_date", { ascending: false })
          .order("created_at", { ascending: false })
      : { data: [] };

  const events = (rawEvents || []) as PurchaseEvent[];
  const eventsByLine = new Map<number, PurchaseEvent[]>();
  events.forEach((eventItem) => {
    const existing = eventsByLine.get(eventItem.project_purchase_line_id) || [];
    eventsByLine.set(eventItem.project_purchase_line_id, [...existing, eventItem]);
  });

  const totalsByCurrency = summarizePurchaseTotalsByCurrency(lines);
  const pendingBySupplier = summarizePendingBySupplier(lines);
  const progressPercent = getPurchaseProgressPercent(lines);
  const variationMxn = summarizePurchaseVariationMxn(lines, eventsByLine);
  const linesWithVariation = lines
    .map((line) => ({
      ...line,
      variation: getPurchaseLineVariation(line, eventsByLine.get(line.id) || []),
    }))
    .sort(
      (a, b) =>
        Math.abs(b.variation.variation) - Math.abs(a.variation.variation) ||
        Number(b.total_required_cost || 0) - Number(a.total_required_cost || 0)
    );
  const consolidatedLines = Array.from(
    linesWithVariation.reduce((map, line) => {
      const key = getConsolidationKey(line);
      const existing = map.get(key) || [];
      map.set(key, [...existing, line]);
      return map;
    }, new Map<string, typeof linesWithVariation>())
  )
    .map(([key, childLines]) => {
      const representative = childLines[0];
      const quantityRequired = childLines.reduce(
        (sum, line) => sum + Number(line.quantity_required || 0),
        0
      );
      const quantityPurchased = childLines.reduce(
        (sum, line) => sum + Number(line.quantity_purchased || 0),
        0
      );
      const totalRequiredCost = childLines.reduce(
        (sum, line) => sum + Number(line.total_required_cost || 0),
        0
      );
      const totalPurchasedCost = childLines.reduce(
        (sum, line) => sum + Number(line.total_purchased_cost || 0),
        0
      );
      const totalPendingCost = childLines.reduce(
        (sum, line) => sum + Number(line.total_pending_cost || 0),
        0
      );
      const eventsForGroup = childLines.flatMap((line) => eventsByLine.get(line.id) || []);
      const variation = combineVariations(childLines);
      const origins = Array.from(
        new Set(
          childLines.map((line) => {
            if (line.system_name?.trim()) {
              return line.system_name;
            }

            return line.project_operational_item_id
              ? "Base operativa"
              : "Historico de compras";
          })
        )
      );
      const displayStatus = getDisplayStatus(
        quantityPurchased >= quantityRequired
          ? "purchased"
          : quantityPurchased > 0
            ? "partial"
            : "pending",
        eventsForGroup
      );
      const unitCost =
        Number(representative.quantity_required || 0) > 0
          ? Number(representative.total_required_cost || 0) /
            Number(representative.quantity_required || 0)
          : Number(representative.unit_cost || 0);
      const actionLine: PurchaseLineAction = {
        id: representative.id,
        supplier: representative.supplier,
        product_brand: representative.product_brand,
        product_model: representative.product_model,
        product_name: representative.product_name,
        quantity_required: quantityRequired,
        quantity_purchased: quantityPurchased,
        cost_currency: representative.cost_currency || "USD",
        unit_cost: unitCost,
        total_required_cost: totalRequiredCost,
        total_purchased_cost: totalPurchasedCost,
        total_pending_cost: totalPendingCost,
        exchange_rate: Number(representative.exchange_rate || 0) || null,
        child_lines: childLines
          .sort((a, b) => {
            const aPending =
              Number(a.quantity_required || 0) - Number(a.quantity_purchased || 0);
            const bPending =
              Number(b.quantity_required || 0) - Number(b.quantity_purchased || 0);
            return Number(bPending > 0) - Number(aPending > 0) || a.id - b.id;
          })
          .map((line) => ({
            id: line.id,
            supplier: line.supplier,
            quantity_required: Number(line.quantity_required || 0),
            quantity_purchased: Number(line.quantity_purchased || 0),
            unit_cost:
              Number(line.quantity_required || 0) > 0
                ? Number(line.total_required_cost || 0) / Number(line.quantity_required || 0)
                : Number(line.unit_cost || 0),
            total_required_cost: Number(line.total_required_cost || 0),
            total_purchased_cost: Number(line.total_purchased_cost || 0),
          })),
      };

      return {
        key,
        representative,
        childLines,
        events: eventsForGroup,
        origins,
        originText: origins.join(" / "),
        quantity_required: quantityRequired,
        quantity_purchased: quantityPurchased,
        total_required_cost: totalRequiredCost,
        total_purchased_cost: totalPurchasedCost,
        total_pending_cost: totalPendingCost,
        displayStatus,
        variation,
        actionLine,
      };
    })
    .sort(
      (a, b) =>
        getSupplier(a.representative.supplier).localeCompare(
          getSupplier(b.representative.supplier)
        ) ||
        Math.abs(b.variation.variation) - Math.abs(a.variation.variation) ||
        Number(b.total_required_cost || 0) - Number(a.total_required_cost || 0)
    );

  const actionLines: PurchaseLineAction[] = consolidatedLines.map(
    (line) => line.actionLine
  );
  const actionEvents: PurchaseEventAction[] = events.map((eventItem) => ({
    id: eventItem.id,
    project_purchase_line_id: eventItem.project_purchase_line_id,
    warehouse_status: eventItem.warehouse_status,
  }));

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${projectData.id}`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver al proyecto
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            COMPRAS DE EQUIPO
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {projectData.name || "Proyecto operativo"}
          </h1>
          <p className="mt-3 text-[#B3B3B8]">
            {clientData?.name || "Sin cliente"} / Control interno de compras y bodega.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <RecalculatePurchaseLinesButton projectId={projectData.id} />
          <ProjectPurchaseActions lines={actionLines} events={actionEvents} />
        </div>
      </section>

      {purchaseSqlError ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
          Ejecuta el SQL del modulo de compras para habilitar esta vista. Detalle:{" "}
          {purchaseSqlError}
        </section>
      ) : null}

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Avance</p>
          <p className="mt-1 text-lg font-bold">{formatNumber(progressPercent)}%</p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Lineas consolidadas</p>
          <p className="mt-1 text-lg font-bold">{consolidatedLines.length}</p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Ahorro</p>
          <p className="mt-1 text-lg font-bold text-[#8CE0B6]">
            {formatCurrency(variationMxn.saving, "MXN")}
          </p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Sobrecosto</p>
          <p className="mt-1 text-lg font-bold text-[#FFB19C]">
            {formatCurrency(variationMxn.overrun, "MXN")}
          </p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Neta</p>
          <p
            className={`mt-1 text-lg font-bold ${
              variationMxn.net >= 0 ? "text-[#8CE0B6]" : "text-[#FFB19C]"
            }`}
          >
            {formatCurrency(variationMxn.net, "MXN")}
          </p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Pendiente</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#F4C66A]">
            {Array.from(totalsByCurrency.entries())
              .map(([currency, totals]) => formatCurrency(totals.pending, currency))
              .join(" / ") || "Sin pendiente"}
          </p>
        </div>
      </section>

      {pendingBySupplier.size > 0 ? (
        <section className="mb-5 rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {Array.from(pendingBySupplier.entries()).map(([supplier, currencyTotals]) => (
              <span
                key={supplier}
                className="inline-flex rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-[#B3B3B8]"
              >
                {supplier}:{" "}
                {Array.from(currencyTotals.entries())
                  .map(([currency, total]) => formatCurrency(total, currency))
                  .join(" / ")}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
        {consolidatedLines.length === 0 ? (
          <div className="p-8 text-[#77777D]">
            No hay partidas de equipo sincronizadas para este proyecto.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1580px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-3 py-2 font-semibold">Proveedor</th>
                  <th className="px-3 py-2 font-semibold">Marca</th>
                  <th className="px-3 py-2 font-semibold">Modelo</th>
                  <th className="px-3 py-2 font-semibold">Descripcion</th>
                  <th className="px-3 py-2 font-semibold">Origen</th>
                  <th className="px-3 py-2 text-right font-semibold">Req.</th>
                  <th className="px-3 py-2 text-right font-semibold">Comprado</th>
                  <th className="px-3 py-2 text-right font-semibold">Pendiente</th>
                  <th className="px-3 py-2 text-right font-semibold">Estimado Unit.</th>
                  <th className="px-3 py-2 text-right font-semibold">Real Unit.</th>
                  <th className="px-3 py-2 text-right font-semibold">Estimado Total</th>
                  <th className="px-3 py-2 text-right font-semibold">Real Comprado</th>
                  <th className="px-3 py-2 text-right font-semibold">Variacion</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedLines.map((line) => {
                  const representative = line.representative;
                  const pendingQuantity = Math.max(
                    Number(line.quantity_required || 0) -
                      Number(line.quantity_purchased || 0),
                    0
                  );
                  const variationIsVisible =
                    line.variation.status !== "no_purchases" &&
                    line.variation.status !== "missing_exchange_rate";

                  return (
                    <tr
                      key={line.key}
                      className="border-b border-[#222228] align-top hover:bg-[#1A1A1F]"
                    >
                      <td className="px-3 py-2">{getSupplier(representative.supplier)}</td>
                      <td className="px-3 py-2">{representative.product_brand || "-"}</td>
                      <td className="px-3 py-2 font-semibold">
                        {representative.product_model || "-"}
                      </td>
                      <td className="max-w-[260px] truncate px-3 py-2 text-[#B3B3B8]">
                        {representative.product_name || "Sin descripcion"}
                      </td>
                      <td
                        className="max-w-[240px] truncate px-3 py-2 text-[#77777D]"
                        title={line.originText}
                      >
                        {line.originText || "Sin origen"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(line.quantity_required)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(line.quantity_purchased)}
                      </td>
                      <td className="px-3 py-2 text-right text-[#F4C66A]">
                        {formatNumber(pendingQuantity)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <p>
                          {formatCurrency(
                            line.variation.estimatedUnitCost,
                            line.variation.estimatedCurrency
                          )}
                        </p>
                        {line.variation.estimatedCurrency === "USD" ? (
                          <p className="text-[10px] text-[#77777D]">
                            {line.variation.estimatedExchangeRate > 0
                              ? formatCurrency(line.variation.estimatedUnitCostMxn, "MXN")
                              : "Falta TC"}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {line.variation.purchasedQuantity > 0
                          ? formatCurrency(line.variation.realUnitCostAverage, "MXN")
                          : "Sin compras"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {line.variation.purchasedQuantity > 0
                          ? formatCurrency(line.variation.estimated, "MXN")
                          : "Sin compras"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {line.variation.purchasedQuantity > 0
                          ? formatCurrency(line.variation.real, "MXN")
                          : "Sin compras"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {variationIsVisible ? (
                          <>
                            <p
                              className={`font-semibold ${
                                line.variation.variation >= 0
                                  ? "text-[#8CE0B6]"
                                  : "text-[#FFB19C]"
                              }`}
                            >
                              {formatCurrency(line.variation.variation, "MXN")}
                            </p>
                            <p className="text-[10px] text-[#77777D]">
                              {formatNumber(line.variation.percent)}%
                            </p>
                          </>
                        ) : (
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[10px] ${getVariationClass(
                              line.variation.status
                            )}`}
                          >
                            {getVariationLabel(line.variation.status)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getStatusClass(
                            line.displayStatus
                          )}`}
                        >
                          {getStatusLabel(line.displayStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-[170px] flex-col gap-2">
                          <ProjectPurchaseActions
                            lines={actionLines}
                            events={actionEvents}
                            triggerLineId={line.actionLine.id}
                            triggerLabel="Comprar"
                          />
                          {line.events.length > 0 ? (
                            <details className="rounded-lg border border-[#2A2A30] bg-[#101114] px-2 py-1">
                              <summary className="cursor-pointer text-[11px] font-semibold text-[#B3B3B8]">
                                {line.events.length} compras
                              </summary>
                              <div className="mt-2 space-y-2">
                                {line.events.map((eventItem) => (
                                  <div
                                    key={eventItem.id}
                                    className="rounded-md border border-[#2A2A30] p-2"
                                  >
                                    <p className="font-semibold">
                                      {formatDate(eventItem.purchase_date)} /{" "}
                                      {formatNumber(eventItem.quantity)} pzas
                                    </p>
                                    <p className="text-[#B3B3B8]">
                                      {formatCurrency(
                                        eventItem.unit_cost,
                                        eventItem.cost_currency
                                      )}
                                      {eventItem.cost_currency === "USD" &&
                                      eventItem.exchange_rate ? (
                                        <> / TC {formatNumber(eventItem.exchange_rate)}</>
                                      ) : null}
                                    </p>
                                    <p className="text-[#77777D]">
                                      {eventItem.invoice_reference || "Sin referencia"} -{" "}
                                      {getWarehouseLabel(eventItem.warehouse_status)}
                                    </p>
                                    <div className="mt-2">
                                      <WarehouseEventActions
                                        eventId={eventItem.id}
                                        lineId={eventItem.project_purchase_line_id}
                                        currentStatus={eventItem.warehouse_status}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
