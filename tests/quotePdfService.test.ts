import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  QUOTE_PDF_SERVICE_GLOBAL_LIMIT,
  QUOTE_PDF_SERVICE_GLOBAL_RATE_KEY,
  QUOTE_PDF_SERVICE_IP_LIMIT,
  QUOTE_PDF_SERVICE_WINDOW_MS,
  QuotePdfServiceClientError,
  extractBearerCredential,
  parseQuotePdfId,
  parseQuotePdfServiceBranding,
  quotePdfContentDisposition,
  quotePdfServiceIpRateKey,
  readConfiguredQuotePdfServiceToken,
  serveQuotePdfPremium,
  timingSafeTokenEqual,
  type QuotePdfServiceRateLimit,
} from "../lib/quotePdfServiceGate";

const TOKEN = "0123456789abcdef0123456789abcdef";
const PRODUCTION_IDS = [258, 259, 260] as const;

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    VERCEL_ENV: "production",
    QUOTE_PDF_SERVICE_TOKEN: TOKEN,
    ...overrides,
  };
}

function pdfBytes(body = "%PDF-1.7\n%") {
  return new Uint8Array(Buffer.from(body));
}

function requestFor(quoteId: string, authorization?: string, extraQuery = "") {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  headers.set("x-forwarded-for", "203.0.113.8, 10.0.0.4");
  return new Request(
    `https://portal.alfait.com.mx/api/quotes/${quoteId}/pdf-premium${extraQuery}`,
    { headers }
  );
}

async function readJson(response: Response) {
  return (await response.json()) as { error?: string; requestId?: string };
}

test("el token se apaga fuera de Production y si no cumple el largo", () => {
  assert.equal(readConfiguredQuotePdfServiceToken({}), null);
  assert.equal(
    readConfiguredQuotePdfServiceToken({ QUOTE_PDF_SERVICE_TOKEN: TOKEN }),
    TOKEN
  );
  assert.equal(
    readConfiguredQuotePdfServiceToken({
      VERCEL_ENV: "production",
      QUOTE_PDF_SERVICE_TOKEN: TOKEN,
    }),
    TOKEN
  );
  assert.equal(
    readConfiguredQuotePdfServiceToken({
      VERCEL_ENV: "preview",
      QUOTE_PDF_SERVICE_TOKEN: TOKEN,
    }),
    null
  );
  assert.equal(
    readConfiguredQuotePdfServiceToken({
      VERCEL_ENV: "development",
      QUOTE_PDF_SERVICE_TOKEN: TOKEN,
    }),
    null
  );
  assert.equal(
    readConfiguredQuotePdfServiceToken({
      VERCEL_ENV: "production",
      QUOTE_PDF_SERVICE_TOKEN: "corto",
    }),
    null
  );
  assert.equal(
    readConfiguredQuotePdfServiceToken({
      VERCEL_ENV: "production",
      QUOTE_PDF_SERVICE_TOKEN: `${TOKEN} con espacio`,
    }),
    null
  );
  assert.equal(
    readConfiguredQuotePdfServiceToken({
      VERCEL_ENV: "production",
      QUOTE_PDF_SERVICE_TOKEN: "a".repeat(257),
    }),
    null
  );
});

test("la comparacion exige el mismo token y no filtra por longitud", () => {
  assert.equal(timingSafeTokenEqual(TOKEN, TOKEN), true);
  assert.equal(timingSafeTokenEqual(`${TOKEN}x`, TOKEN), false);
  assert.equal(timingSafeTokenEqual(TOKEN.slice(0, -1), TOKEN), false);
  assert.equal(timingSafeTokenEqual(TOKEN.toUpperCase(), TOKEN), false);
  assert.equal(extractBearerCredential(`Bearer ${TOKEN}`), TOKEN);
  assert.equal(extractBearerCredential(`bearer ${TOKEN}`), TOKEN);
  assert.equal(extractBearerCredential(`Bearer  ${TOKEN}`), TOKEN);
  assert.equal(extractBearerCredential(`Bearer ${TOKEN} extra`), null);
  assert.equal(extractBearerCredential(TOKEN), null);
  assert.equal(extractBearerCredential(null), null);
});

