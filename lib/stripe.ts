import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
      typescript: true,
    });
  }

  return stripeInstance;
}

export type CreateStripeServicePaymentInput = {
  serviceId: number;
  serviceNumber: string;
  amountMxn: number;
  clientName: string;
  clientEmail?: string | null;
  token?: string | null;
};

export async function getOrCreateServiceStripeCheckout(
  input: CreateStripeServicePaymentInput
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) {
    return null;
  }

  if (!input.amountMxn || input.amountMxn <= 0) {
    return null;
  }

  const baseUrl = getAppBaseUrl();
  const supabase = createSupabaseAdminClient();

  try {
    // Si ya existe un payment_link_url activo en service_reports, podemos reutilizarlo
    const { data: existingReport } = await supabase
      .from("service_reports")
      .select("payment_link_url, payment_status")
      .eq("id", input.serviceId)
      .maybeSingle();

    if (existingReport?.payment_link_url && existingReport.payment_status === "pending_payment") {
      return existingReport.payment_link_url;
    }

    const unitAmountCents = Math.round(input.amountMxn * 100);
    const returnUrl = input.token
      ? `${baseUrl}/public/service-sign/${input.token}`
      : `${baseUrl}/portal/services/${input.serviceId}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            unit_amount: unitAmountCents,
            product_data: {
              name: `Servicio Técnico ${input.serviceNumber} - ALFA IT`,
              description: `Servicio técnico e ingeniería en sitio para ${input.clientName}`,
              images: [`${baseUrl}/logo-print.png`],
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: input.clientEmail?.includes("@") ? input.clientEmail : undefined,
      client_reference_id: String(input.serviceId),
      metadata: {
        serviceId: String(input.serviceId),
        serviceNumber: input.serviceNumber,
        clientName: input.clientName,
        source: "alfa_os_services",
      },
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&paid=true`,
      cancel_url: returnUrl,
    });

    if (session.url) {
      await supabase
        .from("service_reports")
        .update({ payment_link_url: session.url })
        .eq("id", input.serviceId);
    }

    return session.url || null;
  } catch (error) {
    console.error("Error creando Stripe Checkout Session para servicio:", error);
    return null;
  }
}
