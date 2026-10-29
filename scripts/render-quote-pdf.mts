/**
 * PDF Premium de una cotizacion, generado en local con los mismos builders
 * que usa /api/quotes/[id]/premium-pdf (sin sesion de usuario).
 *
 * Lee la cotizacion con la service role de .env.local (la base a la que
 * apunte ese archivo) e imprime el HTML con Chrome/Edge en modo headless.
 * Se usa la impresion por linea de comandos y no puppeteer porque puppeteer
 * no logra lanzar el navegador desde las sesiones de Claude Code en Windows.
 *
 * Uso:
 *   npx tsx --conditions=react-server scripts/render-quote-pdf.mts 239
 *   npx tsx --conditions=react-server scripts/render-quote-pdf.mts 239 --out ruta.pdf
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { getQuotePdfSnapshot } from "@/lib/quotePdfSnapshot";
import { buildQuotePremiumPdfHtml } from "@/lib/quotePremiumPdfHtml";
import { slugifyFilenamePart } from "@/lib/filenames";

process.loadEnvFile(".env.local");

const quoteId = Number(process.argv[2]);
if (!Number.isInteger(quoteId) || quoteId <= 0) {
  console.error("Uso: render-quote-pdf.mts <quote_id> [--out ruta.pdf]");
  process.exit(1);
}

const outIndex = process.argv.indexOf("--out");
const explicitOut = outIndex >= 0 ? process.argv[outIndex + 1] : null;

const BROWSERS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((candidate): candidate is string => Boolean(candidate));

const browser = BROWSERS.find((candidate) => fs.existsSync(candidate));
if (!browser) {
  console.error("No se encontro Chrome ni Edge para imprimir el PDF.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const snapshot = await getQuotePdfSnapshot(supabase, quoteId);
const html = buildQuotePremiumPdfHtml(snapshot);

const clientPart = slugifyFilenamePart(
  snapshot.client.companyName || snapshot.client.name
);
const outPath = path.resolve(
  explicitOut ||
    path.join(
      "docs/audits/quotes",
      ["Cotizacion", snapshot.quote.quoteNumber || `ID${quoteId}`, clientPart]
        .filter(Boolean)
        .join("-") + ".pdf"
    )
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "alfa-quote-pdf-"));
const htmlPath = path.join(tmpDir, "quote.html");
fs.writeFileSync(htmlPath, html);

const result = spawnSync(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--user-data-dir=${path.join(tmpDir, "profile")}`,
    `--print-to-pdf=${outPath}`,
    pathToFileURL(htmlPath).href,
  ],
  { encoding: "utf8", timeout: 120_000 }
);
fs.rmSync(tmpDir, { recursive: true, force: true });

if (result.status !== 0 || !fs.existsSync(outPath)) {
  console.error("No se pudo imprimir el PDF:", result.stderr || result.error);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      quote: snapshot.quote.quoteNumber,
      client: snapshot.client.companyName || snapshot.client.name,
      totals: snapshot.totals,
      pdf: outPath,
    },
    null,
    2
  )
);