test("el id de cotizacion solo acepta enteros positivos", () => {
  for (const quoteId of PRODUCTION_IDS) {
    assert.equal(parseQuotePdfId(String(quoteId)), quoteId);
  }
  for (const invalid of ["0", "00", "-1", "258.5", "258abc", "ALFA-0195", " 258", ""]) {
    assert.equal(parseQuotePdfId(invalid), null);
  }
});

test("el nombre del archivo no puede romper Content-Disposition", () => {
  assert.equal(
    quotePdfContentDisposition('Cotizacion-ALFA-0195"; filename="evil'),
    'inline; filename="Cotizacion-ALFA-0195filenameevil.pdf"'
  );
  assert.equal(
    quotePdfContentDisposition("Cotizacion-258.pdf"),
    'inline; filename="Cotizacion-258.pdf"'
  );
});

test("sin token configurado responde 401 y no renderiza", async () => {
  const rendered: number[] = [];
  const limited: string[] = [];
  const response = await serveQuotePdfPremium(requestFor("258", `Bearer ${TOKEN}`), "258", {
    env: { VERCEL_ENV: "production" },
    checkRateLimit: async (key) => {
      limited.push(key);
      return true;
    },
    renderQuotePdf: async (quoteId) => {
      rendered.push(quoteId);
      return { pdf: pdfBytes(), filename: "Cotizacion" };
    },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), { error: "Unauthorized" });
  assert.deepEqual(rendered, []);
  assert.deepEqual(limited, []);
});

test("Preview responde 401 aunque el token sea el correcto", async () => {
  const rendered: number[] = [];
  const response = await serveQuotePdfPremium(
    requestFor("258", `Bearer ${TOKEN}`, `?token=${TOKEN}&key=${TOKEN}`),
    "258",
    {
      env: productionEnv({ VERCEL_ENV: "preview" }),
      checkRateLimit: async () => true,
      renderQuotePdf: async (quoteId) => {
        rendered.push(quoteId);
        return { pdf: pdfBytes(), filename: "Cotizacion" };
      },
    }
  );

  assert.equal(response.status, 401);
  assert.deepEqual(rendered, []);
});

test("un token invalido o mandado por query no descarga el PDF", async () => {
  const cases = [
    requestFor("258"),
    requestFor("258", "Bearer token-incorrecto-de-32-caracteres"),
    requestFor("nope", `Bearer ${"b".repeat(32)}`, `?token=${TOKEN}&key=${TOKEN}`),
    requestFor("258", undefined, `?token=${TOKEN}`),
  ];

  for (const request of cases) {
    const rendered: number[] = [];
    const response = await serveQuotePdfPremium(request, "258", {
      env: productionEnv(),
      checkRateLimit: async () => true,
      renderQuotePdf: async (quoteId) => {
        rendered.push(quoteId);
        return { pdf: pdfBytes(), filename: "Cotizacion" };
      },
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), { error: "Unauthorized" });
    assert.deepEqual(rendered, []);
  }
});

test("un id invalido responde 400 despues de autenticar", async () => {
  const rendered: number[] = [];
  const response = await serveQuotePdfPremium(requestFor("ALFA-0195", `Bearer ${TOKEN}`), "ALFA-0195", {
    env: productionEnv(),
    checkRateLimit: async () => true,
    renderQuotePdf: async (quoteId) => {
      rendered.push(quoteId);
      return { pdf: pdfBytes(), filename: "Cotizacion" };
    },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), { error: "Bad Request" });
  assert.deepEqual(rendered, []);
});

test("258, 259 y 260 devuelven el PDF Premium sin usar la query", async () => {
  for (const quoteId of PRODUCTION_IDS) {
    const seen: number[] = [];
    const keys: Array<{ key: string; limit?: number; windowMs?: number }> = [];
    const checkRateLimit: QuotePdfServiceRateLimit = async (key, limit, windowMs) => {
      keys.push({ key, limit, windowMs });
      assert.equal(key.includes(TOKEN), false);
      return true;
    };
    const modes: string[] = [];
    const response = await serveQuotePdfPremium(
      requestFor(String(quoteId), `Bearer ${TOKEN}`, "?token=no"),
      String(quoteId),
      {
        env: productionEnv(),
        checkRateLimit,
        renderQuotePdf: async (id, mode) => {
          seen.push(id);
          modes.push(mode);
          return { pdf: pdfBytes("%PDF-1.4\nmock"), filename: `Cotizacion-ALFA-${id}` };
        },
      }
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      response.headers.get("content-disposition"),
      `inline; filename="Cotizacion-ALFA-${quoteId}.pdf"`
    );
    assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    assert.deepEqual(seen, [quoteId]);
    assert.deepEqual(modes, ["default"]);
    assert.deepEqual(
      keys.map((entry) => entry.key),
      [quotePdfServiceIpRateKey("203.0.113.8"), QUOTE_PDF_SERVICE_GLOBAL_RATE_KEY]
    );
    assert.equal(keys[0]?.limit, QUOTE_PDF_SERVICE_IP_LIMIT);
    assert.equal(keys[1]?.limit, QUOTE_PDF_SERVICE_GLOBAL_LIMIT);
    assert.equal(keys[0]?.windowMs, QUOTE_PDF_SERVICE_WINDOW_MS);
  }
});

