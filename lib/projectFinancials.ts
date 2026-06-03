import type { SupabaseClient } from "@supabase/supabase-js";

type Quote = {
  equipment_total: number | null;
  labor_total: number | null;
  total_mxn: number | null;
  grand_total: number | null;
  exchange_rate: number | null;
};

type ProjectPayment = {
  payment_category: string | null;
  currency: string | null;
  amount: number | null;
  exchange_rate: number | null;
  amount_mxn: number | null;
};

function getQuoteExchangeRate(quote: Quote) {
  return Number(quote.exchange_rate || 1);
}

function getQuoteTotalMxn(quote: Quote) {
  return (
    Number(quote.total_mxn) ||
    Number(quote.grand_total) ||
    Number(quote.equipment_total || 0) * getQuoteExchangeRate(quote) +
      Number(quote.labor_total || 0)
  );
}

function getPaymentAmountMxn(payment: ProjectPayment) {
  if (payment.amount_mxn != null) return Number(payment.amount_mxn || 0);
  if ((payment.currency || "MXN").toUpperCase() === "USD") {
    return Number(payment.amount || 0) * Number(payment.exchange_rate || 0);
  }
  return Number(payment.amount || 0);
}

export async function getProjectFinancialSummary(
  supabase: SupabaseClient,
  projectId: number
) {
  const [{ data: quotes }, { data: payments }] = await Promise.all([
    supabase
      .from("quotes")
      .select("equipment_total, labor_total, total_mxn, grand_total, exchange_rate")
      .eq("client_project_id", projectId)
      .eq("status", "approved"),
    supabase
      .from("project_payments")
      .select("payment_category, currency, amount, exchange_rate, amount_mxn")
      .eq("client_project_id", projectId),
  ]);

  const quoteList = (quotes || []) as Quote[];
  const paymentList = (payments || []) as ProjectPayment[];
  const approvedTotalMxn = quoteList.reduce(
    (sum, quote) => sum + getQuoteTotalMxn(quote),
    0
  );
  const paidTotalMxn = paymentList.reduce(
    (sum, payment) => sum + getPaymentAmountMxn(payment),
    0
  );
  const pendingTotalMxn = Math.max(approvedTotalMxn - paidTotalMxn, 0);

  return {
    approvedTotalMxn,
    paidTotalMxn,
    pendingTotalMxn,
  };
}
