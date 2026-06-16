import "server-only";

import fs from "node:fs";
import path from "node:path";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { QuotePdfSnapshot } from "@/lib/quotePdfSnapshot";

type QuotePdfItem = QuotePdfSnapshot["sections"][number]["items"][number];
type QuotePdfSection = QuotePdfSnapshot["sections"][number];

let logoDataUrl: string | null = null;

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function money(value: number, currency: string) {
  return escapeHtml(formatCurrency(value, currency));
}

function number(value: number) {
  return escapeHtml(formatNumber(value));
}

function getLogoDataUrl() {
  if (logoDataUrl) return logoDataUrl;

  const logoPath = path.join(process.cwd(), "public", "logo-print.png");
  const logoBytes = fs.readFileSync(logoPath);
  logoDataUrl = `data:image/png;base64,${logoBytes.toString("base64")}`;
  return logoDataUrl;
}

function buildTermsList(snapshot: QuotePdfSnapshot) {
  const terms = snapshot.terms;
  const lines = [
    terms.payment100Advance
      ? "Anticipo: 100% del total de la propuesta."
      : `Anticipo de equipos: ${formatCurrency(
          snapshot.totals.equipmentTotalUsd,
          "USD"
        )}. Mano de obra conforme a condiciones comerciales acordadas.`,
    "Todos los precios de equipos estan expresados en USD y la mano de obra en MXN.",
    "El pago debera ser en Pesos Mexicanos, considerando el Tipo de Cambio DOF del dia de pago.",
    "Incluye 16% de IVA.",
    terms.isLocalGuadalajara
      ? "Precio L.A.B. en la ubicacion de la obra en Guadalajara, Jalisco."
      : "El presupuesto considera viaticos para los dias de trabajo calculados.",
    terms.includesConduit && terms.includesCabling
      ? "Incluye canalizaciones y cableado."
      : terms.includesConduit
        ? "Incluye canalizaciones; no incluye cableado."
        : terms.includesCabling
          ? "No incluye canalizaciones; si incluye cableado."
          : "No incluye canalizaciones ni cableados.",
  ];

  return lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function buildItemImage(item: QuotePdfItem) {
  if (item.productImage.src) {
    return `<img class="item-image" src="${escapeHtml(item.productImage.src)}" alt="${escapeHtml(
      item.productImage.alt || item.productName || "Producto"
    )}" />`;
  }

  return `<div class="item-image-fallback" aria-hidden="true"></div>`;
}

function getClientDisplay(snapshot: QuotePdfSnapshot) {
  return snapshot.client.companyName || snapshot.client.name || "Sin cliente";
}

function getContactDisplay(snapshot: QuotePdfSnapshot) {
  if (!snapshot.client.companyName) return null;
  if (!snapshot.client.name || snapshot.client.name === snapshot.client.companyName) {
    return null;
  }

  return snapshot.client.name;
}

function getProjectDisplay(snapshot: QuotePdfSnapshot) {
  return snapshot.project.name || "Sin proyecto";
}

function buildCover(snapshot: QuotePdfSnapshot) {
  const title = snapshot.quote.quoteNumber || `Cotizacion #${snapshot.quote.id}`;
  const contact = getContactDisplay(snapshot);
  const project = getProjectDisplay(snapshot);
  const logoSrc = getLogoDataUrl();

  return `
    <section class="page cover">
      <div>
        <div class="cover-logo-row">
          <div>
            <img class="cover-logo" src="${logoSrc}" alt="ALFA" />
            <div class="cover-kicker">Propuesta comercial</div>
          </div>
          <div class="cover-folio">
            <span>Folio</span>
            <strong>${escapeHtml(title)}</strong>
          </div>
        </div>

        <div class="cover-hero">
          <span class="cover-label">Proyecto</span>
          <h1 class="cover-title">${escapeHtml(project)}</h1>
        </div>
      </div>

      <div class="cover-bottom">
        <div class="cover-info">
          <div>
            <span>Cliente</span>
            <strong>${escapeHtml(getClientDisplay(snapshot))}</strong>
          </div>
          ${
            contact
              ? `<div><span>Atencion a</span><strong>${escapeHtml(contact)}</strong></div>`
              : ""
          }
          <div>
            <span>Proyecto</span>
            <strong>${escapeHtml(project)}</strong>
          </div>
        </div>

        <div class="cover-total">
          <span>Total estimado</span>
          <strong class="amount">${money(snapshot.totals.totalMxn, "MXN")}</strong>
          <small>TC USD/MXN ${number(snapshot.exchangeRate.value)}</small>
          <small>Fecha: ${escapeHtml(formatDate(snapshot.quote.createdAt))} - Vigencia: 15 d&iacute;as</small>
        </div>
      </div>
    </section>
  `;
}

function buildFinancialRows(snapshot: QuotePdfSnapshot) {
  const rows = [
    ["Equipos", money(snapshot.totals.equipmentTotalUsd, "USD")],
    ["Mano de Obra", money(snapshot.totals.laborTotalMxn, "MXN")],
    ["Subtotal", money(snapshot.totals.subtotalMxn, "MXN")],
  ];

  if (snapshot.totals.partnerTotalDiscountMxn > 0) {
    rows.push([
      "Descuento aliado",
      `-${money(snapshot.totals.partnerTotalDiscountMxn, "MXN")}`,
    ]);
  }

  if (snapshot.totals.discountMxn > 0) {
    rows.push(["Descuento", `-${money(snapshot.totals.discountMxn, "MXN")}`]);
  }

  rows.push(
    ["IVA 16%", money(snapshot.totals.ivaMxn, "MXN")],
    ["Total estimado", money(snapshot.totals.totalMxn, "MXN")]
  );

  return rows
    .map(
      ([label, value], index) => `
        <div class="financial-row ${index === rows.length - 1 ? "is-total" : ""}">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");
}

function buildExecutiveSummary(snapshot: QuotePdfSnapshot) {
  const scope = snapshot.sections
    .map(
      (section) => `
        <li>
          <span>${escapeHtml(section.name || "Sistema sin nombre")}</span>
          <strong>${money(section.totalMxn, "MXN")}</strong>
        </li>
      `
    )
    .join("");

  return `
    <section class="page summary-page">
      <div class="page-heading">
        <div>
          <h2>Resumen ejecutivo</h2>
          <p class="summary-reference">${escapeHtml(getProjectDisplay(snapshot))} - ${escapeHtml(
            snapshot.quote.quoteNumber || `Cotizacion #${snapshot.quote.id}`
          )}</p>
        </div>
        <div class="page-meta">
          <strong>${escapeHtml(snapshot.quote.quoteNumber || `Cotizacion #${snapshot.quote.id}`)}</strong>
          <span>${escapeHtml(getClientDisplay(snapshot))}</span>
        </div>
      </div>

      <div class="summary-grid">
        <div class="total-card">
          <span>Inversion total estimada</span>
          <strong class="amount">${money(snapshot.totals.totalMxn, "MXN")}</strong>
          <small>Importe con IVA incluido.</small>
        </div>

        <div class="summary-card financial-card">
          <h3>Resumen financiero</h3>
          ${buildFinancialRows(snapshot)}
        </div>

        <div class="summary-card">
          <h3>Condiciones clave</h3>
          <ul class="clean-list">
            <li>TC USD/MXN ${number(snapshot.exchangeRate.value)}</li>
            <li>Vigencia: 15 d&iacute;as</li>
            <li>Los equipos se totalizan en USD y la mano de obra en Pesos Mexicanos.</li>
          </ul>
        </div>

        <div class="summary-card">
          <h3>Alcance general</h3>
          <ul class="scope-list">${scope}</ul>
        </div>
      </div>
    </section>
  `;
}

function buildItemRow(item: QuotePdfItem) {
  const brandModel = [item.productBrand, item.productModel].filter(Boolean).join(" ");
  const title = brandModel || item.productName || "Partida sin descripcion";
  const description = item.productName && item.productName !== brandModel ? item.productName : "";
  const activities = item.laborActivities.length
    ? `<ul class="labor">${item.laborActivities
        .map(
          (activity) =>
            `<li>${escapeHtml(activity.name || "Actividad")} - ${number(
              activity.quantity
            )} ${escapeHtml(activity.unit || "")} - ${money(
              activity.saleTotalMxn,
              "MXN"
            )}</li>`
        )
        .join("")}</ul>`
    : "";

  return `
    <div class="item-row">
      <div>${buildItemImage(item)}</div>
      <div class="item-description">
        <div class="item-title">${escapeHtml(title)}</div>
        ${description ? `<div class="item-meta">${escapeHtml(description)}</div>` : ""}
        ${activities}
      </div>
      <div class="num">${number(item.quantity)}</div>
      <div class="num">${money(item.equipmentTotalUsd, "USD")}</div>
      <div class="num">${money(item.laborTotalMxn, "MXN")}</div>
      <div class="num strong">${money(item.lineTotalMxn, "MXN")}</div>
    </div>
  `;
}

function buildSection(section: QuotePdfSection) {
  const firstRows = section.items.slice(0, 2).map(buildItemRow).join("");
  const remainingRows = section.items.slice(2).map(buildItemRow).join("");

  return `
    <section class="section">
      <div class="section-start-block">
        <div class="section-head">
          <div>
            <span class="eyebrow">Sistema</span>
            <h2>${escapeHtml(section.name || "Sistema sin nombre")}</h2>
          </div>
          <div class="section-kpis">
            <span>Totales:</span>
            <span>Equipo ${money(section.equipmentTotalUsd, "USD")}</span>
            <span>Mano de Obra ${money(section.laborTotalMxn, "MXN")}</span>
            <strong>Total ${money(section.totalMxn, "MXN")}</strong>
          </div>
        </div>

        <div class="item-header">
          <span></span>
          <span>Partida</span>
          <span class="num">Cantidad</span>
          <span class="num">Equipo</span>
          <span class="num">Mano de Obra</span>
          <span class="num">Total MXN</span>
        </div>
        ${firstRows}
      </div>
      ${remainingRows}
    </section>
  `;
}

function buildNotes(snapshot: QuotePdfSnapshot) {
  if (!snapshot.quote.notes) return "";

  return `
    <section class="closing-section">
      <h3>Notas</h3>
      <p>${escapeHtml(snapshot.quote.notes).replaceAll("\n", "<br />")}</p>
    </section>
  `;
}

function buildTerms(snapshot: QuotePdfSnapshot) {
  return `
    <section class="closing-section">
      <h3>Condiciones comerciales</h3>
      <ol>${buildTermsList(snapshot)}</ol>
    </section>
  `;
}

function buildClosing(snapshot: QuotePdfSnapshot) {
  return `
    <section class="closing">
      ${buildNotes(snapshot)}
      ${buildTerms(snapshot)}
    </section>
  `;
}

export function buildQuotePremiumPdfHtml(snapshot: QuotePdfSnapshot) {
  const title = snapshot.quote.quoteNumber || `Cotizacion #${snapshot.quote.id}`;
  const sectionsHtml = snapshot.sections.map(buildSection).join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: letter; margin: 14mm 15mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #15171c;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 400;
        font-size: 10.5px;
        line-height: 1.42;
      }
      h1, h2, h3, p { margin: 0; }
      h1, h2, h3 { font-weight: 600; }
      .page { page-break-after: always; }
      .cover {
        min-height: calc(279.4mm - 28mm);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 8mm 0;
      }
      .cover-logo-row,
      .cover-bottom,
      .page-heading,
      .section-head,
      .financial-row {
        display: flex;
        justify-content: space-between;
        gap: 18px;
      }
      .cover-logo-row {
        align-items: flex-start;
      }
      .cover-logo {
        display: block;
        width: 94px;
        height: 94px;
        object-fit: contain;
      }
      .cover-kicker,
      .eyebrow {
        color: #9e1b32;
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .cover-kicker {
        margin-top: 12px;
      }
      .cover-folio {
        min-width: 150px;
        text-align: right;
      }
      .cover-folio span,
      .cover-info span,
      .cover-total span,
      .total-card span,
      .page-meta span {
        display: block;
        color: #626773;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: .08em;
      }
      .cover-folio strong,
      .cover-info strong {
        display: block;
        margin-top: 4px;
        font-size: 13px;
      }
      .cover-hero {
        max-width: 520px;
        margin-top: 36mm;
      }
      .cover-label {
        display: block;
        margin-bottom: 9px;
        color: #626773;
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .cover-title {
        font-size: 32px;
        line-height: 1.08;
        letter-spacing: 0;
      }
      .cover-info {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        max-width: 330px;
      }
      .cover-total {
        width: 300px;
        border-top: 1px solid #d8d2c7;
        padding-top: 16px;
        break-inside: avoid;
      }
      .total-card,
      .summary-card {
        border-top: 1px solid #d8d2c7;
        padding-top: 16px;
        break-inside: avoid;
      }
      .summary-card {
        background: transparent;
      }
      .cover-total .amount,
      .total-card .amount {
        display: block;
        margin-top: 6px;
        font-size: 26px;
        line-height: 1.06;
        font-weight: 700;
      }
      .cover-total small,
      .total-card small {
        display: block;
        margin-top: 8px;
        color: #626773;
        font-size: 9.5px;
      }
      .summary-page {
        min-height: calc(279.4mm - 28mm);
        padding: 4mm 0 0;
      }
      .page-heading {
        align-items: flex-end;
        padding-bottom: 18px;
        border-bottom: 1px solid #d8d2c7;
      }
      .page-heading h2 {
        font-size: 25px;
        line-height: 1.08;
      }
      .summary-reference {
        margin-top: 7px;
        color: #626773;
        font-size: 11px;
      }
      .page-meta {
        min-width: 180px;
        text-align: right;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
        margin-top: 20px;
      }
      .summary-card h3,
      .closing-section h3 {
        margin-bottom: 10px;
        color: #9e1b32;
        font-size: 10px;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .financial-row {
        padding: 6px 0;
        border-bottom: 1px solid #e7e0d5;
        align-items: baseline;
      }
      .financial-row:last-child { border-bottom: 0; }
      .financial-row.is-total {
        padding-top: 10px;
        font-size: 13px;
      }
      .clean-list,
      .scope-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .clean-list li {
        padding: 6px 0;
        border-bottom: 1px solid #e7e0d5;
      }
      .clean-list li:last-child { border-bottom: 0; }
      .scope-list li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 5px 0;
        border-bottom: 1px solid #e7e0d5;
      }
      .scope-list li:last-child { border-bottom: 0; }
      .scope-list strong {
        color: #626773;
        font-weight: 700;
        white-space: nowrap;
      }
      .section {
        margin-top: 18px;
        break-inside: auto;
      }
      .section:first-of-type { margin-top: 0; }
      .section-start-block {
        break-inside: avoid;
      }
      .section-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 18px;
        align-items: end;
        padding: 12px 0 8px;
        border-bottom: 1px solid #d6d1c8;
        break-after: avoid;
      }
      .section-head h2 {
        margin-top: 4px;
        font-size: 18px;
        line-height: 1.12;
      }
      .section-kpis {
        display: flex;
        gap: 9px;
        justify-content: flex-end;
        color: #555963;
        font-size: 9px;
        white-space: nowrap;
      }
      .section-kpis span:first-child {
        color: #15171c;
        font-weight: 600;
      }
      .section-kpis strong {
        color: #15171c;
      }
      .item-header,
      .item-row {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr) 58px 78px 96px 86px;
        gap: 10px;
      }
      .item-header {
        padding: 8px 0 6px;
        color: #626773;
        font-size: 8px;
        font-weight: 600;
        letter-spacing: .08em;
        text-transform: uppercase;
        break-after: avoid;
      }
      .item-row {
        padding: 10px 0;
        border-bottom: 1px solid #eee8df;
        break-inside: avoid;
      }
      .item-image,
      .item-image-fallback {
        display: block;
        width: 64px;
        height: 64px;
        border: 1px solid #e1ddd5;
        background: #f7f5f1;
      }
      .item-image {
        object-fit: contain;
      }
      .item-image-fallback {
        background: linear-gradient(135deg, #f7f5f1, #ffffff);
      }
      .item-title {
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .item-meta {
        margin-top: 4px;
        color: #626773;
        font-size: 9px;
        overflow-wrap: anywhere;
      }
      .labor {
        margin: 5px 0 0;
        padding: 0;
        color: #626773;
        font-size: 8.8px;
        list-style: none;
      }
      .labor li { margin-top: 2px; }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .strong { font-weight: 700; }
      .closing {
        margin-top: 26px;
        padding-top: 10px;
        border-top: 1px solid #d8d2c7;
      }
      .closing-section {
        padding: 16px 0;
        border-bottom: 1px solid #e7e0d5;
        break-inside: avoid;
      }
      .closing-section:last-child {
        border-bottom: 0;
      }
      .closing-section p {
        color: #3f444d;
        overflow-wrap: anywhere;
      }
      .closing-section ol {
        margin: 0;
        padding-left: 16px;
        color: #3f444d;
      }
      .closing-section li { margin-bottom: 5px; }
    </style>
  </head>
  <body>
    ${buildCover(snapshot)}
    ${buildExecutiveSummary(snapshot)}
    ${sectionsHtml}
    ${buildClosing(snapshot)}
  </body>
</html>`;
}
