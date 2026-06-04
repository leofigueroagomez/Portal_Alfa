import { getFiscalRegimeCode, type FiscalClientData } from "@/lib/fiscalData";
import { getFacturamaSandboxReceiver } from "@/lib/facturama";
import type { ProjectInvoice } from "@/lib/invoices";

export type PaymentComplementsEnv = "sandbox" | "production";

export type PaymentComplementsConfig = {
  enabled: boolean;
  stampingEnabled: boolean;
  env: PaymentComplementsEnv;
};

export type PaymentComplementStatus =
  | "draft"
  | "validated"
  | "issued"
  | "stamped"
  | "cancelled"
  | "failed";

export type PaymentComplementRecord = {
  id: number;
  project_invoice_id: number;
  project_payment_id: number | null;
  client_project_id: number;
  client_id: number;
  status: PaymentComplementStatus | string;
  complement_env: PaymentComplementsEnv | string;
  partiality_number: number;
  previous_balance_mxn: number;
  amount_paid_mxn: number;
  paid_amount_mxn?: number | null;
  source_payment_amount_mxn?: number | null;
  manual_amount_override?: boolean | null;
  manual_override_reason?: string | null;
  outstanding_balance_mxn: number;
  payment_date: string;
  payment_form_code: string;
  currency: "MXN" | string;
  exchange_rate: number | null;
  payment_reference: string | null;
  payload_preview: unknown;
  pdf_url?: string | null;
  xml_url?: string | null;
  facturama_id: string | null;
  sat_uuid: string | null;
  last_error: string | null;
  created_at: string | null;
};

export type PaymentComplementCalculation = {
  partialityNumber: number;
  previousBalanceMxn: number;
  paidAmountMxn: number;
  outstandingBalanceMxn: number;
};

export type PaymentComplementPayloadInput = {
  invoice: Pick<
    ProjectInvoice,
    | "id"
    | "internal_folio"
    | "sat_uuid"
    | "payment_method_code"
    | "total_mxn"
    | "total"
  >;
  client: FiscalClientData;
  paymentDate: string;
  paymentFormCode: string;
  calculation: PaymentComplementCalculation;
  paymentReference?: string | null;
  env?: PaymentComplementsEnv;
};

const stampedComplementStatuses = new Set(["issued", "stamped"]);

export function getPaymentComplementsConfig(): PaymentComplementsConfig {
  const envValue = process.env.PAYMENT_COMPLEMENTS_ENV || "sandbox";

  return {
    enabled: process.env.PAYMENT_COMPLEMENTS_ENABLED === "true",
    stampingEnabled: process.env.PAYMENT_COMPLEMENTS_STAMPING_ENABLED === "true",
    env: envValue === "production" ? "production" : "sandbox",
  };
}

export function isActivePaymentComplementStatus(status: string | null | undefined) {
  return stampedComplementStatuses.has(status || "");
}

export function roundPaymentAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export function getInvoicePaymentComplementPaidAmount(
  complements: Array<
    Pick<PaymentComplementRecord, "status" | "amount_paid_mxn" | "paid_amount_mxn">
  >
) {
  // Fiscal balances and partiality numbers only consider complements already stamped.
  return roundPaymentAmount(
    complements
      .filter((complement) => isActivePaymentComplementStatus(complement.status))
      .reduce(
        (sum, complement) =>
          sum + Number(complement.paid_amount_mxn ?? complement.amount_paid_mxn ?? 0),
        0
      )
  );
}

export function calculatePaymentComplement(input: {
  invoiceTotalMxn: number;
  existingComplements: Array<
    Pick<PaymentComplementRecord, "status" | "amount_paid_mxn" | "paid_amount_mxn">
  >;
  paidAmountMxn: number;
}): PaymentComplementCalculation {
  const invoiceTotalMxn = roundPaymentAmount(input.invoiceTotalMxn);
  const paidAmount = getInvoicePaymentComplementPaidAmount(input.existingComplements);
  const previousBalanceMxn = roundPaymentAmount(invoiceTotalMxn - paidAmount);
  const paidAmountMxn = roundPaymentAmount(input.paidAmountMxn);
  const activeComplements = input.existingComplements.filter((complement) =>
    isActivePaymentComplementStatus(complement.status)
  );

  return {
    partialityNumber: activeComplements.length + 1,
    previousBalanceMxn,
    paidAmountMxn,
    outstandingBalanceMxn: roundPaymentAmount(previousBalanceMxn - paidAmountMxn),
  };
}

