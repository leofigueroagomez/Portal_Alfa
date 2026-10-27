import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute production functions with every network/provider boundary replaced.
function loadModule(path, dependencies, globals = {}) {
  const filename = new URL(path, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename.pathname,
  });
  const loadedModule = { exports: {} };
  const mockRequire = (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  new Function("require", "module", "exports", ...Object.keys(globals), outputText)(
    mockRequire, loadedModule, loadedModule.exports, ...Object.values(globals),
  );
  return loadedModule.exports;
}

function warrantyFixture({ denied = false, mismatch = false } = {}) {
  const calls = { clients: 0, privileged: 0, links: 0, financials: 0, emails: [], filters: [] };
  const rows = {
    project_warranties: mismatch ? null : { id: 8, client_project_id: 4, status: "issued" },
    client_projects: { id: 4, name: "<script>project</script>", clients: { name: "Client & Co", email: "fixture@example.invalid" } },
    project_deliveries: null,
  };
  const client = {
    from(table) {
      return {
        select() { return this; }, update() { return this; },
        eq(key, value) { calls.filters.push([table, key, value]); return this; },
        order() { return this; }, limit() { return this; },
        async maybeSingle() { return { data: rows[table], error: null }; },
      };
    },
  };
  const actions = loadModule("../app/(admin)/projects/[id]/warranty/[warrantyId]/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/apiAuth": { requireWorkOrderRole: async () => ({ response: denied ? { status: 403 } : null }) },
    "@/services/supabaseServer": { createSupabaseServerClient: async () => { calls.clients++; return client; } },
    "@/services/supabaseAdmin": { createSupabaseAdminClient: () => { calls.privileged++; return client; } },
    "@/lib/appUrl": { getAppBaseUrl: () => "https://portal.example.invalid" },
    "@/lib/postSalePdf": { generateWarrantyLetterPdf: async () => Buffer.from("fixture") },
    "@/lib/projectFinancials": { getProjectFinancialSummary: async () => { calls.financials++; return { balance: 0 }; } },
    "@/lib/publicDocumentLinks": { getOrCreateWarrantyPublicLink: async () => { calls.links++; return { token: "fixture-token" }; } },
  }, {
    process: { env: { RESEND_API_KEY: "fixture-only", EMAIL_FROM: "fixture@example.invalid" } },
    fetch: async (_url, options) => {
      calls.emails.push(JSON.parse(options.body));
      return { ok: true, text: async () => "{}" };
    },
  });
  return { actions, calls };
}

test("warranty actions deny before database, token generation or email", async () => {
  const { actions, calls } = warrantyFixture({ denied: true });
  await assert.rejects(actions.getWarrantyDispatchContext(4, 8), /No autorizado/);
  assert.equal((await actions.sendProjectWarrantyEmailAction({ projectId: 4, warrantyId: 8, recipientEmail: "fixture@example.invalid" })).ok, false);
  assert.equal(calls.clients + calls.privileged + calls.links + calls.financials + calls.emails.length, 0);
});

test("warranty from another project cannot mint a public link or read financials", async () => {
  const { actions, calls } = warrantyFixture({ mismatch: true });
  await assert.rejects(actions.getWarrantyDispatchContext(4, 8), /no encontrada/);
  assert.equal(calls.privileged + calls.links + calls.financials, 0);
  assert.ok(calls.filters.some(([table, key, value]) => table === "project_warranties" && key === "client_project_id" && value === 4));
});

test("valid warranty retains dispatch and escapes untrusted email content", async () => {
  const { actions, calls } = warrantyFixture();
  assert.match((await actions.getWarrantyDispatchContext(4, 8)).directPdfUrl, /fixture-token/);
  assert.equal(calls.links, 1);
  const result = await actions.sendProjectWarrantyEmailAction({
    projectId: 4, warrantyId: 8, recipientEmail: "fixture@example.invalid",
    customMessage: '<img src="https://attacker.invalid/pixel">',
  });
  assert.equal(result.ok, true);
  assert.equal(calls.emails.length, 1);
  const html = calls.emails[0].html;
  assert.ok(!html.includes("<script>project"));
  assert.ok(!html.includes('<img src="https://attacker.invalid'));
  assert.ok(html.includes("&lt;script&gt;project"));
  assert.ok(html.includes("Client &amp; Co"));
});

test("rate limiter preserves limits and bounds memory under unique-key flooding", () => {
  let now = 1000;
  const limiter = loadModule("../lib/rateLimit.ts", { "server-only": {} }, {
    Date: { now: () => now }, process: { env: {} },
  });
  assert.equal(limiter.checkMemoryRateLimit("existing", 2), true);
  assert.equal(limiter.checkMemoryRateLimit("existing", 2), true);
  assert.equal(limiter.checkMemoryRateLimit("existing", 2), false);
  for (let i = 0; i < 9999; i++) assert.equal(limiter.checkMemoryRateLimit(`key-${i}`), true);
  assert.equal(limiter.checkMemoryRateLimit("overflow"), false);
  assert.equal(limiter.checkMemoryRateLimit("existing", 2), false);
  now += 60_001;
  assert.equal(limiter.checkMemoryRateLimit("overflow"), true);
});

test("malformed Redis replies cannot silently allow unlimited requests", async () => {
  const limiter = loadModule("../lib/rateLimit.ts", { "server-only": {} }, {
    process: { env: { UPSTASH_REDIS_REST_URL: "https://redis.example.invalid", UPSTASH_REDIS_REST_TOKEN: "fixture" } },
    fetch: async (_url, options) => {
      assert.ok(options.signal);
      return { ok: true, json: async () => [{ error: "fixture failure" }] };
    },
  });
  assert.equal(await limiter.checkRateLimit("fixture", 1), true);
  assert.equal(await limiter.checkRateLimit("fixture", 1), false);
});

function loadWorker() {
  const handlers = {};
  const cached = [];
  const context = {
    URL,
    self: { location: { origin: "https://portal.example.invalid" }, addEventListener: (name, callback) => { handlers[name] = callback; } },
    caches: { match: async () => null, open: async () => ({ put: (request) => { cached.push(request.url); } }) },
    fetch: async () => new Response("fixture", { status: 200 }),
  };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), context);
  return { handlers, cached };
}

test("service worker never caches private URLs disguised as static images", async () => {
  const { handlers, cached } = loadWorker();
  for (const path of ["/api/invoices/1/pdf?name=.png", "/portal/projects/1?asset=/catalog/", "/public/documents/token/file.png", "/auth/callback?next=.ico"]) {
    handlers.fetch({ request: new Request(`https://portal.example.invalid${path}`), respondWith() { assert.fail(`Cache intercepted ${path}`); } });
  }
  let response;
  handlers.fetch({ request: new Request("https://portal.example.invalid/_next/static/fixture.js"), respondWith(promise) { response = promise; } });
  assert.equal((await response).status, 200);
  assert.equal(cached.length, 1);
});
