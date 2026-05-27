import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import PrintQuoteButton from "./PrintQuoteButton";

type Quote = {
  id: number;
  quote_number: string | null;
  status: string | null;
  client_id: number | null;
  client_project_id?: number | null;
  equipment_total: number | null;
  labor_total: number | null;
  grand_total: number | null;
  discount_type?: string | null;
  discount_percent?: number | null;
  discount_amount_mxn?: number | null;
  subtotal_mxn?: number | null;
  taxable_base_mxn?: number | null;
  iva_mxn?: number | null;
  total_mxn?: number | null;
  exchange_rate: number | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  notes?: string | null;
  created_at: string | null;
};

type Client = {
  name: string | null;
  company_name: string | null;
};

type ClientProject = {
  name: string | null;
};

type QuoteSection = {
  id: number;
  name: string | null;
  equipment_total: number | null;
  labor_total: number | null;
};

type QuoteItem = {
  id: number;
  quote_section_id: number;
  quantity: number | null;
  sale_currency: string | null;
  unit_equipment_price: number | null;
  unit_equipment_price_usd?: number | null;
  equipment_total_usd?: number | null;
  unit_labor_price: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
};

type QuoteTermsSettings = {
  payment_100_equipment: boolean;
  labor_payment_mode: string;
  payment_100_advance: boolean;
  is_local_guadalajara: boolean;
  includes_travel_expenses: boolean;
  includes_conduit: boolean;
  includes_cabling: boolean;
};

