import assert from "node:assert/strict";
import test from "node:test";
import {
  isSensitiveTrackingPath,
  isTokenLikeSegment,
  parseInviteLinkType,
  sanitizeAttributionReferrer,
} from "../lib/routeGate.ts";
import { secretsMatch } from "../lib/routeGateSecret.ts";

test("rutas sensibles no llevan trackers ni atribucion", () => {
  for (const path of [
    "/public/contracts/onb_0123456789abcdef0123456789abcdef0123456789abcdef/onboarding",
    "/public/documents/abc/pdf",
    "/public",
    "/auth/accept-invite",
    "/auth/reset-password",
    "/portal",
    "/portal/projects/12",
    "/login",
    "/Login",
    null,
    "",
  ]) {
    assert.equal(isSensitiveTrackingPath(path), true, String(path));
  }
});

test("rutas con segmento tipo token son sensibles aunque no esten en la lista", () => {
  assert.equal(isSensitiveTrackingPath("/x/sgn_0123456789abcdef0123456789abcdef"), true);
  assert.equal(isSensitiveTrackingPath("/x/3f2c1a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f"), true);
  assert.equal(isSensitiveTrackingPath("/x/0123456789abcdef01234567"), true);
  assert.equal(isSensitiveTrackingPath("/x/AbCdEfGhIjKlMnOpQrStUvWxYz012345"), true);
});

test("sitio publico y slugs normales siguen con trackers", () => {
  for (const path of [
    "/",
    "/servicios/cctv",
    "/blog/como-elegir-camaras-de-seguridad-para-tu-casa-en-2026",
    "/marcas/hikvision/DS-KLM28-12",
    "/portafolio/residencia-zapopan",
    "/publicaciones",
    "/portales",
    "/loginx",
  ]) {
    assert.equal(isSensitiveTrackingPath(path), false, path);
  }
  assert.equal(isTokenLikeSegment("como-elegir-camaras"), false);
});

test("query y hash no cambian la decision", () => {
  assert.equal(isSensitiveTrackingPath("/auth/accept-invite?token_hash=abc&type=invite"), true);
  assert.equal(isSensitiveTrackingPath("/servicios?utm_source=google"), false);
});

test("referrer propio sensible se reduce al origen", () => {
  const origin = "https://portal.alfait.com.mx";
  assert.equal(
    sanitizeAttributionReferrer(`${origin}/public/documents/0123456789abcdef01234567/pdf`, origin),
    origin
  );
  assert.equal(sanitizeAttributionReferrer(`${origin}/servicios`, origin), `${origin}/servicios`);
  assert.equal(
    sanitizeAttributionReferrer("https://www.google.com/", origin),
    "https://www.google.com/"
  );
  assert.equal(sanitizeAttributionReferrer("", origin), undefined);
  assert.equal(sanitizeAttributionReferrer("no es url", origin), undefined);
});

test("accept-invite solo acepta invite, recovery y magiclink", () => {
  assert.equal(parseInviteLinkType("invite"), "invite");
  assert.equal(parseInviteLinkType("recovery"), "recovery");
  assert.equal(parseInviteLinkType("magiclink"), "magiclink");
  for (const value of ["signup", "email_change", "email", "INVITE", "", null, undefined]) {
    assert.equal(parseInviteLinkType(value), null, String(value));
  }
});

test("secretsMatch compara en tiempo constante y falla cerrado", () => {
  assert.equal(secretsMatch("abc123", "abc123"), true);
  assert.equal(secretsMatch("abc124", "abc123"), false);
  assert.equal(secretsMatch("abc12", "abc123"), false);
  assert.equal(secretsMatch("abc1234", "abc123"), false);
  assert.equal(secretsMatch("", "abc123"), false);
  assert.equal(secretsMatch(null, "abc123"), false);
  assert.equal(secretsMatch("abc123", undefined), false);
  assert.equal(secretsMatch("", ""), false);
  assert.equal(secretsMatch("   ", "   "), false);
  // Multibyte: la longitud se mide en bytes, no lanza.
  assert.equal(secretsMatch("ñ", "nn"), false);
});
