import { sanitizeCfdiDescription } from "@/lib/cfdiDescription";

type FacturamaEnv = "sandbox" | "production";

type FacturamaReceiver = {
  rfc: string;
  name: string;
  fiscalRegime: string;
  cfdiUse: string;
  taxZipCode: string;
};

export type FacturamaInvoiceDraft = {
  invoiceId: number;
  invoiceDate: string;
  subtotalMxn: number;
  ivaMxn: number;
  totalMxn: number;
  paymentMethodCode: "PUE" | "PPD";
  paymentFormCode: string;
  projectName: string | null;
  receiver: FacturamaReceiver;
  items: FacturamaInvoiceItem[];
};

export type FacturamaInvoiceItem = {
  productCode: string;
  unitCode: string;
  unit: string;
  description: string;
  quantity: number;
  unitPriceMxn: number;
  subtotalMxn: number;
  discountMxn?: number;
  netAmountMxn?: number;
  ivaMxn: number;
  totalMxn: number;
  fiscalObject: string;
};

export type FacturamaStampResult = {
  facturamaId: string;
  satUuid: string | null;
  facturamaResponse: FacturamaResponseLog;
};

export type FacturamaPaymentComplementPayload = {
  NameId: number | string;
  CfdiType: "P";
  ExpeditionPlace: string;
  Receiver: Record<string, unknown>;
  Complemento: {
    Payments: Array<Record<string, unknown>>;
  };
};

export type FacturamaResponseLog = {
  provider: "facturama";
  path: string;
  status: number;
  statusText: string;
  request?: unknown;
  body: unknown;
};

type FacturamaResponse<T> = FacturamaResponseLog & {
  data: T;
};

type FacturamaCreateCfdiResponse = {
  Id?: string;
  Complement?: {
    TaxStamp?: {
      Uuid?: string;
      UUID?: string;
    };
  };
};

type FacturamaFileResponse = {
  ContentEncoding?: string;
  ContentType?: string;
  ContentLength?: number;
  Content?: string;
};

const FACTURAMA_URLS: Record<FacturamaEnv, string> = {
  sandbox: "https://apisandbox.facturama.mx/",
  production: "https://api.facturama.mx/",
};

const FACTURAMA_TEST_RECEIVER_RFC = "EKU9003173C9";

export type FacturamaSandboxReceiver = {
  rfc: string;
  name: string;
  fiscalRegime: string;
  taxZipCode: string;
};

export const facturamaSandboxReceiverNotice =
  "Timbrado en sandbox usando datos fiscales de prueba.";

const defaultFacturamaSandboxReceiver: FacturamaSandboxReceiver = {
  rfc: FACTURAMA_TEST_RECEIVER_RFC,
  name: "ESCUELA KEMPER URGATE",
  fiscalRegime: "601",
  taxZipCode: "42501",
};

export class FacturamaRequestError extends Error {
  details: FacturamaResponseLog;

  constructor(message: string, details: FacturamaResponseLog) {
    super(message);
    this.name = "FacturamaRequestError";
    this.details = details;
  }
}

export function getFacturamaErrorDetails(error: unknown) {
  return error instanceof FacturamaRequestError ? error.details : null;
}

export function getFacturamaEnv() {
  const env = process.env.FACTURAMA_ENV || "sandbox";

  if (env !== "sandbox" && env !== "production") {
    throw new Error("FACTURAMA_ENV debe ser sandbox o production.");
  }

  return env;
}

export function getFacturamaProductionEnabled() {
  return process.env.FACTURAMA_ENABLE_PRODUCTION === "true";
}