const defaultTermsSettings: QuoteTermsSettings = {
  payment_100_equipment: true,
  labor_payment_mode: "50_50",
  payment_100_advance: false,
  is_local_guadalajara: true,
  includes_travel_expenses: false,
  includes_conduit: false,
  includes_cabling: false,
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getEquipmentUnitPriceUsd(item: QuoteItem, exchangeRate: number) {
  if (item.unit_equipment_price_usd != null) {
    return Number(item.unit_equipment_price_usd || 0);
  }

  if ((item.sale_currency || "USD").toUpperCase() === "MXN") {
    return exchangeRate > 0
      ? Number(item.unit_equipment_price || 0) / exchangeRate
      : 0;
  }

  return Number(item.unit_equipment_price || 0);
}

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  let { data: quote, error } = (await supabase
    .from("quotes")
    .select(
      "id, quote_number, status, client_id, client_project_id, equipment_total, labor_total, grand_total, discount_type, discount_percent, discount_amount_mxn, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, exchange_rate, exchange_rate_source, exchange_rate_date, notes, created_at"
    )
    .eq("id", id)
    .single()) as {
    data: Quote | null;
    error: { code?: string; message: string } | null;
  };

  if (
    error &&
    error.code === "PGRST204" &&
    (error.message.includes("client_project_id") ||
      error.message.includes("exchange_rate_source") ||
      error.message.includes("exchange_rate_date") ||
      error.message.includes("notes") ||
      error.message.includes("total_mxn"))
  ) {
    const fallback = (await supabase
      .from("quotes")
      .select(
        "id, quote_number, status, client_id, equipment_total, labor_total, grand_total, exchange_rate, created_at"
      )
      .eq("id", id)
      .single()) as {
      data: Quote | null;
      error: { code?: string; message: string } | null;
    };

    quote = fallback.data;
    error = fallback.error;
  }

  if (error || !quote) {
    return (
      <main className="min-h-screen bg-white text-[#151518] p-10">
        <h1 className="text-2xl font-semibold">Cotizacion no encontrada</h1>
      </main>
    );
  }

  const { data: client } = quote.client_id
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", quote.client_id)
        .maybeSingle()
    : { data: null };

  const { data: clientProject } = quote.client_project_id
    ? await supabase
        .from("client_projects")
        .select("name")
        .eq("id", quote.client_project_id)
        .maybeSingle()
    : { data: null };

  const { data: sections } = await supabase
    .from("quote_sections")
    .select("id, name, equipment_total, labor_total")
    .eq("quote_id", id)
    .order("sort_order", { ascending: true });

  let { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select(
      "id, quote_section_id, quantity, sale_currency, unit_equipment_price, unit_equipment_price_usd, equipment_total_usd, unit_labor_price, product_brand, product_model, product_name, product_image_url"
    )
    .eq("quote_id", id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    const fallbackItems = await supabase
      .from("quote_items")
      .select(
        "id, quote_section_id, quantity, sale_currency, unit_equipment_price, unit_labor_price, product_brand, product_model, product_name, product_image_url"
      )
      .eq("quote_id", id)
      .order("sort_order", { ascending: true });

    items = fallbackItems.data as typeof items;
  }

  const { data: terms } = await supabase
    .from("quote_terms_settings")
    .select(
      "payment_100_equipment, labor_payment_mode, payment_100_advance, is_local_guadalajara, includes_travel_expenses, includes_conduit, includes_cabling"
    )
    .eq("quote_id", id)
    .maybeSingle();

  const quoteData = quote as Quote;
  const clientData = client as Client | null;
  const projectData = clientProject as ClientProject | null;
  const quoteSections = (sections || []) as QuoteSection[];
  const quoteItems = (items || []) as QuoteItem[];
  const termsSettings = {
    ...defaultTermsSettings,
    ...(terms as Partial<QuoteTermsSettings> | null),
  };
  const exchangeRate = Number(quoteData.exchange_rate || 1);
  const laborTotal = Number(quoteData.labor_total || 0);
  const subtotalMXN =
    Number(quoteData.subtotal_mxn) ||
    Number(quoteData.equipment_total || 0) * exchangeRate + laborTotal;
  const discountMXN = Number(quoteData.discount_amount_mxn || 0);
  const taxableBaseMXN =
    Number(quoteData.taxable_base_mxn) || subtotalMXN - discountMXN;
  const ivaMXN = Number(quoteData.iva_mxn) || taxableBaseMXN * 0.16;
  const totalMXN =
    Number(quoteData.total_mxn) ||
    Number(quoteData.grand_total) ||
    taxableBaseMXN + ivaMXN;

  const paymentTerms = termsSettings.payment_100_advance
    ? ["Anticipo: 100% del total de la propuesta."]
    : [
        `Anticipo: 100% del monto de equipos en USD: ${formatCurrency(
          quoteData.equipment_total,
          "USD"
        )}`,
        `Avance para inicio de trabajos: 50% de mano de obra MXN: ${formatCurrency(
          laborTotal * 0.5,
          "MXN"
        )}`,
        `Finiquito: 50% de mano de obra MXN: ${formatCurrency(
          laborTotal * 0.5,
          "MXN"
        )}`,
      ];

  const conduitAndCablingTerm =
    termsSettings.includes_conduit && termsSettings.includes_cabling
      ? "Incluye canalizaciones y cableado."
      : termsSettings.includes_conduit && !termsSettings.includes_cabling
        ? "Incluye canalizaciones; no incluye cableado."
        : !termsSettings.includes_conduit && termsSettings.includes_cabling
          ? "No incluye canalizaciones; si incluye cableado."
          : "No incluye canalizaciones ni cableados.";

  const commercialTerms = [
    ...paymentTerms,
    "Todos los precios de equipos estan expresados en USD y la mano de obra en MXN.",
    "El pago debera ser en Pesos Mexicanos, considerando el Tipo de Cambio DOF del dia de pago.",
    "Incluye 16% de IVA.",
    "Los precios fueron calculados para venta en conjunto; si el cliente adquiere solo una parte, quedan sujetos a revision.",
    "No se aceptan cancelaciones de equipo.",
    "La cuantificacion de cable es estimada conforme a trayectorias en plano; cualquier complemento sera cobrado como adicional.",
    termsSettings.is_local_guadalajara
      ? "Nuestro precio es L.A.B. en la ubicacion de la obra en Guadalajara, Jalisco."
      : "El presupuesto incluye viaticos considerados para los dias de trabajo calculados; en caso de requerir dias adicionales, se dara aviso al cliente y deberan ser pagados junto con el finiquito.",
    ...(laborTotal > 0
      ? [
          "Incluye suministro, programacion, puesta en marcha, capacitacion y mano de obra de instalacion.",
        ]
      : []),
    conduitAndCablingTerm,
  ];

  function getSectionItems(sectionId: number) {
    return quoteItems.filter((item) => item.quote_section_id === sectionId);
  }

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] text-[#111318] py-5">
      <style>{`
        @page {
          size: letter;
          margin: 10mm;
        }

        .print-root {
          font-family: Arial, Helvetica, sans-serif;
        }

        .print-keep-together,
        .print-avoid-break,
        .totals-box,
        .notes-box,
        .terms-box,
        .line-item-row {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .totals-box {
          break-before: auto;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        @media print {
          html,
          body {
            background: white !important;
            font-size: 10.5px !important;
          }

          body > div > aside,
          body aside,
          body header:not(.quote-print-header),
          nav,
          .admin-sidebar,
          .admin-nav,
          .mobile-admin-header,
          .admin-menu-button,
          .admin-menu-overlay,
          .admin-user-card,
          .no-print,
          .print-actions {
            display: none !important;
          }

          body > div,
          .admin-print-route,
          main {
            display: block !important;
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }

          .document {
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10.5px !important;
            line-height: 1.35 !important;
          }

          .print-avoid-break,
          .totals-box,
          .notes-box,
          .terms-box,
          .line-item-row {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .quote-print-header {
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }

          .quote-print-logo-wrap {
            height: 28px !important;
            margin-bottom: 6px !important;
          }

          .quote-print-logo {
            max-height: 28px !important;
            max-width: 112px !important;
          }

          .quote-print-kicker {
            font-size: 8.5px !important;
            letter-spacing: 0.12em !important;
          }

          .quote-print-meta {
            font-size: 9px !important;
            line-height: 1.35 !important;
          }

          .quote-print-folio {
            font-size: 14px !important;
            line-height: 1.2 !important;
          }

          .client-project-grid {
            gap: 8px !important;
            margin-bottom: 12px !important;
            font-size: 10px !important;
          }

          .client-project-card {
            padding: 8px 10px !important;
          }

          .client-project-label {
            margin-bottom: 2px !important;
            font-size: 8.5px !important;
            letter-spacing: 0.1em !important;
          }

          .client-project-title {
            font-size: 12px !important;
            line-height: 1.25 !important;
          }

          .quote-sections {
            margin-top: 0 !important;
          }

          .quote-sections > :not([hidden]) ~ :not([hidden]) {
            margin-top: 12px !important;
          }

          .section-block {
            break-inside: auto;
            page-break-inside: auto;
          }

          .section-heading {
            margin-bottom: 4px !important;
            padding-bottom: 4px !important;
            break-after: avoid;
            page-break-after: avoid;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .section-heading h2 {
            font-size: 13px !important;
            line-height: 1.25 !important;
          }

          .section-heading-meta {
            font-size: 9px !important;
          }

          .quote-items-table {
            break-inside: auto;
            page-break-inside: auto;
            font-size: 9px !important;
          }

          .quote-items-table thead {
            display: table-header-group;
            break-after: avoid;
            page-break-after: avoid;
          }

          .quote-items-table tbody {
            break-inside: auto;
            page-break-inside: auto;
          }

          .quote-items-table th,
          .quote-items-table td {
            padding: 3px 5px !important;
            line-height: 1.25 !important;
          }

          .quote-items-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .quote-items-table tbody tr:nth-child(-n + 2) {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .product-image-box {
            width: 36px !important;
            height: 36px !important;
          }

          .product-image {
            max-width: 36px !important;
            max-height: 36px !important;
          }

          .section-subtotal {
            margin-top: 4px !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .section-subtotal > div {
            width: 210px !important;
            font-size: 9px !important;
          }

          .totals-box {
            break-before: auto;
            break-inside: avoid;
            page-break-inside: avoid;
            width: 250px !important;
            padding: 10px !important;
            font-size: 10px !important;
          }

          .totals-box .total-line {
            font-size: 13px !important;
          }

          .notes-box,
          .terms-box {
            margin-top: 14px !important;
            padding-top: 10px !important;
          }

          .notes-box h3,
          .terms-box h3 {
            font-size: 12px !important;
            margin-bottom: 4px !important;
          }

          .terms-box ol,
          .notes-box div {
            font-size: 9px !important;
            line-height: 1.35 !important;
          }

          img {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[8.5in] max-w-[calc(100vw-32px)] items-center justify-between">
        <Link href={`/quotes/${quoteData.id}`} className="text-xs text-[#5F626A]">
          Volver a cotizacion
        </Link>
        <PrintQuoteButton />
      </div>

      <article className="document mx-auto w-[8.5in] min-h-[11in] max-w-[calc(100vw-32px)] bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="quote-print-logo-wrap mb-3 flex h-11 items-center">
              <img
                src="/logo-print.png"
                alt="ALFA OS"
                className="quote-print-logo max-h-11 max-w-36"
              />
            </div>
            <p className="quote-print-kicker text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Propuesta comercial
            </p>
          </div>

          <div className="quote-print-meta text-right text-[11px] leading-5 text-[#555963]">
            <p className="quote-print-folio text-xl font-semibold text-[#111318]">
              {quoteData.quote_number || "Sin folio"}
            </p>
            <p>Status: {quoteData.status || "Sin estado"}</p>
            <p>Fecha: {formatDate(quoteData.created_at)}</p>
            <p>TC USD/MXN: {formatNumber(exchangeRate)}</p>
            <p>
              {quoteData.exchange_rate_source || "manual"}{" "}
              {quoteData.exchange_rate_date || ""}
            </p>
          </div>
        </header>

        <section className="client-project-grid mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="client-project-card border border-[#E1DDD5] p-4">
            <p className="client-project-label mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Atencion a
            </p>
            <p className="client-project-title text-base font-semibold">
              {clientData?.name || "Sin cliente"}
            </p>
            <p className="mt-1 text-[#555963]">
              {clientData?.company_name || ""}
            </p>
          </div>

          <div className="client-project-card border border-[#E1DDD5] p-4">
            <p className="client-project-label mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Proyecto / oportunidad
            </p>
            <p className="client-project-title text-base font-semibold">
              {projectData?.name || "Sin proyecto"}
            </p>
          </div>
        </section>

        <section className="quote-sections space-y-6">
          {quoteSections.map((section) => {
            const sectionItems = getSectionItems(section.id);

            return (
              <div key={section.id} className="section section-block">
                <div className="section-heading print-avoid-break mb-2 flex items-end justify-between border-b border-[#D6D1C8] pb-2">
                  <h2 className="text-base font-semibold">
                    {section.name || "Sin sistema"}
                  </h2>
                  <div className="section-heading-meta text-right text-[11px] text-[#555963]">
                    <span>{formatCurrency(section.equipment_total, "USD")}</span>
                    <span className="mx-2">/</span>
                    <span>{formatCurrency(section.labor_total, "MXN")}</span>
                  </div>
                </div>

                <table className="quote-items-table w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#E1DDD5] bg-[#F7F5F1] text-left text-[#555963]">
                      <th className="w-14 px-2 py-2">Img</th>
                      <th className="px-2 py-2">Marca / modelo</th>
                      <th className="px-2 py-2">Descripcion</th>
                      <th className="w-12 px-2 py-2 text-center">Cant.</th>
                      <th className="w-24 px-2 py-2 text-right">Equipo</th>
                      <th className="w-24 px-2 py-2 text-right">MO MXN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionItems.map((item) => (
                      <tr key={item.id} className="line-item-row border-b border-[#EFECE6]">
                        <td className="px-2 py-2">
                          <div className="product-image-box flex h-[50px] w-[50px] items-center justify-center bg-[#F7F5F1]">
                            {item.product_image_url ? (
                              <img
                                src={item.product_image_url}
                                alt={item.product_name || "Producto"}
                                className="product-image max-h-[50px] max-w-[50px] object-contain"
                              />
                            ) : (
                              <span className="text-[9px] text-[#8A8D94]">
                                Sin img
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 font-semibold">
                          {item.product_brand || "Sin marca"}{" "}
                          {item.product_model || ""}
                        </td>
                        <td className="px-2 py-2 text-[#555963]">
                          {item.product_name || "Sin descripcion"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {item.quantity || 0}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(
                            Number(item.unit_equipment_price || 0) *
                              Number(item.quantity || 0),
                            item.sale_currency || "USD"
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(
                            Number(item.unit_labor_price || 0) *
                              Number(item.quantity || 0),
                            "MXN"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="section-subtotal print-avoid-break mt-2 flex justify-end">
                  <div className="w-64 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#555963]">Subtotal equipo</span>
                      <span>{formatCurrency(section.equipment_total, "USD")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#555963]">Subtotal MO</span>
                      <span>{formatCurrency(section.labor_total, "MXN")}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#D6D1C8] pt-1 font-semibold">
                      <span>Total estimado</span>
                      <span>
                        {formatCurrency(
                          Number(section.equipment_total || 0) * exchangeRate +
                            Number(section.labor_total || 0),
                          "MXN"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="print-keep-together mt-6 flex justify-end">
          <div className="totals-box w-72 border border-[#D6D1C8] bg-[#F7F5F1] p-4 text-xs">
            <div className="mb-2 flex justify-between">
              <span className="text-[#555963]">Equipos</span>
              <span>{formatCurrency(quoteData.equipment_total, "USD")}</span>
            </div>
            <div className="mb-2 flex justify-between">
              <span className="text-[#555963]">Mano de obra</span>
              <span>{formatCurrency(quoteData.labor_total, "MXN")}</span>
            </div>
            <div className="mb-3 flex justify-between">
              <span className="text-[#555963]">Tipo de cambio</span>
              <span>{formatNumber(exchangeRate)}</span>
            </div>
            <div className="mb-2 flex justify-between border-t border-[#D6D1C8] pt-3">
              <span className="text-[#555963]">Subtotal</span>
              <span>{formatCurrency(subtotalMXN, "MXN")}</span>
            </div>
            {discountMXN > 0 ? (
              <div className="mb-2 flex justify-between">
                <span className="text-[#555963]">Descuento</span>
                <span>-{formatCurrency(discountMXN, "MXN")}</span>
              </div>
            ) : null}
            <div className="mb-3 flex justify-between">
              <span className="text-[#555963]">IVA 16%</span>
              <span>{formatCurrency(ivaMXN, "MXN")}</span>
            </div>
            <div className="total-line flex justify-between border-t border-[#D6D1C8] pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totalMXN, "MXN")}</span>
            </div>
            <p className="mt-3 text-[9px] leading-4 text-[#555963]">
              El total en MXN es estimado. El tipo de cambio aplicable será el
              publicado por el DOF el día hábil de pago.
            </p>
          </div>
        </section>

        {quoteData.notes?.trim() ? (
          <section className="notes-box print-keep-together mt-6 border-t border-[#D6D1C8] pt-4">
            <h3 className="mb-2 text-sm font-semibold">
              Notas y aclaraciones
            </h3>
            <div className="whitespace-pre-line text-[10px] leading-4 text-[#555963]">
              {quoteData.notes}
            </div>
          </section>
        ) : null}

        <section className="terms-box print-keep-together mt-6 border-t border-[#D6D1C8] pt-4">
          <h3 className="mb-1 text-sm font-semibold">
            Terminos y condiciones
          </h3>
          <ol className="list-decimal space-y-1 pl-4 text-[10px] leading-4 text-[#555963]">
            {commercialTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ol>
        </section>
      </article>
    </main>
  );
}
