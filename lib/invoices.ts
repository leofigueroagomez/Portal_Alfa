import type { FiscalClientData } from "@/lib/fiscalData";
import { getMexicoCurrentMonthRange } from "@/lib/mexicoDate";
import {
  getPaymentFormLabel,
  getPaymentMethodLabel,
  type PaymentFormCatalogItem,
} from "@/lib/paymentTerms";

export const invoiceStatuses = ["draft", "issued", "cancelled", "paid"] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  issued: "Emitida",
  cancelled: "Cancelada",
  paid: "Pagada",
};

export const invoiceStatusClasses: Record<InvoiceStatus, string> = {
  draft: "border-[#3A3A42] bg-[#222228] text-[#B3B3B8]",
  issued: "border-[#614620] bg-[#322514] text-[#F4C66A]",
  cancelled: "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]",
  paid: "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]",
};

export type ProjectInvoice = {
  id: number;
  internal_folio: string | null;
  client_project_id: number | null;
  client_id: number | null;
  source_type?: string | null;
  source_quote_id?: number | null;
  source_service_report_id?: number | null;
  invoice_date: string | null;
  subtotal?: number | null;
  iva?: number | null;
  total?: number | null;
  subtotal_mxn: number | null;
  iva_mxn: number | null;
  total_mxn: number | null;
  status: InvoiceStatus | string | null;
  facturama_id?: string | null;
  xml_url?: string | null;
  pdf_url?: string | null;
  sat_uuid?: string | null;
  payment_method_code?: string | null;
  payment_form_code?: string | null;
  requires_payment_complement?: boolean | null;
  payment_complement_status?: string | null;
  sat_payment_form_catalog?: PaymentFormCatalogItem | PaymentFormCatalogItem[] | null;
  clients?: FiscalClientData | FiscalClientData[] | null;
  client_projects?: { name: string | null } | { name: string | null }[] | null;
};

export function normalizeInvoiceStatus(status: string | null | undefined): InvoiceStatus {
  if (invoiceStatuses.includes(status as InvoiceStatus)) {
    return status as InvoiceStatus;
  }

  return "draft";
}

export function isInvoicedStatus(status: string | null | undefined) {
  const normalized = normalizeInvoiceStatus(status);
  return normalized === "issued" || normalized === "paid";
}

export function isReceivableStatus(status: string | null | undefined) {
  return normalizeInvoiceStatus(status) === "issued";
}

export function isCollectedStatus(status: string | null | undefined) {
  return normalizeInvoiceStatus(status) === "paid";
}

export function getInvoiceTotal(
  invoice: Pick<ProjectInvoice, "total_mxn"> & { total?: number | null }
) {
  return Number(invoice.total_mxn ?? invoice.total ?? 0);
}

export function getInvoiceSubtotal(
  invoice: Pick<ProjectInvoice, "subtotal_mxn"> & { subtotal?: number | null }
) {
  return Number(invoice.subtotal_mxn ?? invoice.subtotal ?? 0);
}

export function getInvoiceIva(
  invoice: Pick<ProjectInvoice, "iva_mxn"> & { iva?: number | null }
) {
  return Number(invoice.iva_mxn ?? invoice.iva ?? 0);
}

export function getCurrentMonthRange(now = new Date()) {
  return getMexicoCurrentMonthRange(now);
}

export function getInvoiceRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation || null;
}

export function getInvoicePaymentMethodLabel(invoice: ProjectInvoice) {
  return getPaymentMethodLabel(invoice.payment_method_code);
}

export function getInvoicePaymentFormLabel(invoice: ProjectInvoice) {
  const paymentForm = getInvoiceRelation(invoice.sat_payment_form_catalog);
  return getPaymentFormLabel(invoice.payment_form_code, paymentForm?.name);
}
