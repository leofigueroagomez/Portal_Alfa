import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export type CreateTerminalPaymentIntentInput = {
  serviceId: number;
  serviceNumber: string;
  amountMxn: number;
  clientName: string;
};

/**
 * Crea un PaymentIntent para cobro presencial en sitio con terminal física (BBPOS / WisePOS E)
 * o Tap to Pay on Mobile.
 * 
 * Regla de Stripe Best Practices: Terminal es la única integración donde DEBE pasarse
 * payment_method_types: ['card_present'].
 */
export async function createTerminalServicePaymentIntent(
  input: CreateTerminalPaymentIntentInput
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("Stripe no está configurado.");
  }

  const unitAmountCents = Math.round(input.amountMxn * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: unitAmountCents,
    currency: "mxn",
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    description: `Servicio Técnico ${input.serviceNumber} - ALFA IT`,
    metadata: {
      serviceId: String(input.serviceId),
      serviceNumber: input.serviceNumber,
      clientName: input.clientName,
      source: "alfa_terminal_pos",
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("No se pudo obtener el client_secret de Stripe Terminal.");
  }

  // Guardar referencia en el reporte de servicio
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("service_reports")
    .update({
      payment_reference: paymentIntent.id,
    })
    .eq("id", input.serviceId);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}
