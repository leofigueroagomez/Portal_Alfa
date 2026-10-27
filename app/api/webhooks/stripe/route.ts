import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getServiceProposalTotals, type ServiceProposalQuoteItem } from "@/lib/serviceProposal";
import { checkStripeServicePayment, extractCheckoutSessionIdFromUrl } from "@/lib/finIntegrityStripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

type ServicePaymentSettlement = {
  serviceId: number;
  paidObjectId: string;
  amountCents: number | null | undefined;
  currency: string | null | undefined;
  paymentMethod: "stripe" | "stripe_terminal";
  paymentReference: string;
  /** De donde sale el id vigente guardado para el servicio. */
  storedIdFrom: "checkout_url" | "payment_reference";
};

// Concilia y liquida un servicio. Devuelve 500 solo ante fallas de BD (Stripe
// reintenta); cualquier discrepancia se registra en log y responde 200 sin
// marcar nada como pagado, para no entrar en reintentos infinitos.
async function settleServicePayment(
  supabase: SupabaseAdmin,
  input: ServicePaymentSettlement
): Promise<NextResponse | null> {
  const { data: report, error: reportError } = await supabase
    .from("service_reports")
    .select(
      "id, labor_sale_mxn, service_discount_type, service_discount_percent, service_discount_mxn, related_quote_id, payment_status, payment_link_url, payment_reference"
    )
    .eq("id", input.serviceId)
    .maybeSingle();

  if (reportError) {
    console.error(`Stripe webhook: error leyendo servicio ${input.serviceId}:`, reportError);
    return NextResponse.json({ error: "Database read failed" }, { status: 500 });
  }

  if (!report) {
    console.error(`Stripe webhook: servicio ${input.serviceId} no existe (${input.paidObjectId}). No se registra pago.`);
    return null;
  }

  if (report.payment_status === "paid") {
    // Idempotente: eventos repetidos no reescriben paid_at ni la referencia.
    return null;
  }

  if (report.payment_status !== "pending_payment") {
    console.error(
      `Stripe webhook: servicio ${input.serviceId} en estado ${report.payment_status}; pago ${input.paidObjectId} requiere conciliacion manual.`
    );
    return null;
  }

  // Importes que generan las rutas actuales: labor_sale_mxn (admin/cron) y el
  // total con refacciones, descuento e IVA de la pagina publica de firma.
  let quoteItems: ServiceProposalQuoteItem[] = [];
  if (report.related_quote_id) {
    const { data: items, error: itemsError } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", report.related_quote_id);

    if (itemsError) {
      console.error(`Stripe webhook: error leyendo partidas del servicio ${input.serviceId}:`, itemsError);
      return NextResponse.json({ error: "Database read failed" }, { status: 500 });
    }
    quoteItems = (items || []) as ServiceProposalQuoteItem[];
  }

  const proposalTotals = getServiceProposalTotals(
    {
      labor_sale_mxn: report.labor_sale_mxn || 0,
      service_discount_type: report.service_discount_type,
      service_discount_percent: report.service_discount_percent,
      service_discount_mxn: report.service_discount_mxn,
    },
    quoteItems
  );

  const storedObjectId =
    input.storedIdFrom === "checkout_url"
      ? extractCheckoutSessionIdFromUrl(report.payment_link_url)
      : typeof report.payment_reference === "string" && report.payment_reference.startsWith("pi_")
        ? report.payment_reference
        : null;

  const check = checkStripeServicePayment({
    paidObjectId: input.paidObjectId,
    amountCents: input.amountCents,
    currency: input.currency,
    expectedAmountsMxn: [report.labor_sale_mxn, proposalTotals.total],
    storedObjectId,
  });

  if (!check.ok) {
    console.error(
      `Stripe webhook: pago ${input.paidObjectId} NO aplicado al servicio ${input.serviceId}: ${check.reason}.`
    );
    return null;
  }

  // UPDATE condicionado: si otro evento ya lo liquido, no se reescribe.
  const { data: updated, error: updateError } = await supabase
    .from("service_reports")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: input.paymentMethod,
      payment_reference: input.paymentReference,
    })
    .eq("id", input.serviceId)
    .eq("payment_status", "pending_payment")
    .select("id");

  if (updateError) {
    console.error(`Error actualizando pago en servicio ${input.serviceId}:`, updateError);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  if (updated && updated.length > 0) {
    console.log(`✅ Servicio ${input.serviceId} marcado como pagado vía Stripe (${input.paidObjectId}).`);
  }

  return null;
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    // Sin firma verificada, cualquiera podria mandar un evento falso (p.ej. marcar
    // un servicio como pagado sin pagar). Nunca se debe confiar en el body sin
    // verificar contra STRIPE_WEBHOOK_SECRET.
    console.error("Stripe webhook rechazado: falta STRIPE_WEBHOOK_SECRET o el header stripe-signature.");
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Error verificando webhook de Stripe:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const serviceIdStr = session.metadata?.serviceId || session.client_reference_id;

      // Solo "paid": "unpaid" (pago asincrono en curso) y "no_payment_required"
      // nunca liquidan un servicio.
      if (serviceIdStr && session.payment_status === "paid") {
        const serviceId = parseInt(serviceIdStr, 10);
        if (!isNaN(serviceId)) {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;

          const failure = await settleServicePayment(supabase, {
            serviceId,
            paidObjectId: session.id,
            amountCents: session.amount_total,
            currency: session.currency,
            paymentMethod: "stripe",
            paymentReference: paymentIntentId || session.id,
            storedIdFrom: "checkout_url",
          });
          if (failure) return failure;
        }
      }
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const serviceIdStr = paymentIntent.metadata?.serviceId;

      if (serviceIdStr) {
        const serviceId = parseInt(serviceIdStr, 10);
        if (!isNaN(serviceId)) {
          const isTerminal = paymentIntent.payment_method_types?.includes("card_present");
          const failure = await settleServicePayment(supabase, {
            serviceId,
            paidObjectId: paymentIntent.id,
            amountCents: paymentIntent.amount_received,
            currency: paymentIntent.currency,
            paymentMethod: isTerminal ? "stripe_terminal" : "stripe",
            paymentReference: paymentIntent.id,
            storedIdFrom: "payment_reference",
          });
          if (failure) return failure;
        }
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
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
