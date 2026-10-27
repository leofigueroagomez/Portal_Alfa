// Datos bancarios oficiales de ALFA para cobros por transferencia (SPEI).
// Viven SOLO en variables de entorno: ALFA_BANK_CLABE (18 digitos con digito
// verificador valido) y ALFA_BANK_BENEFICIARY son obligatorias; ALFA_BANK_NAME,
// ALFA_BANK_ACCOUNT y ALFA_COMPANY_RFC son opcionales. Si faltan o son invalidas
// fallamos cerrado: nunca se imprime una CLABE de ejemplo a un cliente real.

export const ALFA_BANK_DETAILS_CONTACT_EMAIL = "direccion@alfait.com.mx";

export const BANK_DETAILS_UNAVAILABLE_MESSAGE =
  `Solicita los datos bancarios oficiales para transferencia a ${ALFA_BANK_DETAILS_CONTACT_EMAIL}.`;

export type BankAccountInfo = {
  /** true solo si la CLABE es valida y hay beneficiario configurado. */
  configured: boolean;
  bankName: string;
  beneficiary: string;
  clabe: string;
  accountNumber?: string;
  rfc?: string;
  notes?: string;
};

const CLABE_WEIGHTS = [3, 7, 1];

/** Valida formato (18 digitos) y digito verificador de una CLABE (pesos 3,7,1). */
export function isValidClabe(value: string | null | undefined): boolean {
  const clabe = (value || "").trim();
  if (!/^\d{18}$/.test(clabe)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 17; index += 1) {
    sum += (Number(clabe[index]) * CLABE_WEIGHTS[index % 3]) % 10;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(clabe[17]);
}

type BankEnv = Record<string, string | undefined>;

/**
 * Devuelve siempre un objeto (compatibilidad con consumidores que leen
 * `bankName`/`beneficiary`/`clabe` directo). Cuando no esta configurado,
 * `configured` es false, `clabe` va vacia y los textos visibles apuntan a
 * solicitar los datos por correo; los consumidores deben revisar `configured`.
 */
export function getAlfaBankAccounts(env: BankEnv = process.env): BankAccountInfo {
  const clabe = (env.ALFA_BANK_CLABE || "").trim();
  const beneficiary = (env.ALFA_BANK_BENEFICIARY || "").trim();

  if (!isValidClabe(clabe) || !beneficiary) {
    if (clabe && !isValidClabe(clabe)) {
      console.error("ALFA_BANK_CLABE no es una CLABE valida; no se mostraran datos bancarios.");
    }

    return {
      configured: false,
      bankName: "Datos bancarios por confirmar",
      beneficiary: BANK_DETAILS_UNAVAILABLE_MESSAGE,
      clabe: "",
      notes: BANK_DETAILS_UNAVAILABLE_MESSAGE,
    };
  }

  const accountNumber = (env.ALFA_BANK_ACCOUNT || "").trim();
  const rfc = (env.ALFA_COMPANY_RFC || "").trim().toUpperCase();

  return {
    configured: true,
    bankName: (env.ALFA_BANK_NAME || "").trim(),
    beneficiary,
    clabe,
    accountNumber: /^\d{10,11}$/.test(accountNumber) ? accountNumber : undefined,
    rfc: rfc || undefined,
    notes: "Transferencia electrónica vía SPEI. Referencia: Indicar número de servicio.",
  };
}

export function formatBankTransferInstructions(input: {
  serviceNumber: string;
  totalMxn: number;
  clientName?: string;
  bank?: BankAccountInfo;
}) {
  const bank = input.bank ?? getAlfaBankAccounts();
  const formattedAmount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(input.totalMxn);

  if (!bank.configured) {
    return [
      "🏦 *Pago por Transferencia Electrónica (SPEI):*",
      `• *Monto a Liquidar:* ${formattedAmount} (+ IVA si requiere factura)`,
      `• *Concepto / Referencia:* ${input.serviceNumber}`,
      "",
      `Para recibir los datos bancarios oficiales, escríbenos a ${ALFA_BANK_DETAILS_CONTACT_EMAIL} indicando tu referencia.`,
    ].join("\n");
  }

  return [
    "🏦 *Datos Bancarios para Transferencia Electrónica (SPEI):*",
    bank.bankName ? `• *Banco:* ${bank.bankName}` : null,
    `• *Beneficiario:* ${bank.beneficiary}`,
    `• *CLABE Interbancaria:* ${bank.clabe}`,
    bank.accountNumber ? `• *Número de Cuenta:* ${bank.accountNumber}` : null,
    `• *Monto a Liquidar:* ${formattedAmount} (+ IVA si requiere factura)`,
    `• *Concepto / Referencia:* ${input.serviceNumber}`,
    "",
    "💳 *Comprobante de Pago:*",
    `Una vez realizada la transferencia, favor de enviar su comprobante por este medio o al correo ${ALFA_BANK_DETAILS_CONTACT_EMAIL} para registrar su pago y emitir su factura fiscal correspondiente.`,
  ]
    .filter(Boolean)
    .join("\n");
}