export function getFacturamaSandboxReceiverOverride() {
  if (getFacturamaEnv() !== "sandbox") return null;

  return {
    rfc:
      process.env.FACTURAMA_SANDBOX_RECEIVER_RFC?.trim().toUpperCase() ||
      defaultFacturamaSandboxReceiver.rfc,
    name:
      process.env.FACTURAMA_SANDBOX_RECEIVER_NAME?.trim().toUpperCase() ||
      defaultFacturamaSandboxReceiver.name,
    fiscalRegime:
      process.env.FACTURAMA_SANDBOX_RECEIVER_TAX_REGIME?.trim() ||
      defaultFacturamaSandboxReceiver.fiscalRegime,
    taxZipCode:
      process.env.FACTURAMA_SANDBOX_RECEIVER_ZIP_CODE?.trim() ||
      defaultFacturamaSandboxReceiver.taxZipCode,
  };
}

export function getFacturamaSandboxReceiverNotice() {
  try {
    return getFacturamaSandboxReceiverOverride()
      ? facturamaSandboxReceiverNotice
      : null;
  } catch {
    return null;
  }
}

function getFacturamaConfig() {
  const username = process.env.FACTURAMA_USERNAME;
  const password = process.env.FACTURAMA_PASSWORD;
  const env = getFacturamaEnv();

  if (!username || !password) {
    throw new Error("Configura FACTURAMA_USERNAME y FACTURAMA_PASSWORD.");
  }

  if (env === "production" && !getFacturamaProductionEnabled()) {
    throw new Error("Facturama producción está deshabilitado en ALFA OS.");
  }

  return {
    baseUrl: FACTURAMA_URLS[env],
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}

function getFacturamaConfigForExplicitEnv(env: FacturamaEnv) {
  const username = process.env.FACTURAMA_USERNAME;
  const password = process.env.FACTURAMA_PASSWORD;

  if (!username || !password) {
    throw new Error("Configura FACTURAMA_USERNAME y FACTURAMA_PASSWORD.");
  }

  if (env === "production") {
    throw new Error("Fase 2 de complementos solo permite Facturama sandbox.");
  }

  return {
    baseUrl: FACTURAMA_URLS[env],
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}

async function facturamaRequest<T>(
  path: string,
  init?: RequestInit,
  requestLog?: unknown,
  envOverride?: FacturamaEnv
): Promise<FacturamaResponse<T>> {
  const config = envOverride
    ? getFacturamaConfigForExplicitEnv(envOverride)
    : getFacturamaConfig();
  const cleanPath = path.replace(/^\//, "");
  const url = new URL(cleanPath, config.baseUrl);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: config.authorization,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? parseJson(text) : null;
  const responseLog: FacturamaResponseLog = {
    provider: "facturama",
    path: cleanPath,
    status: response.status,
    statusText: response.statusText,
    request: requestLog,
    body,
  };

  if (!response.ok) {
    throw new FacturamaRequestError(
      `Facturama error ${response.status}: ${extractFacturamaMessage(body, text, response.statusText)}`,
      responseLog
    );
  }

  return {
    ...responseLog,
    data: body as T,
  };
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractFacturamaMessage(body: unknown, rawText: string, statusText: string) {
  const message = extractMessageFromUnknown(body) || rawText || statusText;
  return truncateForMessage(message);
}

function extractMessageFromUnknown(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(extractMessageFromUnknown).filter(Boolean).join(" | ");
  }
  if (typeof value !== "object") return String(value);

  const record = value as Record<string, unknown>;
  for (const key of ["Message", "message", "Error", "error", "error_description"]) {
    const message = extractMessageFromUnknown(record[key]);
    if (message) return message;
  }

  for (const key of ["ModelState", "Errors", "errors"]) {
    const message = extractMessageFromUnknown(record[key]);
    if (message) return message;
  }

  try {
    return JSON.stringify(record);
  } catch {
    return "Respuesta no legible de Facturama.";
  }
}

function truncateForMessage(message: string) {
  return message.length > 2000 ? `${message.slice(0, 2000)}...` : message;
}

function amount(value: number) {
  return Number(value.toFixed(2));
}

function getExpeditionPlace() {
  const expeditionPlace = process.env.FACTURAMA_EXPEDITION_PLACE?.trim();

  if (!expeditionPlace) {
    throw new Error("Configura FACTURAMA_EXPEDITION_PLACE con el codigo postal fiscal del emisor.");
  }

  if (!/^\d{5}$/.test(expeditionPlace)) {
    throw new Error("FACTURAMA_EXPEDITION_PLACE debe tener 5 digitos.");
  }

  return expeditionPlace;
}

function buildInvoicePayload(draft: FacturamaInvoiceDraft) {
  return {
    NameId: 1,
    Date: `${draft.invoiceDate}T12:00:00`,
    Currency: "MXN",
    ExpeditionPlace: getExpeditionPlace(),
    Exportation: "01",
    Folio: String(draft.invoiceId),
    CfdiType: "I",
    PaymentForm: draft.paymentFormCode,
    PaymentMethod: draft.paymentMethodCode,
    Receiver: {
      Rfc: draft.receiver.rfc,
      Name: draft.receiver.name,
      CfdiUse: draft.receiver.cfdiUse,
      FiscalRegime: draft.receiver.fiscalRegime,
      TaxZipCode: draft.receiver.taxZipCode,
    },
    Items: draft.items.map((item) => {
      const discount = amount(item.discountMxn || 0);
      const netAmount = amount(
        item.netAmountMxn ?? Math.max(item.subtotalMxn - discount, 0)
      );

      return {
        Quantity: amount(item.quantity),
        ProductCode: item.productCode,
        UnitCode: item.unitCode,
        Unit: item.unit,
        Description: sanitizeCfdiDescription(item.description),
        UnitPrice: amount(item.unitPriceMxn),
        Subtotal: amount(item.subtotalMxn),
        ...(discount > 0 ? { Discount: discount } : {}),
        TaxObject: item.fiscalObject,
        Taxes:
          item.fiscalObject === "02"
            ? [
                {
                  Name: "IVA",
                  Rate: 0.16,
                  Total: amount(item.ivaMxn),
                  Base: netAmount,
                  IsRetention: false,
                  IsFederalTax: true,
                },
              ]
            : [],
        Total: amount(item.totalMxn),
      };
    }),
  };
}

type FacturamaInvoicePayload = ReturnType<typeof buildInvoicePayload>;

function buildFacturamaRequestLog(payload: FacturamaInvoicePayload) {
  return {
    Receiver: {
      Rfc: payload.Receiver.Rfc,
      Name: payload.Receiver.Name,
    },
    Folio: payload.Folio,
    CfdiType: payload.CfdiType,
    Currency: payload.Currency,
    PaymentForm: payload.PaymentForm,
    PaymentMethod: payload.PaymentMethod,
    ItemsCount: payload.Items.length,
  };
}

function buildPaymentComplementRequestLog(payload: FacturamaPaymentComplementPayload) {
  const payment = payload.Complemento.Payments[0] || {};
  const relatedDocuments = Array.isArray(payment.RelatedDocuments)
    ? payment.RelatedDocuments
    : [];

  return {
    Receiver: payload.Receiver,
    CfdiType: payload.CfdiType,
    PaymentAmount: payment.Amount,
    PaymentForm: payment.PaymentForm,
    RelatedDocumentsCount: relatedDocuments.length,
  };
}

function assertReceiverAllowedForFacturamaEnv(payload: FacturamaInvoicePayload) {
  if (
    getFacturamaEnv() === "production" &&
    payload.Receiver.Rfc.trim().toUpperCase() === FACTURAMA_TEST_RECEIVER_RFC
  ) {
    throw new Error(
      "Bloqueo de producción: el RFC receptor EKU9003173C9 es de prueba y no puede timbrarse en Facturama producción."
    );
  }
}

export async function stampFacturamaInvoice(
  draft: FacturamaInvoiceDraft
): Promise<FacturamaStampResult> {
  const payload = buildInvoicePayload(draft);
  assertReceiverAllowedForFacturamaEnv(payload);
  const response = await facturamaRequest<FacturamaCreateCfdiResponse>(
    "3/cfdis",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    buildFacturamaRequestLog(payload)
  );
  const facturamaId = response.data.Id;

  if (!facturamaId) {
    throw new Error("Facturama no regreso ID de CFDI.");
  }

  return {
    facturamaId,
    satUuid:
      response.data.Complement?.TaxStamp?.Uuid ||
      response.data.Complement?.TaxStamp?.UUID ||
      null,
    facturamaResponse: {
      provider: "facturama",
      path: response.path,
      status: response.status,
      statusText: response.statusText,
      request: response.request,
      body: response.body,
    },
  };
}

export async function stampPaymentComplement(
  payload: FacturamaPaymentComplementPayload,
  env: FacturamaEnv = "sandbox"
): Promise<FacturamaStampResult> {
  if (env !== "sandbox") {
    throw new Error("Fase 2 solo permite timbrar complementos en sandbox.");
  }

  const response = await facturamaRequest<FacturamaCreateCfdiResponse>(
    "3/cfdis",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    buildPaymentComplementRequestLog(payload),
    env
  );
  const facturamaId = response.data.Id;

  if (!facturamaId) {
    throw new Error("Facturama no regreso ID de complemento de pago.");
  }

  return {
    facturamaId,
    satUuid:
      response.data.Complement?.TaxStamp?.Uuid ||
      response.data.Complement?.TaxStamp?.UUID ||
      null,
    facturamaResponse: {
      provider: "facturama",
      path: response.path,
      status: response.status,
      statusText: response.statusText,
      request: response.request,
      body: response.body,
    },
  };
}

export async function downloadFacturamaInvoiceFile(
  facturamaId: string,
  format: "pdf" | "xml"
) {
  const response = await facturamaRequest<FacturamaFileResponse>(
    `cfdi/${format}/issued/${facturamaId}`,
    { method: "GET" }
  );

  if (!response.data.Content) {
    throw new Error(`Facturama no regreso archivo ${format.toUpperCase()}.`);
  }

  const bytes = Buffer.from(response.data.Content, "base64");
  const actualFormat = detectFacturamaFileFormat(bytes);

  if (actualFormat && actualFormat !== format) {
    throw new Error(
      `Facturama regreso ${actualFormat.toUpperCase()} al solicitar ${format.toUpperCase()}.`
    );
  }

  return {
    bytes,
    contentType:
      format === "pdf"
        ? "application/pdf"
        : "application/xml; charset=utf-8",
    providerContentType: response.data.ContentType || null,
  };
}

export async function downloadPaymentComplementFile(
  facturamaId: string,
  format: "pdf" | "xml",
  env: FacturamaEnv = "sandbox"
) {
  if (env !== "sandbox") {
    throw new Error("Fase 2 solo permite descargar complementos desde sandbox.");
  }

  const response = await facturamaRequest<FacturamaFileResponse>(
    `cfdi/${format}/issued/${facturamaId}`,
    { method: "GET" },
    undefined,
    env
  );

  if (!response.data.Content) {
    throw new Error(`Facturama no regreso complemento ${format.toUpperCase()}.`);
  }

  const bytes = Buffer.from(response.data.Content, "base64");
  const actualFormat = detectFacturamaFileFormat(bytes);

  if (actualFormat && actualFormat !== format) {
    throw new Error(
      `Facturama regreso ${actualFormat.toUpperCase()} al solicitar ${format.toUpperCase()}.`
    );
  }

  return {
    bytes,
    contentType:
      format === "pdf"
        ? "application/pdf"
        : "application/xml; charset=utf-8",
    providerContentType: response.data.ContentType || null,
  };
}

function detectFacturamaFileFormat(bytes: Buffer): "pdf" | "xml" | null {
  if (bytes.subarray(0, 4).toString("utf8") === "%PDF") return "pdf";

  const sample = bytes.subarray(0, 200).toString("utf8").trimStart();
  if (sample.startsWith("<")) return "xml";

  return null;
}
