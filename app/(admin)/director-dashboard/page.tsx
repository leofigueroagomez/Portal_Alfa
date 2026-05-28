import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getPurchaseLineVariation,
  getPurchaseProgressPercent,
  summarizePurchaseVariationMxn,
} from "@/lib/projectPurchases";
import { normalizeSalesStage } from "@/lib/salesStages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  sales_stage?: string | null;
  estimated_value_mxn?: number | null;
  site_contact_name?: string | null;
  site_contact_phone?: string | null;
  site_address?: string | null;
  site_google_maps_url?: string | null;
  crew_lead_name?: string | null;
  crew_lead_phone?: string | null;
};

type Client = {
  id: number;
  name: string | null;
};

type Quote = {
  id: number;
  quote_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  status: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  total_mxn: number | null;
  grand_total: number | null;
  exchange_rate: number | null;
  approved_at?: string | null;
  created_at: string | null;
};

type Payment = {
  id: number;
  client_project_id: number | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_category: string | null;
  currency: string | null;
  amount: number | null;
  amount_mxn: number | null;
  exchange_rate: number | null;
};

type PurchaseLine = {
  id: number;
  client_project_id: number | null;
  quote_item_id: number | null;
  supplier: string | null;
  cost_currency: string | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
  unit_cost: number | null;
  total_required_cost: number | null;
  total_purchased_cost: number | null;
  total_pending_cost: number | null;
  purchase_status: string | null;
  exchange_rate?: number | null;
};

type PurchaseEvent = {
  id: number;
  project_purchase_line_id: number | null;
  quantity: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate: number | null;
  warehouse_status: string | null;
};

type QuoteItem = {
  id: number;
  quote_id: number | null;
};

