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
  subtotal_mxn: number | null;
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
  description: string;
  quantity: number;
  unit_price_mxn: number;
  subtotal_mxn: number;
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) return relation[0] || null;
  return relation || null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
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

function getProductDescription(item: QuoteItem) {
  return [item.product_brand, item.product_model, item.product_name]
    .filter(Boolean)
    .join(" ")
    .trim() || `Partida de cotizacion #${item.id}`;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [fiscalModalIntro, setFiscalModalIntro] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

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

    return quoteItems.map((item, index) => {
      const product = getRelation(item.products);
      const quantity = Number(item.quantity || 1) || 1;
      const subtotal = roundMoney(getQuoteItemSubtotalMxn(item, selectedQuote));
      const iva = roundMoney(subtotal * 0.16);

      return {
        source_quote_item_id: item.id,
        product_id: item.product_id,
        description: getProductDescription(item),
        quantity,
        unit_price_mxn: roundMoney(subtotal / quantity),
        subtotal_mxn: subtotal,
        iva_mxn: iva,
        total_mxn: roundMoney(subtotal + iva),
        sat_product_service_code: getProductSatProductCode(product),
        sat_unit_code: getProductSatUnitCode(product),
        sat_unit_name: getProductSatUnitName(product),
        fiscal_object: getProductFiscalObject(product),
        sort_order: Number(item.sort_order ?? index),
      };
    });
  }, [quoteItems, selectedQuote, sourceType]);

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
  const iva = sourceType === "manual"
    ? Number(manualIva || 0)
    : concepts.reduce((sum, item) => sum + item.iva_mxn, 0);
  const total = subtotal + iva;

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  useEffect(() => {
    async function loadApprovedQuotes() {
      setApprovedQuotes([]);
      setQuoteItems([]);
      setQuoteId("");

      if (!projectId) return;

      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, subtotal_mxn, iva_mxn, total_mxn, grand_total, exchange_rate")
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
      if (!quoteId || sourceType !== "quote") return;

      const { data, error } = await supabase
        .from("quote_items")
        .select(
          "id, product_id, quantity, unit_equipment_price_usd, unit_equipment_price, unit_labor_price, equipment_total_usd, equipment_total, labor_total, line_total, product_brand, product_model, product_name, sort_order, products(id, name, sat_product_service_code, sat_unit_code, sat_unit_name, fiscal_object, sat_product_key, sat_unit_key, unit_name)"
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
      setErrorMessage("La cotizacion aprobada no tiene partidas para facturar.");
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
      setErrorMessage("La factura debe tener subtotal mayor a cero.");
      return;
    }

    setSaving(true);

    let invoice: CreatedInvoice | null = null;
    let insertError: unknown = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const internalFolio = await getNextInternalInvoiceFolio(supabase);
      const result = await supabase
        .from("project_invoices")
        .insert({
          internal_folio: internalFolio,
          client_project_id: Number(projectId),
          client_id: Number(clientId),
          source_type: sourceType,
          source_quote_id: sourceType === "quote" ? Number(quoteId) : null,
          invoice_date: invoiceDate,
          subtotal_mxn: roundMoney(subtotal),
          iva_mxn: roundMoney(iva),
          total_mxn: roundMoney(total),
          status: "draft",
        })
        .select("id, internal_folio")
        .single();

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
            ...item,
          }))
        : [
            {
              project_invoice_id: invoice.id,
              source_quote_item_id: null,
              product_id: null,
              description: "Concepto manual interno",
              quantity: 1,
              unit_price_mxn: roundMoney(subtotal),
              subtotal_mxn: roundMoney(subtotal),
              iva_mxn: roundMoney(iva),
              total_mxn: roundMoney(total),
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
                    <table className="w-full min-w-[820px] text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A30] text-left text-[#B3B3B8]">
                          <th className="px-3 py-3">Concepto</th>
                          <th className="px-3 py-3 text-right">Cantidad</th>
                          <th className="px-3 py-3 text-right">Subtotal</th>
                          <th className="px-3 py-3 text-right">IVA</th>
                          <th className="px-3 py-3 text-right">Total</th>
                          <th className="px-3 py-3">SAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {concepts.map((concept) => (
                          <tr key={concept.source_quote_item_id} className="border-b border-[#222228]">
                            <td className="px-3 py-3">{concept.description}</td>
                            <td className="px-3 py-3 text-right">{concept.quantity}</td>
                            <td className="px-3 py-3 text-right">
                              {formatCurrency(concept.subtotal_mxn, "MXN")}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}

            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label="Subtotal" value={formatCurrency(subtotal, "MXN")} />
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
