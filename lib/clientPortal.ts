import "server-only";

import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonthsToMexicoDate } from "@/lib/mexicoDate";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export type ClientPortalUser = {
  id: number;
  user_id: string;
  client_id: number;
  is_active: boolean;
};

export type ClientPortalProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  sales_stage: string | null;
  estimated_value_mxn?: number | null;
  expected_close_date?: string | null;
};

export async function getClientPortalContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: portalUser, error } = await supabase
    .from("client_portal_users")
    .select("id, user_id, client_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !portalUser) {
    notFound();
  }

  return {
    supabase,
    user,
    portalUser: portalUser as ClientPortalUser,
  };
}

export async function getAccessibleClientProject(
  supabase: SupabaseClient,
  portalUser: ClientPortalUser,
  projectId: number
) {
  const { data: access, error: accessError } = await supabase
    .from("client_portal_project_access")
    .select("id")
    .eq("client_portal_user_id", portalUser.id)
    .eq("client_project_id", projectId)
    .eq("is_active", true)
    .maybeSingle();

  if (accessError || !access) {
    notFound();
  }

  const { data: project, error: projectError } = await supabase
    .from("client_projects")
    .select("id, client_id, name, sales_stage, estimated_value_mxn, expected_close_date")
    .eq("id", projectId)
    .eq("client_id", portalUser.client_id)
    .maybeSingle();

  if (projectError || !project) {
    notFound();
  }

  return project as ClientPortalProject;
}

export function formatPortalDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export function addMonths(value: string | null | undefined, months: number | null | undefined) {
  if (!value || !months) return null;
  return addMonthsToMexicoDate(value, months);
}

export function getPortalProjectStatusLabel(status: string | null | undefined) {
  if (status === "delivered") return "Entregado";
  if (status === "warranty") return "En garantia";
  if (status === "installed") return "Instalado";
  if (status === "closed") return "Cerrado";
  if (status === "won") return "En preparacion";
  if (status === "negotiation") return "En revision";
  return "Activo";
}

export function getPortalStatusClasses(status: string | null | undefined) {
  if (status === "warranty" || status === "delivered" || status === "closed") {
    return "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]";
  }

  if (status === "installed" || status === "won") {
    return "border-[#2D5F8F] bg-[#132D47] text-[#9ED0FF]";
  }

  return "border-[#614620] bg-[#322514] text-[#F4C66A]";
}

export type ClientPortalInvoice = {
  id: number;
  internal_folio: string | null;
  invoice_date: string | null;
  total_mxn: number | null;
  total?: number | null;
  status: string | null;
  sat_uuid?: string | null;
};

export type ClientPortalPayment = {
  id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  currency: string | null;
  amount: number | null;
  amount_mxn: number | null;
  exchange_rate: number | null;
  notes: string | null;
};

export function getPortalInvoiceTotal(invoice: ClientPortalInvoice) {
  return Number(invoice.total_mxn ?? invoice.total ?? 0);
}

export function getPortalPaymentAmount(payment: ClientPortalPayment) {
  if (payment.amount_mxn != null) return Number(payment.amount_mxn || 0);
  if ((payment.currency || "MXN").toUpperCase() === "USD") {
    return Number(payment.amount || 0) * Number(payment.exchange_rate || 0);
  }
  return Number(payment.amount || 0);
}

export function getPortalAccountSummary(
  invoices: ClientPortalInvoice[],
  payments: ClientPortalPayment[]
) {
  const invoicedTotalMxn = invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + getPortalInvoiceTotal(invoice), 0);
  const paidTotalMxn = payments.reduce(
    (sum, payment) => sum + getPortalPaymentAmount(payment),
    0
  );

  return {
    invoicedTotalMxn,
    paidTotalMxn,
    pendingTotalMxn: Math.max(invoicedTotalMxn - paidTotalMxn, 0),
  };
}
