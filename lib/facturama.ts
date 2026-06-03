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
};

export type FacturamaStampResult = {
  facturamaId: string;
  satUuid: string | null;
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

function getFacturamaConfig() {
  const username = process.env.FACTURAMA_USERNAME;
  const password = process.env.FACTURAMA_PASSWORD;
  const env = (process.env.FACTURAMA_ENV || "sandbox") as FacturamaEnv;

  if (!username || !password) {
    throw new Error("Configura FACTURAMA_USERNAME y FACTURAMA_PASSWORD.");
  }

  if (env === "production") {
    throw new Error("Facturama produccion esta deshabilitado en ALFA OS.");
  }

  return {
    baseUrl: FACTURAMA_URLS.sandbox,
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  };
}

async function facturamaRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const config = getFacturamaConfig();
  const url = new URL(path.replace(/^\//, ""), config.baseUrl);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: config.authorization,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "Message" in data
        ? String(data.Message)
        : text || response.statusText;
    throw new Error(`Facturama ${response.status}: ${message}`);
  }

  return data as T;
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function amount(value: number) {
  return Number(value.toFixed(2));
}

function getExpeditionPlace(receiverZipCode: string) {
  return process.env.FACTURAMA_EXPEDITION_PLACE || receiverZipCode;
}

function buildInvoicePayload(draft: FacturamaInvoiceDraft) {
  const subtotal = amount(draft.subtotalMxn);
  const iva = amount(draft.ivaMxn);
  const total = amount(draft.totalMxn);
  const description = draft.projectName
    ? `Servicios ALFA - ${draft.projectName}`
    : `Servicios ALFA - Proyecto ${draft.invoiceId}`;

  return {
    NameId: 1,
    Date: `${draft.invoiceDate}T12:00:00`,
    Currency: "MXN",
    ExpeditionPlace: getExpeditionPlace(draft.receiver.taxZipCode),
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
    Items: [
      {
        Quantity: 1,
        ProductCode: process.env.FACTURAMA_PRODUCT_CODE || "81161700",
        UnitCode: "E48",
        Unit: "Servicio",
        Description: description.slice(0, 1000),
        UnitPrice: subtotal,
        Subtotal: subtotal,
        TaxObject: "02",
        Taxes: [
          {
            Name: "IVA",
            Rate: 0.16,
            Total: iva,
            Base: subtotal,
            IsRetention: false,
            IsFederalTax: true,
          },
        ],
        Total: total,
      },
    ],
  };
}

export async function stampFacturamaInvoice(
  draft: FacturamaInvoiceDraft
): Promise<FacturamaStampResult> {
  const payload = buildInvoicePayload(draft);
  const response = await facturamaRequest<FacturamaCreateCfdiResponse>("3/cfdis", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const facturamaId = response.Id;

  if (!facturamaId) {
    throw new Error("Facturama no regreso ID de CFDI.");
  }

  return {
    facturamaId,
    satUuid:
      response.Complement?.TaxStamp?.Uuid ||
      response.Complement?.TaxStamp?.UUID ||
      null,
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

  if (!response.Content) {
    throw new Error(`Facturama no regreso archivo ${format.toUpperCase()}.`);
  }

  return {
    bytes: Buffer.from(response.Content, "base64"),
    contentType:
      format === "pdf"
        ? "application/pdf"
        : "application/xml; charset=utf-8",
  };
}