export function getPaymentComplementValidationErrors(input: {
  invoice: Pick<ProjectInvoice, "status" | "payment_method_code" | "sat_uuid" | "total_mxn" | "total">;
  calculation: PaymentComplementCalculation;
  paymentAlreadyHasComplement: boolean;
}) {
  const errors: string[] = [];
  const invoiceTotalMxn = Number(input.invoice.total_mxn ?? input.invoice.total ?? 0);

  if (input.invoice.payment_method_code !== "PPD") {
    errors.push("Solo se pueden crear complementos para facturas PPD.");
  }
  if (input.invoice.status !== "issued") {
    errors.push("La factura debe estar emitida.");
  }
  if (!input.invoice.sat_uuid) {
    errors.push("La factura debe tener UUID fiscal.");
  }
  if (!Number.isFinite(invoiceTotalMxn) || invoiceTotalMxn <= 0) {
    errors.push("La factura debe tener total mayor a cero.");
  }
  if (input.calculation.paidAmountMxn <= 0) {
    errors.push("El pago debe ser mayor a cero.");
  }
  if (input.calculation.paidAmountMxn > input.calculation.previousBalanceMxn) {
    errors.push("El pago no puede ser mayor que el saldo pendiente.");
  }
  if (input.paymentAlreadyHasComplement) {
    errors.push("Este pago ya tiene un complemento activo.");
  }
  if (input.calculation.outstandingBalanceMxn < 0) {
    errors.push("El saldo insoluto no puede ser negativo.");
  }

  return errors;
}

export function buildFacturamaPaymentComplementPayload({
  invoice,
  client,
  paymentDate,
  paymentFormCode,
  calculation,
  paymentReference,
  env = "production",
}: PaymentComplementPayloadInput) {
  const expeditionPlace = process.env.FACTURAMA_EXPEDITION_PLACE?.trim() || "";
  const sandboxReceiver = env === "sandbox" ? getFacturamaSandboxReceiver() : null;
  const receiver = sandboxReceiver
    ? {
        rfc: sandboxReceiver.rfc,
        name: sandboxReceiver.name,
        fiscalRegime: sandboxReceiver.fiscalRegime,
        taxZipCode: sandboxReceiver.taxZipCode,
      }
    : {
        rfc: (client.tax_rfc || "").trim().toUpperCase(),
        name: (client.tax_business_name || client.name || "").trim().toUpperCase(),
        fiscalRegime: getFiscalRegimeCode(client),
        taxZipCode: (client.tax_zip_code || "").trim(),
      };

  return {
    NameId: 14,
    CfdiType: "P",
    ExpeditionPlace: expeditionPlace,
    Receiver: {
      Rfc: receiver.rfc,
      Name: receiver.name,
      FiscalRegime: receiver.fiscalRegime,
      CfdiUse: "CP01",
      TaxZipCode: receiver.taxZipCode,
    },
    ...(sandboxReceiver
      ? {
          PreviewNotice:
            "Ambiente sandbox: usando receptor fiscal de prueba.",
        }
      : {}),
    Complemento: {
      Payments: [
        {
          Date: `${paymentDate}T12:00:00.000Z`,
          PaymentForm: paymentFormCode,
          Currency: "MXN",
          Amount: calculation.paidAmountMxn,
          ...(paymentReference ? { OperationNumber: paymentReference } : {}),
          RelatedDocuments: [
            {
              Uuid: invoice.sat_uuid,
              Folio: invoice.internal_folio || String(invoice.id),
              Currency: "MXN",
              PaymentMethod: invoice.payment_method_code || "PPD",
              PartialityNumber: calculation.partialityNumber,
              PreviousBalanceAmount: calculation.previousBalanceMxn,
              AmountPaid: calculation.paidAmountMxn,
              OutstandingBalanceAmount: calculation.outstandingBalanceMxn,
            },
          ],
        },
      ],
    },
  };
}
