import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";

const SANDBOX_REF = "pkqwlvqosooewbejbktx";
const BASE_URL = "http://localhost:3210";
const BUCKET = "quote-blinds-private";
const marker = `ALFA-BLINDS-S4B-${new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(0, 14)}`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const fixtureAdminKey = process.env.SMOKE_FIXTURE_ADMIN_KEY;

assert.equal(
  new URL(supabaseUrl).hostname,
  `${SANDBOX_REF}.supabase.co`,
  "La URL no pertenece al sandbox autorizado."
);
assert.ok(publishableKey, "Falta publishable key sandbox.");
assert.ok(fixtureAdminKey, "Falta llave administrativa sólo para fixtures.");

const fixtureAdmin = createClient(supabaseUrl, fixtureAdminKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const password = `Sbx!${randomBytes(24).toString("base64url")}`;
const fixtureUsers = [];
const itemIds = [];
const imagePaths = new Map();
let quoteId = null;
let quoteGroupId = null;
let commercialSession = null;
let adminSession = null;
let uiBrowser = null;

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
    cookieEntries() {
      return [...cookieJar].map(([name, value]) => ({ name, value }));
    },
  };
}

async function createFixtureUser(label, userMetadata = {}) {
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
  assert.ok(data.user?.id);
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
  assert.ok(profile);

  return { ...session, userId: data.user.id };
}

async function api(
  session,
  path,
  { method = "GET", json, formData, expectBinary = false } = {}
) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(session ? { cookie: session.cookieHeader() } : {}),
      ...(json ? { "content-type": "application/json" } : {}),
    },
    body: json
      ? JSON.stringify(json)
      : formData || undefined,
  });

  if (expectBinary) {
    return {
      status: response.status,
      headers: response.headers,
      bytes: Buffer.from(await response.arrayBuffer()),
    };
  }

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { non_json_response: true };
  }
  return { status: response.status, headers: response.headers, json: body };
}

async function imageForm(relativePath, fileName) {
  const bytes = await readFile(relativePath);
  const formData = new FormData();
  formData.set(
    "image",
    new Blob([bytes], { type: "image/jpeg" }),
    fileName
  );
  return formData;
}

async function uploadImage(session, itemId, source, fileName) {
  const response = await api(
    session,
    `/api/quotes/blinds/${quoteId}/items/${itemId}/reference-image`,
    {
      method: "POST",
      formData: await imageForm(source, fileName),
    }
  );
  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.match(
    response.json.reference_image_path,
    new RegExp(`^quote-blinds/${quoteId}/${itemId}/`)
  );
  assert.equal(response.json.cleanup_pending, false);
  const signedResponse = await fetch(response.json.signed_url);
  assert.equal(signedResponse.status, 200);
  assert.match(signedResponse.headers.get("content-type") || "", /^image\//);
  imagePaths.set(itemId, response.json.reference_image_path);
  return response.json;
}

async function openAuthenticatedUi() {
  if (!uiBrowser) {
    uiBrowser = await puppeteer.launch({
      headless: true,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox"],
    });
  }

  const page = await uiBrowser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await page.setCookie(
    ...commercialSession.cookieEntries().map(({ name, value }) => ({
      name,
      value,
      url: BASE_URL,
    }))
  );
  return page;
}

async function uploadImageThroughUi(itemIndex, itemId, source) {
  const page = await openAuthenticatedUi();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  try {
    await page.goto(`${BASE_URL}/quotes/blinds/${quoteId}`, {
      waitUntil: "networkidle2",
    });
    await new Promise((resolveWait) => setTimeout(resolveWait, 1500));
    const editButtonCount = await page.evaluate(
      () =>
        [...document.querySelectorAll("button")].filter(
          (button) => button.textContent?.trim() === "Editar"
        ).length
    );
    if (editButtonCount < 4) {
      const pageState = await page.evaluate(async (activeQuoteId) => {
        const response = await globalThis.fetch(
          `/api/quotes/blinds/${activeQuoteId}`,
          { cache: "no-store" }
        );
        return {
          title: document.title,
          text: document.body.innerText.slice(0, 500),
          readyState: document.readyState,
          scriptCount: document.scripts.length,
          apiStatus: response.status,
        };
      }, quoteId);
      throw new Error(
        `UI fixture unavailable at ${page.url()}: ${JSON.stringify({
          ...pageState,
          pageErrors,
        })}`
      );
    }
    const clicked = await page.evaluate((index) => {
      const buttons = [...document.querySelectorAll("button")].filter(
        (button) => button.textContent?.trim() === "Editar"
      );
      const button = buttons[index];
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    }, itemIndex);
    assert.equal(clicked, true);
    const input = await page.waitForSelector('input[type="file"]');
    assert.ok(input);
    await input.uploadFile(resolve(source));
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Foto de referencia agregada.") &&
        [...document.querySelectorAll("img")].some(
          (image) =>
            image.alt === "Foto de referencia de la persiana" &&
            image.complete &&
            image.naturalWidth > 0
        ),
      { timeout: 20_000 }
    );

    const detail = await api(
      commercialSession,
      `/api/quotes/blinds/${quoteId}`
    );
    assert.equal(detail.status, 200);
    const path = detail.json.items.find(
      (item) => Number(item.id) === itemId
    )?.blind_detail?.reference_image_path;
    assert.match(path, new RegExp(`^quote-blinds/${quoteId}/${itemId}/`));
    imagePaths.set(itemId, path);
    return path;
  } finally {
    await page.close();
  }
}

