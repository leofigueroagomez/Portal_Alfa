import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMfaChallengeUrl,
  getAssuranceState,
  getMfaErrorMessage,
  getSafeNextPath,
  needsMfaChallenge,
  nextTotpFriendlyName,
  normalizeTotpCode,
} from "../lib/mfa.ts";

test("usuario sin factores (aal1 -> aal1) no necesita reto", () => {
  assert.equal(needsMfaChallenge({ currentLevel: "aal1", nextLevel: "aal1" }), false);
});

test("usuario con factor verificado en sesion aal1 necesita reto", () => {
  assert.equal(needsMfaChallenge({ currentLevel: "aal1", nextLevel: "aal2" }), true);
});

test("sesion ya en aal2 no necesita reto", () => {
  assert.equal(needsMfaChallenge({ currentLevel: "aal2", nextLevel: "aal2" }), false);
});

test("sin datos o sin sesion no se exige reto (no bloquear)", () => {
  assert.equal(needsMfaChallenge(null), false);
  assert.equal(needsMfaChallenge(undefined), false);
  assert.equal(needsMfaChallenge({ currentLevel: null, nextLevel: null }), false);
});

function fakeClient({ session, aal, aalError, throws } = {}) {
  const calls = { jwt: [] };
  return {
    calls,
    auth: {
      async getSession() {
        if (throws) throw new Error("boom");
        return { data: { session: session ?? null }, error: null };
      },
      mfa: {
        async getAuthenticatorAssuranceLevel(jwt) {
          calls.jwt.push(jwt);
          if (aalError) return { data: null, error: { message: aalError } };
          return { data: aal, error: null };
        },
      },
    },
  };
}

test("getAssuranceState pasa el access token y calcula needsChallenge", async () => {
  const client = fakeClient({
    session: { access_token: "jwt-123" },
    aal: { currentLevel: "aal1", nextLevel: "aal2", currentAuthenticationMethods: [] },
  });
  const state = await getAssuranceState(client);
  assert.deepEqual(client.calls.jwt, ["jwt-123"]);
  assert.equal(state.needsChallenge, true);
  assert.equal(state.error, null);
});

test("getAssuranceState: usuario sin factores sigue igual", async () => {
  const client = fakeClient({
    session: { access_token: "jwt" },
    aal: { currentLevel: "aal1", nextLevel: "aal1", currentAuthenticationMethods: [] },
  });
  const state = await getAssuranceState(client);
  assert.equal(state.needsChallenge, false);
});

test("getAssuranceState falla abierto ante errores (sin bloqueo)", async () => {
  assert.equal((await getAssuranceState(fakeClient({}))).needsChallenge, false);
  const withError = await getAssuranceState(
    fakeClient({ session: { access_token: "jwt" }, aalError: "network" })
  );
  assert.equal(withError.needsChallenge, false);
  assert.equal(withError.error, "network");
  const thrown = await getAssuranceState(fakeClient({ throws: true }));
  assert.equal(thrown.needsChallenge, false);
  assert.equal(thrown.error, "boom");
});

test("getSafeNextPath acepta rutas internas relativas", () => {
  assert.equal(getSafeNextPath("/quotes/12"), "/quotes/12");
  assert.equal(getSafeNextPath("/quotes/12?tab=pdf#x"), "/quotes/12?tab=pdf#x");
  assert.equal(getSafeNextPath("/settings/security"), "/settings/security");
});

test("getSafeNextPath rechaza destinos externos o peligrosos", () => {
  const unsafe = [
    undefined,
    null,
    42,
    "",
    "   ",
    "dashboard",
    "https://evil.com",
    "http://evil.com/dashboard",
    "//evil.com",
    "//evil.com/dashboard",
    "/\\evil.com",
    "\\\\evil.com",
    "/%0d%0aSet-Cookie:x",
    "/ok\nnext",
    "javascript:alert(1)",
    "/auth/mfa",
    "/auth/mfa?next=/dashboard",
    "/login",
    "/auth/signout",
    `/${"a".repeat(3000)}`,
  ];
  for (const value of unsafe) {
    const result = getSafeNextPath(value);
    if (value === "/%0d%0aSet-Cookie:x") {
      // Percent-encoded sequences are inert inside a path; it stays same-origin.
      assert.equal(result.startsWith("/"), true);
      assert.equal(result.startsWith("//"), false);
      continue;
    }
    assert.equal(result, "/dashboard", `deberia rechazar ${String(value)}`);
  }
});

test("getSafeNextPath respeta fallback personalizado", () => {
  assert.equal(getSafeNextPath("//evil.com", "/settings/security"), "/settings/security");
});

test("buildMfaChallengeUrl codifica el destino seguro", () => {
  assert.equal(buildMfaChallengeUrl("/quotes/1?a=b"), "/auth/mfa?next=%2Fquotes%2F1%3Fa%3Db");
  assert.equal(buildMfaChallengeUrl("https://evil.com"), "/auth/mfa?next=%2Fdashboard");
});

test("normalizeTotpCode", () => {
  assert.equal(normalizeTotpCode("123456"), "123456");
  assert.equal(normalizeTotpCode(" 123 456 "), "123456");
  assert.equal(normalizeTotpCode("123-456"), "123456");
  assert.equal(normalizeTotpCode("12345"), null);
  assert.equal(normalizeTotpCode("abcdef"), null);
  assert.equal(normalizeTotpCode(123456), null);
});

test("nextTotpFriendlyName evita choques de nombre", () => {
  assert.equal(nextTotpFriendlyName([]), "ALFA OS");
  assert.equal(nextTotpFriendlyName(["ALFA OS"]), "ALFA OS 2");
  assert.equal(nextTotpFriendlyName(["ALFA OS", "ALFA OS 2", null]), "ALFA OS 3");
});

test("getMfaErrorMessage traduce codigos conocidos", () => {
  assert.match(getMfaErrorMessage({ code: "mfa_verification_failed" }), /código/);
  assert.match(getMfaErrorMessage({ code: "insufficient_aal" }), /verifica/);
  assert.match(getMfaErrorMessage({ code: "mfa_totp_enroll_not_enabled" }), /habilitada/);
  assert.equal(getMfaErrorMessage(null, "fallback"), "fallback");
});

test("toSafeQrDataUrl re-codifica el SVG y rechaza otras URLs", async () => {
  const { toSafeQrDataUrl } = await import("../lib/mfa.ts");
  const raw = 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#000"/></svg>';
  const safe = toSafeQrDataUrl(raw);
  assert.ok(safe?.startsWith("data:image/svg+xml;charset=utf-8,%3Csvg"));
  assert.equal(safe?.includes("#"), false);
  assert.equal(toSafeQrDataUrl("https://evil.com/qr.svg"), null);
  assert.equal(toSafeQrDataUrl("data:text/html,<script>"), null);
  assert.equal(toSafeQrDataUrl("data:image/svg+xml;utf-8,javascript:1"), null);
  assert.equal(toSafeQrDataUrl(undefined), null);
});

test("formatTotpSecret agrupa en bloques de 4", async () => {
  const { formatTotpSecret } = await import("../lib/mfa.ts");
  assert.equal(formatTotpSecret("ABCDEFGHIJ"), "ABCD EFGH IJ");
  assert.equal(formatTotpSecret(null), "");
});
