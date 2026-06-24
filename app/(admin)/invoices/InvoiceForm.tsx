"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import ClientFiscalDataModal from "@/components/ClientFiscalDataModal";
import ProductFiscalDataModal from "@/components/ProductFiscalDataModal";
import {
  formatMissingFiscalFields,
  getMissingFiscalFields,
  type FiscalClientData,
} from "@/lib/fiscalData";
import {
  getMissingProductFiscalFields,
  getProductFiscalObject,
  getProductSatProductCode,
  getProductSatUnitCode,
  getProductSatUnitName,
  type ProductFiscalData,
} from "@/lib/productFiscalData";
import { formatCurrency } from "@/lib/format";
import {
  getNextInternalInvoiceFolio,
  isDuplicateInternalFolioError,
} from "@/lib/invoiceFolios";
import {
  fallbackPaymentForms,
  getPaymentComplementStatus,
  paymentMethodOptions,
  sortPaymentForms,
  type PaymentFormCatalogItem,
  type PaymentMethodCode,
} from "@/lib/paymentTerms";
import {
  CFDI_DESCRIPTION_MAX_LENGTH,
  sanitizeCfdiDescription,
  validateCfdiDescription,
} from "@/lib/cfdiDescription";
import { getMexicoDate } from "@/lib/mexicoDate";
import { supabase } from "@/services/supabase";

type Project = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Props = {
  clients: FiscalClientData[];
  projects: Project[];
  defaultProjectId?: number;
  defaultClientId?: number | null;
  allowManual?: boolean;
};

type InvoiceSourceType = "quote" | "advance" | "partial" | "balance" | "service" | "manual";

type ApprovedQuote = {
  id: number;
  quote_number: string | null;
  discount_total?: number | null;
  discount_amount_mxn?: number | null;
  partner_total_discount_mxn?: number | null;
  subtotal_mxn: number | null;
  taxable_base_mxn?: number | null;
  iva_mxn: number | null;
  total_mxn: number | null;
  grand_total: number | null;
  exchange_rate: number | null;
};

type QuoteItem = {
  id: number;
  product_id: number | null;
  quantity: number | null;
  unit_equipment_price_usd: number | null;
  unit_equipment_price: number | null;
  unit_labor_price: number | null;
  equipment_total_usd: number | null;
  equipment_total: number | null;
  labor_total: number | null;
  line_total: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  sort_order: number | null;
  products?: ProductFiscalData | ProductFiscalData[] | null;
};

type InvoiceConcept = {
  source_quote_item_id: number | null;
  product_id: number | null;
  commercial_description: string;
  description: string;
  quantity: number;
  unit_price_mxn: number;
  subtotal_mxn: number;
  gross_amount_mxn: number;
  discount_mxn: number;
  net_amount_mxn: number;
  iva_mxn: number;
  total_mxn: number;
  sat_product_service_code: string;
  sat_unit_code: string;
  sat_unit_name: string;
  fiscal_object: string;
  sort_order: number;
};

type CreatedInvoice = {
  id: number;
  internal_folio: string | null;
};

const IVA_RATE = 0.16;

function today() {
  return getMexicoDate();
}

function getRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation || null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function moneyToCents(value: number) {
  return Math.round(roundMoney(value) * 100);
}

function centsToMoney(cents: number) {
  return roundMoney(cents / 100);
}

function getIvaFromTaxBase(taxBaseMxn: number) {
  return roundMoney(taxBaseMxn * IVA_RATE);
}

function isMissingLegacyAmountColumnError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  const message = String(error.message || "").toLowerCase();

  return (
    message.includes("project_invoices") &&
    (message.includes("subtotal") || message.includes("iva") || message.includes("total")) &&
    (message.includes("column") || message.includes("schema cache"))
  );
}

function getQuoteItemSubtotalMxn(item: QuoteItem, quote: ApprovedQuote | null) {
  const directLineTotal = Number(item.line_total || 0);
  if (directLineTotal > 0) return directLineTotal;

  const exchangeRate = Number(quote?.exchange_rate || 1);
  const equipmentTotalUsd =
    Number(item.equipment_total_usd || 0) ||
    Number(item.equipment_total || 0) ||
    Number(item.unit_equipment_price_usd || 0) * Number(item.quantity || 0);
  const laborTotal = Number(item.labor_total || 0);

  return equipmentTotalUsd * exchangeRate + laborTotal;
}

function getQuoteDiscountMxn(quote: ApprovedQuote | null) {
  if (!quote) return 0;

  const explicitDiscount = Number(
    quote.discount_amount_mxn ?? quote.discount_total ?? 0
  );
  const partnerDiscount = Number(quote.partner_total_discount_mxn || 0);

  return roundMoney(Math.max(explicitDiscount + partnerDiscount, 0));
}

function getQuoteFiscalSnapshot(
  quote: ApprovedQuote | null,
  fallbackSubtotalMxn: number
) {
  if (!quote) {
    const subtotalMxn = roundMoney(fallbackSubtotalMxn);
    const ivaMxn = roundMoney(subtotalMxn * 0.16);

    return {
      subtotalMxn,
      discountMxn: 0,
      taxableSubtotalMxn: subtotalMxn,
      ivaMxn,
      totalMxn: roundMoney(subtotalMxn + ivaMxn),
    };
  }

  const subtotalMxn = roundMoney(
    Number(quote.subtotal_mxn) || fallbackSubtotalMxn
  );
  const discountMxn = Math.min(getQuoteDiscountMxn(quote), subtotalMxn);
  const taxableSubtotalMxn = roundMoney(
    Number(quote.taxable_base_mxn) ||
      Math.max(subtotalMxn - discountMxn, 0)
  );
  const approvedTotalMxn = roundMoney(
    Number(quote.total_mxn) || Number(quote.grand_total) || 0
  );
  const ivaMxn = roundMoney(
    Number(quote.iva_mxn) ||
      (approvedTotalMxn > 0
        ? Math.max(approvedTotalMxn - taxableSubtotalMxn, 0)
        : taxableSubtotalMxn * 0.16)
  );

  return {
    subtotalMxn,
    discountMxn,
    taxableSubtotalMxn,
    ivaMxn,
    totalMxn:
      approvedTotalMxn > 0
        ? approvedTotalMxn
        : roundMoney(taxableSubtotalMxn + ivaMxn),
  };
}