async function captureAuthenticatedUi() {
  const page = await openAuthenticatedUi();
  try {
    await page.goto(`${BASE_URL}/quotes/blinds/${quoteId}`, {
      waitUntil: "networkidle2",
    });
    await page.waitForFunction(
      () => {
        const images = [
          ...document.querySelectorAll('img[alt="Referencia privada"]'),
        ];
        return (
          images.length === 2 &&
          images.every((image) => image.complete && image.naturalWidth > 0)
        );
      },
      { timeout: 20_000 }
    );
    const audit = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        bedroom: text.includes("Recámara principal"),
        living: text.includes("Sala / comedor"),
        pieces: text.includes("6"),
        m2: text.includes("15.72 m²"),
        subtotal: text.includes("$7,248.00"),
        iva: text.includes("$1,159.68"),
        total: text.includes("$8,407.68"),
        thumbnails: document.querySelectorAll(
          'img[alt="Referencia privada"]'
        ).length,
        exposesPath: text.includes("quote-blinds/"),
        exposesBucket: text.includes("quote-blinds-private"),
      };
    });
    assert.deepEqual(audit, {
      bedroom: true,
      living: true,
      pieces: true,
      m2: true,
      subtotal: true,
      iva: true,
      total: true,
      thumbnails: 2,
      exposesPath: false,
      exposesBucket: false,
    });
    await mkdir("tmp/screenshots", { recursive: true });
    await page.screenshot({
      path: "tmp/screenshots/quote-blinds-sprint4b-ui.png",
      fullPage: true,
    });
    return audit;
  } finally {
    await page.close();
  }
}

async function cleanupBrowserFixture() {
  const { data: quotes } = await fixtureAdmin
    .from("quotes")
    .select("id, quote_group_id")
    .ilike("notes", "ALFA-BLINDS-S4B-20260724-SESSION%");

  for (const quote of quotes || []) {
    await fixtureAdmin.from("quotes").delete().eq("id", quote.id);
    if (quote.quote_group_id) {
      await fixtureAdmin
        .from("quote_groups")
        .delete()
        .eq("id", quote.quote_group_id);
    }
  }
}

