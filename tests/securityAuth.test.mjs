import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextResponse } = require("next/server");

// Exercise the actual TypeScript guards with isolated auth/database boundaries.
// Unknown imports fail the test rather than reaching any configured environment.
function loadModule(relativePath, dependencies) {
  const filename = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename.pathname,
  });
  const cjsModule = { exports: {} };
  const mockRequire = (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  new Function("require", "module", "exports", outputText)(mockRequire, cjsModule, cjsModule.exports);
  return cjsModule.exports;
}

const permissions = loadModule("../lib/permissions.ts", {});
const internalProfile = {
  id: "fixture-user", email: "fixture@example.invalid", full_name: "Fixture",
  role: "finanzas", is_active: true, is_internal: true, user_type: "internal",
};

function loadGuards(profile, createClient = async () => ({
  // La consulta de MFA solo usa auth; cualquier lectura de datos falla la prueba.
  auth: {},
  from() {
    throw new Error("The guard must deny before consulting project data");
  },
})) {
  return loadModule("../lib/apiAuth.ts", {
    "server-only": {},
    "next/server": { NextResponse },
    "@/lib/permissions": permissions,
    "@/services/profile": {
      getCurrentUserProfile: async () => profile,
      getCurrentInternalUserProfile: async () => profile?.is_active && profile?.is_internal ? profile : null,
    },
    "@/services/supabaseServer": { createSupabaseServerClient: createClient },
    "@/lib/rateLimit": {},
    "@/lib/mfa": { getAssuranceState: async () => ({ needsChallenge: false }) },
  });
}

test("inactive finance and portal accounts fail all shared authentication guards", async () => {
  for (const profile of [
    null,
    { ...internalProfile, is_active: false },
    { ...internalProfile, role: "client", user_type: "client_portal", is_internal: false, is_active: false },
  ]) {
    const guards = loadGuards(profile);
    for (const result of [
      await guards.requireAuthenticatedUser(),
      await guards.requireFiscalProjectAccessForProfile(profile, 7),
      await guards.requirePortalProjectAccessForProfile(profile, 7),
    ]) {
      assert.equal(result.response.status, 401);
      assert.equal(result.profile, null);
    }
  }
});

test("active finance remains authorized and active commercial remains forbidden", async () => {
  const finance = loadGuards(internalProfile);
  assert.equal((await finance.requireAuthenticatedUser()).response, null);
  assert.equal((await finance.requireFiscalProjectAccessForProfile(internalProfile, 7)).response, null);
  const commercial = { ...internalProfile, role: "comercial" };
  assert.equal((await loadGuards(commercial).requireFiscalProjectAccessForProfile(commercial, 7)).response.status, 403);
});

test("active portal access still requires an active project assignment", async () => {
  const profile = { ...internalProfile, role: "client", user_type: "client_portal", is_internal: false };
  for (const hasAccess of [false, true]) {
    const filters = [];
    const guards = loadGuards(profile, async () => ({
      from(table) {
        return {
          select() { return this; },
          eq(column, value) { filters.push([table, column, value]); return this; },
          async maybeSingle() {
            return { data: table === "client_portal_users" ? { id: 9, client_id: 3, is_active: true } : hasAccess ? { id: 1 } : null, error: null };
          },
        };
      },
    }));
    const result = await guards.requirePortalProjectAccessForProfile(profile, 7);
    assert.equal(result.response?.status ?? null, hasAccess ? null : 403);
    assert.ok(filters.some(([table, column, value]) => table === "client_portal_users" && column === "user_id" && value === profile.id));
    assert.ok(filters.some(([table, column, value]) => table === "client_portal_project_access" && column === "client_project_id" && value === 7));
    assert.equal(filters.filter(([, column, value]) => column === "is_active" && value === true).length, 2);
  }
});

function loadSignout(signOut) {
  return loadModule("../app/auth/signout/route.ts", {
    "next/server": { NextResponse },
    "@/services/supabaseServer": { createSupabaseServerClient: async () => ({ auth: { signOut } }) },
  }).POST;
}

test("logout rejects missing or foreign origins without touching the session", async () => {
  const post = loadSignout(async () => { throw new Error("Must not sign out"); });
  for (const origin of [null, "https://attacker.invalid", "null"]) {
    const request = new Request("https://portal.example.invalid/auth/signout", {
      method: "POST", headers: origin ? { origin } : {},
    });
    assert.equal((await post(request)).status, 403);
  }
});

