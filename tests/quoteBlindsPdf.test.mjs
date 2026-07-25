import assert from "node:assert/strict";
import test from "node:test";
import { buildQuoteBlindsPdfHtml } from "../lib/quoteBlindsPdfHtml.ts";

const forbiddenInternalNote = "INTERNAL-NOTE-MUST-NOT-LEAK";
const forbiddenOverrideReason = "OVERRIDE-REASON-MUST-NOT-LEAK";
const forbiddenStoragePath = "quote-blinds/88/private-reference.webp";

const baseItem = {
  brand: "Hunter Douglas",
  blindType: "Enrollables",
  collection: "Screen",
  color: "Marfil",
  mechanism: "Motorizado",
  control: "Control remoto",
  widthCm: 120,
  heightCm: 200,
  quantity: 1,
  unitM2: 2.4,
  billableM2: 2.4,
  lineTotalMxn: 2400,
  customerVisibleNote: "Acabado visible aprobado por cliente.",
  hasReferenceImage: false,
};

const snapshot = {
  logoDataUrl: "data:image/png;base64,AA==",
  quote: {
    id: 88,
    quoteNumber: "ALFA-0088-V1",
    createdAt: "2026-07-24T12:00:00.000Z",
    currency: "MXN",
    validityText: "15 días naturales",
  },
  client: {
    name: "Cliente de prueba",
    companyName: "ALFA Sandbox Client",
  },
  project: {
    name: "Residencia Sprint 4A",
  },
  totals: {
    pieces: 6,
    billableM2: 11.8,
    subtotalMxn: 11800,
    ivaMxn: 1888,
    totalMxn: 13688,
  },
  terms: {
    payment100Equipment: true,
    payment100Advance: false,
    isLocalGuadalajara: true,
    includesTravelExpenses: false,
  },
  items: [
    {
      ...baseItem,
      id: 1,
      area: "Sala",
      model: "Designer Roller",
      internal_notes: forbiddenInternalNote,
      override_reason: forbiddenOverrideReason,
      reference_image_path: forbiddenStoragePath,
    },
    {
      ...baseItem,
      id: 2,
      area: "Sala",
      model: "Silhouette",
      quantity: 2,
      lineTotalMxn: 3200,
      mechanism: "Manual",
      control: "Cadena metálica",
    },
    {
      ...baseItem,
      id: 3,
      area: "Recámara principal",
      model: "Duette",
      lineTotalMxn: 2800,
      blindType: "Celular",
      collection: "Applause",
    },
    {
      ...baseItem,
      id: 4,
      area: "Recámara principal",
      model: "Pirouette",
      quantity: 2,
      lineTotalMxn: 3400,
      hasReferenceImage: true,
    },
  ],
};

test("renderiza PDF comercial por áreas con datos visibles", () => {
  const html = buildQuoteBlindsPdfHtml(snapshot);

  assert.match(html, /ALFA-0088-V1/);
  assert.match(html, /ALFA Sandbox Client/);
  assert.match(html, /Residencia Sprint 4A/);
  assert.match(html, /Sala/);
  assert.match(html, /Recámara principal/);
  assert.match(html, /Designer Roller/);
  assert.match(html, /Duette/);
  assert.match(html, /Acabado visible aprobado por cliente/);
  assert.match(html, /13[,.]688/);
  assert.match(html, /6 piezas/);
  assert.match(html, /11[,.]8/);
});

test("excluye campos internos y paths privados del documento", () => {
  const html = buildQuoteBlindsPdfHtml(snapshot);

  assert.doesNotMatch(html, new RegExp(forbiddenInternalNote));
  assert.doesNotMatch(html, new RegExp(forbiddenOverrideReason));
  assert.doesNotMatch(html, new RegExp(forbiddenStoragePath));
  assert.doesNotMatch(html, /internal_notes/);
  assert.doesNotMatch(html, /override_reason/);
  assert.match(html, /Imagen disponible en expediente/);
});

test("escapa contenido comercial antes de insertarlo en HTML", () => {
  const html = buildQuoteBlindsPdfHtml({
    ...snapshot,
    items: [
      {
        ...snapshot.items[0],
        model: "<script>alert('x')</script>",
        customerVisibleNote: "<b>nota</b>",
      },
    ],
  });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;b&gt;nota&lt;\/b&gt;/);
});
