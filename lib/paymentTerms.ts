export const paymentMethodOptions = [
  {
    code: "PUE",
    name: "Pago en una sola exhibicion",
  },
  {
    code: "PPD",
    name: "Pago en parcialidades o diferido",
  },
] as const;

export type PaymentMethodCode = (typeof paymentMethodOptions)[number]["code"];

export type PaymentFormCatalogItem = {
  code: string;
  name: string;
  is_active: boolean;
};

export const commonPaymentFormCodes = ["03", "04", "28", "01", "02"] as const;

export const fallbackPaymentForms: PaymentFormCatalogItem[] = [
  { code: "01", name: "Efectivo", is_active: true },
  { code: "02", name: "Cheque nominativo", is_active: true },
  { code: "03", name: "Transferencia electronica de fondos", is_active: true },
  { code: "04", name: "Tarjeta de credito", is_active: true },
  { code: "05", name: "Monedero electronico", is_active: true },
  { code: "06", name: "Dinero electronico", is_active: true },
  { code: "08", name: "Vales de despensa", is_active: true },
  { code: "12", name: "Dacion en pago", is_active: true },
  { code: "13", name: "Pago por subrogacion", is_active: true },
  { code: "14", name: "Pago por consignacion", is_active: true },
  { code: "15", name: "Condonacion", is_active: true },
  { code: "17", name: "Compensacion", is_active: true },
  { code: "23", name: "Novacion", is_active: true },
  { code: "24", name: "Confusion", is_active: true },
  { code: "25", name: "Remision de deuda", is_active: true },
  { code: "26", name: "Prescripcion o caducidad", is_active: true },
  { code: "27", name: "A satisfaccion del acreedor", is_active: true },
  { code: "28", name: "Tarjeta de debito", is_active: true },
  { code: "29", name: "Tarjeta de servicios", is_active: true },
  { code: "30", name: "Aplicacion de anticipos", is_active: true },
  { code: "31", name: "Intermediario pagos", is_active: true },
  { code: "99", name: "Por definir", is_active: true },
];

export function isPaymentMethodCode(value: string | null | undefined): value is PaymentMethodCode {
  return value === "PUE" || value === "PPD";
}

export function getPaymentMethodLabel(value: string | null | undefined) {
  const option = paymentMethodOptions.find((item) => item.code === value);
  return option ? `${option.code} - ${option.name}` : "Metodo pendiente";
}

export function getPaymentFormLabel(
  code: string | null | undefined,
  name?: string | null
) {
  if (!code) return "Forma pendiente";
  return `${code}${name ? ` - ${name}` : ""}`;
}

export function getPaymentComplementStatus(
  paymentMethodCode: string | null | undefined
) {
  return paymentMethodCode === "PPD"
    ? {
        requiresPaymentComplement: true,
        paymentComplementStatus: "pending",
      }
    : {
        requiresPaymentComplement: false,
        paymentComplementStatus: "not_required",
      };
}

export function sortPaymentForms(items: PaymentFormCatalogItem[]) {
  const priority = new Map<string, number>(
    commonPaymentFormCodes.map((code, index) => [code, index])
  );

  return [...items].sort((a, b) => {
    const aPriority = priority.get(a.code) ?? 999;
    const bPriority = priority.get(b.code) ?? 999;

    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.code.localeCompare(b.code);
  });
}
