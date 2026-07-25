import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const SANDBOX_REF = "pkqwlvqosooewbejbktx";
const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const marker = `ALFA-BLINDS-SMOKE-${new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(0, 14)}`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const fixtureAdminKey = process.env.SMOKE_FIXTURE_ADMIN_KEY;
const linkedRef = readFileSync("supabase/.temp/project-ref", "utf8").trim();

assert.equal(linkedRef, SANDBOX_REF, "El CLI no está enlazado al sandbox autorizado.");
assert.equal(
  new URL(supabaseUrl).hostname,
  `${SANDBOX_REF}.supabase.co`,
  "La URL Supabase no pertenece al sandbox autorizado."
);
assert.ok(publishableKey, "Falta publishable key sandbox.");
assert.ok(fixtureAdminKey, "Falta la llave administrativa sólo para fixtures.");

const fixtureAdmin = createClient(supabaseUrl, fixtureAdminKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const password = `Sbx!${randomBytes(24).toString("base64url")}`;
const fixtureUsers = [];
let server;
let quoteId = null;
let quoteGroupId = null;
let itemId = null;
let adminSession = null;

function createCookieSession() {
  const cookieJar = new Map();
  const client = createBrowserClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return [...cookieJar].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const cookie of cookies) {
          if (cookie.value) cookieJar.set(cookie.name, cookie.value);
          else cookieJar.delete(cookie.name);
        }
      },
    },
  });

  return {
    client,
    cookieHeader() {
      return [...cookieJar]
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
  };
}

