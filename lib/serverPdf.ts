import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type CookieParam, type LaunchOptions } from "puppeteer-core";
import { getAppBaseUrl } from "@/lib/appUrl";

function parseCookieHeader(cookieHeader: string | null | undefined, baseUrl: string) {
  if (!cookieHeader) return [];

  const hostname = new URL(baseUrl).hostname;
  const secure = baseUrl.startsWith("https://");

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie): CookieParam | null => {
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex <= 0) return null;

      return {
        name: cookie.slice(0, separatorIndex),
        value: cookie.slice(separatorIndex + 1),
        domain: hostname,
        path: "/",
        secure,
        sameSite: "Lax",
      };
    })
    .filter((cookie): cookie is CookieParam => Boolean(cookie));
}

async function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const executablePath = await chromium.executablePath();

  if (!executablePath) {
    throw new Error(
      "No se encontro Chromium para generar PDFs. Configura PUPPETEER_EXECUTABLE_PATH en local o usa @sparticuz/chromium en Vercel."
    );
  }

  return executablePath;
}

function getChromiumHeadlessMode(): LaunchOptions["headless"] {
  return (chromium as unknown as { headless?: LaunchOptions["headless"] }).headless ?? true;
}

export async function generatePdfFromUrl(url: string, cookieHeader?: string | null) {
  let browser: Browser | null = null;

  try {
    const baseUrl = getAppBaseUrl();
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await getExecutablePath(),
      headless: getChromiumHeadlessMode(),
      defaultViewport: {
        width: 816,
        height: 1056,
        deviceScaleFactor: 1,
      },
    });

    const page = await browser.newPage();
    const cookies = parseCookieHeader(cookieHeader, baseUrl);

    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });

    const renderedText = await page.evaluate(() => document.body?.innerText || "");

    if (
      renderedText.includes("Entrega no encontrada") ||
      renderedText.includes("Carta de garantia no encontrada") ||
      renderedText.includes("Carta de garantía no encontrada") ||
      renderedText.includes("Iniciar sesion") ||
      renderedText.includes("Iniciar sesión")
    ) {
      throw new Error("La vista print no renderizo el documento formal esperado.");
    }

    await page.emulateMediaType("print");

    return Buffer.from(
      await page.pdf({
        format: "Letter",
        printBackground: true,
        preferCSSPageSize: true,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido.";
    throw new Error(`No se pudo generar el PDF formal en servidor. ${message}`);
  } finally {
    await browser?.close();
  }
}

export async function renderPrintRouteToPdf(pathname: string, cookieHeader?: string | null) {
  const url = new URL(pathname, getAppBaseUrl()).toString();
  return generatePdfFromUrl(url, cookieHeader);
}