test("rate limit, cotizacion ausente y fallo de render", async () => {
  const unauthorizedFlood = await serveQuotePdfPremium(requestFor("258", `Bearer ${TOKEN}`), "258", {
    env: productionEnv(),
    checkRateLimit: async (key) => key !== quotePdfServiceIpRateKey("203.0.113.8"),
    renderQuotePdf: async () => {
      throw new Error("no debio renderizar");
    },
  });
  assert.equal(unauthorizedFlood.status, 429);

  const globalFlood = await serveQuotePdfPremium(requestFor("259", `Bearer ${TOKEN}`), "259", {
    env: productionEnv(),
    checkRateLimit: async (key) => key !== QUOTE_PDF_SERVICE_GLOBAL_RATE_KEY,
    renderQuotePdf: async () => {
      throw new Error("no debio renderizar");
    },
  });
  assert.equal(globalFlood.status, 429);
  assert.deepEqual(await readJson(globalFlood), { error: "Too Many Requests" });

  const missing = await serveQuotePdfPremium(requestFor("260", `Bearer ${TOKEN}`), "260", {
    env: productionEnv(),
    checkRateLimit: async () => true,
    renderQuotePdf: async () => {
      throw new Error("Cotizacion no encontrada.");
    },
  });
  assert.equal(missing.status, 404);
  assert.deepEqual(await readJson(missing), { error: "Not Found" });

  let logged = false;
  const broken = await serveQuotePdfPremium(requestFor("258", `Bearer ${TOKEN}`), "258", {
    env: productionEnv(),
    checkRateLimit: async () => true,
    renderQuotePdf: async () => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    },
    onError: ({ error }) => {
      logged = error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY");
    },
  });
  const brokenBody = await readJson(broken);
  assert.equal(broken.status, 500);
  assert.equal(brokenBody.error, "Unable to process request");
  assert.equal(typeof brokenBody.requestId, "string");
  assert.equal(JSON.stringify(brokenBody).includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.equal(logged, true);

  const notPdf = await serveQuotePdfPremium(requestFor("258", `Bearer ${TOKEN}`), "258", {
    env: productionEnv(),
    checkRateLimit: async () => true,
    renderQuotePdf: async () => ({ pdf: pdfBytes("hello"), filename: "Cotizacion" }),
  });
  const notPdfBody = await readJson(notPdf);
  assert.equal(notPdf.status, 500);
  assert.equal(JSON.stringify(notPdfBody).includes("hello"), false);
});

test("la ruta reutiliza el renderer oficial y no lee el token de la query", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/api/quotes/[id]/pdf-premium/route.ts"),
    "utf8"
  );

  assert.match(source, /getQuotePdfSnapshot\(supabase, quoteId\)/);
  assert.match(source, /buildQuotePremiumPdfHtml\(snapshot, branding\)/);
  assert.match(source, /renderQuotePremiumPdf\(html\)/);
  assert.match(source, /resolvePartnerQuotePdfBranding\(supabase, quoteId\)/);
  assert.match(source, /checkRateLimit/);
  assert.match(source, /createSupabaseAdminClient/);
  assert.equal(source.includes("searchParams"), false);
  assert.equal(source.includes("canGeneratePartnerQuotes"), false);
  assert.equal(source.includes("QUOTE_PDF_SERVICE_TOKEN="), false);

  const button = readFileSync(
    path.join(process.cwd(), "app/api/quotes/[id]/premium-pdf/route.ts"),
    "utf8"
  );
  assert.match(button, /canGeneratePartnerQuotes\(profile\?\.role\)/);
  assert.match(button, /resolvePartnerQuotePdfBranding\(supabase, quoteId\)/);
  assert.match(button, /brandingMode === "partner"/);
  assert.equal(button.includes("from(\"commercial_partners\")"), false);
  assert.equal(button.includes("from(\"quotes\")"), false);
});

