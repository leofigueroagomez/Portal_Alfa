"use server";

import { revalidatePath } from "next/cache";
import { canManageFiscalPayments, canViewFinancials } from "@/lib/permissions";
import {
  buildFacturamaPaymentComplementPayload,
  calculatePaymentComplement,
  getPaymentComplementValidationErrors,
  getPaymentComplementsConfig,
  type PaymentComplementRecord,
} from "@/lib/paymentComplements";
import type { FiscalClientData } from "@/lib/fiscalData";
import type { ProjectInvoice } from "@/lib/invoices";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

type ProjectPayment = {
  id: number;
  client_project_id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  amount_mxn: number | null;
  payment_form_code?: string | null;
};

export type CreatePaymentComplementDraftResult =
  | {
      ok: true;
      complementId: number;
      payloadPreview: unknown;
      warning?: string;
    }
  | {
      ok: false;
      error: string;
      payloadPreview?: unknown;
    };

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getActionErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo crear el borrador de complemento.";
}

export async function createPaymentComplementDraft(
  formData: FormData
): Promise<CreatePaymentComplementDraftResult> {
  try {
    const config = getPaymentComplementsConfig();
    if (!config.enabled) {
      throw new Error("Los complementos de pago estan deshabilitados.");
    }

    const profile = await getCurrentUserProfile();
    if (!profile?.is_active || !canViewFinancials(profile.role)) {
      throw new Error("No tienes permisos para crear complementos de pago.");
    }

    const invoiceId = Number(getFormString(formData, "invoiceId"));
    const projectPaymentIdValue = getFormString(formData, "projectPaymentId");
    const projectPaymentId = projectPaymentIdValue ? Number(projectPaymentIdValue) : null;
    const paymentDate = getFormString(formData, "paymentDate");
    const paymentFormCode = getFormString(formData, "paymentFormCode");
    const paidAmountMxn = Number(getFormString(formData, "paidAmountMxn"));
    const paymentReference = getFormString(formData, "paymentReference") || null;
    const manualOverrideReason = getFormString(formData, "manualOverrideReason");

    if (!invoiceId) throw new Error("Factura requerida.");
    if (!paymentDate) throw new Error("Fecha de pago requerida.");
    if (!paymentFormCode) throw new Error("Forma de pago requerida.");

    const supabase = createSupabaseAdminClient();
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("project_invoices")
      .select(
        "id, internal_folio, client_project_id, client_id, invoice_date, total_mxn, total, status, sat_uuid, payment_method_code, clients(id, name, tax_rfc, tax_business_name, tax_regime, fiscal_regime, cfdi_use, default_cfdi_use, tax_zip_code, billing_email)"
      )
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) throw new Error(`Error leyendo factura: ${invoiceError.message}`);
    if (!invoiceData) throw new Error("Factura no encontrada.");

    const invoice = invoiceData as unknown as ProjectInvoice;
    const clientRelation = invoice.clients;
    const client = Array.isArray(clientRelation)
      ? clientRelation[0] || null
      : clientRelation || null;
    if (!client) throw new Error("La factura no tiene cliente fiscal.");

    let projectPayment: ProjectPayment | null = null;
    if (projectPaymentId) {
      const { data: paymentData, error: paymentError } = await supabase
        .from("project_payments")
        .select("id, client_project_id, payment_date, payment_method, payment_reference, amount_mxn, payment_form_code")
        .eq("id", projectPaymentId)
        .maybeSingle();

      if (paymentError) throw new Error(`Error leyendo pago: ${paymentError.message}`);
      if (!paymentData) throw new Error("Pago no encontrado.");
      projectPayment = paymentData as ProjectPayment;

      if (Number(projectPayment.client_project_id) !== Number(invoice.client_project_id)) {
        throw new Error("El pago no pertenece al proyecto de la factura.");
      }
    }

    const effectivePaymentFormCode = projectPayment?.payment_form_code || paymentFormCode;

    const { data: paymentForm, error: paymentFormError } = await supabase
      .from("sat_payment_form_catalog")
      .select("code, name, is_active")
      .eq("code", effectivePaymentFormCode)
      .maybeSingle();

    if (paymentFormError) {
      throw new Error(`Error validando forma de pago: ${paymentFormError.message}`);
    }
    if (!paymentForm?.is_active || effectivePaymentFormCode === "99") {
      throw new Error("Seleccione una forma de pago real para el complemento.");
    }

    const { data: complementData, error: complementError } = await supabase
      .from("project_payment_complements")
      .select("id, status, amount_paid_mxn, paid_amount_mxn, project_payment_id, manual_amount_override")
      .eq("project_invoice_id", invoice.id);

    if (complementError) {
      throw new Error(`Error leyendo complementos existentes: ${complementError.message}`);
    }

    const existingComplements = (complementData || []) as PaymentComplementRecord[];
    const { data: paymentComplementData, error: paymentComplementError } =
      projectPaymentId
        ? await supabase
            .from("project_payment_complements")
            .select("id, status, amount_paid_mxn, paid_amount_mxn, project_payment_id")
            .eq("project_payment_id", projectPaymentId)
        : { data: [], error: null };

    if (paymentComplementError) {
      throw new Error(
        `Error leyendo complementos del pago: ${paymentComplementError.message}`
      );
    }

    const existingComplementsForPayment =
      (paymentComplementData || []) as PaymentComplementRecord[];
    const activeComplementsForPayment = projectPaymentId
      ? existingComplementsForPayment.filter(
          (complement) =>
            Number(complement.project_payment_id) === projectPaymentId &&
            ["draft", "validated", "stamped"].includes(complement.status)
        )
      : [];
    const sourcePaymentAmountMxn = projectPayment
      ? Number(projectPayment.amount_mxn || 0)
      : null;
    const fiscalPaidAmountMxn = paidAmountMxn;
    const manualAmountOverride =
      sourcePaymentAmountMxn != null &&
      Math.abs(fiscalPaidAmountMxn - sourcePaymentAmountMxn) > 0.01;

    if (manualAmountOverride && !canManageFiscalPayments(profile.role)) {
      throw new Error("Solo admin o finanzas pueden autorizar ajuste manual del importe fiscal.");
    }

    if (manualAmountOverride && !manualOverrideReason) {
      throw new Error("Captura el motivo del ajuste manual del importe fiscal.");
    }

    const paymentAlreadyHasComplement =
      activeComplementsForPayment.length > 0 && !manualAmountOverride;
    const calculation = calculatePaymentComplement({
      invoiceTotalMxn: Number(invoice.total_mxn ?? invoice.total ?? 0),
      existingComplements,
      paidAmountMxn: fiscalPaidAmountMxn,
    });
    const validationErrors = getPaymentComplementValidationErrors({
      invoice,
      calculation,
      paymentAlreadyHasComplement,
    });

    if (activeComplementsForPayment.some((complement) => complement.status === "stamped")) {
      throw new Error("Este pago ya tiene un complemento timbrado.");
    }

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(" | "));
    }

    const payloadPreview = buildFacturamaPaymentComplementPayload({
      invoice,
      client: client as FiscalClientData,
      paymentDate: projectPayment?.payment_date || paymentDate,
      paymentFormCode: effectivePaymentFormCode,
      paymentReference: projectPayment?.payment_reference || paymentReference,
      calculation,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("project_payment_complements")
      .insert({
        project_invoice_id: invoice.id,
        project_payment_id: projectPaymentId,
        client_project_id: invoice.client_project_id,
        client_id: invoice.client_id,
        status: "draft",
        complement_env: config.env,
        partiality_number: calculation.partialityNumber,
        previous_balance_mxn: calculation.previousBalanceMxn,
        amount_paid_mxn: calculation.paidAmountMxn,
        paid_amount_mxn: calculation.paidAmountMxn,
        source_payment_amount_mxn: sourcePaymentAmountMxn,
        manual_amount_override: manualAmountOverride,
        manual_override_reason: manualAmountOverride ? manualOverrideReason : null,
        outstanding_balance_mxn: calculation.outstandingBalanceMxn,
        payment_date: projectPayment?.payment_date || paymentDate,
        payment_form_code: effectivePaymentFormCode,
        currency: "MXN",
        exchange_rate: null,
        payment_reference: projectPayment?.payment_reference || paymentReference,
        payload_preview: payloadPreview,
        created_by_user_id: profile.id,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Error guardando borrador de complemento: ${insertError.message}`);
    }

    revalidatePath("/invoices");
    revalidatePath(`/projects/${invoice.client_project_id}/invoices`);
    revalidatePath(`/projects/${invoice.client_project_id}/account-statement`);

    return {
      ok: true,
      complementId: Number(inserted.id),
      payloadPreview,
      ...(config.stampingEnabled
        ? {
            warning:
              "El timbrado de complementos esta habilitado por flag, pero Fase 1 solo genera borradores y preview.",
          }
        : {}),
    };
  } catch (error) {
    return {
      ok: false,
      error: getActionErrorMessage(error),
    };
  }
}
