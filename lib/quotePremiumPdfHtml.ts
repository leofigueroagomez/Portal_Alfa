import "server-only";

import { formatCurrency, formatNumber } from "@/lib/format";
import type { QuotePdfSnapshot } from "@/lib/quotePdfSnapshot";

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

function buildTerms(snapshot: QuotePdfSnapshot) {
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

function buildItemImage(item: QuotePdfSnapshot["sections"][number]["items"][number]) {
  if (item.productImage.src) {
    return `<img class="item-image" src="${escapeHtml(item.productImage.src)}" alt="${escapeHtml(
      item.productImage.alt || item.productName || "Producto"
    )}" />`;
  }

  return `<div class="item-image-fallback">Sin img</div>`;
}

export function buildQuotePremiumPdfHtml(snapshot: QuotePdfSnapshot) {
  const title = snapshot.quote.quoteNumber || `Cotizacion #${snapshot.quote.id}`;
  const clientName =
    snapshot.client.companyName || snapshot.client.name || "Sin cliente";
  const projectName = snapshot.project.name || "Sin proyecto";

  const sectionsHtml = snapshot.sections
    .map((section) => {
      const rows = section.items
        .map((item) => {
          const description = [
            item.productBrand,
            item.productModel,
            item.productName,
          ]
            .filter(Boolean)
            .join(" ");

          const activities = item.laborActivities.length
            ? `<ul class="labor">${item.laborActivities
                .map(
                  (activity) =>
                    `<li>${escapeHtml(activity.name || "Actividad")} - ${number(
                      activity.quantity
                    )} ${escapeHtml(activity.unit || "")} / ${money(
                      activity.saleTotalMxn,
                      "MXN"
                    )}</li>`
                )
                .join("")}</ul>`
            : "";

          return `
            <tr>
              <td class="image-cell">${buildItemImage(item)}</td>
              <td>
                <strong>${escapeHtml(description || "Partida sin descripcion")}</strong>
                ${activities}
              </td>
              <td class="num">${number(item.quantity)}</td>
              <td class="num">${money(item.equipmentTotalUsd, "USD")}</td>
              <td class="num">${money(item.laborTotalMxn, "MXN")}</td>
              <td class="num">${money(item.lineTotalMxn, "MXN")}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <section class="section">
          <div class="section-head">
            <h2>${escapeHtml(section.name || "Sistema sin nombre")}</h2>
            <div>
              <span>${money(section.equipmentTotalUsd, "USD")}</span>
              <span>${money(section.laborTotalMxn, "MXN")}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="image-cell">Img</th>
                <th>Partida</th>
                <th class="num">Cant.</th>
                <th class="num">Equipo</th>
                <th class="num">MO</th>
                <th class="num">Total MXN</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: letter; margin: 16mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111318;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        line-height: 1.45;
      }
      header {
        display: flex;
        justify-content: space-between;
        gap: 32px;
        padding-bottom: 18px;
        border-bottom: 1px solid #d6d1c8;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 28px; line-height: 1.1; }
      h2 { font-size: 16px; }
      h3 { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #9e1b32; }
      .meta { text-align: right; color: #555963; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0; }
      .box { border: 1px solid #e1ddd5; padding: 14px; break-inside: avoid; }
      .box p { margin-top: 4px; }
      .totals { margin: 20px 0; border: 1px solid #d6d1c8; padding: 14px; break-inside: avoid; }
      .totals-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #efebe4; }
      .totals-row:last-child { border-bottom: 0; padding-top: 8px; font-size: 16px; font-weight: 700; }
      .section { margin-top: 18px; break-inside: avoid; }
      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 18px;
        padding-bottom: 8px;
        border-bottom: 1px solid #d6d1c8;
      }
      .section-head div { display: flex; gap: 14px; color: #555963; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
      th, td { padding: 7px 6px; border-bottom: 1px solid #efebe4; vertical-align: top; }
      th { text-align: left; background: #f7f5f1; color: #555963; font-size: 10px; }
      .image-cell { width: 52px; }
      .item-image,
      .item-image-fallback {
        display: block;
        width: 42px;
        height: 42px;
        border: 1px solid #e1ddd5;
        background: #f7f5f1;
      }
      .item-image {
        object-fit: contain;
      }
      .item-image-fallback {
        color: #8a8d94;
        font-size: 8px;
        line-height: 40px;
        text-align: center;
      }
      .num { text-align: right; white-space: nowrap; }
      .labor { margin: 4px 0 0 14px; padding: 0; color: #555963; font-size: 9px; }
      .notes, .terms { margin-top: 20px; padding-top: 12px; border-top: 1px solid #d6d1c8; }
      .terms ol { margin: 8px 0 0; padding-left: 18px; }
      .muted { color: #555963; }
      footer { margin-top: 24px; color: #8a8d94; font-size: 9px; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h3>Propuesta comercial V0</h3>
        <h1>${escapeHtml(title)}</h1>
        <p class="muted">${escapeHtml(snapshot.quote.status || "Sin estado")}</p>
      </div>
      <div class="meta">
        <p>Fecha: ${escapeHtml(formatDate(snapshot.quote.createdAt))}</p>
        <p>TC USD/MXN: ${number(snapshot.exchangeRate.value)}</p>
        <p>${escapeHtml(snapshot.exchangeRate.source || "manual")} ${escapeHtml(
          snapshot.exchangeRate.date || ""
        )}</p>
        <p>Vigencia: ${escapeHtml(snapshot.quote.validityText || "No especificada")}</p>
      </div>
    </header>

    <section class="grid">
      <div class="box">
        <h3>Cliente</h3>
        <p><strong>${escapeHtml(clientName)}</strong></p>
        <p>${escapeHtml(snapshot.client.name || "")}</p>
      </div>
      <div class="box">
        <h3>Proyecto</h3>
        <p><strong>${escapeHtml(projectName)}</strong></p>
      </div>
    </section>

    <section class="totals">
      <div class="totals-row"><span>Equipos</span><strong>${money(
        snapshot.totals.equipmentTotalUsd,
        "USD"
      )}</strong></div>
      <div class="totals-row"><span>Mano de obra</span><strong>${money(
        snapshot.totals.laborTotalMxn,
        "MXN"
      )}</strong></div>
      <div class="totals-row"><span>Subtotal</span><strong>${money(
        snapshot.totals.subtotalMxn,
        "MXN"
      )}</strong></div>
      ${
        snapshot.totals.partnerTotalDiscountMxn > 0
          ? `<div class="totals-row"><span>Descuento aliado</span><strong>-${money(
              snapshot.totals.partnerTotalDiscountMxn,
              "MXN"
            )}</strong></div>`
          : ""
      }
      ${
        snapshot.totals.discountMxn > 0
          ? `<div class="totals-row"><span>Descuento</span><strong>-${money(
              snapshot.totals.discountMxn,
              "MXN"
            )}</strong></div>`
          : ""
      }
      <div class="totals-row"><span>Base gravable</span><strong>${money(
        snapshot.totals.taxableBaseMxn,
        "MXN"
      )}</strong></div>
      <div class="totals-row"><span>IVA 16%</span><strong>${money(
        snapshot.totals.ivaMxn,
        "MXN"
      )}</strong></div>
      <div class="totals-row"><span>Total estimado</span><strong>${money(
        snapshot.totals.totalMxn,
        "MXN"
      )}</strong></div>
    </section>

    ${sectionsHtml}

    ${
      snapshot.quote.notes
        ? `<section class="notes"><h3>Notas</h3><p>${escapeHtml(
            snapshot.quote.notes
          ).replaceAll("\n", "<br />")}</p></section>`
        : ""
    }

    <section class="terms">
      <h3>Condiciones basicas</h3>
      <ol>${buildTerms(snapshot)}</ol>
    </section>

    <footer>
      PDF Premium V0 tecnico. El print actual permanece como fallback operativo.
    </footer>
  </body>
</html>`;
}