function isThisMonth(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function quoteTotalMxn(quote: Quote) {
  return Number(quote.total_mxn ?? quote.grand_total ?? 0);
}

function quoteExchangeRate(quote: Quote | null | undefined) {
  return Number(quote?.exchange_rate || 0);
}

function getPaymentMxn(payment: Payment) {
  if (payment.amount_mxn != null) return Number(payment.amount_mxn || 0);
  if ((payment.currency || "MXN").toUpperCase() === "USD") {
    return Number(payment.amount || 0) * Number(payment.exchange_rate || 0);
  }
  return Number(payment.amount || 0);
}

function isPendingValue(value: string | null | undefined) {
  return !value?.trim() || value.trim().toLowerCase() === "en espera de llenado";
}

function EmptyRow({ label }: { label: string }) {
  return <p className="text-sm text-[#77777D]">{label}</p>;
}

function KpiCard({
  label,
  value,
  tone = "default",
  detail,
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "yellow" | "red";
  detail?: string;
}) {
  const valueClass =
    tone === "green"
      ? "text-[#8CE0B6]"
      : tone === "yellow"
        ? "text-[#F4C66A]"
        : tone === "red"
          ? "text-[#FFB19C]"
          : "text-white";

  return (
    <div className="rounded-xl border border-[#1F1F24] bg-[#151518] p-4">
      <p className="text-xs text-[#B3B3B8]">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      {detail ? <p className="mt-2 text-xs text-[#77777D]">{detail}</p> : null}
    </div>
  );
}

export default async function DirectorDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [
    projectsResult,
    clientsResult,
    quotesResult,
    paymentsResult,
    purchaseLinesResult,
    purchaseEventsResult,
    quoteItemsResult,
  ] = await Promise.all([
    supabase
      .from("client_projects")
      .select(
        "id, client_id, name, sales_stage, estimated_value_mxn, site_contact_name, site_contact_phone, site_address, site_google_maps_url, crew_lead_name, crew_lead_phone"
      ),
    supabase.from("clients").select("id, name"),
    supabase
      .from("quotes")
      .select(
        "id, quote_number, client_id, client_project_id, status, equipment_total, labor_total, total_mxn, grand_total, exchange_rate, approved_at, created_at"
      ),
    supabase
      .from("project_payments")
      .select(
        "id, client_project_id, payment_date, payment_method, payment_reference, payment_category, currency, amount, amount_mxn, exchange_rate"
      )
      .order("payment_date", { ascending: false })
      .limit(8),
    supabase
      .from("project_purchase_lines")
      .select(
        "id, client_project_id, quote_item_id, supplier, cost_currency, quantity_required, quantity_purchased, unit_cost, total_required_cost, total_purchased_cost, total_pending_cost, purchase_status"
      ),
    supabase
      .from("project_purchase_events")
      .select(
        "id, project_purchase_line_id, quantity, unit_cost, cost_currency, exchange_rate, warehouse_status"
      ),
    supabase.from("quote_items").select("id, quote_id"),
  ]);

  const projects = (projectsResult.data || []) as ClientProject[];
  const clients = (clientsResult.data || []) as Client[];
  const quotes = (quotesResult.data || []) as Quote[];
  const payments = paymentsResult.error ? [] : ((paymentsResult.data || []) as Payment[]);
  const purchaseLines = purchaseLinesResult.error
    ? []
    : ((purchaseLinesResult.data || []) as PurchaseLine[]);
  const purchaseEvents = purchaseEventsResult.error
    ? []
    : ((purchaseEventsResult.data || []) as PurchaseEvent[]);
  const quoteItems = (quoteItemsResult.data || []) as QuoteItem[];

  const clientNames = new Map(clients.map((client) => [client.id, client.name || "Sin cliente"]));
  const projectNames = new Map(
    projects.map((project) => [project.id, project.name || `Proyecto #${project.id}`])
  );
  const projectClientIds = new Map(projects.map((project) => [project.id, project.client_id]));
  const approvedQuotes = quotes.filter((quote) => quote.status === "approved");
  const activeProjects = projects.filter((project) =>
    ["won", "installed"].includes(normalizeSalesStage(project.sales_stage))
  );
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const approvedHistorical = approvedQuotes.reduce((sum, quote) => sum + quoteTotalMxn(quote), 0);
  const approvedThisMonth = approvedQuotes
    .filter((quote) => isThisMonth(quote.approved_at || quote.created_at))
    .reduce((sum, quote) => sum + quoteTotalMxn(quote), 0);
  const approvedByProject = new Map<number, Quote[]>();

  approvedQuotes.forEach((quote) => {
    if (!quote.client_project_id) return;
    const current = approvedByProject.get(quote.client_project_id) || [];
    approvedByProject.set(quote.client_project_id, [...current, quote]);
  });

  const paymentsByProject = new Map<number, Payment[]>();
  payments.forEach((payment) => {
    if (!payment.client_project_id) return;
    const current = paymentsByProject.get(payment.client_project_id) || [];
    paymentsByProject.set(payment.client_project_id, [...current, payment]);
  });

  let pendingEquipmentUsd = 0;
  let pendingLaborMxn = 0;
  let pendingCollectionMxn = 0;
  const projectCollectionRows = activeProjects.map((project) => {
    const projectQuotes = approvedByProject.get(project.id) || [];
    const totalEquipmentUsd = projectQuotes.reduce(
      (sum, quote) => sum + Number(quote.equipment_total || 0),
      0
    );
    const totalLaborMxn = projectQuotes.reduce(
      (sum, quote) => sum + Number(quote.labor_total || 0),
      0
    );
    const equipmentMxn = projectQuotes.reduce(
      (sum, quote) => sum + Number(quote.equipment_total || 0) * quoteExchangeRate(quote),
      0
    );
    const projectRate = totalEquipmentUsd > 0 ? equipmentMxn / totalEquipmentUsd : 1;
    const projectPayments = paymentsByProject.get(project.id) || [];
    const paidEquipmentMxn = projectPayments
      .filter((payment) => payment.payment_category === "equipment")
      .reduce((sum, payment) => sum + getPaymentMxn(payment), 0);
    const paidLaborMxn = projectPayments
      .filter((payment) => payment.payment_category === "labor")
      .reduce((sum, payment) => sum + getPaymentMxn(payment), 0);
    const paidEquipmentUsd = projectRate > 0 ? paidEquipmentMxn / projectRate : 0;
    const equipmentPendingUsd = Math.max(totalEquipmentUsd - paidEquipmentUsd, 0);
    const laborPendingMxn = Math.max(totalLaborMxn - paidLaborMxn, 0);
    const estimatedPendingMxn = equipmentPendingUsd * projectRate + laborPendingMxn;

    pendingEquipmentUsd += equipmentPendingUsd;
    pendingLaborMxn += laborPendingMxn;
    pendingCollectionMxn += estimatedPendingMxn;

    return {
      projectId: project.id,
      projectName: project.name || `Proyecto #${project.id}`,
      clientName: project.client_id ? clientNames.get(project.client_id) || "Sin cliente" : "Sin cliente",
      pendingMxn: estimatedPendingMxn,
      pendingEquipmentUsd: equipmentPendingUsd,
      pendingLaborMxn: laborPendingMxn,
    };
  });

  const quoteIdByItemId = new Map(quoteItems.map((item) => [item.id, item.quote_id]));
  const quoteById = new Map(approvedQuotes.map((quote) => [quote.id, quote]));
  const purchaseEventsByLine = new Map<number, PurchaseEvent[]>();
  purchaseEvents.forEach((eventItem) => {
    if (!eventItem.project_purchase_line_id) return;
    const current = purchaseEventsByLine.get(eventItem.project_purchase_line_id) || [];
    purchaseEventsByLine.set(eventItem.project_purchase_line_id, [...current, eventItem]);
  });
  const purchaseLinesWithRate = purchaseLines.map((line) => {
    const quoteId = line.quote_item_id ? quoteIdByItemId.get(line.quote_item_id) : null;
    const quote = quoteId ? quoteById.get(quoteId) : null;
    return { ...line, exchange_rate: quoteExchangeRate(quote) || null };
  });
  const activePurchaseLines = purchaseLinesWithRate.filter((line) =>
    line.client_project_id ? activeProjectIds.has(line.client_project_id) : false
  );
  const purchaseVariation = summarizePurchaseVariationMxn(
    activePurchaseLines,
    purchaseEventsByLine
  );
  const purchaseProgress = getPurchaseProgressPercent(activePurchaseLines);
  let pendingPurchasesMxn = 0;
  let pendingPurchasesWithoutTcUsd = 0;
  const pendingBySupplier = new Map<string, { mxn: number; usdWithoutTc: number; purchasedMxn: number }>();

  activePurchaseLines.forEach((line) => {
    const supplier = line.supplier?.trim() || "Sin proveedor";
    const current = pendingBySupplier.get(supplier) || { mxn: 0, usdWithoutTc: 0, purchasedMxn: 0 };
    const pending = Number(line.total_pending_cost || 0);
    const purchased = Number(line.total_purchased_cost || 0);
    const currency = (line.cost_currency || "USD").toUpperCase();
    const rate = Number(line.exchange_rate || 0);

    if (currency === "USD") {
      if (rate > 0) {
        current.mxn += pending * rate;
        current.purchasedMxn += purchased * rate;
        pendingPurchasesMxn += pending * rate;
      } else {
        current.usdWithoutTc += pending;
        pendingPurchasesWithoutTcUsd += pending;
      }
    } else {
      current.mxn += pending;
      current.purchasedMxn += purchased;
      pendingPurchasesMxn += pending;
    }

    pendingBySupplier.set(supplier, current);
  });

  const projectPurchaseVariation = activeProjects
    .map((project) => {
      const projectLines = activePurchaseLines.filter((line) => line.client_project_id === project.id);
      const variation = summarizePurchaseVariationMxn(projectLines, purchaseEventsByLine);
      return {
        projectId: project.id,
        name: project.name || `Proyecto #${project.id}`,
        value: variation.net,
      };
    })
    .filter((item) => item.value !== 0);
  const topSavings = projectPurchaseVariation
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topOverruns = projectPurchaseVariation
    .filter((item) => item.value < 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  const projectsWithoutSiteData = activeProjects.filter(
    (project) =>
      isPendingValue(project.site_contact_name) ||
      isPendingValue(project.site_contact_phone) ||
      isPendingValue(project.site_address) ||
      isPendingValue(project.site_google_maps_url)
  );
  const projectsWithoutCrew = activeProjects.filter(
    (project) =>
      isPendingValue(project.crew_lead_name) && isPendingValue(project.crew_lead_phone)
  );
  const activeApprovedValue = activeProjects.reduce((sum, project) => {
    const projectQuotes = approvedByProject.get(project.id) || [];
    return sum + projectQuotes.reduce((quoteSum, quote) => quoteSum + quoteTotalMxn(quote), 0);
  }, 0);
  const incompletePurchaseProjects = activeProjects.filter((project) =>
    activePurchaseLines.some(
      (line) =>
        line.client_project_id === project.id &&
        Number(line.quantity_purchased || 0) < Number(line.quantity_required || 0)
    )
  );
  const projectsWithWarehouse = activeProjects.filter((project) =>
    activePurchaseLines.some((line) => {
      if (line.client_project_id !== project.id || !line.id) return false;
      return (purchaseEventsByLine.get(line.id) || []).some(
        (eventItem) => eventItem.warehouse_status === "received"
      );
    })
  );
  const projectsDeliveredToSite = activeProjects.filter((project) =>
    activePurchaseLines.some((line) => {
      if (line.client_project_id !== project.id || !line.id) return false;
      return (purchaseEventsByLine.get(line.id) || []).some(
        (eventItem) => eventItem.warehouse_status === "delivered_to_site"
      );
    })
  );
  const totalCollected = payments.reduce((sum, payment) => sum + getPaymentMxn(payment), 0);
  const topPendingCollection = projectCollectionRows
    .filter((row) => row.pendingMxn > 0)
    .sort((a, b) => b.pendingMxn - a.pendingMxn)
    .slice(0, 6);
  const topClientsByAmount = clients
    .map((client) => {
      const amount = approvedQuotes
        .filter((quote) => quote.client_id === client.id)
        .reduce((sum, quote) => sum + quoteTotalMxn(quote), 0);
      return { id: client.id, name: client.name || "Sin cliente", amount };
    })
    .filter((client) => client.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
  const topClientsByProjects = clients
    .map((client) => ({
      id: client.id,
      name: client.name || "Sin cliente",
      count: activeProjects.filter((project) => project.client_id === client.id).length,
    }))
    .filter((client) => client.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topSuppliersByPurchased = Array.from(pendingBySupplier.entries())
    .map(([supplier, totals]) => ({ supplier, value: totals.purchasedMxn }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const topSuppliersByPending = Array.from(pendingBySupplier.entries())
    .map(([supplier, totals]) => ({
      supplier,
      value: totals.mxn,
      usdWithoutTc: totals.usdWithoutTc,
    }))
    .filter((item) => item.value > 0 || item.usdWithoutTc > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-8">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Dashboard direccion</h1>
        <p className="mt-3 text-[#B3B3B8]">
          Vista ejecutiva de ventas, cobranza, compras y operacion.
        </p>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas aprobadas historicas"
          value={formatCurrency(approvedHistorical, "MXN")}
          tone="green"
          detail={`${approvedQuotes.length} cotizaciones approved`}
        />
        <KpiCard
          label="Ventas aprobadas del mes"
          value={formatCurrency(approvedThisMonth, "MXN")}
          tone="green"
        />
        <KpiCard
          label="Pendiente por cobrar estimado"
          value={formatCurrency(pendingCollectionMxn, "MXN")}
          tone="yellow"
          detail={`Equipos ${formatCurrency(pendingEquipmentUsd, "USD")} / MO ${formatCurrency(pendingLaborMxn, "MXN")}`}
        />
        <KpiCard
          label="Pendiente por comprar"
          value={formatCurrency(pendingPurchasesMxn, "MXN")}
          tone="yellow"
          detail={
            pendingPurchasesWithoutTcUsd > 0
              ? `Sin TC: ${formatCurrency(pendingPurchasesWithoutTcUsd, "USD")}`
              : "Normalizado a MXN"
          }
        />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ahorro compras" value={formatCurrency(purchaseVariation.saving, "MXN")} tone="green" />
        <KpiCard label="Sobrecosto compras" value={formatCurrency(purchaseVariation.overrun, "MXN")} tone="red" />
        <KpiCard
          label="Variacion neta compras"
          value={formatCurrency(purchaseVariation.net, "MXN")}
          tone={purchaseVariation.net >= 0 ? "green" : "red"}
        />
        <KpiCard
          label="Avance compras global"
          value={`${formatNumber(purchaseProgress)}%`}
          detail={`${incompletePurchaseProjects.length} proyectos con compras incompletas`}
        />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Proyectos activos"
          value={String(activeProjects.length)}
          detail={formatCurrency(activeApprovedValue, "MXN")}
        />
        <KpiCard
          label="Sin datos de obra completos"
          value={String(projectsWithoutSiteData.length)}
          tone={projectsWithoutSiteData.length > 0 ? "yellow" : "green"}
        />
        <KpiCard
          label="Sin cuadrilla asignada"
          value={String(projectsWithoutCrew.length)}
          tone={projectsWithoutCrew.length > 0 ? "yellow" : "green"}
        />
        <KpiCard
          label="Total cobrado"
          value={formatCurrency(totalCollected, "MXN")}
          tone="green"
        />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-[#1F1F24] bg-[#151518] p-5">
          <h2 className="mb-4 text-xl font-semibold">Compras y bodega</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#B3B3B8]">Compras incompletas</span>
              <span className="font-semibold">{incompletePurchaseProjects.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#B3B3B8]">Equipos en bodega</span>
              <span className="font-semibold">{projectsWithWarehouse.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#B3B3B8]">Entregados a obra</span>
              <span className="font-semibold">{projectsDeliveredToSite.length}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F1F24] bg-[#151518] p-5 xl:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Pendiente por proveedor</h2>
          {topSuppliersByPending.length === 0 ? (
            <EmptyRow label="Sin pendientes por proveedor." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs text-[#77777D]">
                  <tr>
                    <th className="pb-2">Proveedor</th>
                    <th className="pb-2 text-right">Pendiente MXN</th>
                    <th className="pb-2 text-right">Sin TC</th>
                  </tr>
                </thead>
                <tbody>
                  {topSuppliersByPending.map((item) => (
                    <tr key={item.supplier} className="border-t border-[#222228]">
                      <td className="py-2">{item.supplier}</td>
                      <td className="py-2 text-right text-[#F4C66A]">
                        {formatCurrency(item.value, "MXN")}
                      </td>
                      <td className="py-2 text-right text-[#77777D]">
                        {item.usdWithoutTc > 0 ? formatCurrency(item.usdWithoutTc, "USD") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ExecutiveList
          title="Proyectos con mayor saldo pendiente"
          rows={topPendingCollection.map((row) => ({
            href: `/projects/${row.projectId}/account-statement`,
            label: row.projectName,
            meta: row.clientName,
            value: formatCurrency(row.pendingMxn, "MXN"),
            tone: "yellow",
          }))}
          empty="Sin saldos pendientes."
        />
        <ExecutiveList
          title="Ultimos pagos registrados"
          rows={payments.map((payment) => ({
            label: projectNames.get(Number(payment.client_project_id || 0)) || "Proyecto sin nombre",
            meta: `${payment.payment_date || "Sin fecha"} / ${payment.payment_method || "Sin metodo"}`,
            value: formatCurrency(getPaymentMxn(payment), "MXN"),
            tone: "green",
          }))}
          empty="Sin pagos registrados."
        />
        <ExecutiveList
          title="Top clientes por monto aprobado"
          rows={topClientsByAmount.map((client) => ({
            label: client.name,
            value: formatCurrency(client.amount, "MXN"),
          }))}
          empty="Sin clientes con ventas aprobadas."
        />
        <ExecutiveList
          title="Top clientes por proyectos"
          rows={topClientsByProjects.map((client) => ({
            label: client.name,
            value: `${client.count} proyectos`,
          }))}
          empty="Sin proyectos activos por cliente."
        />
        <ExecutiveList
          title="Top proyectos con mayor ahorro"
          rows={topSavings.map((project) => ({
            href: `/projects/${project.projectId}/purchases`,
            label: project.name,
            value: formatCurrency(project.value, "MXN"),
            tone: "green",
          }))}
          empty="Sin ahorros registrados."
        />
        <ExecutiveList
          title="Top proyectos con mayor sobrecosto"
          rows={topOverruns.map((project) => ({
            href: `/projects/${project.projectId}/purchases`,
            label: project.name,
            value: formatCurrency(project.value, "MXN"),
            tone: "red",
          }))}
          empty="Sin sobrecostos registrados."
        />
        <ExecutiveList
          title="Top proveedores por comprado"
          rows={topSuppliersByPurchased.map((supplier) => ({
            label: supplier.supplier,
            value: formatCurrency(supplier.value, "MXN"),
            tone: "green",
          }))}
          empty="Sin compras registradas."
        />
        <ExecutiveList
          title="Proyectos con riesgo operativo"
          rows={[...projectsWithoutSiteData, ...projectsWithoutCrew]
            .filter((project, index, array) => array.findIndex((item) => item.id === project.id) === index)
            .slice(0, 8)
            .map((project) => ({
              href: `/projects/${project.id}`,
              label: project.name || `Proyecto #${project.id}`,
              meta: project.client_id ? clientNames.get(project.client_id) : "Sin cliente",
              value: "Revisar",
              tone: "yellow",
            }))}
          empty="Sin riesgos operativos detectados."
        />
      </section>
    </main>
  );
}

function ExecutiveList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{
    href?: string;
    label: string;
    meta?: string;
    value: string;
    tone?: "green" | "yellow" | "red";
  }>;
  empty: string;
}) {
  function valueClass(tone?: "green" | "yellow" | "red") {
    if (tone === "green") return "text-[#8CE0B6]";
    if (tone === "yellow") return "text-[#F4C66A]";
    if (tone === "red") return "text-[#FFB19C]";
    return "text-[#B3B3B8]";
  }

  return (
    <div className="rounded-xl border border-[#1F1F24] bg-[#151518] p-5">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <EmptyRow label={empty} />
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const content = (
              <>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.label}</p>
                  {row.meta ? <p className="mt-1 truncate text-xs text-[#77777D]">{row.meta}</p> : null}
                </div>
                <p className={`shrink-0 text-right text-sm font-semibold ${valueClass(row.tone)}`}>
                  {row.value}
                </p>
              </>
            );

            if (row.href) {
              return (
                <Link
                  key={`${row.label}-${index}`}
                  href={row.href}
                  className="flex items-center justify-between gap-4 rounded-lg bg-[#222228] px-3 py-2 text-sm hover:bg-[#2A2A30]"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={`${row.label}-${index}`}
                className="flex items-center justify-between gap-4 rounded-lg bg-[#222228] px-3 py-2 text-sm"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