test("branding solo acepta partner y no autentica", async () => {
  assert.deepEqual(
    parseQuotePdfServiceBranding("https://portal.alfait.com.mx/api/quotes/261/pdf-premium"),
    { ok: true, mode: "default" }
  );
  assert.deepEqual(
    parseQuotePdfServiceBranding(
      "https://portal.alfait.com.mx/api/quotes/261/pdf-premium?branding=partner"
    ),
    { ok: true, mode: "partner" }
  );
  for (const value of ["alfa", "Partner", "white-label", ""]) {
    const parsed = parseQuotePdfServiceBranding(
      `https://portal.alfait.com.mx/api/quotes/261/pdf-premium?branding=${value}`
    );
    assert.deepEqual(parsed, { ok: false, status: 400, error: "Unsupported branding" });
  }

  const rendered: Array<{ id: number; mode: string }> = [];
  const withoutToken = await serveQuotePdfPremium(
    requestFor("261", undefined, "?branding=partner&token=secreto"),
    "261",
    {
      env: productionEnv(),
      checkRateLimit: async () => true,
      renderQuotePdf: async (id, mode) => {
        rendered.push({ id, mode });
        return { pdf: pdfBytes(), filename: "Cotizacion" };
      },
    }
  );
  assert.equal(withoutToken.status, 401);
  assert.equal(rendered.length, 0);

  const unsupported = await serveQuotePdfPremium(
    requestFor("261", `Bearer ${TOKEN}`, "?branding=alfa"),
    "261",
    {
      env: productionEnv(),
      checkRateLimit: async () => true,
      renderQuotePdf: async (id, mode) => {
        rendered.push({ id, mode });
        return { pdf: pdfBytes(), filename: "Cotizacion" };
      },
    }
  );
  assert.equal(unsupported.status, 400);
  assert.deepEqual(await readJson(unsupported), { error: "Unsupported branding" });
  assert.equal(rendered.length, 0);

  const partner = await serveQuotePdfPremium(
    requestFor("261", `Bearer ${TOKEN}`, "?branding=partner&token=no"),
    "261",
    {
      env: productionEnv(),
      checkRateLimit: async () => true,
      renderQuotePdf: async (id, mode) => {
        rendered.push({ id, mode });
        return { pdf: pdfBytes("%PDF-1.4\nkybit"), filename: "Cotizacion-ALFA-0199-V1-Kybit-Aliado" };
      },
    }
  );
  assert.equal(partner.status, 200);
  assert.equal(
    partner.headers.get("content-disposition"),
    'inline; filename="Cotizacion-ALFA-0199-V1-Kybit-Aliado.pdf"'
  );
  assert.deepEqual(rendered, [{ id: 261, mode: "partner" }]);

  let logged = false;
  const notPartner = await serveQuotePdfPremium(
    requestFor("258", `Bearer ${TOKEN}`, "?branding=partner"),
    "258",
    {
      env: productionEnv(),
      checkRateLimit: async () => true,
      renderQuotePdf: async () => {
        throw new QuotePdfServiceClientError("Not a partner quote", 400);
      },
      onError: () => {
        logged = true;
      },
    }
  );
  assert.equal(notPartner.status, 400);
  assert.deepEqual(await readJson(notPartner), { error: "Not a partner quote" });
  assert.equal(logged, false);

  const incomplete = await serveQuotePdfPremium(
    requestFor("261", `Bearer ${TOKEN}`, "?branding=partner"),
    "261",
    {
      env: productionEnv(),
      checkRateLimit: async () => true,
      renderQuotePdf: async () => {
        throw new QuotePdfServiceClientError("El aliado no tiene logotipo.", 422);
      },
    }
  );
  const incompleteBody = await readJson(incomplete);
  assert.equal(incomplete.status, 422);
  assert.equal(incompleteBody.error, "El aliado no tiene logotipo.");
  assert.equal(typeof incompleteBody.requestId, "string");
});
