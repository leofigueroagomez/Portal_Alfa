import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";

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
  total_purchased_cost: number | null;
};

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
  const [financialSummary, purchasesResult, workOrdersResult] = await Promise.all([
    getProjectFinancialSummary(supabase, projectId),
    supabase
      .from("project_purchase_lines")
      .select("total_purchased_cost")
      .eq("client_project_id", projectId),
    supabase
      .from("work_orders")
      .select("contractor_amount_mxn")
      .eq("client_project_id", projectId)
      .neq("status", "cancelled"),
  ]);

  if (purchasesResult.error) throw purchasesResult.error;
  if (workOrdersResult.error) throw workOrdersResult.error;

  const purchaseLines = (purchasesResult.data || []) as PurchaseLine[];
  const workOrders = (workOrdersResult.data || []) as WorkOrder[];
  const equipmentPurchaseTotalMxn = roundCurrency(
    purchaseLines.reduce(
      (sum, line) => sum + Number(line.total_purchased_cost || 0),
      0
    )
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
  const purchaseLineCount = purchaseLines.filter(
    (line) => Number(line.total_purchased_cost || 0) > 0
  ).length;
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
