import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { getContractTokenColumn } from "../lib/contractTokens";
import { isAuthorizedCronRequest } from "../lib/cronAuth";
import {
  canSubmitContractOnboarding,
  canSubmitContractSignature,
  isValidContractCoordinates,
  isValidContractSignaturePng,
  isValidContractSignerName,
} from "../lib/contractPublicValidation";

test("contract token lookup allows only the generated capability formats", () => {
  assert.equal(getContractTokenColumn(`onb_${"a1".repeat(24)}`), "onboarding_token");
  assert.equal(getContractTokenColumn(`sgn_${"02".repeat(24)}`), "signing_token");
  for (const invalid of [
    "", null, undefined, 1, "invalid,id.eq.1", "invalid,or(id.eq.1)",
    `onb_${"a".repeat(48)},id.eq.1`, `sgn_${"a".repeat(48)}%2Cid.eq.1`,
    `onb_${"a".repeat(47)}`, `onb_${"a".repeat(49)}`, `ctk_${"a".repeat(48)}`,
    `onb_${"a".repeat(48)}\n`,
  ]) {
    assert.equal(getContractTokenColumn(invalid), null, String(invalid));
  }
});

test("cron authorization rejects absent configuration, credentials and URL-only keys", () => {
  const secret = "local-test-secret";
  const request = (header?: string, query = "") => new Request(`https://example.test/cron${query}`, {
    headers: header ? { authorization: header } : {},
  });
  assert.equal(isAuthorizedCronRequest(request(), undefined), false);
  assert.equal(isAuthorizedCronRequest(request("Bearer "), ""), false);
  assert.equal(isAuthorizedCronRequest(request("Bearer    "), "   "), false);
  assert.equal(isAuthorizedCronRequest(request(), secret), false);
  assert.equal(isAuthorizedCronRequest(request(undefined, `?key=${secret}`), secret), false);
  assert.equal(isAuthorizedCronRequest(request("Bearer wrong", `?key=${secret}`), secret), false);
  assert.equal(isAuthorizedCronRequest(request("Basic local-test-secret"), secret), false);
  assert.equal(isAuthorizedCronRequest(request("Bearer local-test-secreu"), secret), false);
  assert.equal(isAuthorizedCronRequest(request(`Bearer ${secret}`), secret), true);
});

test("public contract mutations reject repeated signing and cancelled or completed onboarding", () => {
  assert.equal(canSubmitContractOnboarding({ status: "draft" }), true);
  assert.equal(canSubmitContractOnboarding({ status: "pending_client_data", client_signed_at: null }), true);
  assert.equal(canSubmitContractSignature({ status: "pending_signatures", client_signed_at: null }), true);
  for (const status of ["signed", "cancelled", undefined, "unexpected"]) {
    assert.equal(canSubmitContractOnboarding({ status }), false);
    assert.equal(canSubmitContractSignature({ status }), false);
  }
  assert.equal(canSubmitContractSignature({ status: "pending_client_data" }), false);
  assert.equal(canSubmitContractOnboarding({ status: "pending_signatures" }), false);
  assert.equal(canSubmitContractSignature({ status: "pending_signatures", client_signed_at: "2026-01-01" }), false);
  assert.equal(canSubmitContractOnboarding({ status: "draft", client_signed_at: "2026-01-01" }), false);
});

test("contract signatures reject remote/local URLs, MIME spoofing, oversize and malformed images", () => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=";
  const dataUrl = `data:image/png;base64,${png}`;
  assert.equal(isValidContractSignaturePng(dataUrl), true);
  for (const value of [
    "http://127.0.0.1/private.png", "https://example.test/image.png", "file:///etc/passwd", "/etc/passwd",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "data:image/png;base64,SGVsbG8=",
    `${dataUrl}\n`, `${dataUrl},suffix`, `data:image/png;base64,${"A".repeat(280_000)}`,
  ]) assert.equal(isValidContractSignaturePng(value), false, value.slice(0, 80));
  const oversizedDimensions = Buffer.from(png, "base64");
  oversizedDimensions.writeUInt32BE(100_000, 16);
  assert.equal(isValidContractSignaturePng(`data:image/png;base64,${oversizedDimensions.toString("base64")}`), false);
  const truncated = Buffer.from(png, "base64").subarray(0, 60);
  assert.equal(isValidContractSignaturePng(`data:image/png;base64,${truncated.toString("base64")}`), false);
  const compressed = deflateSync(Buffer.alloc(1024 * 1024));
  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32BE(compressed.length);
  chunkHeader.write("IDAT", 4);
  const oversizedDecodedImage = Buffer.concat([
    Buffer.from(png, "base64").subarray(0, 33), chunkHeader, compressed,
    Buffer.alloc(4), Buffer.from(png, "base64").subarray(-12),
  ]);
  assert.equal(isValidContractSignaturePng(`data:image/png;base64,${oversizedDecodedImage.toString("base64")}`), false);
});

test("contract signer and coordinates validation rejects malformed runtime inputs", () => {
  assert.equal(isValidContractSignerName("Cliente de prueba"), true);
  assert.equal(isValidContractSignerName("   "), false);
  assert.equal(isValidContractSignerName({ name: "Cliente" }), false);
  assert.equal(isValidContractSignerName("x".repeat(201)), false);
  assert.equal(isValidContractCoordinates(0, 0), true);
  assert.equal(isValidContractCoordinates(null, undefined), true);
  assert.equal(isValidContractCoordinates(Infinity, 0), false);
  assert.equal(isValidContractCoordinates(91, -181), false);
  assert.equal(isValidContractCoordinates("19", "-103"), false);
});