async function cleanup() {
  const cleanupErrors = [];

  if (uiBrowser) {
    await uiBrowser.close().catch(() => null);
    uiBrowser = null;
  }

  if (commercialSession && quoteId) {
    for (const [itemId] of imagePaths) {
      const response = await api(
        commercialSession,
        `/api/quotes/blinds/${quoteId}/items/${itemId}/reference-image`,
        { method: "DELETE" }
      ).catch((error) => ({ status: 0, error }));
      if (![200, 404].includes(response.status)) {
        cleanupErrors.push(`image ${itemId}`);
      }
    }
  }

  if (adminSession && quoteId) {
    for (const itemId of itemIds) {
      await api(
        adminSession,
        `/api/quotes/blinds/${quoteId}/items/${itemId}`,
        { method: "DELETE" }
      ).catch(() => null);
    }
  }

  if (quoteId) {
    const { error } = await fixtureAdmin
      .from("quotes")
      .delete()
      .eq("id", quoteId);
    if (error) cleanupErrors.push(`quote ${error.message}`);
  }
  if (quoteGroupId) {
    const { error } = await fixtureAdmin
      .from("quote_groups")
      .delete()
      .eq("id", quoteGroupId);
    if (error) cleanupErrors.push(`group ${error.message}`);
  }

  await cleanupBrowserFixture().catch((error) => {
    cleanupErrors.push(`browser fixture ${error.message}`);
  });

  for (const fixture of fixtureUsers) {
    await fixtureAdmin.from("profiles").delete().eq("id", fixture.id);
    const { error } = await fixtureAdmin.auth.admin.deleteUser(fixture.id);
    if (error) cleanupErrors.push(`auth ${fixture.label}`);
  }

  const { data: authUsers, error: authListError } =
    await fixtureAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authListError) {
    cleanupErrors.push("auth residual audit");
  } else {
    const residualFixtures = authUsers.users.filter((user) =>
      /^alfa-blinds-s4b-\d{14}-(commercial|client|admin)@example\.invalid$/i.test(
        user.email || ""
      )
    );
    for (const user of residualFixtures) {
      await fixtureAdmin.from("profiles").delete().eq("id", user.id);
      const { error } = await fixtureAdmin.auth.admin.deleteUser(user.id);
      if (error) cleanupErrors.push(`residual auth ${user.id}`);
    }
  }

  return cleanupErrors;
}