async function createFixtureUser(label, userMetadata) {
  const email = `${marker.toLowerCase()}-${label}@example.invalid`;
  const { data, error } = await fixtureAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `${marker} ${label}`,
      ...userMetadata,
    },
  });
  assert.ifError(error);
  assert.ok(data.user?.id, `No se creó el usuario ${label}.`);
  fixtureUsers.push({ id: data.user.id, label });

  const session = createCookieSession();
  const { error: signInError } = await session.client.auth.signInWithPassword({
    email,
    password,
  });
  assert.ifError(signInError);
  const { data: profile, error: profileError } = await session.client.rpc(
    "ensure_current_user_profile"
  );
  assert.ifError(profileError);
  assert.ok(profile, `No se creó el perfil ${label}.`);
  return { ...session, userId: data.user.id };
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/login`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`El servidor local no inició: ${lastError || "timeout"}`);
}

async function api(session, path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(session ? { cookie: session.cookieHeader() } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { non_json_response: true };
  }
  return { status: response.status, json };
}

async function cleanup() {
  const cleanupErrors = [];

  if (adminSession && quoteId) {
    const { data, error } = await adminSession.client
      .from("quotes")
      .delete()
      .eq("id", quoteId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      cleanupErrors.push(`quote: ${error?.code || error?.message || "not deleted"}`);
    }
  }
  if (adminSession && quoteGroupId) {
    const { data, error } = await adminSession.client
      .from("quote_groups")
      .delete()
      .eq("id", quoteGroupId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      cleanupErrors.push(`group: ${error?.code || error?.message || "not deleted"}`);
    }
  }

  for (const fixture of fixtureUsers) {
    const { error: profileError } = await fixtureAdmin
      .from("profiles")
      .delete()
      .eq("id", fixture.id);
    if (profileError) {
      cleanupErrors.push(
        `profile ${fixture.label}: ${profileError.code || profileError.message}`
      );
    }
    const { error: userError } = await fixtureAdmin.auth.admin.deleteUser(
      fixture.id
    );
    if (userError) {
      cleanupErrors.push(
        `auth ${fixture.label}: ${userError.code || userError.message}`
      );
    }
  }

  const residualChecks = [
    fixtureAdmin
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("notes", marker),
    fixtureAdmin
      .from("quote_groups")
      .select("id", { count: "exact", head: true })
      .eq("id", quoteGroupId || -1),
    fixtureAdmin
      .from("quote_sections")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quoteId || -1),
    fixtureAdmin
      .from("quote_items")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quoteId || -1),
    fixtureAdmin
      .from("quote_blind_item_details")
      .select("quote_item_id", { count: "exact", head: true })
      .eq("quote_item_id", itemId || -1),
    fixtureAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in(
        "id",
        fixtureUsers.length > 0
          ? fixtureUsers.map((fixture) => fixture.id)
          : ["00000000-0000-0000-0000-000000000000"]
      ),
  ];
  const residualResults = await Promise.all(residualChecks);
  residualResults.forEach((result, index) => {
    if (result.error || result.count !== 0) {
      cleanupErrors.push(
        `residual ${index}: ${result.error?.code || result.error?.message || result.count}`
      );
    }
  });

  const { data: authUsers, error: authListError } =
    await fixtureAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authListError) {
    cleanupErrors.push(`auth residual check: ${authListError.message}`);
  } else {
    const fixtureIds = new Set(fixtureUsers.map((fixture) => fixture.id));
    const residualAuthUsers = authUsers.users.filter((user) =>
      fixtureIds.has(user.id)
    );
    if (residualAuthUsers.length > 0) {
      cleanupErrors.push(`auth residual users: ${residualAuthUsers.length}`);
    }
  }

  if (server && !server.killed) server.kill();
  return cleanupErrors;
}

try {
  const commercial = await createFixtureUser("commercial", {});
  const client = await createFixtureUser("client", {
    user_type: "client_portal",
    role: "client",
  });
  adminSession = await createFixtureUser("admin", {});
  const { error: promoteError } = await fixtureAdmin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", adminSession.userId);
  assert.ifError(promoteError);

  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );
  await waitForServer();

  const anonymousList = await api(null, "/api/quotes/blinds");
  assert.equal(anonymousList.status, 401);

  const clientList = await api(client, "/api/quotes/blinds");
  assert.equal(clientList.status, 401);
  assert.equal(JSON.stringify(clientList.json).includes("internal_notes"), false);
  assert.equal(JSON.stringify(clientList.json).includes("override_reason"), false);

  const createResult = await api(commercial, "/api/quotes/blinds", {
    method: "POST",
    body: { notes: marker },
  });
  assert.equal(createResult.status, 201, JSON.stringify(createResult.json));
  quoteId = Number(createResult.json.quote.id);
  quoteGroupId = Number(createResult.json.quote.quote_group_id);
  assert.ok(quoteId > 0);
  assert.ok(quoteGroupId > 0);
  assert.equal(createResult.json.quote.quote_type, "blinds");

  const listResult = await api(commercial, "/api/quotes/blinds");
  assert.equal(listResult.status, 200);
  assert.ok(listResult.json.quotes.some((quote) => Number(quote.id) === quoteId));
  assert.equal(JSON.stringify(listResult.json).includes("internal_notes"), false);
  assert.equal(JSON.stringify(listResult.json).includes("override_reason"), false);

  const detailEmpty = await api(
    commercial,
    `/api/quotes/blinds/${quoteId}`
  );
  assert.equal(detailEmpty.status, 200);
  assert.deepEqual(detailEmpty.json.items, []);

  const createItemResult = await api(
    commercial,
    `/api/quotes/blinds/${quoteId}/items`,
    {
      method: "POST",
      body: {
        area: `${marker} Recámara`,
        brand: "Hunter Douglas",
        model: "Duette",
        width_cm: 120,
        height_cm: 200,
        blind_type: "Celular",
        collection: "Applause",
        color: "Marfil",
        mechanism: "Motorizado",
        control: "Control remoto",
        quantity: 2,
        price_per_m2_mxn: 350,
        billable_m2_override: 5,
        override_reason: `${marker} mínimo facturable`,
        reference_image_path: `quote-blinds/${quoteId}/reference.webp`,
        internal_notes: `${marker} nota interna`,
        customer_visible_note: `${marker} nota cliente`,
      },
    }
  );
  assert.equal(
    createItemResult.status,
    201,
    JSON.stringify(createItemResult.json)
  );
  itemId = Number(createItemResult.json.item.id);
  assert.equal(createItemResult.json.totals.subtotal_mxn, 1750);
  assert.equal(createItemResult.json.totals.iva_mxn, 280);
  assert.equal(createItemResult.json.totals.total_mxn, 2030);

  const detailWithItem = await api(
    commercial,
    `/api/quotes/blinds/${quoteId}`
  );
  assert.equal(detailWithItem.status, 200);
  assert.equal(detailWithItem.json.items.length, 1);
  assert.equal(
    detailWithItem.json.items[0].blind_detail.calculated_m2_per_unit,
    2.4
  );
  assert.equal(
    detailWithItem.json.items[0].blind_detail.internal_notes,
    `${marker} nota interna`
  );
  assert.equal(
    detailWithItem.json.items[0].blind_detail.override_reason,
    `${marker} mínimo facturable`
  );

  const updateResult = await api(
    commercial,
    `/api/quotes/blinds/${quoteId}/items/${itemId}`,
    {
      method: "PATCH",
      body: {
        area: `${marker} Sala`,
        brand: "Hunter Douglas",
        model: "Duette",
        width_cm: 100,
        height_cm: 200,
        blind_type: "Celular",
        collection: "Applause",
        color: "Gris",
        mechanism: "Manual",
        control: "Cadena",
        quantity: 3,
        price_per_m2_mxn: 400,
        billable_m2_override: null,
        override_reason: null,
        reference_image_path: `quote-blinds/${quoteId}/reference-2.webp`,
        internal_notes: `${marker} nota interna actualizada`,
        customer_visible_note: `${marker} nota cliente actualizada`,
      },
    }
  );
  assert.equal(updateResult.status, 200, JSON.stringify(updateResult.json));
  assert.equal(updateResult.json.totals.subtotal_mxn, 2400);
  assert.equal(updateResult.json.totals.iva_mxn, 384);
  assert.equal(updateResult.json.totals.total_mxn, 2784);

  const commercialDelete = await api(
    commercial,
    `/api/quotes/blinds/${quoteId}/items/${itemId}`,
    { method: "DELETE" }
  );
  assert.equal(commercialDelete.status, 403);

  const adminDelete = await api(
    adminSession,
    `/api/quotes/blinds/${quoteId}/items/${itemId}`,
    { method: "DELETE" }
  );
  assert.equal(adminDelete.status, 200, JSON.stringify(adminDelete.json));
  assert.equal(adminDelete.json.deleted, true);
  assert.equal(adminDelete.json.totals.total_mxn, 0);

  const detailAfterDelete = await api(
    commercial,
    `/api/quotes/blinds/${quoteId}`
  );
  assert.equal(detailAfterDelete.status, 200);
  assert.deepEqual(detailAfterDelete.json.items, []);

  const { count: orphanCount, error: orphanError } = await adminSession.client
    .from("quote_blind_item_details")
    .select("quote_item_id", { count: "exact", head: true })
    .eq("quote_item_id", itemId);
  assert.ifError(orphanError);
  assert.equal(orphanCount, 0);

  const { data: standardQuote, error: standardError } = await commercial.client
    .from("quotes")
    .select("id, quote_number, quote_type")
    .eq("quote_number", "SBX-PERSIANAS-BOOTSTRAP-V1")
    .maybeSingle();
  assert.ifError(standardError);
  assert.equal(standardQuote?.quote_type, "standard");

  console.log(
    JSON.stringify(
      {
        marker,
        quote_id: quoteId,
        quote_group_id: quoteGroupId,
        item_id: itemId,
        positive_http: {
          create_quote: 201,
          list: 200,
          detail: 200,
          create_item: 201,
          update_item: 200,
          delete_item_admin: 200,
        },
        negative_http: {
          anonymous_list: anonymousList.status,
          client_list: clientList.status,
          commercial_delete: commercialDelete.status,
        },
        totals: {
          create_total_mxn: 2030,
          update_total_mxn: 2784,
          after_delete_total_mxn: 0,
        },
        orphan_details: orphanCount,
        standard_quote_preserved: standardQuote?.quote_number || null,
      },
      null,
      2
    )
  );
} finally {
  const cleanupErrors = await cleanup();
  if (cleanupErrors.length > 0) {
    console.error(
      JSON.stringify({ marker, cleanup: "failed", cleanup_errors: cleanupErrors })
    );
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ marker, cleanup: "complete" }));
  }
}
