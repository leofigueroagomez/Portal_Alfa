import assert from "node:assert/strict";
import test from "node:test";
import { submitServiceSignature } from "../lib/serviceSignature";
import { submitDeliverySignature } from "../lib/projectDeliverySignature";

const signatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=";
const input = {
  token: "unit-test-token", signatureDataUrl, signerName: "Persona de prueba",
  signerEmail: "test@example.test", signerPhone: "3312345678", privacyConsentAccepted: true,
};

type Call = { url: URL; method: string; body: Record<string, unknown> | null };
async function withMockDatabase(
  link: Record<string, unknown>,
  record: Record<string, unknown>,
  run: (calls: Call[]) => Promise<void>,
  updateResult: Array<{ id: number }> = [{ id: 1 }],
) {
  const savedFetch = globalThis.fetch;
  const environmentKeys = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"] as const;
  const savedEnvironment = environmentKeys.map((key) => [key, process.env[key]] as const);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "local-test-key";
  delete process.env.RESEND_API_KEY;
  const calls: Call[] = [];
  globalThis.fetch = async (resource, options) => {
    const url = new URL(String(resource));
    assert.equal(url.origin, "https://database.example.test", "No external network or email allowed");
    const method = options?.method || "GET";
    const body = typeof options?.body === "string" ? JSON.parse(options.body) : null;
    calls.push({ url, method, body });
    if (url.pathname.startsWith("/storage/")) {
      return Response.json({ Key: "test-image", data: [] });
    }
    if (method === "PATCH") return Response.json(updateResult);
    if (url.pathname.endsWith("/public_document_links")) return Response.json([link]);
    if (url.pathname.endsWith("/service_reports")) return Response.json([record]);
    if (url.pathname.endsWith("/project_deliveries")) return Response.json(record);
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  };
  try { await run(calls); } finally {
    globalThis.fetch = savedFetch;
    for (const [key, value] of savedEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const serviceLink = { id: 1, document_type: "service_report_sign", service_report_id: 1, client_project_id: 2, expires_at: "2099-01-01", revoked_at: null };
const service = { id: 1, client_project_id: 2, status: "completed", payment_status: "pending_payment", client_signed_at: null, client_signature_image_url: null };
const deliveryLink = { id: 1, document_type: "project_delivery_sign", project_delivery_id: 1, client_project_id: 2, expires_at: "2099-01-01", revoked_at: null };
const delivery = { id: 1, status: "draft", client_signed_at: null, client_signature_image_url: null };

test("real service signature rejects a read-only token before any upload or update", async () => {
  await withMockDatabase({ ...serviceLink, document_type: "service_report" }, service, async (calls) => {
    await assert.rejects(submitServiceSignature(input), /inválido/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.searchParams.get("document_type"), "eq.service_report_sign");
  });
});

test("real service signature rejects signed/cancelled records and mismatched projects", async () => {
  for (const change of [
    { client_signed_at: "2026-01-01" }, { client_signature_image_url: "previous.png" },
    { status: "cancelled" }, { client_project_id: 99 },
  ]) {
    await withMockDatabase(serviceLink, { ...service, ...change }, async (calls) => {
      await assert.rejects(submitServiceSignature(input), /ya fue firmado|no está disponible/);
      assert.ok(calls.every((call) => call.method === "GET"));
    });
  }
});

test("real service signature preserves a paid balance and uses atomic state predicates", async () => {
  await withMockDatabase(serviceLink, { ...service, payment_status: "paid" }, async (calls) => {
    const result = await submitServiceSignature(input);
    assert.equal(result.success, true);
    const update = calls.find((call) => call.method === "PATCH")!;
    assert.equal(update.body?.payment_status, "paid");
    assert.equal(update.url.searchParams.get("payment_status"), "eq.paid");
    assert.equal(update.url.searchParams.get("client_signed_at"), "is.null");
    assert.equal(update.url.searchParams.get("client_signature_image_url"), "is.null");
    assert.equal(update.url.searchParams.get("status"), "eq.completed");
  });
});

test("real service signature refuses a lost race and cleans up its uploaded image", async () => {
  await withMockDatabase(serviceLink, service, async (calls) => {
    await assert.rejects(submitServiceSignature(input), /cambió o ya fue firmado/);
    assert.ok(calls.some((call) => call.method === "DELETE" && call.url.pathname.startsWith("/storage/")));
  }, []);
});

test("real delivery signature rejects read-only tokens and already signed/cancelled records", async () => {
  await withMockDatabase({ ...deliveryLink, document_type: "project_delivery" }, delivery, async (calls) => {
    await assert.rejects(submitDeliverySignature(input), /no es válido/);
    assert.equal(calls.length, 1);
  });
  for (const change of [{ client_signed_at: "2026-01-01" }, { status: "cancelled" }]) {
    await withMockDatabase(deliveryLink, { ...delivery, ...change }, async (calls) => {
      await assert.rejects(submitDeliverySignature(input), /ya fue firmada/);
      assert.ok(calls.every((call) => call.method === "GET"));
    });
  }
});

test("real delivery signature refuses a concurrent change before side effects on project/email", async () => {
  await withMockDatabase(deliveryLink, delivery, async (calls) => {
    await assert.rejects(submitDeliverySignature(input), /No se pudo registrar/);
    const update = calls.find((call) => call.method === "PATCH")!;
    assert.equal(update.url.searchParams.get("client_project_id"), "eq.2");
    assert.equal(update.url.searchParams.get("status"), "eq.draft");
    assert.equal(update.url.searchParams.get("client_signed_at"), "is.null");
    assert.equal(calls.filter((call) => call.method === "PATCH").length, 1);
  }, []);
});