try {
  commercialSession = await createFixtureUser("commercial");
  const clientSession = await createFixtureUser("client", {
    role: "client",
    user_type: "client_portal",
  });
  adminSession = await createFixtureUser("admin");

  const { error: promoteError } = await fixtureAdmin
    .from("profiles")
    .update({ role: "admin", is_internal: true })
    .eq("id", adminSession.userId);
  assert.ifError(promoteError);

  const { data: client, error: clientError } = await fixtureAdmin
    .from("clients")
    .select("id")
    .eq("name", "ALFA Sandbox Client")
    .single();
  assert.ifError(clientError);
  const { data: project, error: projectError } = await fixtureAdmin
    .from("client_projects")
    .select("id")
    .eq("name", "ALFA Sandbox Project")
    .single();
  assert.ifError(projectError);

  const anonymousList = await api(null, "/api/quotes/blinds");
  assert.equal(anonymousList.status, 401);
  const clientList = await api(clientSession, "/api/quotes/blinds");
  assert.equal(clientList.status, 401);

  const createQuote = await api(commercialSession, "/api/quotes/blinds", {
    method: "POST",
    json: {
      client_id: client.id,
      client_project_id: project.id,
      notes: `${marker} · Storage y PDF autenticados`,
    },
  });
  assert.equal(createQuote.status, 201, JSON.stringify(createQuote.json));
  quoteId = Number(createQuote.json.quote.id);
  quoteGroupId = Number(createQuote.json.quote.quote_group_id);

  const itemPayloads = [
    {
      area: "Recámara principal",
      brand: "Hunter Douglas",
      model: "Duette 1",
      width_cm: 120,
      height_cm: 200,
      blind_type: "Celular",
      collection: "Applause",
      color: "Marfil",
      mechanism: "Motorizado",
      control: "Control remoto",
      quantity: 2,
      price_per_m2_mxn: 350,
      billable_m2_override: null,
      override_reason: null,
      reference_image_path: null,
      internal_notes: `${marker} INTERNO proveedor A`,
      customer_visible_note: "Incluye instalación y programación.",
    },
    {
      area: "Recámara principal",
      brand: "Hunter Douglas",
      model: "Duette 2",
      width_cm: 90,
      height_cm: 180,
      blind_type: "Celular",
      collection: "Applause",
      color: "Arena",
      mechanism: "Manual",
      control: "Cordón",
      quantity: 1,
      price_per_m2_mxn: 400,
      billable_m2_override: null,
      override_reason: null,
      reference_image_path: null,
      internal_notes: `${marker} INTERNO proveedor B`,
      customer_visible_note: "Tela traslúcida coordinada.",
    },
    {
      area: "Sala / comedor",
      brand: "Lutron",
      model: "Palladiom",
      width_cm: 150,
      height_cm: 220,
      blind_type: "Enrollables",
      collection: "Essentials",
      color: "Grafito",
      mechanism: "Motorizado",
      control: "Teclado",
      quantity: 2,
      price_per_m2_mxn: 500,
      billable_m2_override: null,
      override_reason: null,
      reference_image_path: null,
      internal_notes: `${marker} INTERNO motor silencioso`,
      customer_visible_note: "Integración con escenas de iluminación.",
    },
    {
      area: "Sala / comedor",
      brand: "Lutron",
      model: "Triathlon",
      width_cm: 100,
      height_cm: 250,
      blind_type: "Enrollables",
      collection: "Blackout",
      color: "Niebla",
      mechanism: "Motorizado",
      control: "App",
      quantity: 1,
      price_per_m2_mxn: 600,
      billable_m2_override: 2.7,
      override_reason: `${marker} Mínimo facturable del proveedor`,
      reference_image_path: null,
      internal_notes: `${marker} INTERNO ajuste proveedor`,
      customer_visible_note: "Blackout para control solar.",
    },
  ];

  for (const payload of itemPayloads) {
    const response = await api(
      commercialSession,
      `/api/quotes/blinds/${quoteId}/items`,
      { method: "POST", json: payload }
    );
    assert.equal(response.status, 201, JSON.stringify(response.json));
    itemIds.push(Number(response.json.item.id));
  }

  const editPayload = {
    ...itemPayloads[1],
    color: "Arena editada",
  };
  const editResult = await api(
    commercialSession,
    `/api/quotes/blinds/${quoteId}/items/${itemIds[1]}`,
    { method: "PATCH", json: editPayload }
  );
  assert.equal(editResult.status, 200, JSON.stringify(editResult.json));

  const oldFirstPath = await uploadImageThroughUi(
    0,
    itemIds[0],
    "public/projects/audio-hifi-bw-mcintosh.jpeg",
  );
  await uploadImage(
    commercialSession,
    itemIds[0],
    "public/projects/cine-bw-yamaha.jpeg",
    "recamara-reemplazo.jpeg"
  );
  const { data: firstFolderAfterReplace, error: replaceListError } =
    await fixtureAdmin.storage
      .from(BUCKET)
      .list(`quote-blinds/${quoteId}/${itemIds[0]}`);
  assert.ifError(replaceListError);
  assert.equal(firstFolderAfterReplace.length, 1);
  assert.equal(
    firstFolderAfterReplace.some((entry) => oldFirstPath.endsWith(entry.name)),
    false
  );

  await uploadImageThroughUi(
    2,
    itemIds[2],
    "public/projects/audio-hifi-bw-mcintosh.jpeg",
  );
  const removeSecondPhoto = await api(
    commercialSession,
    `/api/quotes/blinds/${quoteId}/items/${itemIds[2]}/reference-image`,
    { method: "DELETE" }
  );
  assert.equal(removeSecondPhoto.status, 200);
  imagePaths.delete(itemIds[2]);
  await uploadImage(
    commercialSession,
    itemIds[2],
    "public/projects/cine-bw-yamaha.jpeg",
    "sala-reemplazo.jpeg"
  );

  const protectedPath = imagePaths.get(itemIds[0]);
  assert.ok(protectedPath);
  const { data: clientSignedData, error: clientSignedError } =
    await clientSession.client.storage
      .from(BUCKET)
      .createSignedUrl(protectedPath, 60);
  assert.ok(clientSignedError);
  assert.equal(clientSignedData, null);

  const unauthorizedUploadPath =
    `quote-blinds/${quoteId}/${itemIds[0]}/client-denied.jpg`;
  const { error: clientUploadError } = await clientSession.client.storage
    .from(BUCKET)
    .upload(
      unauthorizedUploadPath,
      new Blob(["denied"], { type: "image/jpeg" }),
      { contentType: "image/jpeg", upsert: false }
    );
  assert.ok(clientUploadError);

  const imageAnonymous = await api(
    null,
    `/api/quotes/blinds/${quoteId}/items/${itemIds[0]}/reference-image`
  );
  assert.equal(imageAnonymous.status, 401);
  const imageClient = await api(
    clientSession,
    `/api/quotes/blinds/${quoteId}/items/${itemIds[0]}/reference-image`
  );
  assert.equal(imageClient.status, 401);

  const detail = await api(
    commercialSession,
    `/api/quotes/blinds/${quoteId}`
  );
  assert.equal(detail.status, 200);
  assert.equal(detail.json.items.length, 4);
  assert.deepEqual(
    [...new Set(detail.json.items.map((item) => item.area))].sort(),
    ["Recámara principal", "Sala / comedor"].sort()
  );
  assert.equal(
    detail.json.items.filter(
      (item) => item.blind_detail.reference_image_path
    ).length,
    2
  );
  assert.equal(detail.json.quote.subtotal_mxn, 7248);
  assert.equal(detail.json.quote.iva_mxn, 1159.68);
  assert.equal(detail.json.quote.total_mxn, 8407.68);

  const uiAudit = await captureAuthenticatedUi();

  const pdf = await api(
    commercialSession,
    `/api/quotes/blinds/${quoteId}/pdf`,
    { expectBinary: true }
  );
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(pdf.bytes.subarray(0, 5).toString("ascii"), "%PDF-");
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/quote-blinds-sprint4b-http.pdf", pdf.bytes);

  const anonymousPdf = await api(
    null,
    `/api/quotes/blinds/${quoteId}/pdf`
  );
  assert.equal(anonymousPdf.status, 401);
  const clientPdf = await api(
    clientSession,
    `/api/quotes/blinds/${quoteId}/pdf`
  );
  assert.equal(clientPdf.status, 401);

  await uploadImage(
    commercialSession,
    itemIds[3],
    "public/projects/audio-hifi-bw-mcintosh.jpeg",
    "eliminar-con-partida.jpeg"
  );
  const commercialItemDelete = await api(
    commercialSession,
    `/api/quotes/blinds/${quoteId}/items/${itemIds[3]}`,
    { method: "DELETE" }
  );
  assert.equal(commercialItemDelete.status, 403);
  const adminItemDelete = await api(
    adminSession,
    `/api/quotes/blinds/${quoteId}/items/${itemIds[3]}`,
    { method: "DELETE" }
  );
  assert.equal(adminItemDelete.status, 200);
  assert.equal(adminItemDelete.json.image_cleanup_pending, false);
  imagePaths.delete(itemIds[3]);
  const { data: deletedItemFolder, error: deletedItemListError } =
    await fixtureAdmin.storage
      .from(BUCKET)
      .list(`quote-blinds/${quoteId}/${itemIds[3]}`);
  assert.ifError(deletedItemListError);
  assert.equal(deletedItemFolder.length, 0);

  console.log(
    JSON.stringify({
      marker,
      quote_id: quoteId,
      quote_group_id: quoteGroupId,
      item_ids: itemIds,
      positive: {
        create_quote: 201,
        create_items: [201, 201, 201, 201],
        edit_item: 200,
        upload_images: 200,
        replace_image: 200,
        remove_image: 200,
        signed_image_download: 200,
        pdf: 200,
        delete_item_admin: 200,
        delete_item_storage_cleanup: true,
        ui_uploads: 2,
        ui_signed_thumbnails: uiAudit.thumbnails,
      },
      negative: {
        anonymous_api: 401,
        client_api: 401,
        anonymous_image: 401,
        client_image: 401,
        client_direct_signed_url: "denied",
        client_direct_upload: "denied",
        anonymous_pdf: 401,
        client_pdf: 401,
        commercial_delete_item: 403,
      },
      totals: {
        pieces: 6,
        m2: 15.72,
        subtotal_mxn: 7248,
        iva_mxn: 1159.68,
        total_mxn: 8407.68,
      },
      pdf_file: "tmp/pdfs/quote-blinds-sprint4b-http.pdf",
      ui_screenshot: "tmp/screenshots/quote-blinds-sprint4b-ui.png",
    })
  );
} finally {
  const cleanupErrors = await cleanup();
  const { data: residualObjects, error: residualObjectsError } =
    await fixtureAdmin.storage
      .from(BUCKET)
      .list("quote-blinds", { limit: 100 });
  if (residualObjectsError) cleanupErrors.push("storage residual audit");

  console.log(
    JSON.stringify({
      marker,
      cleanup:
        cleanupErrors.length === 0 && (residualObjects || []).length === 0
          ? "complete"
          : "failed",
      cleanup_errors: cleanupErrors,
      root_storage_entries: (residualObjects || []).length,
    })
  );
}
