import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterProjectsForReceiver,
  getBilledPartnerIdForInvoice,
  getProjectPartnerSuggestion,
  isReceiverOverride,
  planProjectPartnerBackfill,
  resolveInvoiceReceiver,
  validateBilledPartnerForStamp,
  type ProjectPartnerBilling,
  type ProjectPartnerBillingMap,
} from "../lib/partnerBilling";
import {
  buildFacturamaPaymentComplementPayload,
  calculatePaymentComplement,
  getComplementReceiverClient,
} from "../lib/paymentComplements";
import type { FiscalClientData } from "../lib/fiscalData";

// Datos reales de los receptores (confirmados en la base 2026-11-04).
const ali: FiscalClientData = {
  id: 48,
  name: "Ali Nuño",
  tax_rfc: "NUME850524582",
  tax_business_name: "ESTIVALIS ALI DAI NUÑO MARTINEZ",
  fiscal_regime: "612",
  cfdi_use: "G03",
  tax_zip_code: "45580",
  billing_email: "facturas@example.com",
};

const noworange: FiscalClientData = {
  id: 500,
  name: "NOWORANGE",
  tax_rfc: "NOW1709201SA",
  tax_business_name: "NOWORANGE",
  fiscal_regime: "601",
  cfdi_use: "G03",
  tax_zip_code: "45080",
  billing_email: "facturas@example.com",
};

const hqe = {
  id: 1,
  commercial_name: "HQE",
  bill_to_partner: true,
  default_billing_client_id: 48,
};

const kybit = {
  id: 2,
  commercial_name: "Kybit",
  bill_to_partner: true,
  default_billing_client_id: 500,
};

// 69 Independencia 80: cliente final Ulises (54), vendido via HQE.
const independencia: ProjectPartnerBilling = {
  projectId: 69,
  finalClientId: 54,
  finalClientName: "Ulises",
  partner: hqe,
  billingClient: ali,
};

// 85 Immmex Tlaquepaque: cliente final Immmex (57), vendido via Kybit.
const immmexTlaquepaque: ProjectPartnerBilling = {
  projectId: 85,
  finalClientId: 57,
  finalClientName: "Immmex",
  partner: kybit,
  billingClient: noworange,
};

const billingMap: ProjectPartnerBillingMap = { 69: independencia, 85: immmexTlaquepaque };

const projects = [
  { id: 69, client_id: 54, name: "Independencia 80" },
  { id: 85, client_id: 57, name: "Immmex Tlaquepaque" },
  { id: 62, client_id: 48, name: "Syscom 040826" },
  { id: 10, client_id: 7, name: "Venta directa" },
];

test("proyecto con aliado preselecciona al receptor del aliado", () => {
  const resolution = resolveInvoiceReceiver({ projectClientId: 54, billing: independencia });

  assert.equal(resolution.kind, "partner");
  assert.equal(resolution.receiverClientId, 48);
  assert.equal(resolution.partnerId, 1);
  if (resolution.kind !== "partner") return;
  assert.equal(
    resolution.notice,
    "Proyecto vendido vía aliado HQE: se factura a ESTIVALIS ALI DAI NUÑO MARTINEZ (NUME850524582). Cliente final: Ulises"
  );
  assert.equal(getBilledPartnerIdForInvoice(independencia, 48), 1);

  const kybitResolution = resolveInvoiceReceiver({
    projectClientId: 57,
    billing: immmexTlaquepaque,
  });
  assert.equal(kybitResolution.receiverClientId, 500);
});

test("proyecto sin aliado conserva el comportamiento actual (cliente del proyecto)", () => {
  const resolution = resolveInvoiceReceiver({ projectClientId: 7, billing: undefined });

  assert.deepEqual(resolution, { kind: "client", receiverClientId: 7, partnerId: null });
  assert.equal(getBilledPartnerIdForInvoice(undefined, 7), null);
  assert.equal(isReceiverOverride(resolution, 7), false);
  // El filtro por cliente sigue igual para ventas directas.
  assert.deepEqual(
    filterProjectsForReceiver(projects, 7, billingMap).map((project) => project.id),
    [10]
  );
});

test("aliado con bill_to_partner=false factura al cliente final", () => {
  const resolution = resolveInvoiceReceiver({
    projectClientId: 54,
    billing: { ...independencia, partner: { ...hqe, bill_to_partner: false } },
  });
  assert.equal(resolution.kind, "client");
  assert.equal(resolution.receiverClientId, 54);
});

test("si el receptor se cambia a mano se respeta y no se marca como facturado al aliado", () => {
  const resolution = resolveInvoiceReceiver({ projectClientId: 54, billing: independencia });

  // El usuario confirma y factura al cliente final (Ulises, 54).
  assert.equal(isReceiverOverride(resolution, 54), true);
  assert.equal(getBilledPartnerIdForInvoice(independencia, 54), null);
  // El proyecto sigue disponible para el cliente final elegido.
  assert.ok(filterProjectsForReceiver(projects, 54, billingMap).some((p) => p.id === 69));
  // Y el timbrado no lo bloquea: sin billed_partner_id no hay nada que validar.
  assert.equal(
    validateBilledPartnerForStamp({ billedPartnerId: null, invoiceClientId: 54, partner: hqe }),
    null
  );
});

test("si el receptor es el aliado, el filtro muestra tambien los proyectos del aliado", () => {
  assert.deepEqual(
    filterProjectsForReceiver(projects, 48, billingMap).map((project) => project.id),
    [69, 62]
  );
  assert.deepEqual(
    filterProjectsForReceiver(projects, 500, billingMap).map((project) => project.id),
    [85]
  );
});