test("logout ends the current session and uses a fixed local redirect", async () => {
  let calls = 0;
  const post = loadSignout(async (options) => {
    calls += 1;
    assert.equal(options.scope, "local");
    return { error: null };
  });
  const response = await post(new Request("https://portal.example.invalid/auth/signout?next=https://attacker.invalid", {
    method: "POST", headers: { origin: "https://portal.example.invalid" },
  }));
  assert.equal(calls, 1);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/login");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("logout does not report success when Supabase cannot end the session", async () => {
  const post = loadSignout(async () => ({ error: { message: "provider failure" } }));
  const response = await post(new Request("https://portal.example.invalid/auth/signout", {
    method: "POST", headers: { origin: "https://portal.example.invalid" },
  }));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("location"), null);
  assert.doesNotMatch(await response.text(), /provider failure/);
});

function loadBusinessActions(relativePath, profile, dependencies = {}) {
  return loadModule(relativePath, {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect() { throw new Error("Unexpected redirect"); } },
    "@/services/profile": {
      getCurrentInternalUserProfile: async () => profile?.is_active && profile?.is_internal ? profile : null,
    },
    "@/lib/permissions": permissions,
    "@/services/supabaseAdmin": {
      createSupabaseAdminClient() { throw new Error("Unauthorized action reached service role"); },
    },
    "@/lib/appUrl": {},
    "@/lib/contracts": {},
    "@/lib/bankAccounts": {},
    "@/lib/publicDocumentLinks": {},
    "@/lib/serviceReportPdf": {},
    "@/lib/stripe": {},
    "@/lib/googleCalendar": {},
    "@/lib/googleCalendarSync": {},
    "@/lib/contractorNotificationEmail": {},
    "@/lib/contractPublicValidation": {},
    "@/lib/escapeHtml": { escapeHtml: String, safeHrefUrl: String },
    "@/lib/finIntegrityStripe": {},
    ...dependencies,
  });
}

test("commercial server actions reject anonymous, external, inactive and unrelated internal roles", async () => {
  const cases = [
    ["../app/(admin)/leads/actions.ts", [
      ["convertLeadToClient", [new FormData()], true],
    ]],
    ["../app/(admin)/projects/[id]/contract/actions.ts", [
      ["createOrGetProjectContractAction", [7], false],
      ["getContractDispatchContext", [7], true],
      ["signContractAsAlfaAction", [7, "fixture"], false],
      ["updateContractSettingsAction", [7, {}], false],
      ["sendContractReminderAction", [7], false],
    ]],
    ["../app/(admin)/services/[id]/actions.ts", [
      ["markServiceAsPaidAction", [7, { paymentMethod: "transfer" }], false],
      ["updateServiceAmountAction", [7, 100], false],
      ["completeServiceReportAction", [7], false],
      ["syncToGoogleCalendarAction", [7], false],
      ["sendServicePaymentReminderEmailAction", [7], false],
      ["getServiceDispatchContext", [7], true],
      ["notifyContractorAction", [7, 9], false],
    ]],
  ];
  for (const profile of [
    null,
    { ...internalProfile, role: "client", is_internal: false },
    { ...internalProfile, role: "contractor", is_internal: false },
    { ...internalProfile, role: "admin", is_active: false },
    { ...internalProfile, role: "instalador" },
  ]) {
    for (const [path, actions] of cases) {
      const loadedActions = loadBusinessActions(path, profile);
      assert.deepEqual(Object.keys(loadedActions).sort(), actions.map(([name]) => name).sort());
      for (const [name, args, throws] of actions) {
        if (throws) {
          await assert.rejects(loadedActions[name](...args), /No autorizado/);
        } else {
          const result = await loadedActions[name](...args);
          assert.equal(result.ok, false, name);
          assert.match(result.error, /No autorizado/, name);
        }
      }
    }
  }
});

test("contract creation still allows an authorized commercial user", async () => {
  const profile = { ...internalProfile, role: "comercial" };
  const actions = loadBusinessActions("../app/(admin)/projects/[id]/contract/actions.ts", profile, {
    "@/services/supabaseAdmin": {
      createSupabaseAdminClient: () => ({
        from(table) {
          assert.equal(table, "project_contracts");
          return {
            select() { return this; },
            eq(column, value) { assert.equal(column, "quote_id"); assert.equal(value, 7); return this; },
            async maybeSingle() { return { data: { id: 11, contract_number: "FIXTURE" }, error: null }; },
          };
        },
      }),
    },
  });
  assert.deepEqual(await actions.createOrGetProjectContractAction(7), {
    ok: true, contractId: 11, contractNumber: "FIXTURE",
  });
});

