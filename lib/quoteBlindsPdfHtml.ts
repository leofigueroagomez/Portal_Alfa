export type QuoteBlindsPdfItem = {
  id: number;
  area: string;
  brand: string;
  model: string;
  blindType: string;
  collection: string;
  color: string;
  mechanism: string;
  control: string;
  widthCm: number;
  heightCm: number;
  quantity: number;
  unitM2: number;
  billableM2: number;
  lineTotalMxn: number;
  customerVisibleNote: string | null;
  hasReferenceImage: boolean;
};

export type QuoteBlindsPdfSnapshot = {
  logoDataUrl: string;
  quote: {
    id: number;
    quoteNumber: string | null;
    createdAt: string | null;
    currency: "MXN";
    validityText: string;
  };
  client: {
    name: string | null;
    companyName: string | null;
  };
  project: {
    name: string | null;
  };
  totals: {
    pieces: number;
    billableM2: number;
    subtotalMxn: number;
    ivaMxn: number;
    totalMxn: number;
  };
  terms: {
    payment100Equipment: boolean;
    payment100Advance: boolean;
    isLocalGuadalajara: boolean;
    includesTravelExpenses: boolean;
  };
  items: QuoteBlindsPdfItem[];
};

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

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function formatMxn(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function getClientDisplay(snapshot: QuoteBlindsPdfSnapshot) {
  return snapshot.client.companyName || snapshot.client.name || "Sin cliente";
}

function getClientContact(snapshot: QuoteBlindsPdfSnapshot) {
  if (
    !snapshot.client.companyName ||
    !snapshot.client.name ||
    snapshot.client.companyName === snapshot.client.name
  ) {
    return null;
  }

  return snapshot.client.name;
}

function getProjectDisplay(snapshot: QuoteBlindsPdfSnapshot) {
  return snapshot.project.name || "Sin proyecto";
}

function groupItemsByArea(items: QuoteBlindsPdfItem[]) {
  const groups = new Map<string, QuoteBlindsPdfItem[]>();

  for (const item of items) {
    const area = item.area.trim() || "Área general";
    groups.set(area, [...(groups.get(area) || []), item]);
  }

  return [...groups.entries()];
}

function buildCover(snapshot: QuoteBlindsPdfSnapshot) {
  const folio =
    snapshot.quote.quoteNumber || `Cotización #${snapshot.quote.id}`;
  const contact = getClientContact(snapshot);

  return `
    <section class="page cover">
      <header class="cover-header">
        <div>
          <img class="cover-logo" src="${escapeHtml(snapshot.logoDataUrl)}" alt="ALFA" />
          <p class="cover-kicker">Propuesta comercial</p>
        </div>
        <div class="cover-folio">
          <span>Folio</span>
          <strong>${escapeHtml(folio)}</strong>
        </div>
      </header>

      <div class="cover-hero">
        <span>Cotización de Persianas</span>
        <h1>${escapeHtml(getProjectDisplay(snapshot))}</h1>
        <p>Soluciones a medida, organizadas por cada espacio del proyecto.</p>
      </div>

      <div>
        <div class="cover-context">
          <div>
            <span>Cliente</span>
            <strong>${escapeHtml(getClientDisplay(snapshot))}</strong>
            ${contact ? `<small>Atención: ${escapeHtml(contact)}</small>` : ""}
          </div>
          <div>
            <span>Proyecto</span>
            <strong>${escapeHtml(getProjectDisplay(snapshot))}</strong>
          </div>
          <div>
            <span>Fecha</span>
            <strong>${escapeHtml(formatDate(snapshot.quote.createdAt))}</strong>
            <small>Vigencia: ${escapeHtml(snapshot.quote.validityText)}</small>
          </div>
        </div>

        <div class="cover-summary">
          <div>
            <span>Piezas</span>
            <strong>${escapeHtml(formatNumber(snapshot.totals.pieces, 0))}</strong>
          </div>
          <div>
            <span>m² considerados</span>
            <strong>${escapeHtml(formatNumber(snapshot.totals.billableM2, 4))}</strong>
          </div>
          <div class="cover-total">
            <span>Inversión total</span>
            <strong>${escapeHtml(formatMxn(snapshot.totals.totalMxn))}</strong>
            <small>IVA incluido</small>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildItem(item: QuoteBlindsPdfItem) {
  const productTitle = [item.brand, item.model].filter(Boolean).join(" ");

  return `
    <article class="item-card">
      <div class="item-heading">
        <div>
          <h3>${escapeHtml(productTitle || item.blindType || "Persiana")}</h3>
          <p>${escapeHtml(item.blindType)} · ${escapeHtml(item.collection)} · ${escapeHtml(item.color)}</p>
        </div>
        <div class="item-amount">
          <span>Importe</span>
          <strong>${escapeHtml(formatMxn(item.lineTotalMxn))}</strong>
        </div>
      </div>

      <div class="item-specs">
        <div>
          <span>Medida</span>
          <strong>${escapeHtml(formatNumber(item.widthCm))} × ${escapeHtml(
            formatNumber(item.heightCm)
          )} cm</strong>
        </div>
        <div>
          <span>Cantidad</span>
          <strong>${escapeHtml(formatNumber(item.quantity, 0))} pzas.</strong>
        </div>
        <div>
          <span>Superficie</span>
          <strong>${escapeHtml(formatNumber(item.billableM2, 4))} m²</strong>
        </div>
        <div>
          <span>m² unitario</span>
          <strong>${escapeHtml(formatNumber(item.unitM2, 4))} m²</strong>
        </div>
      </div>

      <div class="item-finish">
        <span><b>Mecanismo</b>${escapeHtml(item.mechanism)}</span>
        <span><b>Control</b>${escapeHtml(item.control)}</span>
        ${
          item.hasReferenceImage
            ? "<span><b>Referencia</b>Imagen disponible en expediente</span>"
            : ""
        }
      </div>

      ${
        item.customerVisibleNote
          ? `<p class="customer-note"><b>Nota:</b> ${escapeHtml(
              item.customerVisibleNote
            ).replaceAll("\n", "<br />")}</p>`
          : ""
      }
    </article>
  `;
}

function buildAreas(snapshot: QuoteBlindsPdfSnapshot) {
  return groupItemsByArea(snapshot.items)
    .map(([area, items], index) => {
      const pieces = items.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      );
      const subtotal = items.reduce(
        (total, item) => total + Number(item.lineTotalMxn || 0),
        0
      );

      return `
        <section class="area-group">
          <header class="area-heading">
            <div>
              <span>Área ${String(index + 1).padStart(2, "0")}</span>
              <h2>${escapeHtml(area)}</h2>
            </div>
            <div>
              <strong>${escapeHtml(formatNumber(pieces, 0))} piezas</strong>
              <span>${escapeHtml(formatMxn(subtotal))}</span>
            </div>
          </header>
          <div class="area-items">
            ${items.map(buildItem).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function buildTerms(snapshot: QuoteBlindsPdfSnapshot) {
  const paymentLine = snapshot.terms.payment100Advance
    ? "Condición de pago registrada: 100% de anticipo."
    : snapshot.terms.payment100Equipment
      ? "Condición de pago registrada: 100% de anticipo para suministro."
      : "Condiciones de pago conforme a la propuesta comercial autorizada.";
  const locationLine = snapshot.terms.isLocalGuadalajara
    ? "Precio L.A.B. en la ubicación de la obra en Guadalajara, Jalisco."
    : snapshot.terms.includesTravelExpenses
      ? "La propuesta considera los viáticos registrados para el proyecto."
      : "Viáticos y traslados adicionales no están incluidos salvo indicación expresa.";

  return `
    <section class="terms">
      <h2>Condiciones comerciales</h2>
      <ol>
        <li>${escapeHtml(paymentLine)}</li>
        <li>Todos los importes están expresados en Pesos Mexicanos (MXN).</li>
        <li>Los importes incluyen IVA del 16%, desglosado en el resumen financiero.</li>
        <li>Vigencia de la propuesta: ${escapeHtml(snapshot.quote.validityText)}.</li>
        <li>${escapeHtml(locationLine)}</li>
      </ol>
    </section>
  `;
}

function buildFinancialSummary(snapshot: QuoteBlindsPdfSnapshot) {
  return `
    <section class="closing-grid">
      <div class="closing-metrics">
        <div>
          <span>Total de piezas</span>
          <strong>${escapeHtml(formatNumber(snapshot.totals.pieces, 0))}</strong>
        </div>
        <div>
          <span>Total m²</span>
          <strong>${escapeHtml(formatNumber(snapshot.totals.billableM2, 4))} m²</strong>
        </div>
      </div>
      <div class="financial-summary">
        <div><span>Subtotal</span><strong>${escapeHtml(
          formatMxn(snapshot.totals.subtotalMxn)
        )}</strong></div>
        <div><span>IVA 16%</span><strong>${escapeHtml(
          formatMxn(snapshot.totals.ivaMxn)
        )}</strong></div>
        <div class="is-total"><span>Total</span><strong>${escapeHtml(
          formatMxn(snapshot.totals.totalMxn)
        )}</strong></div>
      </div>
    </section>
  `;
}

export function buildQuoteBlindsPdfHtml(snapshot: QuoteBlindsPdfSnapshot) {
  const folio =
    snapshot.quote.quoteNumber || `Cotización #${snapshot.quote.id}`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(folio)} - Persianas</title>
    <style>
      @page { size: letter; margin: 14mm 15mm 16mm; }
      * { box-sizing: border-box; }
      html { color-scheme: light; }
      body {
        margin: 0;
        color: #15171c;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        line-height: 1.42;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      h1, h2, h3, p { margin: 0; }
      .page { min-height: calc(279.4mm - 30mm); page-break-after: always; }
      .cover {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 6mm 0 4mm;
      }
      .cover-header,
      .item-heading,
      .area-heading,
      .closing-grid,
      .financial-summary > div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
      .cover-header { align-items: flex-start; }
      .cover-logo {
        display: block;
        width: 82px;
        height: 82px;
        object-fit: contain;
      }
      .cover-kicker,
      .cover-hero > span,
      .area-heading > div:first-child > span {
        color: #8c2030;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .15em;
        text-transform: uppercase;
      }
      .cover-kicker { margin-top: 9px; }
      .cover-folio { min-width: 160px; text-align: right; }
      .cover-folio span,
      .cover-context span,
      .cover-summary span,
      .item-amount span,
      .item-specs span,
      .closing-metrics span {
        display: block;
        color: #73767d;
        font-size: 8.5px;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .cover-folio strong {
        display: block;
        margin-top: 5px;
        font-size: 13px;
      }
      .cover-hero { max-width: 540px; margin-top: 36mm; }
      .cover-hero h1 {
        max-width: 520px;
        margin-top: 10px;
        font-size: 36px;
        line-height: 1.04;
        letter-spacing: -.035em;
      }
      .cover-hero p {
        max-width: 430px;
        margin-top: 14px;
        color: #666a72;
        font-size: 12px;
      }
      .cover-context {
        display: grid;
        grid-template-columns: 1.2fr 1.2fr .8fr;
        gap: 18px;
        padding: 18px 0;
        border-top: 1px solid #d8d4cd;
      }
      .cover-context strong { display: block; margin-top: 5px; font-size: 12px; }
      .cover-context small { display: block; margin-top: 4px; color: #777a81; }
      .cover-summary {
        display: grid;
        grid-template-columns: .55fr .75fr 1.2fr;
        gap: 1px;
        background: #dedad4;
        border: 1px solid #dedad4;
      }
      .cover-summary > div { min-height: 88px; padding: 17px; background: #f7f5f1; }
      .cover-summary strong { display: block; margin-top: 8px; font-size: 24px; }
      .cover-summary .cover-total { color: #ffffff; background: #8c2030; }
      .cover-summary .cover-total span,
      .cover-summary .cover-total small { color: rgba(255,255,255,.72); }
      .cover-summary .cover-total small { display: block; margin-top: 5px; }
      .document-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        padding-bottom: 13px;
        border-bottom: 1px solid #d8d4cd;
      }
      .document-header h1 { margin-top: 3px; font-size: 23px; letter-spacing: -.025em; }
      .document-header p { color: #73767d; }
      .document-header-meta { text-align: right; }
      .document-header-meta strong { display: block; font-size: 12px; }
      .document-header-meta span { display: block; margin-top: 3px; color: #73767d; }
      .content-intro {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 18px;
        margin: 18px 0 20px;
        padding: 14px 16px;
        background: #f7f5f1;
      }
      .content-intro p { color: #5e626a; }
      .content-intro strong { white-space: nowrap; color: #8c2030; }
      .area-group {
        margin-top: 22px;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .area-heading {
        align-items: flex-end;
        padding-bottom: 9px;
        border-bottom: 2px solid #15171c;
        break-after: avoid;
        page-break-after: avoid;
      }
      .area-heading h2 { margin-top: 4px; font-size: 19px; letter-spacing: -.02em; }
      .area-heading > div:last-child { text-align: right; }
      .area-heading > div:last-child strong { display: block; font-size: 11px; }
      .area-heading > div:last-child span { display: block; margin-top: 3px; color: #73767d; }
      .area-items { border-bottom: 1px solid #d8d4cd; }
      .item-card {
        padding: 13px 0 14px;
        border-bottom: 1px solid #e4e1dc;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .item-card:last-child { border-bottom: 0; }
      .item-heading { align-items: flex-start; }
      .item-heading h3 { font-size: 13px; }
      .item-heading p { margin-top: 3px; color: #666a72; }
      .item-amount { min-width: 105px; text-align: right; }
      .item-amount strong { display: block; margin-top: 4px; color: #8c2030; font-size: 13px; }
      .item-specs {
        display: grid;
        grid-template-columns: 1.1fr .65fr .85fr .85fr;
        gap: 12px;
        margin-top: 11px;
        padding: 9px 11px;
        background: #f7f5f1;
      }
      .item-specs strong { display: block; margin-top: 3px; font-size: 10.5px; }
      .item-finish {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 24px;
        margin-top: 9px;
        color: #5e626a;
        font-size: 9.5px;
      }
      .item-finish b { margin-right: 5px; color: #24262b; }
      .customer-note {
        margin-top: 9px;
        padding-left: 9px;
        border-left: 2px solid #8c2030;
        color: #4f535a;
      }
      .closing-grid {
        align-items: stretch;
        margin-top: 24px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .closing-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        flex: 1;
        gap: 1px;
        background: #dedad4;
        border: 1px solid #dedad4;
      }
      .closing-metrics > div { padding: 13px; background: #f7f5f1; }
      .closing-metrics strong { display: block; margin-top: 5px; font-size: 18px; }
      .financial-summary { width: 255px; border-top: 1px solid #d8d4cd; }
      .financial-summary > div { padding: 8px 0; border-bottom: 1px solid #d8d4cd; }
      .financial-summary .is-total {
        padding: 12px 13px;
        color: #ffffff;
        background: #8c2030;
        border: 0;
        font-size: 14px;
      }
      .terms {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #d8d4cd;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .terms h2 { font-size: 14px; }
      .terms ol { margin: 9px 0 0; padding-left: 18px; color: #5e626a; }
      .terms li { margin: 4px 0; padding-left: 4px; }
    </style>
  </head>
  <body>
    ${buildCover(snapshot)}
    <main>
      <header class="document-header">
        <div>
          <p>Cotización de Persianas</p>
          <h1>Detalle por área</h1>
        </div>
        <div class="document-header-meta">
          <strong>${escapeHtml(folio)}</strong>
          <span>${escapeHtml(getClientDisplay(snapshot))}</span>
        </div>
      </header>
      <section class="content-intro">
        <p>Especificaciones comerciales organizadas por ubicación para facilitar la revisión de medidas, acabados y controles.</p>
        <strong>${escapeHtml(formatNumber(snapshot.totals.pieces, 0))} piezas · ${escapeHtml(
          formatNumber(snapshot.totals.billableM2, 4)
        )} m²</strong>
      </section>
      ${buildAreas(snapshot)}
      ${buildFinancialSummary(snapshot)}
      ${buildTerms(snapshot)}
    </main>
  </body>
</html>`;
}