test("aliado con datos fiscales incompletos muestra un error claro", () => {
  const incomplete = resolveInvoiceReceiver({
    projectClientId: 54,
    billing: { ...independencia, billingClient: { ...ali, tax_rfc: "", tax_zip_code: null } },
  });
  assert.equal(incomplete.kind, "partner_incomplete");
  if (incomplete.kind !== "partner_incomplete") return;
  assert.equal(incomplete.receiverClientId, 48);
  assert.match(incomplete.error, /receptor fiscal del aliado HQE tiene datos incompletos/);
  assert.match(incomplete.error, /RFC/);
  assert.match(incomplete.error, /Codigo postal fiscal/);

  const withoutReceiver = resolveInvoiceReceiver({
    projectClientId: 54,
    billing: {
      ...independencia,
      partner: { ...hqe, default_billing_client_id: null },
      billingClient: null,
    },
  });
  assert.equal(withoutReceiver.kind, "partner_incomplete");
  assert.equal(withoutReceiver.receiverClientId, null);
  if (withoutReceiver.kind !== "partner_incomplete") return;
  assert.match(withoutReceiver.error, /no tiene cliente receptor fiscal configurado/);
});

test("timbrado: billed_partner_id debe coincidir con el receptor actual del aliado", () => {
  assert.equal(
    validateBilledPartnerForStamp({ billedPartnerId: 1, invoiceClientId: 48, partner: hqe }),
    null
  );
  assert.match(
    validateBilledPartnerForStamp({ billedPartnerId: 1, invoiceClientId: 54, partner: hqe }) || "",
    /no es el receptor fiscal del aliado/
  );
  assert.match(
    validateBilledPartnerForStamp({ billedPartnerId: 9, invoiceClientId: 48, partner: null }) || "",
    /no existe/
  );
});

test("el complemento hereda el receptor de la factura aunque el proyecto cambie de aliado", () => {
  // Factura PPD timbrada a Ali (HQE). Despues el proyecto se reasigna a Kybit.
  const invoice = {
    id: 900,
    internal_folio: "FAC-0900",
    client_id: 48,
    sat_uuid: "11111111-2222-3333-4444-555555555555",
    payment_method_code: "PPD",
    total_mxn: 10_000,
    total: 10_000,
    clients: ali,
  };
  const projectNow = { id: 69, client_id: 54, commercial_partner_id: kybit.id };
  assert.equal(projectNow.commercial_partner_id, 2);

  const receiver = getComplementReceiverClient(invoice);
  assert.equal(receiver?.id, 48);

  const payload = buildFacturamaPaymentComplementPayload({
    invoice,
    client: receiver!,
    paymentDate: "2026-11-04",
    paymentFormCode: "03",
    calculation: calculatePaymentComplement({
      invoiceTotalMxn: 10_000,
      existingComplements: [],
      paidAmountMxn: 5_000,
    }),
    env: "production",
  });
  assert.equal(payload.Receiver.Rfc, "NUME850524582");
  assert.equal(payload.Receiver.Name, "ESTIVALIS ALI DAI NUÑO MARTINEZ");
  assert.equal(payload.Receiver.FiscalRegime, "612");
  assert.equal(payload.Receiver.TaxZipCode, "45580");

  // Relacion que no corresponde al client_id de la factura -> se rechaza.
  assert.equal(getComplementReceiverClient({ ...invoice, clients: noworange }), null);
});

test("backfill: toma el aliado de la cotizacion vigente y reporta conflictos", () => {
  const plan = planProjectPartnerBackfill(
    [
      // 69: HQE en la vigente.
      { client_project_id: 69, commercial_partner_id: 1, is_latest: true },
      { client_project_id: 69, commercial_partner_id: 1, is_latest: false },
      // 74 Jetoureast Vallarta: HQE en una version vieja, Kybit en la vigente.
      { client_project_id: 74, commercial_partner_id: 1, is_latest: false },
      { client_project_id: 74, commercial_partner_id: 2, is_latest: true },
      // 85: Kybit.
      { client_project_id: 85, commercial_partner_id: 2, is_latest: true },
      // 62: sin aliado en ninguna cotizacion -> no aparece.
      { client_project_id: 62, commercial_partner_id: null, is_latest: true },
      // 33: aliado solo en version vieja.
      { client_project_id: 33, commercial_partner_id: 1, is_latest: false },
      { client_project_id: 33, commercial_partner_id: null, is_latest: true },
      // 48: ya tiene aliado asignado.
      { client_project_id: 48, commercial_partner_id: 2, is_latest: true },
    ],
    { 48: 2 }
  );

  const byProject = Object.fromEntries(plan.map((row) => [row.projectId, row]));
  assert.equal(byProject[69].decision, "ASIGNAR");
  assert.equal(byProject[69].partnerId, 1);
  assert.equal(byProject[85].partnerId, 2);
  assert.equal(byProject[74].decision, "CONFLICTO");
  assert.equal(byProject[74].partnerId, null);
  assert.deepEqual(byProject[74].allPartners, [1, 2]);
  assert.equal(byProject[33].decision, "SOLO_VERSIONES_VIEJAS");
  assert.equal(byProject[33].partnerId, null);
  assert.equal(byProject[48].decision, "YA_TIENE_ALIADO");
  assert.equal(byProject[62], undefined);
});

test("heredar aliado de la cotizacion solo propone cuando cambia algo", () => {
  assert.deepEqual(getProjectPartnerSuggestion(null, 1), { partnerId: 1, replacesPartnerId: null });
  assert.deepEqual(getProjectPartnerSuggestion(2, 1), { partnerId: 1, replacesPartnerId: 2 });
  assert.equal(getProjectPartnerSuggestion(1, 1), null);
  assert.equal(getProjectPartnerSuggestion(1, null), null);
});
