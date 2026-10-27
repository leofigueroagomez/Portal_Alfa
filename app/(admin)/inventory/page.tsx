import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { canManagePurchases } from "@/lib/permissions";
import {
  getInventoryKardex,
  getInventoryStock,
  type InventoryMovementRow,
  type InventoryStockRow,
} from "@/lib/inventory";
import { getInventoryErrorMessage } from "@/lib/inventoryContract";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import InventoryAdjustButton from "./InventoryAdjustButton";
import InventoryEntryButton from "./InventoryEntryButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; item?: string }>;

function productLabel(row: Pick<InventoryStockRow, "product_brand" | "product_model" | "product_id">) {
  return [row.product_brand, row.product_model].filter(Boolean).join(" ") || `Producto #${row.product_id}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin movimientos";
  return new Date(value).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMovementLabel(movement: InventoryMovementRow) {
  if (movement.movement_type === "in") {
    return movement.source_purchase_event_id ? "Entrada · sobrante" : "Entrada";
  }
  if (movement.movement_type === "out") return "Salida a proyecto";
  return movement.quantity > 0 ? "Ajuste +" : "Ajuste −";
}

function getSignedQuantity(movement: InventoryMovementRow) {
  if (movement.movement_type === "out") return -movement.quantity;
  return movement.quantity;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">{children}</main>;
}

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canManagePurchases(profile.role)) {
    return (
      <Shell>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No tienes permiso para ver el almacén.
        </section>
      </Shell>
    );
  }

  const { q = "", item } = await searchParams;
  const search = q.trim().toLowerCase();
  const selectedItemId = Number(item);
  const supabase = await createSupabaseServerClient();

  let stock: InventoryStockRow[] = [];
  let loadError: string | null = null;
  try {
    stock = await getInventoryStock(supabase);
  } catch (error) {
    loadError = getInventoryErrorMessage(error);
  }

  const { data: suppliersData } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  const suppliers = (suppliersData || []) as { id: number; name: string }[];
  const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));

  const locations = Array.from(new Set(stock.map((row) => row.location)));
  const withStock = stock.filter((row) => row.quantity_available > 0);
  const totalValue = withStock.reduce((sum, row) => sum + row.stock_value_mxn, 0);
  const visibleStock = stock.filter((row) => {
    if (!search) return row.quantity_available > 0 || row.inventory_item_id === selectedItemId;
    return [row.product_brand, row.product_model, row.product_name, row.product_sku, row.location]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  const selected = Number.isSafeInteger(selectedItemId)
    ? stock.find((row) => row.inventory_item_id === selectedItemId) || null
    : null;
  let kardex: InventoryMovementRow[] = [];
  const projectNames = new Map<number, string>();
  const originProjectByEvent = new Map<number, number>();

  if (selected) {
    try {
      kardex = await getInventoryKardex(supabase, selected.inventory_item_id);
    } catch (error) {
      loadError = getInventoryErrorMessage(error);
    }

    const sourceEventIds = kardex
      .map((movement) => movement.source_purchase_event_id)
      .filter(Boolean) as number[];
    if (sourceEventIds.length > 0) {
      const { data: sourceEvents } = await supabase
        .from("project_purchase_events")
        .select("id, project_purchase_lines(client_project_id)")
        .in("id", sourceEventIds);
      (sourceEvents || []).forEach((row) => {
        const line = Array.isArray(row.project_purchase_lines)
          ? row.project_purchase_lines[0]
          : row.project_purchase_lines;
        if (line?.client_project_id) {
          originProjectByEvent.set(Number(row.id), Number(line.client_project_id));
        }
      });
    }

    const projectIds = Array.from(
      new Set([
        ...(kardex.map((movement) => movement.client_project_id).filter(Boolean) as number[]),
        ...originProjectByEvent.values(),
      ])
    );
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("client_projects")
        .select("id, name")
        .in("id", projectIds);
      (projects || []).forEach((project) => {
        projectNames.set(Number(project.id), project.name || `Proyecto ${project.id}`);
      });
    }
  }

  return (
    <Shell>
      <Link href="/projects" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Proyectos
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALMACÉN</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Inventario</h1>
          <p className="mt-3 max-w-2xl text-[#B3B3B8]">
            Material propio en bodega a costo promedio en MXN. Los sobrantes de compras de
            proyecto entran aquí sin cambiar lo ya cargado al proyecto.
          </p>
        </div>
        <InventoryEntryButton suppliers={suppliers} locations={locations} />
      </section>

      {loadError ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
          {loadError}
        </section>
      ) : null}

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[#1F1F24] bg-[#151518] p-4">
          <p className="text-xs text-[#B3B3B8]">Valor en almacén</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalValue, "MXN")}</p>
        </div>
        <div className="rounded-xl border border-[#1F1F24] bg-[#151518] p-4">
          <p className="text-xs text-[#B3B3B8]">Productos con existencia</p>
          <p className="mt-1 text-2xl font-bold">{withStock.length}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-[#1F1F24] bg-[#151518] p-4 md:col-span-1">
          <p className="text-xs text-[#B3B3B8]">Ubicaciones</p>
          <p className="mt-1 truncate text-lg font-semibold">
            {locations.join(" · ") || "Sin ubicaciones"}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518]">
          <form className="border-b border-[#1F1F24] p-4" action="/inventory">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77777D]"
              />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar producto o ubicación (incluye sin existencia)"
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] py-3 pl-10 pr-4 text-sm outline-none"
              />
            </label>
          </form>

          {visibleStock.length === 0 ? (
            <p className="p-8 text-sm text-[#77777D]">
              {search ? "Sin coincidencias." : "No hay material en almacén."}
            </p>
          ) : (
            <ul className="divide-y divide-[#1F1F24]">
              {visibleStock.map((row) => {
                const isSelected = row.inventory_item_id === selected?.inventory_item_id;
                const params = new URLSearchParams();
                if (q) params.set("q", q);
                params.set("item", String(row.inventory_item_id));

                return (
                  <li key={row.inventory_item_id}>
                    <Link
                      href={`/inventory?${params.toString()}`}
                      className={`flex items-start justify-between gap-4 px-4 py-4 transition hover:bg-[#1A1A1F] ${
                        isSelected ? "bg-[#1A1A1F]" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{productLabel(row)}</p>
                        <p className="truncate text-xs text-[#B3B3B8]">{row.product_name}</p>
                        <p className="mt-1 text-xs text-[#77777D]">{row.location}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`text-lg font-bold ${
                            row.quantity_available > 0 ? "text-white" : "text-[#77777D]"
                          }`}
                        >
                          {formatNumber(row.quantity_available)}
                          <span className="ml-1 text-xs font-normal text-[#B3B3B8]">
                            {row.unit_name || ""}
                          </span>
                        </p>
                        <p className="text-xs text-[#B3B3B8]">
                          {formatCurrency(row.average_cost_mxn, "MXN")} c/u
                        </p>
                        <p className="text-xs text-[#77777D]">
                          {formatCurrency(row.stock_value_mxn, "MXN")}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          {!selected ? (
            <p className="text-sm text-[#77777D]">
              Selecciona un producto para ver su kardex.
            </p>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.2em] text-[#9E1B32]">KARDEX</p>
                  <h2 className="mt-1 text-2xl font-semibold">{productLabel(selected)}</h2>
                  <p className="mt-1 text-sm text-[#B3B3B8]">{selected.product_name}</p>
                  <p className="mt-3 text-sm">
                    {formatNumber(selected.quantity_available)} {selected.unit_name || ""} en{" "}
                    {selected.location} · {formatCurrency(selected.average_cost_mxn, "MXN")}{" "}
                    promedio · {formatCurrency(selected.stock_value_mxn, "MXN")}
                  </p>
                </div>
                <InventoryAdjustButton
                  inventoryItemId={selected.inventory_item_id}
                  productLabel={productLabel(selected)}
                  location={selected.location}
                  quantityAvailable={selected.quantity_available}
                  averageCostMxn={selected.average_cost_mxn}
                  unitName={selected.unit_name}
                />
              </div>

              {kardex.length === 0 ? (
                <p className="text-sm text-[#77777D]">Sin movimientos.</p>
              ) : (
                <ol className="space-y-3">
                  {kardex.map((movement) => {
                    const signed = getSignedQuantity(movement);
                    const originProjectId = movement.source_purchase_event_id
                      ? originProjectByEvent.get(movement.source_purchase_event_id)
                      : undefined;
                    const projectId = movement.client_project_id || originProjectId;

                    return (
                      <li
                        key={movement.id}
                        className="rounded-xl border border-[#1F1F24] bg-[#101114] p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-semibold">{getMovementLabel(movement)}</p>
                          <p className="text-xs text-[#77777D]">
                            {formatDateTime(movement.created_at)} · #{movement.id}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                          <p className={signed >= 0 ? "text-[#8CE0B6]" : "text-[#FFB19C]"}>
                            {signed >= 0 ? "+" : "−"}
                            {formatNumber(Math.abs(signed))} a{" "}
                            {formatCurrency(movement.unit_cost_mxn, "MXN")} ={" "}
                            {formatCurrency(movement.total_cost_mxn, "MXN")}
                            {movement.cost_currency === "USD" ? (
                              <span className="text-[#77777D]">
                                {" "}
                                ({formatCurrency(movement.unit_cost, "USD")} · TC{" "}
                                {formatNumber(movement.exchange_rate)})
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-[#B3B3B8]">
                            Saldo {formatNumber(movement.quantity_after)} ·{" "}
                            {formatCurrency(movement.average_cost_mxn_after, "MXN")} prom.
                          </p>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-[#77777D]">
                          {projectId ? (
                            <p>
                              {movement.movement_type === "out" ? "Destino: " : "Origen: "}
                              <Link
                                href={`/projects/${projectId}/purchases`}
                                className="text-[#B3B3B8] underline-offset-2 hover:underline"
                              >
                                {projectNames.get(projectId) || `Proyecto ${projectId}`}
                              </Link>
                              {movement.source_purchase_event_id
                                ? ` · compra #${movement.source_purchase_event_id}`
                                : ""}
                              {movement.project_purchase_event_id
                                ? ` · compra #${movement.project_purchase_event_id}`
                                : ""}
                            </p>
                          ) : null}
                          {movement.supplier_id || movement.invoice_reference ? (
                            <p>
                              {[
                                movement.supplier_id
                                  ? suppliersById.get(movement.supplier_id) ||
                                    `Proveedor ${movement.supplier_id}`
                                  : null,
                                movement.invoice_reference,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                          {movement.notes ? <p>{movement.notes}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