function distributeCentsByWeight(
  targetMxn: number,
  weights: number[],
  fallbackWeight = 1
) {
  const targetCents = moneyToCents(targetMxn);
  if (weights.length === 0) return [];

  const normalizedWeights = weights.map((weight) =>
    Math.max(Number.isFinite(weight) ? weight : 0, 0)
  );
  const totalWeight = normalizedWeights.reduce((sum, weight) => sum + weight, 0);
  const effectiveWeights =
    totalWeight > 0
      ? normalizedWeights
      : weights.map(() => Math.max(fallbackWeight, 1));
  const effectiveTotalWeight = effectiveWeights.reduce(
    (sum, weight) => sum + weight,
    0
  );
  let distributedCents = 0;

  return effectiveWeights.map((weight, index) => {
    if (index === effectiveWeights.length - 1) {
      return targetCents - distributedCents;
    }

    const cents = Math.round((targetCents * weight) / effectiveTotalWeight);
    distributedCents += cents;
    return cents;
  });
}

function taxCentsFromBaseCents(baseCents: number) {
  return Math.round(baseCents * IVA_RATE);
}

function sumCents(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

function moveTaxBaseCent(input: {
  baseCents: number[];
  grossCents: number[];
  discountCents: number[];
  direction: 1 | -1;
}) {
  const { baseCents, grossCents, discountCents, direction } = input;

  for (let receiver = 0; receiver < baseCents.length; receiver += 1) {
    for (let donor = 0; donor < baseCents.length; donor += 1) {
      if (receiver === donor) continue;
      if (direction === 1 && baseCents[donor] <= 0) continue;
      if (direction === -1 && baseCents[receiver] <= 0) continue;

      const currentTax =
        taxCentsFromBaseCents(baseCents[receiver]) +
        taxCentsFromBaseCents(baseCents[donor]);
      const nextReceiverBase =
        direction === 1 ? baseCents[receiver] + 1 : baseCents[receiver] - 1;
      const nextDonorBase =
        direction === 1 ? baseCents[donor] - 1 : baseCents[donor] + 1;

      if (nextReceiverBase < 0 || nextDonorBase < 0) continue;
      if (direction === 1 && grossCents[donor] - 1 < discountCents[donor]) {
        continue;
      }
      if (
        direction === -1 &&
        grossCents[receiver] - 1 < discountCents[receiver]
      ) {
        continue;
      }

      const nextTax =
        taxCentsFromBaseCents(nextReceiverBase) +
        taxCentsFromBaseCents(nextDonorBase);

      if (nextTax - currentTax !== direction) continue;

      baseCents[receiver] = nextReceiverBase;
      baseCents[donor] = nextDonorBase;
      grossCents[receiver] += direction === 1 ? 1 : -1;
      grossCents[donor] += direction === 1 ? -1 : 1;
      return true;
    }
  }

  return false;
}

function alignTaxBaseDistribution(input: {
  grossCents: number[];
  discountCents: number[];
  targetIvaMxn: number;
}) {
  const grossCents = [...input.grossCents];
  const discountCents = [...input.discountCents];
  const baseCents = grossCents.map((gross, index) =>
    Math.max(gross - (discountCents[index] || 0), 0)
  );
  const targetIvaCents = moneyToCents(input.targetIvaMxn);
  let currentIvaCents = sumCents(baseCents.map(taxCentsFromBaseCents));
  let remainingIterations = Math.abs(targetIvaCents - currentIvaCents) * 50 + 100;

  while (currentIvaCents !== targetIvaCents && remainingIterations > 0) {
    const direction: 1 | -1 = currentIvaCents < targetIvaCents ? 1 : -1;
    const moved = moveTaxBaseCent({
      baseCents,
      grossCents,
      discountCents,
      direction,
    });

    if (!moved) break;
    currentIvaCents = sumCents(baseCents.map(taxCentsFromBaseCents));
    remainingIterations -= 1;
  }

  return {
    grossCents,
    discountCents,
    baseCents,
    ivaCents: baseCents.map(taxCentsFromBaseCents),
    matchedTargetIva: currentIvaCents === targetIvaCents,
  };
}

function logInvoiceQuoteMismatchDiagnostics(input: {
  quote: ApprovedQuote | null;
  invoice: {
    subtotalMxn: number;
    discountMxn: number;
    taxableSubtotalMxn: number;
    ivaMxn: number;
    totalMxn: number;
  };
  differenceMxn: number;
  concepts: InvoiceConcept[];
}) {
  const quote = input.quote;
  const quoteSubtotalMxn = roundMoney(Number(quote?.subtotal_mxn || 0));
  const quoteDiscountMxn = getQuoteDiscountMxn(quote);
  const quoteTaxableSubtotalMxn = roundMoney(
    Number(quote?.taxable_base_mxn) ||
      Math.max(quoteSubtotalMxn - quoteDiscountMxn, 0)
  );
  const quoteIvaMxn = roundMoney(
    Number(quote?.iva_mxn) ||
      Math.max(
        Number(quote?.total_mxn || quote?.grand_total || 0) -
          quoteTaxableSubtotalMxn,
        0
      )
  );
  const quoteTotalMxn = roundMoney(
    Number(quote?.total_mxn || quote?.grand_total || 0)
  );

  console.warn("[InvoiceForm] factura vs cotizacion aprobada mismatch", {
    quote: {
      id: quote?.id || null,
      quoteNumber: quote?.quote_number || null,
      subtotalMxn: quoteSubtotalMxn,
      ivaMxn: quoteIvaMxn,
      discountMxn: quoteDiscountMxn,
      taxableSubtotalMxn: quoteTaxableSubtotalMxn,
      totalMxn: quoteTotalMxn,
    },
    invoice: input.invoice,
    differenceMxn: input.differenceMxn,
    items: input.concepts.map((concept) => ({
      sourceQuoteItemId: concept.source_quote_item_id,
      productId: concept.product_id,
      description: concept.commercial_description,
      quantity: concept.quantity,
      unitPriceMxn: concept.unit_price_mxn,
      subtotalMxn: concept.subtotal_mxn,
      discountMxn: concept.discount_mxn,
      netAmountMxn: concept.net_amount_mxn,
      ivaMxn: concept.iva_mxn,
      totalMxn: concept.total_mxn,
    })),
  });
}

function getProductDescription(item: QuoteItem) {
  return [item.product_brand, item.product_model, item.product_name]
    .filter(Boolean)
    .join(" ")
    .trim() || `Partida de cotizacion #${item.id}`;
}

function getConceptKey(concept: Pick<InvoiceConcept, "source_quote_item_id" | "sort_order">) {
  return String(concept.source_quote_item_id ?? `manual-${concept.sort_order}`);
}

const sourceOptions: { value: InvoiceSourceType; label: string; enabled: boolean }[] = [
  { value: "quote", label: "Cotizacion aprobada completa", enabled: true },
  { value: "advance", label: "Anticipo", enabled: false },
  { value: "partial", label: "Parcialidad", enabled: false },
  { value: "balance", label: "Saldo", enabled: false },
  { value: "service", label: "Servicio", enabled: false },
  { value: "manual", label: "Manual interno solo admin", enabled: true },
];

export default function InvoiceForm({
  clients,
  projects,
  defaultProjectId,
  defaultClientId,
  allowManual = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientList, setClientList] = useState(clients);
  const [projectId, setProjectId] = useState(String(defaultProjectId || ""));
  const [clientId, setClientId] = useState(String(defaultClientId || ""));
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [sourceType, setSourceType] = useState<InvoiceSourceType>("quote");
  const [quoteId, setQuoteId] = useState("");
  const [approvedQuotes, setApprovedQuotes] = useState<ApprovedQuote[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [manualSubtotal, setManualSubtotal] = useState("");
  const [manualIva, setManualIva] = useState("");
  const [paymentMethodCode, setPaymentMethodCode] = useState<PaymentMethodCode>("PUE");
  const [paymentFormCode, setPaymentFormCode] = useState("03");
  const [paymentFormQuery, setPaymentFormQuery] = useState("");
  const [paymentForms, setPaymentForms] =
    useState<PaymentFormCatalogItem[]>(fallbackPaymentForms);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [fiscalModalIntro, setFiscalModalIntro] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [cfdiDescriptionModalOpen, setCfdiDescriptionModalOpen] = useState(false);
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>(
    {}
  );

  const availableProjects = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((project) => String(project.client_id || "") === clientId);
  }, [clientId, projects]);
  const selectedClient =
    clientList.find((client) => String(client.id) === clientId) || null;
  const selectedQuote =
    approvedQuotes.find((quote) => String(quote.id) === quoteId) || null;
  const missingFiscalFields = clientId
    ? getMissingFiscalFields(selectedClient)
    : [];

  const concepts = useMemo(() => {
    if (sourceType !== "quote" || !selectedQuote) return [] as InvoiceConcept[];

    const grossAmounts = quoteItems.map((item) =>
      roundMoney(getQuoteItemSubtotalMxn(item, selectedQuote))
    );
    const grossSubtotal = roundMoney(
      grossAmounts.reduce((sum, amount) => sum + amount, 0)
    );
    const fiscalSnapshot = getQuoteFiscalSnapshot(selectedQuote, grossSubtotal);
    const grossCents = distributeCentsByWeight(
      fiscalSnapshot.subtotalMxn,
      grossAmounts
    );
    const discountCents = distributeCentsByWeight(
      fiscalSnapshot.discountMxn,
      grossCents
    );
    const adjustedDistribution = alignTaxBaseDistribution({
      grossCents,
      discountCents,
      targetIvaMxn: fiscalSnapshot.ivaMxn,
    });

    return quoteItems.map((item, index) => {
      const product = getRelation(item.products);
      const quantity = Number(item.quantity || 1) || 1;
      const grossAmount = centsToMoney(
        adjustedDistribution.grossCents[index] || 0
      );
      const discount = centsToMoney(
        adjustedDistribution.discountCents[index] || 0
      );
      const netAmount = centsToMoney(
        adjustedDistribution.baseCents[index] || 0
      );
      const iva = getIvaFromTaxBase(netAmount);
      const commercialDescription = getProductDescription(item);
      const conceptKey = String(item.id);
      const fiscalDescription =
        descriptionOverrides[conceptKey] ??
        product?.fiscal_description?.trim() ??
        commercialDescription;

      return {
        source_quote_item_id: item.id,
        product_id: item.product_id,
        commercial_description: commercialDescription,
        description: fiscalDescription,
        quantity,
        unit_price_mxn: roundMoney(grossAmount / quantity),
        subtotal_mxn: grossAmount,
        gross_amount_mxn: grossAmount,
        discount_mxn: discount,
        net_amount_mxn: netAmount,
        iva_mxn: iva,
        total_mxn: roundMoney(netAmount + iva),
        sat_product_service_code: getProductSatProductCode(product),
        sat_unit_code: getProductSatUnitCode(product),
        sat_unit_name: getProductSatUnitName(product),
        fiscal_object: getProductFiscalObject(product),
        sort_order: Number(item.sort_order ?? index),
      };
    });
  }, [descriptionOverrides, quoteItems, selectedQuote, sourceType]);

  const invalidCfdiDescriptions = useMemo(
    () =>
      concepts
        .map((concept) => ({
          concept,
          validation: validateCfdiDescription(concept.description),
        }))
        .filter((item) => !item.validation.ok),
    [concepts]
  );

  const quoteMissingProducts = useMemo(() => {
    const byId = new Map<number, ProductFiscalData & { missing: string[] }>();

    for (const item of quoteItems) {
      const product = getRelation(item.products);
      if (!product?.id) continue;

      const missing = getMissingProductFiscalFields(product);
      if (missing.length > 0) {
        byId.set(product.id, {
          ...product,
          name: product.name || item.product_name,
          missing,
        });
      }
    }

    return [...byId.values()];
  }, [quoteItems]);

  const subtotal = sourceType === "manual"
    ? Number(manualSubtotal || 0)
    : concepts.reduce((sum, item) => sum + item.subtotal_mxn, 0);
  const discount = sourceType === "manual"
    ? 0
    : concepts.reduce((sum, item) => sum + item.discount_mxn, 0);
  const taxableSubtotal = sourceType === "manual"
    ? Number(manualSubtotal || 0)
    : concepts.reduce((sum, item) => sum + item.net_amount_mxn, 0);
  const iva = sourceType === "manual"
    ? Number(manualIva || 0)
    : concepts.reduce((sum, item) => sum + item.iva_mxn, 0);
  const total = taxableSubtotal + iva;
  const sortedPaymentForms = useMemo(
    () => sortPaymentForms(paymentForms.filter((item) => item.is_active)),
    [paymentForms]
  );
  const selectedPaymentForm = sortedPaymentForms.find(
    (item) => item.code === paymentFormCode
  );

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  useEffect(() => {
    if (paymentMethodCode === "PPD") {
      setPaymentFormCode("99");
      setPaymentFormQuery("");
    } else if (paymentFormCode === "99") {
      setPaymentFormCode("03");
    }
  }, [paymentFormCode, paymentMethodCode]);

  useEffect(() => {
    async function loadPaymentForms() {
      const query = paymentFormQuery.trim();
      const codesToLoad = ["03", "04", "28", "01", "02", "99"];

      try {
        const codeResponses = await Promise.all(
          codesToLoad.map((code) =>
            fetch(`/api/sat-catalogs/payment-forms?code=${encodeURIComponent(code)}`)
          )
        );
        const codePayloads = await Promise.all(
          codeResponses.map((response) =>
            response.json() as Promise<{ items?: PaymentFormCatalogItem[] }>
          )
        );
        const commonItems = codePayloads.flatMap((payload) => payload.items || []);
        let searchItems: PaymentFormCatalogItem[] = [];

        if (query.length >= 1) {
          const searchResponse = await fetch(
            `/api/sat-catalogs/payment-forms?q=${encodeURIComponent(query)}`
          );
          const searchPayload = (await searchResponse.json()) as {
            items?: PaymentFormCatalogItem[];
          };
          searchItems = searchPayload.items || [];
        }

        const byCode = new Map<string, PaymentFormCatalogItem>();
        for (const item of [...commonItems, ...searchItems]) {
          byCode.set(item.code, item);
        }

        setPaymentForms(
          byCode.size > 0 ? [...byCode.values()] : fallbackPaymentForms
        );
      } catch {
        setPaymentForms(fallbackPaymentForms);
      }
    }

    loadPaymentForms();
  }, [paymentFormQuery]);

  useEffect(() => {
    async function loadApprovedQuotes() {
      setApprovedQuotes([]);
      setQuoteItems([]);
      setQuoteId("");
      setDescriptionOverrides({});

      if (!projectId) return;

      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, discount_total, discount_amount_mxn, partner_total_discount_mxn, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, grand_total, exchange_rate")
        .eq("client_project_id", projectId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(`Error leyendo cotizaciones aprobadas: ${error.message}`);
        return;
      }

      const quotes = (data || []) as ApprovedQuote[];
      setApprovedQuotes(quotes);
      if (quotes.length === 1) setQuoteId(String(quotes[0].id));
    }

    loadApprovedQuotes();
  }, [projectId]);

  useEffect(() => {
    async function loadQuoteItems() {
      setQuoteItems([]);
      setDescriptionOverrides({});
      if (!quoteId || sourceType !== "quote") return;

      const { data, error } = await supabase
        .from("quote_items")
        .select(
          "id, product_id, quantity, unit_equipment_price_usd, unit_equipment_price, unit_labor_price, equipment_total_usd, equipment_total, labor_total, line_total, product_brand, product_model, product_name, sort_order, products(id, name, sat_product_service_code, sat_unit_code, sat_unit_name, fiscal_object, sat_product_key, sat_unit_key, unit_name, fiscal_description)"
        )
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

      if (error) {
        setErrorMessage(`Error leyendo partidas de cotizacion: ${error.message}`);
        return;
      }

      setQuoteItems((data || []) as unknown as QuoteItem[]);
    }

    loadQuoteItems();
  }, [quoteId, sourceType]);

  function updateProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    const project = projects.find((item) => String(item.id) === nextProjectId);
    if (project?.client_id) setClientId(String(project.client_id));
    setErrorMessage(null);
  }

  function openFiscalModalForMissing() {
    setFiscalModalIntro(
      missingFiscalFields.length > 0
        ? `Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`
        : null
    );
    setFiscalModalOpen(true);
  }

  function handleFiscalSaved(nextClient: FiscalClientData) {
    setClientList((current) =>
      current.map((client) => (client.id === nextClient.id ? { ...client, ...nextClient } : client))
    );
    setErrorMessage(null);
  }

  function handleProductsSaved(products: ProductFiscalData[]) {
    const productMap = new Map(products.map((product) => [product.id, product]));
    setQuoteItems((current) =>
      current.map((item) => {
        const product = item.product_id ? productMap.get(item.product_id) : null;
        const currentProduct = getRelation(item.products) || {};
        return product ? { ...item, products: { ...currentProduct, ...product } } : item;
      })
    );
    setErrorMessage(null);
  }

  function updateCfdiDescription(concept: InvoiceConcept, description: string) {
    setDescriptionOverrides((current) => ({
      ...current,
      [getConceptKey(concept)]: description,
    }));
    setErrorMessage(null);
  }

  function sanitizeConceptDescription(concept: InvoiceConcept) {
    updateCfdiDescription(concept, sanitizeCfdiDescription(concept.description));
  }

  async function saveProductFiscalDescriptions() {
    const byProduct = new Map<number, string>();
    const byQuoteItem = new Map<number, string>();

    for (const concept of concepts) {
      const fiscalDescription = sanitizeCfdiDescription(concept.description);
      if (concept.product_id) byProduct.set(concept.product_id, fiscalDescription);
      if (concept.source_quote_item_id) {
        byQuoteItem.set(concept.source_quote_item_id, fiscalDescription);
      }
    }

    for (const [productId, fiscalDescription] of byProduct) {
      const { error } = await supabase
        .from("products")
        .update({ fiscal_description: fiscalDescription })
        .eq("id", productId);

      if (error) {
        throw new Error(
          `Error guardando descripcion CFDI del producto #${productId}: ${error.message}`
        );
      }
    }

    for (const [quoteItemId, fiscalDescription] of byQuoteItem) {
      const { error } = await supabase
        .from("quote_items")
        .update({ invoice_description_snapshot: fiscalDescription })
        .eq("id", quoteItemId);

      if (error) {
        throw new Error(
          `Error guardando snapshot CFDI de partida #${quoteItemId}: ${error.message}`
        );
      }
    }
  }

  async function isActiveCatalogCode(endpoint: string, code: string) {
    if (!code.trim()) return false;

    const response = await fetch(`${endpoint}?code=${encodeURIComponent(code.trim())}`);
    const payload = (await response.json()) as {
      items?: Array<{ code: string; is_active: boolean }>;
    };

    return Boolean(response.ok && payload.items?.[0]?.is_active);
  }

  async function getConceptFiscalErrors() {
    const messages: string[] = [];

    for (const concept of concepts) {
      const [validProductCode, validUnitCode, validTaxObject] = await Promise.all([
        isActiveCatalogCode(
          "/api/sat-catalogs/product-services",
          concept.sat_product_service_code
        ),
        isActiveCatalogCode("/api/sat-catalogs/units", concept.sat_unit_code),
        isActiveCatalogCode("/api/sat-catalogs/tax-objects", concept.fiscal_object),
      ]);
      const missing: string[] = [];

      if (!validProductCode) {
        missing.push("Codigo SAT producto/servicio requiere actualizacion");
      }
      if (!validUnitCode) {
        missing.push("Clave unidad SAT requiere actualizacion");
      }
      if (!validTaxObject) {
        missing.push("Objeto de impuesto requiere actualizacion");
      }

      if (missing.length > 0) {
        messages.push(`${concept.description}: ${missing.join(", ")}`);
      }
    }

    return messages;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!projectId || !clientId) {
      setErrorMessage("Selecciona cliente y proyecto.");
      return;
    }

    if (missingFiscalFields.length > 0) {
      setErrorMessage(`Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`);
      openFiscalModalForMissing();
      return;
    }

    if (!invoiceDate) {
      setErrorMessage("Selecciona la fecha de factura.");
      return;
    }

    if (paymentMethodCode !== "PUE" && paymentMethodCode !== "PPD") {
      setErrorMessage("Selecciona metodo de pago PUE o PPD.");
      return;
    }

    if (paymentMethodCode === "PPD" && paymentFormCode !== "99") {
      setErrorMessage("Para PPD la forma de pago debe ser 99 Por definir.");
      return;
    }

    if (paymentMethodCode === "PUE" && !selectedPaymentForm?.is_active) {
      setErrorMessage("Seleccione una forma de pago valida del catalogo SAT.");
      return;
    }

    if (sourceType !== "quote" && sourceType !== "manual") {
      setErrorMessage("Este origen esta preparado para una siguiente fase.");
      return;
    }

    if (sourceType === "manual" && !allowManual) {
      setErrorMessage("La captura manual solo esta disponible para administradores.");
      return;
    }

    if (sourceType === "quote" && !quoteId) {
      setErrorMessage("Selecciona una cotizacion aprobada.");
      return;
    }

    if (sourceType === "quote" && concepts.length === 0) {
      setErrorMessage("No se encontraron conceptos facturables.");
      return;
    }

    if (sourceType === "quote" && invalidCfdiDescriptions.length > 0) {
      setErrorMessage("Estos conceptos requieren correccion para facturar.");
      setCfdiDescriptionModalOpen(true);
      return;
    }

    if (sourceType === "quote" && quoteMissingProducts.length > 0) {
      setErrorMessage("Faltan datos fiscales en productos de la cotizacion.");
      setProductModalOpen(true);
      return;
    }

    if (sourceType === "quote") {
      const conceptFiscalErrors = await getConceptFiscalErrors();

      if (conceptFiscalErrors.length > 0) {
        setErrorMessage(`Faltan datos fiscales en conceptos: ${conceptFiscalErrors.join(" | ")}`);
        setProductModalOpen(true);
        return;
      }
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      setErrorMessage(
        sourceType === "quote"
          ? "No se encontraron conceptos facturables."
          : "La factura debe tener subtotal mayor a cero."
      );
      return;
    }

    if (sourceType === "quote") {
      const subtotalValue = roundMoney(subtotal);
      const discountValue = roundMoney(discount);
      const taxableSubtotalValue = roundMoney(taxableSubtotal);
      const ivaValue = roundMoney(iva);
      const selectedQuoteSnapshot = getQuoteFiscalSnapshot(
        selectedQuote,
        subtotalValue
      );
      const selectedQuoteTotal = selectedQuoteSnapshot.totalMxn;
      const calculatedTotal = roundMoney(taxableSubtotalValue + ivaValue);

      if (discountValue > subtotalValue) {
        setErrorMessage("El descuento no puede ser mayor que el subtotal bruto.");
        return;
      }

      if (Math.abs(roundMoney(subtotalValue - discountValue) - taxableSubtotalValue) > 0.01) {
        logInvoiceQuoteMismatchDiagnostics({
          quote: selectedQuote,
          invoice: {
            subtotalMxn: subtotalValue,
            discountMxn: discountValue,
            taxableSubtotalMxn: taxableSubtotalValue,
            ivaMxn: ivaValue,
            totalMxn: calculatedTotal,
          },
          differenceMxn: roundMoney(calculatedTotal - selectedQuoteTotal),
          concepts,
        });
        setErrorMessage("El descuento prorrateado no cuadra con el subtotal neto.");
        return;
      }

      if (selectedQuoteTotal > 0 && Math.abs(calculatedTotal - selectedQuoteTotal) > 0.05) {
        logInvoiceQuoteMismatchDiagnostics({
          quote: selectedQuote,
          invoice: {
            subtotalMxn: subtotalValue,
            discountMxn: discountValue,
            taxableSubtotalMxn: taxableSubtotalValue,
            ivaMxn: ivaValue,
            totalMxn: calculatedTotal,
          },
          differenceMxn: roundMoney(calculatedTotal - selectedQuoteTotal),
          concepts,
        });
        setErrorMessage("El total de la factura no cuadra con la cotizacion aprobada.");
        return;
      }
    }

    setSaving(true);

    if (sourceType === "quote") {
      try {
        await saveProductFiscalDescriptions();
      } catch (error) {
        setSaving(false);
        setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la descripcion CFDI.");
        return;
      }
    }

    let invoice: CreatedInvoice | null = null;
    let insertError: unknown = null;
    const subtotalValue = roundMoney(subtotal);
    const discountValue = roundMoney(discount);
    const taxableSubtotalValue = roundMoney(taxableSubtotal);
    const ivaValue = roundMoney(iva);
    const totalValue = roundMoney(total);
    const paymentComplement = getPaymentComplementStatus(paymentMethodCode);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const internalFolio = await getNextInternalInvoiceFolio(supabase);
      const invoicePayload = {
        internal_folio: internalFolio,
        client_project_id: Number(projectId),
        client_id: Number(clientId),
        source_type: sourceType,
        source_quote_id: sourceType === "quote" ? Number(quoteId) : null,
        invoice_date: invoiceDate,
        subtotal_mxn: subtotalValue,
        discount_mxn: discountValue,
        taxable_subtotal_mxn: taxableSubtotalValue,
        iva_mxn: ivaValue,
        total_mxn: totalValue,
        payment_method_code: paymentMethodCode,
        payment_form_code: paymentMethodCode === "PPD" ? "99" : paymentFormCode,
        requires_payment_complement: paymentComplement.requiresPaymentComplement,
        payment_complement_status: paymentComplement.paymentComplementStatus,
        status: "draft",
      };
      let result = await supabase
        .from("project_invoices")
        .insert({
          ...invoicePayload,
          subtotal: subtotalValue,
          iva: ivaValue,
          total: totalValue,
        })
        .select("id, internal_folio")
        .single();

      if (result.error && isMissingLegacyAmountColumnError(result.error)) {
        result = await supabase
          .from("project_invoices")
          .insert(invoicePayload)
          .select("id, internal_folio")
          .single();
      }

      if (!result.error && result.data) {
        invoice = result.data as CreatedInvoice;
        insertError = null;
        break;
      }

      insertError = result.error;
      if (!isDuplicateInternalFolioError(result.error)) break;
    }

    if (insertError || !invoice) {
      setSaving(false);
      const message =
        insertError &&
        typeof insertError === "object" &&
        "message" in insertError &&
        typeof insertError.message === "string"
          ? insertError.message
          : "No se recibio factura";
      setErrorMessage(`Error al guardar factura: ${message}`);
      return;
    }

    const itemsToInsert =
      sourceType === "quote"
        ? concepts.map((item) => ({
            project_invoice_id: invoice.id,
            source_quote_item_id: item.source_quote_item_id,
            product_id: item.product_id,
            description: sanitizeCfdiDescription(item.description),
            quantity: item.quantity,
            unit_price_mxn: item.unit_price_mxn,
            subtotal_mxn: item.subtotal_mxn,
            gross_amount_mxn: item.gross_amount_mxn,
            discount_mxn: item.discount_mxn,
            net_amount_mxn: item.net_amount_mxn,
            iva_mxn: item.iva_mxn,
            total_mxn: item.total_mxn,
            sat_product_service_code: item.sat_product_service_code,
            sat_unit_code: item.sat_unit_code,
            sat_unit_name: item.sat_unit_name,
            fiscal_object: item.fiscal_object,
            sort_order: item.sort_order,
          }))
        : [
            {
              project_invoice_id: invoice.id,
              source_quote_item_id: null,
              product_id: null,
              description: "Concepto manual interno",
              quantity: 1,
              unit_price_mxn: subtotalValue,
              subtotal_mxn: subtotalValue,
              gross_amount_mxn: subtotalValue,
              discount_mxn: 0,
              net_amount_mxn: subtotalValue,
              iva_mxn: ivaValue,
              total_mxn: totalValue,
              sat_product_service_code: "81161700",
              sat_unit_code: "E48",
              sat_unit_name: "Unidad de servicio",
              fiscal_object: "02",
              sort_order: 0,
            },
          ];

    const { error: itemsError } = await supabase
      .from("project_invoice_items")
      .insert(itemsToInsert);

    setSaving(false);

    if (itemsError) {
      setErrorMessage(`Error al guardar conceptos: ${itemsError.message}`);
      return;
    }

    setOpen(false);
    setProjectId(String(defaultProjectId || ""));
    setClientId(String(defaultClientId || ""));
    setInvoiceDate(today());
    setSourceType("quote");
    setQuoteId("");
    setQuoteItems([]);
    setManualSubtotal("");
    setManualIva("");
    setPaymentMethodCode("PUE");
    setPaymentFormCode("03");
    setPaymentFormQuery("");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C]"
      >
        <Plus size={18} />
        Nueva factura
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Factura interna</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Genera el borrador desde conceptos reales antes de timbrar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {errorMessage ? (
              <div className="mb-5 rounded-xl border border-[#6A2A2A] bg-[#351818] p-4 text-sm text-[#FFB4B4]">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Fecha</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Cliente</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={clientId}
                  disabled={Boolean(defaultClientId)}
                  onChange={(event) => {
                    setClientId(event.target.value);
                    setProjectId("");
                    setErrorMessage(null);
                  }}
                >
                  <option value="">Seleccionar cliente</option>
                  {clientList.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name || `Cliente #${client.id}`}
                      {client.tax_rfc ? ` / ${client.tax_rfc}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Proyecto</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={projectId}
                  disabled={Boolean(defaultProjectId)}
                  onChange={(event) => updateProject(event.target.value)}
                >
                  <option value="">Seleccionar proyecto</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name || `Proyecto #${project.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Origen de factura</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value as InvoiceSourceType)}
                >
                  {sourceOptions
                    .filter((option) => option.value !== "manual" || allowManual)
                    .map((option) => (
                      <option key={option.value} value={option.value} disabled={!option.enabled}>
                        {option.label}
                        {option.enabled ? "" : " - proximamente"}
                      </option>
                    ))}
                </select>
              </label>

              {sourceType === "quote" ? (
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-[#B3B3B8]">Cotizacion aprobada</span>
                  <select
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                    value={quoteId}
                    onChange={(event) => setQuoteId(event.target.value)}
                  >
                    <option value="">Seleccionar cotizacion</option>
                    {approvedQuotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.quote_number || `Cotizacion #${quote.id}`} /{" "}
                        {formatCurrency(
                          quote.total_mxn || quote.grand_total || 0,
                          "MXN"
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {sourceType === "manual" && allowManual ? (
                <>
                  <label className="space-y-2">
                    <span className="text-sm text-[#B3B3B8]">Subtotal manual</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                      value={manualSubtotal}
                      onChange={(event) => {
                        setManualSubtotal(event.target.value);
                        setManualIva((Number(event.target.value || 0) * 0.16).toFixed(2));
                      }}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-[#B3B3B8]">IVA manual</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                      value={manualIva}
                      onChange={(event) => setManualIva(event.target.value)}
                    />
                  </label>
                </>
              ) : null}
            </div>

            <section className="mt-6 rounded-2xl border border-[#2A2A30] bg-[#101114] p-4">
              <h3 className="text-xl font-semibold">Condiciones de pago CFDI</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-[#B3B3B8]">Metodo de pago</span>
                  <select
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                    value={paymentMethodCode}
                    onChange={(event) =>
                      setPaymentMethodCode(event.target.value as PaymentMethodCode)
                    }
                  >
                    {paymentMethodOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <label className="block space-y-2">
                    <span className="text-sm text-[#B3B3B8]">Forma de pago</span>
                    <select
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                      value={paymentFormCode}
                      disabled={paymentMethodCode === "PPD"}
                      onChange={(event) => setPaymentFormCode(event.target.value)}
                    >
                      {paymentMethodCode === "PPD" ? (
                        <option value="99">99 - Por definir</option>
                      ) : (
                        sortedPaymentForms
                          .filter((item) => item.code !== "99")
                          .map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.code} - {item.name}
                            </option>
                          ))
                      )}
                    </select>
                  </label>
                  {paymentMethodCode === "PUE" ? (
                    <input
                      type="search"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-2 text-sm outline-none"
                      value={paymentFormQuery}
                      placeholder="Buscar forma de pago SAT"
                      onChange={(event) => setPaymentFormQuery(event.target.value)}
                    />
                  ) : (
                    <p className="rounded-xl border border-[#614620] bg-[#322514] p-3 text-sm text-[#F4C66A]">
                      En PPD la forma de pago debe ser 99 Por definir. Los pagos reales se timbraran despues mediante complemento de pago.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {selectedClient ? (
              <div
                className={`mt-5 rounded-xl border p-4 text-sm ${
                  missingFiscalFields.length > 0
                    ? "border-[#614620] bg-[#322514] text-[#F4C66A]"
                    : "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    {missingFiscalFields.length > 0
                      ? `Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`
                      : "Datos fiscales completos para facturacion."}
                  </p>
                  <button
                    type="button"
                    onClick={openFiscalModalForMissing}
                    className="w-fit rounded-xl border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/15"
                  >
                    {missingFiscalFields.length > 0
                      ? "Completar datos fiscales"
                      : "Editar datos fiscales"}
                  </button>
                </div>
              </div>
            ) : null}

            {sourceType === "quote" ? (
              <section className="mt-6 rounded-2xl border border-[#2A2A30] bg-[#101114] p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Conceptos fiscales</h3>
                    <p className="mt-1 text-sm text-[#B3B3B8]">
                      Se generan desde partidas de la cotizacion aprobada.
                    </p>
                  </div>
                  {quoteMissingProducts.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setProductModalOpen(true)}
                      className="w-fit rounded-xl border border-[#614620] bg-[#322514] px-4 py-2 text-sm font-semibold text-[#F4C66A] hover:bg-[#3C2B16]"
                    >
                      Completar productos fiscales
                    </button>
                  ) : null}
                </div>

                {quoteId && concepts.length === 0 ? (
                  <p className="text-sm text-[#77777D]">Sin partidas para facturar.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A30] text-left text-[#B3B3B8]">
                          <th className="px-3 py-3">Concepto</th>
                          <th className="px-3 py-3">Descripcion CFDI</th>
                          <th className="px-3 py-3 text-right">Cantidad</th>
                          <th className="px-3 py-3 text-right">Bruto</th>
                          <th className="px-3 py-3 text-right">Descuento</th>
                          <th className="px-3 py-3 text-right">Neto</th>
                          <th className="px-3 py-3 text-right">IVA</th>
                          <th className="px-3 py-3 text-right">Total</th>
                          <th className="px-3 py-3">SAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {concepts.map((concept) => {
                          const validation = validateCfdiDescription(concept.description);

                          return (
                            <tr key={getConceptKey(concept)} className="border-b border-[#222228]">
                              <td className="px-3 py-3">{concept.commercial_description}</td>
                              <td className="px-3 py-3">
                                <div className="max-w-[280px] space-y-2">
                                  <p className="line-clamp-2 text-white">
                                    {concept.description || "Sin descripcion"}
                                  </p>
                                  {!validation.ok ? (
                                    <p className="text-xs text-[#F4C66A]">
                                      {validation.errors.join(" ")}
                                    </p>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => setCfdiDescriptionModalOpen(true)}
                                    className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/15"
                                  >
                                    Editar
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right">{concept.quantity}</td>
                              <td className="px-3 py-3 text-right">
                                {formatCurrency(concept.gross_amount_mxn, "MXN")}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {formatCurrency(concept.discount_mxn, "MXN")}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {formatCurrency(concept.net_amount_mxn, "MXN")}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {formatCurrency(concept.iva_mxn, "MXN")}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {formatCurrency(concept.total_mxn, "MXN")}
                              </td>
                              <td className="px-3 py-3 text-[#B3B3B8]">
                                {concept.sat_product_service_code && concept.sat_unit_code
                                  ? `${concept.sat_product_service_code} / ${concept.sat_unit_code}`
                                  : "Incompleto"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}

            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label="Subtotal bruto" value={formatCurrency(subtotal, "MXN")} />
              <Metric label="Descuento" value={formatCurrency(discount, "MXN")} />
              <Metric label="Subtotal neto" value={formatCurrency(taxableSubtotal, "MXN")} />
              <Metric label="IVA" value={formatCurrency(iva, "MXN")} />
              <Metric label="Total" value={formatCurrency(total, "MXN")} />
            </section>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {saving ? "Guardando..." : "Crear borrador"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ClientFiscalDataModal
        client={selectedClient}
        open={fiscalModalOpen}
        intro={fiscalModalIntro}
        onClose={() => setFiscalModalOpen(false)}
        onSaved={handleFiscalSaved}
      />

      <ProductFiscalDataModal
        open={productModalOpen}
        products={quoteMissingProducts}
        onClose={() => setProductModalOpen(false)}
        onSaved={handleProductsSaved}
      />

      {cfdiDescriptionModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/75 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Descripcion CFDI</h3>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Estos conceptos requieren correccion para facturar cuando contienen caracteres no permitidos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCfdiDescriptionModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {concepts.map((concept) => {
                const validation = validateCfdiDescription(concept.description);

                return (
                  <div
                    key={getConceptKey(concept)}
                    className={`rounded-xl border p-4 ${
                      validation.ok
                        ? "border-[#2A2A30] bg-[#101114]"
                        : "border-[#614620] bg-[#322514]"
                    }`}
                  >
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold">{concept.commercial_description}</p>
                        <p className="mt-1 text-xs text-[#B3B3B8]">
                          Se guardara como descripcion fiscal del producto y snapshot de factura.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => sanitizeConceptDescription(concept)}
                        className="w-fit rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                      >
                        Limpiar texto
                      </button>
                    </div>
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 text-sm outline-none"
                      value={concept.description}
                      maxLength={CFDI_DESCRIPTION_MAX_LENGTH}
                      onChange={(event) =>
                        updateCfdiDescription(concept, event.target.value)
                      }
                    />
                    <div className="mt-2 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <p className={validation.ok ? "text-[#8CE0B6]" : "text-[#F4C66A]"}>
                        {validation.ok ? "Lista para CFDI." : validation.errors.join(" ")}
                      </p>
                      <p className="text-[#77777D]">
                        {concept.description.trim().length}/{CFDI_DESCRIPTION_MAX_LENGTH}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setCfdiDescriptionModalOpen(false)}
                disabled={invalidCfdiDescriptions.length > 0}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                Guardar correcciones
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
      <p className="mb-2 text-sm text-[#B3B3B8]">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
