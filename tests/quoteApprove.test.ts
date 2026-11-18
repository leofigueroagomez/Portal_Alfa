import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  QUOTE_APPROVAL_BOT_NOTE,
  approveQuoteVersion,
} from "../lib/quoteApproval";
import {
  QUOTE_APPROVE_SERVICE_IP_LIMIT,
  authorizeQuoteApproveService,
  parseQuoteApproveId,
  readConfiguredQuoteApproveServiceToken,
} from "../lib/quoteApproveServiceGate";

const TOKEN = "0123456789abcdef0123456789abcdef";

test("el token de aprobacion es distinto, largo y solo de Production", () => {
  assert.equal(readConfiguredQuoteApproveServiceToken({}), null);
  assert.equal(
    readConfiguredQuoteApproveServiceToken({
      VERCEL_ENV: "production",
      QUOTE_APPROVE_SERVICE_TOKEN: "corto",
    }),
    null
  );
  assert.equal(
    readConfiguredQuoteApproveServiceToken({
      VERCEL_ENV: "preview",
      QUOTE_APPROVE_SERVICE_TOKEN: TOKEN,
    }),
    null
  );
  assert.equal(
    readConfiguredQuoteApproveServiceToken({
      VERCEL_ENV: "production",
      QUOTE_APPROVE_SERVICE_TOKEN: TOKEN,
    }),
    TOKEN
  );
  assert.equal(authorizeQuoteApproveService(`Bearer ${TOKEN}`, { VERCEL_ENV: "production" }), false);
  assert.equal(
    authorizeQuoteApproveService(`Bearer ${TOKEN}`, {
      VERCEL_ENV: "production",
      QUOTE_APPROVE_SERVICE_TOKEN: TOKEN,
    }),
    true
  );
  assert.equal(
    authorizeQuoteApproveService(null, {
      VERCEL_ENV: "production",
      QUOTE_APPROVE_SERVICE_TOKEN: TOKEN,
    }),
    false
  );
  assert.equal(parseQuoteApproveId("261"), 261);
  assert.equal(parseQuoteApproveId("ALFA-0199"), null);
  assert.equal(QUOTE_APPROVE_SERVICE_IP_LIMIT < 10, true);
});

type Filter = ["eq" | "neq", string, unknown];

function approvalClient(options?: { alreadyApproved?: boolean; latest?: boolean }) {
  let status = options?.alreadyApproved ? "approved" : "draft";
  const latest = options?.latest ?? true;
  const calls: string[] = [];
  const syncs: Array<string | null> = [];

  function builder(table: string, payload: Record<string, unknown>) {
    const filters: Filter[] = [];
    const api = {
      eq(column: string, value: unknown) {
        filters.push(["eq", column, value]);
        return api;
      },
      neq(column: string, value: unknown) {
        filters.push(["neq", column, value]);
        return api;
      },
      select: async () => {
        calls.push(`claim:${JSON.stringify(filters)}`);
        const requiresLatest = filters.some(([op, column]) => op === "eq" && column === "is_latest");
        const blocksApproved = filters.some(
          ([op, column, value]) => op === "neq" && column === "status" && value === "approved"
        );
        if (table === "quotes" && blocksApproved && status !== "approved" && (!requiresLatest || latest)) {
          status = "approved";
          return { data: [{ id: 10 }], error: null };
        }
        return { data: [], error: null };
      },
      then(resolve: (value: { error: null }) => unknown, reject?: (reason: unknown) => unknown) {
        calls.push(`update:${table}:${Object.keys(payload).join(",")}`);
        return Promise.resolve({ error: null }).then(resolve, reject);
      },
    };
    return api;
  }

  const client = {
    from(table: string) {
      return {
        update(payload: Record<string, unknown>) {
          return builder(table, payload);
        },
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    calls,
    syncs,
    get status() {
      return status;
    },
  };
}

const baseInput = {
  quoteId: 10,
  quoteGroupId: 3,
  clientProjectId: 48,
  commercialPartnerId: 2,
  commercialPartnerName: "Kybit",
  resolveActorUserId: async () => null as string | null,
  createContract: async () => ({ ok: true }),
  notify: () => undefined,
};

test("la aprobacion reclama una sola vez y no llama compras si pierde", async () => {
  const db = approvalClient();
  const syncs: Array<string | null> = [];
  const orders: number[] = [];
  let contracts = 0;

  const first = await approveQuoteVersion(
    db.client,
    { ...baseInput, requireLatest: true, createContract: async () => { contracts += 1; } },
    {
      syncProjectOperationalItems: async (_client, _project, userId) => {
        syncs.push(userId ?? null);
        return { inserted: 1, skipped: 0, approvedQuotes: 1, activitiesInserted: 0, activitiesSkipped: 0 };
      },
      generateProjectSpecializedWorkOrders: async (_client, _project, quoteId) => {
        orders.push(quoteId || 0);
        return { ok: true, generatedOrders: [] };
      },
      proposeProjectPartnerFromQuote: async () => false,
    }
  );

  const second = await approveQuoteVersion(
    db.client,
    { ...baseInput, requireLatest: true },
    {
      syncProjectOperationalItems: async () => {
        syncs.push("second");
        return { inserted: 0, skipped: 0, approvedQuotes: 1, activitiesInserted: 0, activitiesSkipped: 0 };
      },
      generateProjectSpecializedWorkOrders: async () => {
        orders.push(-1);
        return { ok: true, generatedOrders: [] };
      },
      proposeProjectPartnerFromQuote: async () => false,
    }
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.claimed, false);
  assert.deepEqual(syncs, [null]);
  assert.deepEqual(orders, [10]);
  assert.equal(contracts, 1);
  assert.equal(db.calls.some((call) => call.includes('"is_latest"')), true);
  assert.equal(db.calls.some((call) => call.includes('"approved"')), true);
});

test("sin exigir ultima version el boton no filtra is_latest", async () => {
  const db = approvalClient();
  const result = await approveQuoteVersion(
    db.client,
    { ...baseInput, clientProjectId: null, requireLatest: false },
    {
      syncProjectOperationalItems: async () => {
        throw new Error("no debio sincronizar");
      },
      generateProjectSpecializedWorkOrders: async () => {
        throw new Error("no debio generar odt");
      },
      proposeProjectPartnerFromQuote: async () => false,
    }
  );
  assert.equal(result.ok, true);
  assert.equal(db.calls.some((call) => call.includes("is_latest")), false);
});

test("la ruta no usa el token del PDF y deja el actor en null", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/api/quotes/[id]/approve/route.ts"),
    "utf8"
  );
  const button = readFileSync(
    path.join(process.cwd(), "app/(admin)/quotes/[id]/ApproveQuoteVersionButton.tsx"),
    "utf8"
  );

  assert.match(source, /QUOTE_APPROVE_SERVICE_TOKEN/);
  assert.match(source, /QUOTE_APPROVAL_BOT_NOTE/);
  assert.match(source, /approveQuoteVersion/);
  assert.match(source, /resolveActorUserId: async \(\) => null/);
  assert.equal(source.includes("QUOTE_PDF_SERVICE_TOKEN"), false);
  assert.equal(source.includes(".update({ status: \"approved\" })"), false);
  assert.match(button, /approveQuoteVersion/);
  assert.match(button, /requireLatest: false/);
  assert.equal(button.includes(".update("), false);
  assert.equal(QUOTE_APPROVAL_BOT_NOTE, "aprobado por bot a petición de Leonardo");
});
