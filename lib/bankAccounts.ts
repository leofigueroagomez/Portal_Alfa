export type BankAccountInfo = {
  bankName: string;
  beneficiary: string;
  clabe: string;
  accountNumber?: string;
  rfc?: string;
  branch?: string;
  notes?: string;
};

export function getAlfaBankAccounts(): BankAccountInfo {
  return {
    bankName: process.env.ALFA_BANK_NAME || "BBVA México",
    beneficiary: process.env.ALFA_BANK_BENEFICIARY || "ALFA IT SOLUCIONES S.A. DE C.V.",
    clabe: process.env.ALFA_BANK_CLABE || "012180015894123567",
    accountNumber: process.env.ALFA_BANK_ACCOUNT || "0158941235",
    rfc: process.env.ALFA_COMPANY_RFC || "AIT180612ABC",
    branch: "Sucursal Corporativa Monterrey / CDMX",
    notes: "Transferencia electrónica vía SPEI. Referencia: Indicar número de servicio.",
  };
}

export function formatBankTransferInstructions(input: {
  serviceNumber: string;
  totalMxn: number;
  clientName?: string;
}) {
  const bank = getAlfaBankAccounts();
  const formattedAmount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(input.totalMxn);

  return [
    "🏦 *Datos Bancarios para Transferencia Electrónica (SPEI):*",
    `• *Banco:* ${bank.bankName}`,
    `• *Beneficiario:* ${bank.beneficiary}`,
    `• *CLABE Interbancaria:* ${bank.clabe}`,
    bank.accountNumber ? `• *Número de Cuenta:* ${bank.accountNumber}` : null,
    `• *Monto a Liquidar:* ${formattedAmount} (+ IVA si requiere factura)`,
    `• *Concepto / Referencia:* ${input.serviceNumber}`,
    "",
    "💳 *Comprobante de Pago:*",
    "Una vez realizada la transferencia, favor de enviar su comprobante por este medio o al correo direccion@alfait.com.mx para registrar su pago y emitir su factura fiscal correspondiente.",
  ]
    .filter(Boolean)
    .join("\n");
}
