import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getPurchaseProgressPercent,
  summarizePendingBySupplier,
  summarizePurchaseTotalsByCurrency,
} from "@/lib/projectPurchases";
import ProjectPurchaseActions, {
  PurchaseEventAction,
  PurchaseLineAction,
  WarehouseEventActions,
} from "./ProjectPurchaseActions";

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
};

type QuoteItem = {
  id: number;
  quote_id: number;
  product_id: number | null;
  quantity: number | null;
  sale_currency: string | null;
  unit_equipment_price: number | null;
  unit_equipment_price_usd?: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
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
  product_id: number | null;
  notes: string | null;
  purchase_status: string | null;
  product_image_url?: string | null;
};

type PurchaseEvent = PurchaseEventAction & {
  purchase_date: string | null;
  quantity: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
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
    in_warehouse: "En bodega / obra",
  };

  return labels[status || "pending"] || "Pendiente";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "purchased") return "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]";
  if (status === "in_warehouse") return "border-[#345A9E] bg-[#172D53] text-[#AFCBFF]";
  if (status === "partial") return "border-[#614620] bg-[#322514] text-[#F4C66A]";
  return "border-[#3A3A42] bg-[#222228] text-[#B3B3B8]";
}

function getWarehouseLabel(status: string | null | undefined) {
  if (status === "received") return "Recibido en bodega";
  if (status === "delivered_to_site") return "Entregado a obra";
  return "Pendiente de recibir";
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
      .select("id, quote_number")
      .eq("client_project_id", projectData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
  ]);

  const clientData = client as Client | null;
  const quotes = (approvedQuotes || []) as Quote[];
  const quoteIds = quotes.map((quote) => quote.id);

  let purchaseSqlError: string | null = null;
  const [{ data: rawQuoteItems }, existingLinesResult] =
    quoteIds.length > 0
      ? await Promise.all([
          supabase
            .from("quote_items")
            .select(
              "id, quote_id, product_id, quantity, sale_currency, unit_equipment_price, unit_equipment_price_usd, product_brand, product_model, product_name, product_image_url"
            )
            .in("quote_id", quoteIds),
          supabase
            .from("project_purchase_lines")
            .select("id, quote_item_id")
            .eq("client_project_id", projectData.id),
        ])
      : [{ data: [] }, { data: [], error: null }];

  if (existingLinesResult.error) {
    purchaseSqlError = existingLinesResult.error.message;
  }

  const quoteItems = (rawQuoteItems || []) as QuoteItem[];
  const productIds = Array.from(
    new Set(quoteItems.map((item) => item.product_id).filter(Boolean) as number[])
  );
  const { data: rawProducts } = productIds.length
    ? await supabase
        .from("products")
        .select("id, supplier, cost_price, cost_currency, image_url")
        .in("id", productIds)
    : { data: [] };

  const products = (rawProducts || []) as Product[];
  const productsById = new Map(products.map((productItem) => [productItem.id, productItem]));
  const existingQuoteItemIds = new Set(
    ((existingLinesResult.data || []) as { quote_item_id: number | null }[])
      .map((line) => line.quote_item_id)
      .filter(Boolean) as number[]
  );

  if (!purchaseSqlError) {
    const linesToInsert = quoteItems
      .filter((item) => !existingQuoteItemIds.has(item.id))
      .map((item) => {
        const productItem = item.product_id ? productsById.get(item.product_id) : null;
        const quantityRequired = Number(item.quantity || 0);
        const costCurrency =
          (productItem?.cost_currency || item.sale_currency || "USD").toUpperCase();
        const unitCost =
          Number(productItem?.cost_price) ||
          Number(item.unit_equipment_price_usd) ||
          Number(item.unit_equipment_price || 0);
        const totalRequiredCost = quantityRequired * unitCost;

        return {
          client_project_id: projectData.id,
          quote_item_id: item.id,
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
          "id, client_project_id, quote_item_id, product_id, supplier, product_brand, product_model, product_name, quantity_required, quantity_purchased, cost_currency, unit_cost, total_required_cost, total_purchased_cost, total_pending_cost, purchase_status, notes"
        )
        .eq("client_project_id", projectData.id)
        .order("supplier", { ascending: true })
        .order("total_required_cost", { ascending: false });

  if (linesError) {
    purchaseSqlError = linesError.message;
  }

  const lines = ((rawLines || []) as PurchaseLine[]).map((line) => {
    const productItem = line.product_id ? productsById.get(line.product_id) : null;
    const quoteItem = line.quote_item_id
      ? quoteItems.find((item) => item.id === line.quote_item_id)
      : null;

    return {
      ...line,
      product_image_url: productItem?.image_url || quoteItem?.product_image_url || null,
    };
  });

  const lineIds = lines.map((line) => line.id);
  const { data: rawEvents } =
    !purchaseSqlError && lineIds.length > 0
      ? await supabase
          .from("project_purchase_events")
          .select(
            "id, project_purchase_line_id, purchase_date, quantity, unit_cost, cost_currency, supplier, invoice_reference, warehouse_status, notes"
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
  const groupedLines = Array.from(
    lines.reduce((map, line) => {
      const supplier = getSupplier(line.supplier);
      const existing = map.get(supplier) || [];
      map.set(supplier, [...existing, line]);
      return map;
    }, new Map<string, PurchaseLine[]>())
  ).sort(([a], [b]) => a.localeCompare(b));

  const actionLines: PurchaseLineAction[] = lines.map((line) => ({
    id: line.id,
    supplier: line.supplier,
    product_brand: line.product_brand,
    product_model: line.product_model,
    product_name: line.product_name,
    quantity_required: Number(line.quantity_required || 0),
    quantity_purchased: Number(line.quantity_purchased || 0),
    cost_currency: line.cost_currency || "USD",
    unit_cost: Number(line.unit_cost || 0),
    total_required_cost: Number(line.total_required_cost || 0),
    total_purchased_cost: Number(line.total_purchased_cost || 0),
    total_pending_cost: Number(line.total_pending_cost || 0),
  }));
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

        <ProjectPurchaseActions lines={actionLines} events={actionEvents} />
      </section>

      {purchaseSqlError ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
          Ejecuta el SQL del modulo de compras para habilitar esta vista. Detalle:{" "}
          {purchaseSqlError}
        </section>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">% avance compras</p>
          <p className="text-2xl font-bold">{formatNumber(progressPercent)}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#222228]">
            <div
              className="h-full rounded-full bg-[#9E1B32]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {Array.from(totalsByCurrency.entries()).map(([currency, totals]) => (
          <div
            key={currency}
            className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5"
          >
            <p className="mb-2 text-sm text-[#B3B3B8]">Pendiente {currency}</p>
            <p className="text-2xl font-bold text-[#F4C66A]">
              {formatCurrency(totals.pending, currency)}
            </p>
            <p className="mt-2 text-xs text-[#77777D]">
              Comprado {formatCurrency(totals.purchased, currency)} / Requerido{" "}
              {formatCurrency(totals.required, currency)}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Lineas de compra</p>
          <p className="text-2xl font-bold">{lines.length}</p>
          <p className="mt-2 text-xs text-[#77777D]">
            Desde {quotes.length} cotizaciones aprobadas
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-4 text-2xl font-semibold">Pendiente por proveedor</h2>
        {pendingBySupplier.size === 0 ? (
          <p className="text-[#77777D]">Sin pendientes de compra.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(pendingBySupplier.entries()).map(([supplier, currencyTotals]) => (
              <div key={supplier} className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <p className="mb-2 font-semibold">{supplier}</p>
                <div className="space-y-1 text-sm text-[#B3B3B8]">
                  {Array.from(currencyTotals.entries()).map(([currency, total]) => (
                    <p key={currency}>
                      {currency}:{" "}
                      <span className="text-[#F4C66A]">
                        {formatCurrency(total, currency)}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        {groupedLines.length === 0 ? (
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#77777D]">
            No hay partidas de equipo sincronizadas para este proyecto.
          </section>
        ) : (
          groupedLines.map(([supplier, supplierLines]) => (
            <section
              key={supplier}
              className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6"
            >
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">{supplier}</h2>
                  <p className="mt-1 text-sm text-[#B3B3B8]">
                    {supplierLines.length} lineas de compra
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {supplierLines
                  .sort(
                    (a, b) =>
                      Number(b.total_required_cost || 0) -
                      Number(a.total_required_cost || 0)
                  )
                  .map((line) => {
                    const pendingQuantity = Math.max(
                      Number(line.quantity_required || 0) -
                        Number(line.quantity_purchased || 0),
                      0
                    );
                    const lineEvents = eventsByLine.get(line.id) || [];

                    return (
                      <article
                        key={line.id}
                        className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
                      >
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[72px_1.4fr_1fr_auto] xl:items-center">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[#151518]">
                            {line.product_image_url ? (
                              <img
                                src={line.product_image_url}
                                alt={line.product_name || "Equipo"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <PackageSearch size={22} className="text-[#77777D]" />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold">
                              {line.product_brand || "Sin marca"}{" "}
                              {line.product_model || ""}
                            </p>
                            <p className="mt-1 text-sm text-[#B3B3B8]">
                              {line.product_name || "Sin descripcion"}
                            </p>
                            <span
                              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${getStatusClass(
                                line.purchase_status
                              )}`}
                            >
                              {getStatusLabel(line.purchase_status)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 xl:grid-cols-2">
                            <div>
                              <p className="text-[#77777D]">Requerido</p>
                              <p className="font-semibold">
                                {formatNumber(line.quantity_required)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#77777D]">Comprado</p>
                              <p className="font-semibold">
                                {formatNumber(line.quantity_purchased)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#77777D]">Pendiente</p>
                              <p className="font-semibold text-[#F4C66A]">
                                {formatNumber(pendingQuantity)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#77777D]">Costo unitario</p>
                              <p className="font-semibold">
                                {formatCurrency(line.unit_cost, line.cost_currency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#77777D]">Total requerido</p>
                              <p className="font-semibold">
                                {formatCurrency(
                                  line.total_required_cost,
                                  line.cost_currency
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#77777D]">Costo pendiente</p>
                              <p className="font-semibold text-[#F4C66A]">
                                {formatCurrency(
                                  line.total_pending_cost,
                                  line.cost_currency
                                )}
                              </p>
                            </div>
                          </div>

                          <ProjectPurchaseActions
                            lines={actionLines}
                            events={actionEvents}
                            triggerLineId={line.id}
                            triggerLabel="Comprar"
                          />
                        </div>

                        {lineEvents.length > 0 ? (
                          <div className="mt-4 border-t border-[#2A2A30] pt-4">
                            <p className="mb-3 text-sm font-semibold text-[#B3B3B8]">
                              Compras registradas
                            </p>
                            <div className="space-y-3">
                              {lineEvents.map((eventItem) => (
                                <div
                                  key={eventItem.id}
                                  className="grid grid-cols-1 gap-3 rounded-xl border border-[#2A2A30] bg-[#151518] p-3 text-sm lg:grid-cols-[1fr_1fr_auto]"
                                >
                                  <div>
                                    <p className="font-semibold">
                                      {formatDate(eventItem.purchase_date)} /{" "}
                                      {formatNumber(eventItem.quantity)} piezas
                                    </p>
                                    <p className="mt-1 text-[#B3B3B8]">
                                      {formatCurrency(
                                        eventItem.unit_cost,
                                        eventItem.cost_currency
                                      )}{" "}
                                      unitario - {eventItem.supplier || supplier}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[#77777D]">Referencia</p>
                                    <p className="font-semibold">
                                      {eventItem.invoice_reference || "-"}
                                    </p>
                                    <p className="mt-1 text-[#B3B3B8]">
                                      {getWarehouseLabel(eventItem.warehouse_status)}
                                    </p>
                                  </div>
                                  <WarehouseEventActions
                                    eventId={eventItem.id}
                                    lineId={line.id}
                                    currentStatus={eventItem.warehouse_status}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
              </div>
            </section>
          ))
        )}
      </section>
    </main>
  );
}
