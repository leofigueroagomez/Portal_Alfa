import { sanitizeCfdiDescription } from "@/lib/cfdiDescription";
import {
  MEXICO_TIME_ZONE,
  getMexicoDate,
  getMexicoFacturamaDateTime,
} from "@/lib/mexicoDate";

type FacturamaEnv = "sandbox" | "production";

type FacturamaReceiver = {
  rfc: string;
  name: string;
  fiscalRegime: string;
  cfdiUse: string;
  taxZipCode: string;
};

export type FacturamaCfdiRelation = {
  /** TipoRelacion SAT. "04" = Sustitucion de los CFDI previos. */
  type: string;
  /** UUIDs (folios fiscales) de los CFDI relacionados. */
  uuids: string[];
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
  /** Nodo CfdiRelacionados. Solo se envia si hay al menos un UUID. */
  relation?: FacturamaCfdiRelation | null;
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
  PreviewNotice?: string;
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

  return getFacturamaSandboxReceiver();
}

export function getFacturamaSandboxReceiver() {
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

  if (env === "production" && !getFacturamaProductionEnabled()) {
    throw new Error("Facturama producción está deshabilitado en ALFA OS.");
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

function buildCfdiRelations(relation: FacturamaCfdiRelation | null | undefined) {
  if (!relation) return null;

  const uuids = [
    ...new Set(
      relation.uuids
        .map((uuid) => uuid?.trim().toUpperCase())
        .filter((uuid): uuid is string => Boolean(uuid))
    ),
  ];

  if (uuids.length === 0 || !relation.type?.trim()) return null;

  return {
    Type: relation.type.trim(),
    Cfdis: uuids.map((uuid) => ({ Uuid: uuid })),
  };
}

function buildInvoicePayload(draft: FacturamaInvoiceDraft) {
  const serverNow = new Date();
  const facturamaDate = getMexicoFacturamaDateTime(serverNow);
  const relations = buildCfdiRelations(draft.relation);

  return {
    NameId: 1,
    Date: facturamaDate,
    Currency: "MXN",
    ExpeditionPlace: getExpeditionPlace(),
    Exportation: "01",
    Folio: String(draft.invoiceId),
    CfdiType: "I",
    PaymentForm: draft.paymentFormCode,
    PaymentMethod: draft.paymentMethodCode,
    ...(relations ? { Relations: relations } : {}),
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

function buildFacturamaRequestLog(
  payload: FacturamaInvoicePayload,
  draft: FacturamaInvoiceDraft
) {
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
    Relations: summarizeRelationsForLog(payload),
    OriginalInvoiceDate: draft.invoiceDate,
    Date: payload.Date,
    ServerNowIso: new Date().toISOString(),
    MexicoDate: getMexicoDate(),
    MexicoTimeZone: MEXICO_TIME_ZONE,
    ItemsCount: payload.Items.length,
  };
}

function buildPaymentComplementRequestLog(
  payload: FacturamaPaymentComplementPayload,
  env: FacturamaEnv
) {
  const payment = payload.Complemento.Payments[0] || {};
  const relatedDocuments = Array.isArray(payment.RelatedDocuments)
    ? payment.RelatedDocuments
    : [];
  const relatedDocument = (relatedDocuments[0] || {}) as Record<string, unknown>;
  const receiverSource = payload.PreviewNotice ? "sandbox" : "real";

  return {
    PAYMENT_COMPLEMENTS_ENV: env,
    ReceiverSource: receiverSource,
    UsesSandboxReceiver: receiverSource === "sandbox",
    SandboxNotice: payload.PreviewNotice || null,
    CfdiType: payload.CfdiType,
    Receiver: {
      Rfc: payload.Receiver.Rfc,
      Name: payload.Receiver.Name,
      CfdiUse: payload.Receiver.CfdiUse,
    },
    Payment: {
      Date: payment.Date,
      Amount: payment.Amount,
      PaymentForm: payment.PaymentForm,
    },
    ServerNowIso: new Date().toISOString(),
    MexicoDate: getMexicoDate(),
    MexicoTimeZone: MEXICO_TIME_ZONE,
    RelatedDocuments: [
      {
        Uuid: relatedDocument.Uuid,
        TaxObject: relatedDocument.TaxObject,
        PartialityNumber: relatedDocument.PartialityNumber,
        PreviousBalanceAmount: relatedDocument.PreviousBalanceAmount,
        AmountPaid: relatedDocument.AmountPaid,
        OutstandingBalanceAmount: relatedDocument.OutstandingBalanceAmount,
      },
    ],
    RelatedDocumentsCount: relatedDocuments.length,
  };
}

function summarizeRelationsForLog(payload: FacturamaInvoicePayload) {
  const relations = (payload as { Relations?: { Type?: string; Cfdis?: unknown[] } })
    .Relations;
  if (!relations) return null;

  return {
    Type: relations.Type || null,
    Count: Array.isArray(relations.Cfdis) ? relations.Cfdis.length : 0,
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
  console.info("[Facturama CFDI I date]", {
    originalInvoiceDate: draft.invoiceDate,
    facturamaDate: payload.Date,
    serverNowIso: new Date().toISOString(),
    mexicoDate: getMexicoDate(),
    mexicoTimeZone: MEXICO_TIME_ZONE,
  });
  const response = await facturamaRequest<FacturamaCreateCfdiResponse>(
    "3/cfdis",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    buildFacturamaRequestLog(payload, draft)
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
  const payment = payload.Complemento.Payments[0] || {};
  console.info("[Facturama payment complement date]", {
    paymentDateSent: payment.Date,
    serverNowIso: new Date().toISOString(),
    mexicoDate: getMexicoDate(),
    mexicoTimeZone: MEXICO_TIME_ZONE,
  });
  const response = await facturamaRequest<FacturamaCreateCfdiResponse>(
    "3/cfdis",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    buildPaymentComplementRequestLog(payload, env),
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

export type FacturamaCancellationMotive = "01" | "02" | "03" | "04";

export type FacturamaCancelResult = {
  status: "canceled" | "requested" | "rejected" | "unknown";
  satUuid: string | null;
  requestDate: string | null;
  responseDate: string | null;
  expirationDate: string | null;
  acuseXmlBase64: string | null;
  facturamaResponse: FacturamaResponseLog;
};

type FacturamaCancelResponse = {
  Status?: string;
  Uuid?: string;
  RequestDate?: string;
  ResponseDate?: string;
  ExpirationDate?: string;
  AcuseXmlBase64?: string;
};

export async function cancelFacturamaInvoice(
  facturamaId: string,
  motive: FacturamaCancellationMotive,
  uuidReplacement?: string | null,
  env?: FacturamaEnv
): Promise<FacturamaCancelResult> {
  const params = new URLSearchParams({ type: "issued", motive });
  if (uuidReplacement) params.set("uuidReplacement", uuidReplacement);

  const response = await facturamaRequest<FacturamaCancelResponse>(
    `cfdi/${facturamaId}?${params.toString()}`,
    { method: "DELETE" },
    { facturamaId, motive, uuidReplacement: uuidReplacement || null },
    env
  );

  const status = normalizeFacturamaCancelStatus(response.data.Status);

  return {
    status,
    satUuid: response.data.Uuid || null,
    requestDate: response.data.RequestDate || null,
    responseDate: response.data.ResponseDate || null,
    expirationDate: response.data.ExpirationDate || null,
    acuseXmlBase64: response.data.AcuseXmlBase64 || null,
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

function normalizeFacturamaCancelStatus(
  rawStatus: string | null | undefined
): FacturamaCancelResult["status"] {
  const status = (rawStatus || "").toLowerCase().trim();

  if (status === "canceled" || status === "cancelled" || status === "cancelado") {
    return "canceled";
  }
  if (status === "requested" || status === "pending" || status === "en proceso") {
    return "requested";
  }
  if (status === "rejected" || status === "rechazado") {
    return "rejected";
  }
  return "unknown";
}

export type FacturamaCfdiSatStatus = {
  /** "Vigente" | "Cancelado" | "No Encontrado" | otro texto crudo del SAT. */
  status: string | null;
  /** "Vigente" -> vigente; "Cancelado" -> canceled; "No Encontrado" -> not_found. */
  normalized: "vigente" | "canceled" | "not_found" | "unknown";
  isCancelable: string | null;
  uuid: string | null;
  facturamaResponse: FacturamaResponseLog;
};

type FacturamaCfdiSatStatusResponse = {
  Status?: string;
  IsCancelable?: string;
  Uuid?: string;
};

/**
 * Consulta el estatus real de un CFDI ante el SAT (GET /cfdi/status).
 * Sirve para resolver una cancelacion que quedo `requested` (pendiente de
 * aceptacion del receptor, hasta 72 h) sin volver a enviar una peticion de
 * cancelacion.
 */
export async function checkFacturamaCfdiSatStatus(
  params: {
    uuid: string;
    issuerRfc: string;
    receiverRfc: string;
    totalMxn: number;
  },
  env?: FacturamaEnv
): Promise<FacturamaCfdiSatStatus> {
  const query = new URLSearchParams({
    uuid: params.uuid.trim(),
    issuerRfc: params.issuerRfc.trim().toUpperCase(),
    receiverRfc: params.receiverRfc.trim().toUpperCase(),
    total: amount(params.totalMxn).toFixed(2),
  });

  const response = await facturamaRequest<FacturamaCfdiSatStatusResponse>(
    `cfdi/status?${query.toString()}`,
    { method: "GET" },
    { uuid: params.uuid, issuerRfc: params.issuerRfc, receiverRfc: params.receiverRfc },
    env
  );

  const raw = (response.data.Status || "").toLowerCase().trim();
  const normalized: FacturamaCfdiSatStatus["normalized"] =
    raw === "vigente"
      ? "vigente"
      : raw === "cancelado"
        ? "canceled"
        : raw === "no encontrado"
          ? "not_found"
          : "unknown";

  return {
    status: response.data.Status || null,
    normalized,
    isCancelable: response.data.IsCancelable || null,
    uuid: response.data.Uuid || null,
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

export type FacturamaCfdiDetail = {
  issuerRfc: string | null;
  receiverRfc: string | null;
  totalMxn: number | null;
  raw: unknown;
};

type FacturamaCfdiDetailResponse = {
  Total?: number;
  Issuer?: { Rfc?: string; TaxName?: string; FiscalRegime?: string };
  Receiver?: { Rfc?: string; Name?: string };
};

/**
 * Detalle de un CFDI emitido (GET /cfdi/{id}?type=issued). Se usa para obtener
 * el RFC emisor / receptor / total que necesita `checkFacturamaCfdiSatStatus`
 * sin depender de un env var adicional.
 */
export async function getFacturamaCfdiDetail(
  facturamaId: string,
  env?: FacturamaEnv
): Promise<FacturamaCfdiDetail> {
  const response = await facturamaRequest<FacturamaCfdiDetailResponse>(
    `cfdi/${facturamaId}?type=issued`,
    { method: "GET" },
    { facturamaId },
    env
  );

  return {
    issuerRfc: response.data.Issuer?.Rfc || null,
    receiverRfc: response.data.Receiver?.Rfc || null,
    totalMxn:
      typeof response.data.Total === "number" ? response.data.Total : null,
    raw: response.body,
  };
}

function detectFacturamaFileFormat(bytes: Buffer): "pdf" | "xml" | null {
  if (bytes.subarray(0, 4).toString("utf8") === "%PDF") return "pdf";

  const sample = bytes.subarray(0, 200).toString("utf8").trimStart();
  if (sample.startsWith("<")) return "xml";

  return null;
}
