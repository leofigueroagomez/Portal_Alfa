import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
import { convertPurchaseEventCost, isMissingMxnColumnError } from "@/lib/projectPurchases";

export type ProfitabilityReport = {
  id: number;
  client_project_id: number;
  report_number: string | null;
  generated_at: string | null;
  generated_by_user_id: string | null;
  total_sold_mxn: number | null;
  equipment_purchase_total_mxn: number | null;
  work_orders_total_mxn: number | null;
  other_costs_mxn: number | null;
  operating_profit_mxn: number | null;
  operating_margin_percent: number | null;
  status: string | null;
  director_email_sent_at: string | null;
  director_email_sent_to: string | null;
  director_email_status: string | null;
  director_email_error: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProfitabilitySnapshot = {
  totalSoldMxn: number;
  equipmentPurchaseTotalMxn: number;
  workOrdersTotalMxn: number;
  otherCostsMxn: number;
  operatingProfitMxn: number;
  operatingMarginPercent: number;
  purchaseLineCount: number;
  workOrderCostCount: number;
  warnings: string[];
};

type PurchaseLine = {
  id: number;
  project_operational_item_id: number | null;
  total_purchased_cost_mxn?: number | null;
};

type PurchaseEvent = {
  project_purchase_line_id: number;
  quantity: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
  exchange_rate: number | null;
};

/**
 * Comprado en MXN por linea. Usa total_purchased_cost_mxn (cada evento en MXN
 * con su propia moneda y TC, ver recalculatePurchaseLineTotals). Respaldo cuando
 * viene null o la columna aun no existe: lo calcula desde los eventos de la
 * linea con la misma conversion. total_purchased_cost NO se usa porque esta en
 * la moneda de la linea (puede ser USD).
 */
export async function getPurchasedMxnByLine(supabase: SupabaseClient, projectId: number) {
  const selectLines = async (columns: string) => {
    const { data, error } = await supabase
      .from("project_purchase_lines")
      .select(columns)
      .eq("client_project_id", projectId);
    return { data: (data || []) as unknown as PurchaseLine[], error };
  };
  let linesResult = await selectLines(
    "id, project_operational_item_id, total_purchased_cost_mxn"
  );
  if (isMissingMxnColumnError(linesResult.error)) {
    linesResult = await selectLines("id, project_operational_item_id");
  }
  if (linesResult.error) throw linesResult.error;

  const lines = linesResult.data;
  const purchasedMxnByLine = new Map<number, number>();
  const fallbackLines: PurchaseLine[] = [];

  lines.forEach((line) => {
    if (line.total_purchased_cost_mxn === null || line.total_purchased_cost_mxn === undefined) {
      fallbackLines.push(line);
    } else {
      purchasedMxnByLine.set(line.id, Number(line.total_purchased_cost_mxn || 0));
    }
  });

  let eventsMissingExchangeRate = 0;
  if (fallbackLines.length > 0) {
    const operationalIds = fallbackLines
      .map((line) => line.project_operational_item_id)
      .filter(Boolean) as number[];
    const [eventsResult, operationalResult] = await Promise.all([
      supabase
        .from("project_purchase_events")
        .select("project_purchase_line_id, quantity, unit_cost, cost_currency, exchange_rate")
        .in(
          "project_purchase_line_id",
          fallbackLines.map((line) => line.id)
        ),
      operationalIds.length > 0
        ? supabase
            .from("project_operational_items")
            .select("id, exchange_rate")
            .in("id", operationalIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (operationalResult.error) throw operationalResult.error;

    const rateByOperationalId = new Map(
      ((operationalResult.data || []) as { id: number; exchange_rate: number | null }[]).map(
        (item) => [item.id, Number(item.exchange_rate || 0) || null]
      )
    );
    const lineById = new Map(fallbackLines.map((line) => [line.id, line]));

    fallbackLines.forEach((line) => purchasedMxnByLine.set(line.id, 0));
    ((eventsResult.data || []) as PurchaseEvent[]).forEach((eventItem) => {
      const line = lineById.get(eventItem.project_purchase_line_id);
      if (!line) return;
      const referenceRate = line.project_operational_item_id
        ? rateByOperationalId.get(line.project_operational_item_id) ?? null
        : null;
      const { amount } = convertPurchaseEventCost(eventItem, "MXN", referenceRate);
      if (amount === null) {
        eventsMissingExchangeRate += 1;
        return;
      }
      purchasedMxnByLine.set(line.id, Number(purchasedMxnByLine.get(line.id) || 0) + amount);
    });
  }

  return { purchasedMxnByLine, eventsMissingExchangeRate };
}

type WorkOrder = {
  contractor_amount_mxn: number | null;
};

function roundCurrency(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}

export function getMarginClassification(marginPercent: number) {
  if (marginPercent >= 35) {
    return {
      label: "Excelente",
      classes: "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]",
    };
  }

  if (marginPercent >= 25) {
    return {
      label: "Bueno",
      classes: "border-[#2D5F8F] bg-[#132D47] text-[#9ED0FF]",
    };
  }

  if (marginPercent >= 15) {
    return {
      label: "Aceptable",
      classes: "border-[#614620] bg-[#322514] text-[#F4C66A]",
    };
  }

  return {
    label: "Riesgo",
    classes: "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]",
  };
}

export async function calculateProjectProfitability(
  supabase: SupabaseClient,
  projectId: number,
  otherCostsMxn = 0
): Promise<ProfitabilitySnapshot> {
  const [financialSummary, purchases, workOrdersResult] = await Promise.all([
    getProjectFinancialSummary(supabase, projectId),
    getPurchasedMxnByLine(supabase, projectId),
    supabase
      .from("work_orders")
      .select("contractor_amount_mxn")
      .eq("client_project_id", projectId)
      .neq("status", "cancelled"),
  ]);

  if (workOrdersResult.error) throw workOrdersResult.error;

  const purchasedMxnValues = Array.from(purchases.purchasedMxnByLine.values());
  const workOrders = (workOrdersResult.data || []) as WorkOrder[];
  const equipmentPurchaseTotalMxn = roundCurrency(
    purchasedMxnValues.reduce((sum, purchasedMxn) => sum + purchasedMxn, 0)
  );
  const workOrdersTotalMxn = roundCurrency(
    workOrders.reduce(
      (sum, order) => sum + Number(order.contractor_amount_mxn || 0),
      0
    )
  );
  const totalSoldMxn = roundCurrency(financialSummary.approvedTotalMxn);
  const normalizedOtherCostsMxn = roundCurrency(otherCostsMxn);
  const operatingProfitMxn = roundCurrency(
    totalSoldMxn -
      equipmentPurchaseTotalMxn -
      workOrdersTotalMxn -
      normalizedOtherCostsMxn
  );
  const operatingMarginPercent =
    totalSoldMxn > 0 ? roundPercent((operatingProfitMxn / totalSoldMxn) * 100) : 0;
  const purchaseLineCount = purchasedMxnValues.filter((purchasedMxn) => purchasedMxn > 0).length;
  const workOrderCostCount = workOrders.filter(
    (order) => Number(order.contractor_amount_mxn || 0) > 0
  ).length;
  const warnings = [
    purchaseLineCount === 0
      ? "No hay compras registradas; la utilidad puede estar sobreestimada."
      : "",
    workOrderCostCount === 0
      ? "No hay costos de ordenes de trabajo; la utilidad puede estar sobreestimada."
      : "",
    purchases.eventsMissingExchangeRate > 0
      ? `${purchases.eventsMissingExchangeRate} compra(s) en USD sin tipo de cambio quedaron fuera del costo de equipo; la utilidad puede estar sobreestimada.`
      : "",
  ].filter(Boolean);

  return {
    totalSoldMxn,
    equipmentPurchaseTotalMxn,
    workOrdersTotalMxn,
    otherCostsMxn: normalizedOtherCostsMxn,
    operatingProfitMxn,
    operatingMarginPercent,
    purchaseLineCount,
    workOrderCostCount,
    warnings,
  };
}

export async function getLatestProfitabilityReport(
  supabase: SupabaseClient,
  projectId: number
) {
  const { data, error } = await supabase
    .from("project_profitability_reports")
    .select("*")
    .eq("client_project_id", projectId)
    .order("generated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ProfitabilityReport | null;
}
