import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  let event: import("stripe").Stripe.Event;

  try {
    const rawBody = await request.text();

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as import("stripe").Stripe.Event;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Error verificando webhook de Stripe:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const serviceIdStr = session.metadata?.serviceId || session.client_reference_id;

      if (serviceIdStr && session.payment_status !== "unpaid") {
        const serviceId = parseInt(serviceIdStr, 10);
        if (!isNaN(serviceId)) {
          const paidAt = new Date().toISOString();
          const paymentReference = session.payment_intent
            ? String(session.payment_intent)
            : session.id;

          const { error: updateError } = await supabase
            .from("service_reports")
            .update({
              payment_status: "paid",
              paid_at: paidAt,
              payment_method: "stripe",
              payment_reference: paymentReference,
            })
            .eq("id", serviceId);

          if (updateError) {
            console.error(`Error actualizando pago en servicio ${serviceId}:`, updateError);
          } else {
            console.log(`✅ Servicio ${serviceId} marcado automáticamente como pagado vía Stripe Checkout (${session.id}).`);
          }
        }
      }
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as import("stripe").Stripe.PaymentIntent;
      const serviceIdStr = paymentIntent.metadata?.serviceId;

      if (serviceIdStr) {
        const serviceId = parseInt(serviceIdStr, 10);
        if (!isNaN(serviceId)) {
          const paidAt = new Date().toISOString();
          const isTerminal = paymentIntent.payment_method_types?.includes("card_present");

          await supabase
            .from("service_reports")
            .update({
              payment_status: "paid",
              paid_at: paidAt,
              payment_method: isTerminal ? "stripe_terminal" : "stripe",
              payment_reference: paymentIntent.id,
            })
            .eq("id", serviceId);

          console.log(`✅ Servicio ${serviceId} pagado vía ${isTerminal ? "Stripe Terminal (Presencial)" : "PaymentIntent"} (${paymentIntent.id}).`);
        }
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as import("stripe").Stripe.Invoice;
      const warrantyIdStr = invoice.metadata?.warrantyId;

      if (warrantyIdStr) {
        console.log(`✅ Póliza de garantía ${warrantyIdStr} renovada/pagada vía Stripe Invoice (${invoice.id}).`);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
