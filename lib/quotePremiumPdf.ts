import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

function getCandidateBrowserPaths() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = configured ? [configured] : [];

  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser"
    );
  }

  return candidates;
}

function resolveBrowserExecutablePath() {
  const executablePath = getCandidateBrowserPaths().find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!executablePath) {
    throw new Error(
      "No se encontro Chrome/Chromium para renderizar PDF. Configura PUPPETEER_EXECUTABLE_PATH o instala un runtime Chromium compatible."
    );
  }

  return executablePath;
}

export async function renderQuotePremiumPdf(html: string) {
  const executablePath = resolveBrowserExecutablePath();
  const userDataDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "alfa-quote-pdf-")
  );

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      userDataDir,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "load",
    });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5_000 }).catch(() => null);
    await page
      .evaluate(async () => {
        const images = Array.from(document.images);
        await Promise.all(
          images.map(
            (image) =>
              new Promise<void>((resolve) => {
                const settleAfterDecode = () => {
                  const decode = image.decode?.();
                  if (decode) {
                    decode.then(resolve).catch(resolve);
                    return;
                  }
                  resolve();
                };

                if (image.complete) {
                  settleAfterDecode();
                  return;
                }

                const timeout = window.setTimeout(resolve, 4_000);
                image.onload = () => {
                  window.clearTimeout(timeout);
                  settleAfterDecode();
                };
                image.onerror = () => {
                  window.clearTimeout(timeout);
                  resolve();
                };
              })
          )
        );
      })
      .catch(() => null);
    await page.emulateMediaType("print");

    // Keep PDF settings here, not in the HTML module, so V0 can change renderer
    // behavior without touching snapshot or template logic.
    return Buffer.from(
      await page.pdf({
        format: "letter",
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: `
          <div style="width:100%; padding:0 15mm; color:#8a8d94; font-family:Arial, Helvetica, sans-serif; font-size:8px; text-align:right;">
            P&aacute;gina <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "9mm",
          left: "0",
        },
      })
    );
  } finally {
    if (browser) await browser.close();
    await fs.promises.rm(userDataDir, { recursive: true, force: true });
  }
}
