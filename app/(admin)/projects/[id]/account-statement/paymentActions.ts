"use server";

import { revalidatePath } from "next/cache";
import { canManageFiscalPayments } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

type ProjectPaymentForEdit = {
  id: number;
  client_project_id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_form_code: string | null;
  payment_reference: string | null;
  payment_category: string | null;
  currency: string | null;
  amount: number | null;
  exchange_rate: number | null;
  amount_mxn: number | null;
  notes: string | null;
};

export type EditProjectPaymentResult =
  | { ok: true }
  | { ok: false; error: string };

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo editar el pago.";
}

function getPaymentAmountMxn(payment: Pick<ProjectPaymentForEdit, "currency" | "amount" | "exchange_rate">) {
  if ((payment.currency || "MXN").toUpperCase() === "USD") {
    return Number(payment.amount || 0) * Number(payment.exchange_rate || 0);
  }

  return Number(payment.amount || 0);
}

function pickAuditedPaymentValues(payment: ProjectPaymentForEdit) {
  return {
    payment_date: payment.payment_date,
    payment_method: payment.payment_method,
    payment_form_code: payment.payment_form_code,
    payment_reference: payment.payment_reference,
    amount: payment.amount,
    amount_mxn: payment.amount_mxn,
    notes: payment.notes,
  };
}

export async function editProjectPayment(
  formData: FormData
): Promise<EditProjectPaymentResult> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.is_active || !canManageFiscalPayments(profile.role)) {
      throw new Error("Solo admin o finanzas pueden editar pagos.");
    }

    const paymentId = Number(getFormString(formData, "paymentId"));
    const reason = getFormString(formData, "reason");
    if (!paymentId) throw new Error("Pago requerido.");
    if (!reason) throw new Error("Captura el motivo de la correccion.");

    const supabase = createSupabaseAdminClient();
    const { data: paymentData, error: paymentError } = await supabase
      .from("project_payments")
      .select(
        "id, client_project_id, payment_date, payment_method, payment_form_code, payment_reference, payment_category, currency, amount, exchange_rate, amount_mxn, notes"
      )
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError) throw new Error(`Error leyendo pago: ${paymentError.message}`);
    if (!paymentData) throw new Error("Pago no encontrado.");

    const payment = paymentData as ProjectPaymentForEdit;
    const { data: stampedComplements, error: complementsError } = await supabase
      .from("project_payment_complements")
      .select("id")
      .eq("project_payment_id", payment.id)
      .in("status", ["issued", "stamped"]);

    if (complementsError) {
      throw new Error(`Error validando complementos: ${complementsError.message}`);
    }

    const hasStampedComplement = (stampedComplements || []).length > 0;
    const nextNotes = getFormString(formData, "notes") || null;
    const updatePayload: Partial<ProjectPaymentForEdit> & { updated_at: string } = {
      notes: nextNotes,
      updated_at: new Date().toISOString(),
    };

    if (!hasStampedComplement) {
      const nextAmount = Number(getFormString(formData, "amount"));
      const nextPaymentDate = getFormString(formData, "paymentDate");
      const nextPaymentFormCode = getFormString(formData, "paymentFormCode") || null;
      const nextPaymentReference = getFormString(formData, "paymentReference") || null;

      if (!nextPaymentDate) throw new Error("Fecha de pago requerida.");
      if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
        throw new Error("Captura un monto valido.");
      }
      if (!nextPaymentFormCode) throw new Error("Forma de pago SAT requerida.");

      const { data: paymentForm, error: paymentFormError } = await supabase
        .from("sat_payment_form_catalog")
        .select("code, is_active")
        .eq("code", nextPaymentFormCode)
        .maybeSingle();

      if (paymentFormError) {
        throw new Error(`Error validando forma de pago: ${paymentFormError.message}`);
      }
      if (!paymentForm?.is_active || nextPaymentFormCode === "99") {
        throw new Error("Seleccione una forma de pago SAT real.");
      }

      updatePayload.payment_date = nextPaymentDate;
      updatePayload.payment_method = nextPaymentFormCode;
      updatePayload.payment_form_code = nextPaymentFormCode;
      updatePayload.payment_reference = nextPaymentReference;
      updatePayload.amount = nextAmount;
      updatePayload.amount_mxn = getPaymentAmountMxn({
        currency: payment.currency,
        amount: nextAmount,
        exchange_rate: payment.exchange_rate,
      });
    }

    const oldValues = pickAuditedPaymentValues(payment);
    const newValues = {
      ...oldValues,
      ...updatePayload,
    };

    const { error: updateError } = await supabase
      .from("project_payments")
      .update(updatePayload)
      .eq("id", payment.id);

    if (updateError) throw new Error(`Error actualizando pago: ${updateError.message}`);

    const { error: auditError } = await supabase
      .from("project_payment_audit_log")
      .insert({
        project_payment_id: payment.id,
        changed_by_user_id: profile.id,
        old_values: oldValues,
        new_values: newValues,
        reason,
      });

    if (auditError) {
      throw new Error(`Pago actualizado, pero fallo la auditoria: ${auditError.message}`);
    }

    revalidatePath(`/projects/${payment.client_project_id}/account-statement`);
    revalidatePath(`/projects/${payment.client_project_id}/invoices`);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}
