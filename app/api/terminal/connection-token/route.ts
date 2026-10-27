import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { requireServicesRole } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const { response } = await requireServicesRole();
  if (response) return response;

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 500 });
  }

  try {
    const locationId =
      process.env.STRIPE_TERMINAL_LOCATION_ID || "tml_GoiWLQB0rq1oxc";

    const connectionToken = await stripe.terminal.connectionTokens.create({
      location: locationId,
    });

    return NextResponse.json(
      {
        secret: connectionToken.secret,
        locationId: connectionToken.location || locationId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando token de Terminal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
