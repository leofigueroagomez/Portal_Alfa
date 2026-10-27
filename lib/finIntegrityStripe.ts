// Conciliacion pura (sin I/O) de pagos Stripe contra el servicio esperado.
// El webhook solo marca `paid` si importe, moneda y sesion coinciden.

/** Convierte MXN a centavos como lo hace la creacion de la Checkout Session. */
export function toStripeCents(amountMxn: number | null | undefined): number {
  const amount = Number(amountMxn || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

/**
 * `service_reports` no guarda el id de la Checkout Session, solo
 * `payment_link_url` (= `session.url`), cuyo path contiene `cs_test_...` o
 * `cs_live_...`. Lo extraemos para conciliar y para expirar la sesion vieja.
 */
export function extractCheckoutSessionIdFromUrl(url: string | null | undefined): string | null {
  const match = (url || "").match(/\/(cs_(?:test|live)_[A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

export type StripePaymentCheckInput = {
  /** Id del objeto Stripe pagado (Checkout Session o PaymentIntent). */
  paidObjectId: string;
  /** `amount_total` (Checkout) o `amount_received` (PaymentIntent), en centavos. */
  amountCents: number | null | undefined;
  currency: string | null | undefined;
  /** Importes validos en MXN segun las rutas que crean el cobro. */
  expectedAmountsMxn: Array<number | null | undefined>;
  /** Id guardado para el servicio, si existe; si viene, debe coincidir. */
  storedObjectId?: string | null;
};

export type StripePaymentCheckResult =
  | { ok: true; amountCents: number }
  | { ok: false; reason: string };

export function checkStripeServicePayment(input: StripePaymentCheckInput): StripePaymentCheckResult {
  if ((input.currency || "").toLowerCase() !== "mxn") {
    return { ok: false, reason: `moneda inesperada (${input.currency || "sin moneda"})` };
  }

  const amountCents = Number(input.amountCents);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: "importe pagado invalido" };
  }

  const expectedCents = input.expectedAmountsMxn
    .map((amount) => toStripeCents(amount))
    .filter((cents) => cents > 0);

  if (expectedCents.length === 0) {
    return { ok: false, reason: "el servicio no tiene importe esperado" };
  }

  if (!expectedCents.includes(amountCents)) {
    return {
      ok: false,
      reason: `importe ${amountCents} no coincide con lo esperado (${expectedCents.join(" / ")})`,
    };
  }

  if (input.storedObjectId && input.storedObjectId !== input.paidObjectId) {
    return {
      ok: false,
      reason: `sesion ${input.paidObjectId} no coincide con la vigente ${input.storedObjectId}`,
    };
  }

  return { ok: true, amountCents };
}
