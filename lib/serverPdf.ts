import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Browser } from "playwright-core";
import { getAppBaseUrl } from "@/lib/appUrl";

type PdfCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "None" | "Strict";
};

function parseCookieHeader(cookieHeader: string | null | undefined, baseUrl: string) {
  if (!cookieHeader) return [];

  const hostname = new URL(baseUrl).hostname;
  const secure = baseUrl.startsWith("https://");

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie): PdfCookie | null => {
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
    .filter((cookie): cookie is PdfCookie => Boolean(cookie));
}

async function getExecutablePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  return chromium.executablePath();
}

export async function renderPrintRouteToPdf(pathname: string, cookieHeader?: string | null) {
  const baseUrl = getAppBaseUrl();
  const url = new URL(pathname, baseUrl).toString();
  let browser: Browser | null = null;

  try {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await getExecutablePath(),
      headless: true,
    });

    const context = await browser.newContext();
    const cookies = parseCookieHeader(cookieHeader, baseUrl);

    if (cookies.length > 0) {
      await context.addCookies(cookies);
    }

    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.emulateMedia({ media: "print" });

    return await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido.";
    throw new Error(`No se pudo generar el PDF desde ${url}: ${message}`);
  } finally {
    await browser?.close();
  }
}
