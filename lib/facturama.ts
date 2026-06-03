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
  ivaMxn: number;
  totalMxn: number;
  fiscalObject: string;
};

export type FacturamaStampResult = {
  facturamaId: string;
  satUuid: string | null;
  facturamaResponse: FacturamaResponseLog;
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

function getFacturamaConfig() {
  const username = process.env.FACTURAMA_USERNAME;
  const password = process.env.FACTURAMA_PASSWORD;
  const env = process.env.FACTURAMA_ENV || "sandbox";

  if (!username || !password) {
    throw new Error("Configura FACTURAMA_USERNAME y FACTURAMA_PASSWORD.");
  }

  if (env !== "sandbox" && env !== "production") {
    throw new Error("FACTURAMA_ENV debe ser sandbox o production.");
  }

  if (env === "production") {
    throw new Error("Facturama produccion esta deshabilitado en ALFA OS.");
  }

  return {
    baseUrl: FACTURAMA_URLS[env],
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}

async function facturamaRequest<T>(
  path: string,
  init?: RequestInit,
  requestLog?: unknown
): Promise<FacturamaResponse<T>> {
  const config = getFacturamaConfig();
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
    PaymentForm: "99",
    PaymentMethod: "PPD",
    Receiver: {
      Rfc: draft.receiver.rfc,
      Name: draft.receiver.name,
      CfdiUse: draft.receiver.cfdiUse,
      FiscalRegime: draft.receiver.fiscalRegime,
      TaxZipCode: draft.receiver.taxZipCode,
    },
    Items: draft.items.map((item) => ({
      Quantity: amount(item.quantity),
      ProductCode: item.productCode,
      UnitCode: item.unitCode,
      Unit: item.unit,
      Description: item.description.slice(0, 1000),
      UnitPrice: amount(item.unitPriceMxn),
      Subtotal: amount(item.subtotalMxn),
      TaxObject: item.fiscalObject,
      Taxes:
        item.fiscalObject === "02"
          ? [
              {
                Name: "IVA",
                Rate: 0.16,
                Total: amount(item.ivaMxn),
                Base: amount(item.subtotalMxn),
                IsRetention: false,
                IsFederalTax: true,
              },
            ]
          : [],
      Total: amount(item.totalMxn),
    })),
  };
}

type FacturamaInvoicePayload = ReturnType<typeof buildInvoicePayload>;

function buildFacturamaRequestLog(payload: FacturamaInvoicePayload) {
  return {
    Receiver: {
      Rfc: payload.Receiver.Rfc,
    },
    Folio: payload.Folio,
    CfdiType: payload.CfdiType,
    Currency: payload.Currency,
    ItemsCount: payload.Items.length,
  };
}

export async function stampFacturamaInvoice(
  draft: FacturamaInvoiceDraft
): Promise<FacturamaStampResult> {
  const payload = buildInvoicePayload(draft);
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

  return {
    bytes: Buffer.from(response.data.Content, "base64"),
    contentType:
      format === "pdf"
        ? "application/pdf"
        : "application/xml; charset=utf-8",
  };
}
