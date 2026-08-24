import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

    return NextResponse.json({
      secret: connectionToken.secret,
      locationId: connectionToken.location || locationId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando token de Terminal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