test("contractor notification requires the selected service to belong to that contractor", async () => {
  for (const assigned of [false, true]) {
    let sends = 0;
    const filters = [];
    const actions = loadBusinessActions("../app/(admin)/services/[id]/actions.ts", { ...internalProfile, role: "admin" }, {
      "@/services/supabaseAdmin": {
        createSupabaseAdminClient: () => ({
          from(table) {
            assert.equal(table, "service_reports");
            return {
              select() { return this; },
              eq(column, value) { filters.push([column, value]); return this; },
              async maybeSingle() { return { data: assigned ? { id: 7 } : null, error: null }; },
            };
          },
        }),
      },
      "@/lib/contractorNotificationEmail": {
        async sendContractorServiceAssignmentEmail(args) {
          sends += 1;
          assert.deepEqual(args, { serviceId: 7, contractorId: 9 });
          return { ok: true };
        },
      },
    });
    const result = await actions.notifyContractorAction(7, 9);
    assert.equal(result.ok, assigned);
    assert.equal(sends, assigned ? 1 : 0);
    assert.deepEqual(filters, [["id", 7], ["contractor_id", 9]]);
  }
});

test("portal contexts reject missing or inactive profiles before reading linked customer data", async () => {
  for (const profile of [null, { ...internalProfile, is_active: false }]) {
    const dependencies = {
      "server-only": {},
      "next/navigation": { redirect() { throw new Error("Unexpected redirect"); } },
      "@/lib/mexicoDate": {},
      "@/services/profile": { getCurrentUserProfile: async () => profile },
      "@/services/supabaseAdmin": {
        createSupabaseAdminClient() { throw new Error("Inactive user reached service role"); },
      },
      "@/services/supabaseServer": {
        createSupabaseServerClient: async () => ({
          auth: { getUser: async () => ({ data: { user: { id: internalProfile.id } } }) },
          from() { throw new Error("Inactive user reached portal data"); },
        }),
      },
    };
    const clients = loadModule("../lib/clientPortal.ts", dependencies);
    const contractors = loadModule("../lib/contractorPortal.ts", dependencies);
    assert.equal(await clients.findClientPortalContext(), null);
    assert.equal(await contractors.getContractorPortalContext(), null);
  }
});

test("work-order mutations and delivery email entrypoints deny unauthorized callers before database access", async () => {
  for (const profile of [null, { ...internalProfile, is_internal: false, role: "client" }, { ...internalProfile, role: "admin", is_active: false }, internalProfile]) {
    const auth = loadGuards(profile);
    const dependencies = {
      "@/services/supabaseServer": { createSupabaseServerClient() { throw new Error("Unauthorized caller reached database"); } },
      "@/lib/workOrdersAutomation": {},
      "node:crypto": {},
      "@/lib/apiAuth": auth,
      "@/lib/format": {},
      "@/lib/projectFinancials": {},
      "@/lib/projectDeliverySystems": {},
      "@/lib/mexicoDate": {},
      "@/lib/postSalePdf": {},
    };
    const workOrders = loadBusinessActions("../app/(admin)/projects/[id]/work-orders/actions.ts", profile, dependencies);
    const deliveries = loadBusinessActions("../app/(admin)/projects/[id]/deliveries/[deliveryId]/actions.ts", profile, dependencies);
    const results = [
      await workOrders.autoGenerateWorkOrdersAction(7),
      await workOrders.updateWorkOrderAssignmentAction({ workOrderId: 9, projectId: 7, executionType: "internal_staff" }),
      await deliveries.previewProjectDeliveryEmail(7, 9),
      await deliveries.sendProjectDeliveryEmail(7, 9, { to: "fixture@example.invalid", cc: "", subject: "Fixture", html: "Fixture" }),
    ];
    for (const result of results) {
      assert.equal(result.ok, false);
      assert.match(result.error || result.message, /No autorizado/);
    }
  }
});

test("work-order assignment is scoped to the supplied project and reports mismatches", async () => {
  for (const found of [false, true]) {
    const filters = [];
    const actions = loadBusinessActions("../app/(admin)/projects/[id]/work-orders/actions.ts", { ...internalProfile, role: "project_manager" }, {
      "@/lib/workOrdersAutomation": {},
      "@/services/supabaseServer": {
        createSupabaseServerClient: async () => ({
          from(table) {
            assert.equal(table, "work_orders");
            return {
              update() { return this; },
              eq(column, value) { filters.push([column, value]); return this; },
              select() { return this; },
              async maybeSingle() { return { data: found ? { id: 9 } : null, error: null }; },
            };
          },
        }),
      },
    });
    const result = await actions.updateWorkOrderAssignmentAction({ workOrderId: 9, projectId: 7, executionType: "internal_staff" });
    assert.equal(result.ok, found);
    assert.deepEqual(filters, [["id", 9], ["client_project_id", 7]]);
  }
});
