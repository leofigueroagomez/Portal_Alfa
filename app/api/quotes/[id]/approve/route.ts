import { QUOTE_APPROVAL_BOT_NOTE, approveQuoteVersion } from "@/lib/quoteApproval";
import {
  QUOTE_APPROVE_SERVICE_GLOBAL_LIMIT,
  QUOTE_APPROVE_SERVICE_GLOBAL_RATE_KEY,
  QUOTE_APPROVE_SERVICE_IP_LIMIT,
  QUOTE_APPROVE_SERVICE_WINDOW_MS,
  authorizeQuoteApproveService,
  parseQuoteApproveId,
  quoteApproveServiceIpRateKey,
  readConfiguredQuoteApproveServiceToken,
} from "@/lib/quoteApproveServiceGate";
import { notifyQuoteApproved } from "@/lib/notifications";
import { createOrGetProjectContract } from "@/lib/projectContractFromQuote";
import { checkRateLimit } from "@/lib/rateLimit";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type QuoteRow = {
  id: number;
  status: string | null;
  is_latest: boolean | null;
  quote_group_id: number | null;
  client_project_id: number | null;
  commercial_partner_id: number | null;
};

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    QUOTE_APPROVE_SERVICE_TOKEN: process.env.QUOTE_APPROVE_SERVICE_TOKEN,
  };

  if (!readConfiguredQuoteApproveServiceToken(env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const ipAllowed = await checkRateLimit(
    quoteApproveServiceIpRateKey(clientIp(request)),
    QUOTE_APPROVE_SERVICE_IP_LIMIT,
    QUOTE_APPROVE_SERVICE_WINDOW_MS
  );
  if (!ipAllowed) return json({ error: "Too Many Requests" }, 429);

  if (!authorizeQuoteApproveService(request.headers.get("authorization"), env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { id } = await params;
  const quoteId = parseQuoteApproveId(id);
  if (!quoteId) return json({ error: "Bad Request" }, 400);

  const globalAllowed = await checkRateLimit(
    QUOTE_APPROVE_SERVICE_GLOBAL_RATE_KEY,
    QUOTE_APPROVE_SERVICE_GLOBAL_LIMIT,
    QUOTE_APPROVE_SERVICE_WINDOW_MS
  );
  if (!globalAllowed) return json({ error: "Too Many Requests" }, 429);

  try {
    const supabase = createSupabaseAdminClient();
    const { data: quote, error: readError } = await supabase
      .from("quotes")
      .select("id, status, is_latest, quote_group_id, client_project_id, commercial_partner_id")
      .eq("id", quoteId)
      .maybeSingle<QuoteRow>();

    if (readError) throw readError;
    if (!quote) return json({ error: "Not Found" }, 404);
    if (quote.status === "approved") return json({ error: "Already approved" }, 409);
    if (quote.is_latest === false) return json({ error: "Not the latest version" }, 409);
    if (!quote.quote_group_id) return json({ error: "Quote has no group" }, 400);

    let partnerName: string | null = null;
    if (quote.commercial_partner_id) {
      const { data: partner } = await supabase
        .from("commercial_partners")
        .select("commercial_name")
        .eq("id", quote.commercial_partner_id)
        .maybeSingle<{ commercial_name: string | null }>();
      partnerName = partner?.commercial_name ?? null;
    }

    const result = await approveQuoteVersion(supabase, {
      quoteId,
      quoteGroupId: quote.quote_group_id,
      clientProjectId: quote.client_project_id,
      commercialPartnerId: quote.commercial_partner_id,
      commercialPartnerName: partnerName,
      requireLatest: true,
      resolveActorUserId: async () => null,
      createContract: (idToContract) => createOrGetProjectContract(supabase, idToContract),
      notify: (projectId, approvedQuoteId) =>
        notifyQuoteApproved(projectId, approvedQuoteId, {
          supabase,
          note: QUOTE_APPROVAL_BOT_NOTE,
        }),
    });

    if (!result.ok && !result.claimed) {
      const { data: again } = await supabase
        .from("quotes")
        .select("status, is_latest")
        .eq("id", quoteId)
        .maybeSingle<{ status: string | null; is_latest: boolean | null }>();
      if (again?.status === "approved") return json({ error: "Already approved" }, 409);
      if (again?.is_latest === false) return json({ error: "Not the latest version" }, 409);
      return json({ error: "Already approved" }, 409);
    }

    if (!result.ok) {
      const requestId = crypto.randomUUID();
      console.error(
        `[api:${requestId}] quote approve failed for quote ${quoteId} at ${result.step}`,
        result.error
      );
      return json({ error: "Unable to process request", requestId }, 500);
    }

    const { error: auditError } = await supabase.from("notification_events").insert({
      event_type: "quote_approved",
      client_project_id: quote.client_project_id,
      title: "Nueva cotizacion aprobada",
      message: QUOTE_APPROVAL_BOT_NOTE,
      status: "recorded",
    });

    const warnings = [...result.warnings];
    if (auditError) {
      warnings.push("No se pudo registrar la nota de auditoria");
      console.error(
        `[api:quote-approve] audit note failed for quote ${quoteId}`,
        auditError
      );
    }

    return json(
      { ok: true, quoteId, status: "approved", warnings },
      200
    );
  } catch (error) {
    const requestId = crypto.randomUUID();
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[api:${requestId}] quote approve failed for quote ${quoteId}: ${message}`);
    return json({ error: "Unable to process request", requestId }, 500);
  }
}
