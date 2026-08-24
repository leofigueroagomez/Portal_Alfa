import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export type ScheduleWarrantyInvoiceInput = {
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  projectId: number;
  projectName: string;
  warrantyId: number;
  maintenanceAmountMxn: number;
  dueDateUnix: number; // Timestamp Unix para fecha límite
};

/**
 * Crea o programa un Stripe Invoice para la póliza de mantenimiento preventivo de garantía.
 * Cumple con Stripe Best Practices para Invoicing y automatización de cobro recurrente/hitos.
 */
export async function scheduleWarrantyMaintenanceInvoice(
  input: ScheduleWarrantyInvoiceInput
): Promise<{ invoiceId: string; invoicePdf?: string; hostedInvoiceUrl?: string } | null> {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("Stripe no está configurado.");
  }

  if (!input.maintenanceAmountMxn || input.maintenanceAmountMxn <= 0) {
    return null;
  }

  // 1. Buscar o crear el Customer en Stripe
  let customerId: string | null = null;
  const existingCustomers = await stripe.customers.list({
    email: input.clientEmail,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email: input.clientEmail,
      name: input.clientName,
      phone: input.clientPhone || undefined,
      metadata: {
        alfaClientId: String(input.clientId),
      },
    });
    customerId = customer.id;
  }

  // 2. Crear el ítem de la factura
  const unitAmountCents = Math.round(input.maintenanceAmountMxn * 100);

  await stripe.invoiceItems.create({
    customer: customerId,
    amount: unitAmountCents,
    currency: "mxn",
    description: `Póliza de Mantenimiento Preventivo Semestral - Proyecto: ${input.projectName} (Garantía ALFA IT)`,
    metadata: {
      warrantyId: String(input.warrantyId),
      projectId: String(input.projectId),
      alfaType: "warranty_preventive_maintenance",
    },
  });

  // 3. Crear el Invoice con fecha de vencimiento programada
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    due_date: input.dueDateUnix,
    auto_advance: true,
    metadata: {
      warrantyId: String(input.warrantyId),
      projectId: String(input.projectId),
      clientId: String(input.clientId),
      source: "alfa_os_warranties",
    },
  });

  // Guardar ID del invoice en metadata o log
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("project_warranties")
    .update({
      support_email: input.clientEmail,
    })
    .eq("id", input.warrantyId);

  return {
    invoiceId: invoice.id,
    hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
    invoicePdf: invoice.invoice_pdf || undefined,
  };
}
