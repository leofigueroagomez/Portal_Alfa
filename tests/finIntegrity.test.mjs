import assert from "node:assert/strict";
import test from "node:test";
import {
  ALFA_BANK_DETAILS_CONTACT_EMAIL,
  formatBankTransferInstructions,
  getAlfaBankAccounts,
  isValidClabe,
} from "../lib/bankAccounts.ts";
import { escapeHtml, safeHrefUrl } from "../lib/escapeHtml.ts";
import {
  checkStripeServicePayment,
  extractCheckoutSessionIdFromUrl,
  toStripeCents,
} from "../lib/finIntegrityStripe.ts";

// Ejemplo publico de Banxico (Banamex), digito verificador valido.
const VALID_CLABE = "002010077777777771";
// CLABE ficticia que existia como fallback hardcodeado.
const LEGACY_FAKE_CLABE = "012180015894123567";

test("CLABE: valida formato y digito verificador (pesos 3,7,1)", () => {
  assert.equal(isValidClabe(VALID_CLABE), true);
  assert.equal(isValidClabe(LEGACY_FAKE_CLABE), false);
  assert.equal(isValidClabe("00201007777777777"), false);
  assert.equal(isValidClabe("0020100777777777712"), false);
  assert.equal(isValidClabe("00201007777777777A"), false);
  assert.equal(isValidClabe("002010077777777772"), false);
  assert.equal(isValidClabe(""), false);
  assert.equal(isValidClabe(null), false);
});

test("sin variables de entorno no hay datos bancarios ficticios", () => {
  const bank = getAlfaBankAccounts({});
  assert.equal(bank.configured, false);
  assert.equal(bank.clabe, "");
  const serialized = JSON.stringify(bank);
  for (const fake of [LEGACY_FAKE_CLABE, "0158941235", "AIT180612ABC", "ALFA IT SOLUCIONES S.A. DE C.V."]) {
    assert.equal(serialized.includes(fake), false, `no debe incluir ${fake}`);
  }
});

test("CLABE invalida o sin beneficiario cuenta como no configurado", () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal(
      getAlfaBankAccounts({ ALFA_BANK_CLABE: LEGACY_FAKE_CLABE, ALFA_BANK_BENEFICIARY: "ALFA" }).configured,
      false
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(getAlfaBankAccounts({ ALFA_BANK_CLABE: VALID_CLABE }).configured, false);
});

test("configurado devuelve los datos del entorno", () => {
  const bank = getAlfaBankAccounts({
    ALFA_BANK_CLABE: ` ${VALID_CLABE} `,
    ALFA_BANK_BENEFICIARY: "Beneficiario Prueba",
    ALFA_BANK_NAME: "Banco Prueba",
    ALFA_BANK_ACCOUNT: "1234567890",
  });
  assert.equal(bank.configured, true);
  assert.equal(bank.clabe, VALID_CLABE);
  assert.equal(bank.beneficiary, "Beneficiario Prueba");
  assert.equal(bank.accountNumber, "1234567890");
});

test("instrucciones de transferencia sin configurar piden los datos por correo", () => {
  const text = formatBankTransferInstructions({
    serviceNumber: "SERV-0001",
    totalMxn: 1500,
    bank: getAlfaBankAccounts({}),
  });
  assert.ok(text.includes(ALFA_BANK_DETAILS_CONTACT_EMAIL));
  assert.ok(text.includes("SERV-0001"));
  assert.equal(text.includes("CLABE"), false);
  assert.equal(/\d{18}/.test(text), false);
});

test("instrucciones configuradas incluyen la CLABE real del entorno", () => {
  const text = formatBankTransferInstructions({
    serviceNumber: "SERV-0002",
    totalMxn: 100,
    bank: getAlfaBankAccounts({ ALFA_BANK_CLABE: VALID_CLABE, ALFA_BANK_BENEFICIARY: "Beneficiario" }),
  });
  assert.ok(text.includes(VALID_CLABE));
  assert.equal(text.includes("Banco:"), false);
});

test("escapeHtml neutraliza etiquetas, atributos y comillas", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('1')">&`),
    "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;"
  );
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml(42), "42");
});

test("safeHrefUrl solo acepta http(s) y escapa para atributo", () => {
  assert.equal(safeHrefUrl("javascript:alert(1)"), "");
  assert.equal(safeHrefUrl("data:text/html,<b>x</b>"), "");
  assert.equal(safeHrefUrl("no es url"), "");
  assert.equal(safeHrefUrl(null), "");
  assert.equal(
    safeHrefUrl(`https://checkout.stripe.com/c/pay/cs_test_a1?x="><script>`),
    "https://checkout.stripe.com/c/pay/cs_test_a1?x=%22%3E%3Cscript%3E"
  );
  assert.equal(safeHrefUrl("https://a.com/?a=1&b=2"), "https://a.com/?a=1&amp;b=2");
});

test("extrae el id de la Checkout Session desde payment_link_url", () => {
  assert.equal(
    extractCheckoutSessionIdFromUrl("https://checkout.stripe.com/c/pay/cs_live_a1B2c3#fidkdWxOYHwnPyd1"),
    "cs_live_a1B2c3"
  );
  assert.equal(extractCheckoutSessionIdFromUrl("https://checkout.stripe.com/c/pay/cs_test_Zz9"), "cs_test_Zz9");
  assert.equal(extractCheckoutSessionIdFromUrl("https://buy.stripe.com/abc"), null);
  assert.equal(extractCheckoutSessionIdFromUrl(null), null);
});

test("toStripeCents redondea como la creacion de la sesion", () => {
  assert.equal(toStripeCents(1160), 116000);
  assert.equal(toStripeCents(0.1 + 0.2), 30);
  assert.equal(toStripeCents(null), 0);
});

test("conciliacion Stripe: importe, moneda y sesion", () => {
  const base = {
    paidObjectId: "cs_test_1",
    amountCents: 116000,
    currency: "mxn",
    expectedAmountsMxn: [1000, 1160],
    storedObjectId: "cs_test_1",
  };

  assert.deepEqual(checkStripeServicePayment(base), { ok: true, amountCents: 116000 });
  assert.equal(checkStripeServicePayment({ ...base, amountCents: 100000 }).ok, true);
  assert.equal(checkStripeServicePayment({ ...base, storedObjectId: null }).ok, true);

  assert.equal(checkStripeServicePayment({ ...base, amountCents: 50000 }).ok, false);
  assert.equal(checkStripeServicePayment({ ...base, currency: "usd" }).ok, false);
  assert.equal(checkStripeServicePayment({ ...base, currency: null }).ok, false);
  assert.equal(checkStripeServicePayment({ ...base, storedObjectId: "cs_test_2" }).ok, false);
  assert.equal(checkStripeServicePayment({ ...base, amountCents: 0 }).ok, false);
  assert.equal(checkStripeServicePayment({ ...base, amountCents: null }).ok, false);
  assert.equal(checkStripeServicePayment({ ...base, expectedAmountsMxn: [0, null] }).ok, false);
});
