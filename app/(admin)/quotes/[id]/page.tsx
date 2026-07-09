import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getPartnerBrandingMissingReason,
  type CommercialPartner,
} from "@/lib/commercialPartners";
import {
  CLIENT_EXISTING_SUPPLY_TYPE,
  getQuoteItemAreaBreakdown,
  getQuoteItemsPresentationTotals,
  isMissingQuoteItemAreaAllocationsSchema,
  shouldGroupQuoteItemsByPresentation,
  type QuoteItemAreaAllocation,
} from "@/lib/quoteItemPresentation";
import { canApproveQuotes, canGeneratePartnerQuotes } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import ProjectStageSelect from "@/components/ProjectStageSelect";
import CreateQuoteVersionButton from "./CreateQuoteVersionButton";
import ApproveQuoteVersionButton from "./ApproveQuoteVersionButton";

type Quote = {
  id: number;
  quote_number: string | null;
  quote_group_id: number | null;
  quote_base_number: string | null;
  version: number | null;
  client_id: number | null;
  client_project_id?: number | null;
  status: string | null;
  currency: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  grand_total: number | null;
  discount_type?: string | null;
  discount_percent?: number | null;
  discount_amount_mxn?: number | null;
  includes_travel_expenses_detail?: boolean | null;
  travel_fuel_mxn?: number | null;
  travel_tolls_mxn?: number | null;
  travel_food_mxn?: number | null;
  travel_total_mxn?: number | null;
  is_partner_quote?: boolean | null;
  commercial_partner_id?: number | null;
  partner_equipment_discount_mxn?: number | null;
  partner_labor_discount_mxn?: number | null;
  partner_total_discount_mxn?: number | null;
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

type QuoteSection = {
  id: number;
  quote_id: number;
  name: string | null;
  sort_order: number | null;
  equipment_total: number | null;
  labor_total: number | null;
  total: number | null;
};

type QuoteItem = {
  id: number;
  quote_id: number;
  quote_section_id: number;
  product_id: number | null;
  quantity: number | null;
  sale_currency: string | null;
  unit_equipment_price: number | null;
  unit_equipment_price_usd?: number | null;
  equipment_total_usd?: number | null;
  unit_labor_price: number | null;
  line_total: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
  existing_customer_equipment?: boolean | null;
  area?: string | null;
  customer_visible_note?: string | null;
  allocations?: QuoteItemAreaAllocation[];
  sort_order: number | null;
};

type SavedAreaAllocation = {
  id: number;
  quote_item_id: number;
  area: string | null;
  quantity: number | null;
  supply_type: string | null;
  customer_visible_note: string | null;
  sort_order: number | null;
};

type ClientProject = {
  id: number;
  name: string | null;
  sales_stage?: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX");
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  let { data: quote, error } = (await supabase
    .from("quotes")
    .select(
      "id, quote_number, quote_group_id, quote_base_number, version, client_id, client_project_id, status, currency, equipment_total, labor_total, grand_total, discount_type, discount_percent, discount_amount_mxn, includes_travel_expenses_detail, travel_fuel_mxn, travel_tolls_mxn, travel_food_mxn, travel_total_mxn, is_partner_quote, commercial_partner_id, partner_equipment_discount_mxn, partner_labor_discount_mxn, partner_total_discount_mxn, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, exchange_rate, exchange_rate_source, exchange_rate_date, notes, created_at"
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
      error.message.includes("is_partner_quote") ||
      error.message.includes("commercial_partner_id") ||
      error.message.includes("total_mxn"))
  ) {
    const fallback = (await supabase
      .from("quotes")
      .select(
        "id, quote_number, quote_group_id, quote_base_number, version, client_id, status, currency, equipment_total, labor_total, grand_total, exchange_rate, created_at"
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
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-2 text-[#B3B3B8] mb-8"
        >
          <ArrowLeft size={18} />
          Volver a cotizaciones
        </Link>

        <h1 className="text-3xl font-bold">
          Cotización no encontrada
        </h1>
      </main>
    );
  }

  const { data: sections } = await supabase
    .from("quote_sections")
    .select("id, quote_id, name, sort_order, equipment_total, labor_total, total")
    .eq("quote_id", id)
    .order("sort_order", { ascending: true });

  const itemsResult = await supabase
    .from("quote_items")
    .select(
      "id, quote_id, quote_section_id, product_id, quantity, sale_currency, unit_equipment_price, unit_equipment_price_usd, equipment_total_usd, unit_labor_price, line_total, product_brand, product_model, product_name, product_image_url, existing_customer_equipment, area, customer_visible_note, sort_order"
    )
    .eq("quote_id", id)
    .order("sort_order", { ascending: true });
  let items = itemsResult.data;
  const itemsError = itemsResult.error;

  if (itemsError) {
    const fallbackItems = await supabase
      .from("quote_items")
      .select(
        "id, quote_id, quote_section_id, product_id, quantity, sale_currency, unit_equipment_price, unit_labor_price, line_total, product_brand, product_model, product_name, product_image_url, sort_order"
      )
      .eq("quote_id", id)
      .order("sort_order", { ascending: true });

    items = fallbackItems.data as typeof items;
  }

  const quoteData = quote as Quote;
  const currentProfile = await getCurrentUserProfile();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canAdminEditApprovedQuote =
    user?.email?.toLowerCase() === "leofigueroagomez@gmail.com";

  const { data: client } = quoteData.client_id
    ? await supabase
        .from("clients")
        .select("id, name")
        .eq("id", quoteData.client_id)
        .maybeSingle()
    : { data: null };

  const { data: clientProject } = quoteData.client_project_id
    ? await supabase
        .from("client_projects")
        .select("id, name, sales_stage")
        .eq("id", quoteData.client_project_id)
        .maybeSingle()
    : { data: null };
  const projectData = clientProject as ClientProject | null;
  const { data: commercialPartner } = quoteData.commercial_partner_id
    ? await supabase
        .from("commercial_partners")
        .select(
          "id, commercial_name, logo_url, logo_storage_path, primary_color, secondary_color, contact_name, contact_email, contact_phone, is_active"
        )
        .eq("id", quoteData.commercial_partner_id)
        .maybeSingle<CommercialPartner>()
    : { data: null };
  const partnerMissingReason = getPartnerBrandingMissingReason(
    supabase,
    commercialPartner || null
  );
  const canGeneratePartnerPrint =
    quoteData.is_partner_quote &&
    canGeneratePartnerQuotes(currentProfile?.role) &&
    !partnerMissingReason;

  const quoteSections = (sections || []) as QuoteSection[];
  const quoteItemsBase = (items || []) as QuoteItem[];
  const quoteItemIds = quoteItemsBase.map((item) => item.id);
  const { data: areaAllocations, error: areaAllocationsError } =
    quoteItemIds.length > 0
      ? await supabase
          .from("quote_item_area_allocations")
          .select(
            "id, quote_item_id, area, quantity, supply_type, customer_visible_note, sort_order"
          )
          .in("quote_item_id", quoteItemIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };
  const areaAllocationsByItemId = new Map<number, QuoteItemAreaAllocation[]>();
  if (
    areaAllocationsError &&
    !isMissingQuoteItemAreaAllocationsSchema(areaAllocationsError)
  ) {
    throw areaAllocationsError;
  }
  if (!areaAllocationsError) {
    ((areaAllocations || []) as SavedAreaAllocation[]).forEach((allocation) => {
      const current = areaAllocationsByItemId.get(allocation.quote_item_id) || [];
      current.push({
        id: allocation.id,
        area: allocation.area || "",
        quantity: Number(allocation.quantity || 0),
        supply_type:
          allocation.supply_type === CLIENT_EXISTING_SUPPLY_TYPE
            ? CLIENT_EXISTING_SUPPLY_TYPE
            : "new_equipment",
        customer_visible_note: allocation.customer_visible_note || "",
        sort_order: Number(allocation.sort_order || 0),
      });
      areaAllocationsByItemId.set(allocation.quote_item_id, current);
    });
  }
  const quoteItems = quoteItemsBase.map((item) => ({
    ...item,
    allocations: areaAllocationsByItemId.get(item.id) || [],
  }));
  const detailExchangeRate = Number(quoteData.exchange_rate || 1);
  const hasAnyAreaAllocations = quoteItems.some(
    (item) => item.allocations.length > 0
  );
  const calculatedQuoteTotals = getQuoteItemsPresentationTotals(
    quoteItems,
    detailExchangeRate
  );
  const displayEquipmentTotalUSD = hasAnyAreaAllocations
    ? calculatedQuoteTotals.equipmentTotalUsd
    : Number(quoteData.equipment_total || 0);
  const displayLaborTotalMXN = hasAnyAreaAllocations
    ? calculatedQuoteTotals.laborTotalMxn
    : Number(quoteData.labor_total || 0);
  const subtotalMXN =
    hasAnyAreaAllocations
      ? displayEquipmentTotalUSD * detailExchangeRate + displayLaborTotalMXN
      : Number(quoteData.subtotal_mxn) ||
        Number(quoteData.equipment_total || 0) * detailExchangeRate +
          Number(quoteData.labor_total || 0);
  const discountMXN = Number(quoteData.discount_amount_mxn || 0);
  const partnerEquipmentDiscountMXN = Number(
    quoteData.partner_equipment_discount_mxn || 0
  );
  const partnerLaborDiscountMXN = Number(
    quoteData.partner_labor_discount_mxn || 0
  );
  const partnerDiscountMXN = Number(
    quoteData.partner_total_discount_mxn ||
      partnerEquipmentDiscountMXN + partnerLaborDiscountMXN
  );
  const taxableBaseMXN =
    hasAnyAreaAllocations
      ? subtotalMXN - partnerDiscountMXN - discountMXN
      : Number(quoteData.taxable_base_mxn) ||
        subtotalMXN - partnerDiscountMXN - discountMXN;
  const ivaMXN = hasAnyAreaAllocations
    ? taxableBaseMXN * 0.16
    : Number(quoteData.iva_mxn) || taxableBaseMXN * 0.16;
  const totalMXN = hasAnyAreaAllocations
    ? taxableBaseMXN + ivaMXN
    : Number(quoteData.total_mxn) ||
      Number(quoteData.grand_total) ||
      taxableBaseMXN + ivaMXN;
  const travelTotalMXN =
    Number(quoteData.travel_total_mxn || 0) ||
    Number(quoteData.travel_fuel_mxn || 0) +
      Number(quoteData.travel_tolls_mxn || 0) +
      Number(quoteData.travel_food_mxn || 0);

  function getSectionItems(sectionId: number) {
    return quoteItems.filter(
      (item) => item.quote_section_id === sectionId
    );
  }

  function getItemLineTotalMxn(item: QuoteItem) {
    return getQuoteItemAreaBreakdown(item, detailExchangeRate).reduce(
      (sum, allocation) => sum + allocation.lineTotalMxn,
      0
    );
  }

  function getAreaGroups(sectionItems: QuoteItem[]) {
    const groups = new Map<
      string,
      {
        area: string;
        rows: {
          item: QuoteItem;
          allocation: ReturnType<typeof getQuoteItemAreaBreakdown>[number];
        }[];
        subtotalMxn: number;
      }
    >();

    for (const item of sectionItems) {
      for (const allocation of getQuoteItemAreaBreakdown(
        item,
        Number(quoteData.exchange_rate || 1)
      )) {
        const current =
          groups.get(allocation.area) || {
            area: allocation.area,
            rows: [],
            subtotalMxn: 0,
          };

        current.rows.push({ item, allocation });
        current.subtotalMxn += allocation.lineTotalMxn;
        groups.set(allocation.area, current);
      }
    }

    return Array.from(groups.values());
  }

  function getSectionDisplayTotals(section: QuoteSection, sectionItems: QuoteItem[]) {
    if (!sectionItems.some((item) => (item.allocations || []).length > 0)) {
      const equipmentTotalUsd = Number(section.equipment_total || 0);
      const laborTotalMxn = Number(section.labor_total || 0);

      return {
        equipmentTotalUsd,
        laborTotalMxn,
        subtotalMxn: equipmentTotalUsd * detailExchangeRate + laborTotalMxn,
      };
    }

    return getQuoteItemsPresentationTotals(sectionItems, detailExchangeRate);
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-2 text-[#B3B3B8] mb-8"
      >
        <ArrowLeft size={18} />
        Volver a cotizaciones
      </Link>

      <section className="mb-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
              {quoteData.quote_number || "Sin folio"}
            </p>

            <h1 className="mb-3 break-words text-3xl font-bold sm:text-4xl">
              Cotización #{quoteData.id}
            </h1>

            <p className="text-[#B3B3B8]">
              Creada el {formatDate(quoteData.created_at)}
            </p>
            {quoteData.is_partner_quote ? (
              <p className="mt-2 text-sm font-semibold text-[#F4C66A]">
                Cotizacion para aliado comercial
                {commercialPartner?.commercial_name
                  ? ` / ${commercialPartner.commercial_name}`
                  : ""}
              </p>
            ) : null}
            {quoteData.is_partner_quote && partnerMissingReason ? (
              <p className="mt-2 max-w-xl text-sm text-[#F28B82]">
                No se puede generar white label: {partnerMissingReason}
              </p>
            ) : null}

            <div className="mt-5 space-y-1 text-[#B3B3B8]">
              <p>
                Atención a:{" "}
                <span className="text-white">
                  {client?.name || "Sin cliente"}
                </span>
              </p>
              <p>
                Proyecto:{" "}
                <span className="text-white">
                  {clientProject?.name || "Sin proyecto"}
                </span>
              </p>
            </div>
            {projectData ? (
              <div className="mt-5 max-w-xs rounded-2xl border border-[#1F1F24] bg-[#151518] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#77777D]">
                  Etapa oportunidad
                </p>
                <ProjectStageSelect
                  projectId={projectData.id}
                  currentStage={projectData.sales_stage || null}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <span
              className={`border rounded-full px-4 py-2 text-sm ${
                quoteData.status === "approved"
                  ? "bg-[#143D2A] border-[#1F7A4D] text-[#8CE0B6]"
                  : "bg-[#222228] border-[#2A2A30] text-[#B3B3B8]"
              }`}
            >
              {quoteData.status || "Sin estado"}
            </span>

            {(quoteData.status === "draft" ||
              (quoteData.status === "approved" && canAdminEditApprovedQuote)) && (
              <Link
                href={`/quotes/${quoteData.id}/edit`}
                className={
                  quoteData.status === "approved"
                    ? "bg-[#9E1B32] hover:bg-[#B91C3C] border border-[#9E1B32] text-white rounded-xl px-5 py-3 font-semibold"
                    : "bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] text-[#B3B3B8] rounded-xl px-5 py-3 font-semibold"
                }
              >
                {quoteData.status === "approved" ? "Editar aprobada" : "Editar"}
              </Link>
            )}

            <a
              href={`/api/quotes/${quoteData.id}/premium-pdf`}
              target="_blank"
              rel="noreferrer"
              className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] text-[#B3B3B8] rounded-xl px-5 py-3 font-semibold"
            >
              Imprimir / PDF
            </a>

            {quoteData.is_partner_quote ? (
              <>
                <a
                  href={`/quotes/${quoteData.id}/print?branding=partner`}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!canGeneratePartnerPrint}
                  className={`rounded-xl border px-5 py-3 font-semibold ${
                    canGeneratePartnerPrint
                      ? "border-[#9E1B32] bg-[#9E1B32] text-white hover:bg-[#B91C3C]"
                      : "pointer-events-none border-[#2A2A30] bg-[#222228] text-[#77777D]"
                  }`}
                >
                  Imprimir cotizacion para aliado
                </a>
                <a
                  href={`/api/quotes/${quoteData.id}/premium-pdf?branding=partner`}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!canGeneratePartnerPrint}
                  className={`rounded-xl border px-5 py-3 font-semibold ${
                    canGeneratePartnerPrint
                      ? "border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:bg-[#2A2A30]"
                      : "pointer-events-none border-[#2A2A30] bg-[#222228] text-[#77777D]"
                  }`}
                >
                  PDF aliado
                </a>
              </>
            ) : null}

            <CreateQuoteVersionButton
              quoteId={quoteData.id}
              quoteGroupId={quoteData.quote_group_id}
              quoteBaseNumber={quoteData.quote_base_number}
            />

            {canApproveQuotes(currentProfile?.role) ? (
              <ApproveQuoteVersionButton
                quoteId={quoteData.id}
                quoteGroupId={quoteData.quote_group_id}
                clientProjectId={quoteData.client_project_id}
                status={quoteData.status}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Equipos USD</p>
          <h2 className="text-2xl font-bold">
            {formatCurrency(displayEquipmentTotalUSD, "USD")}
          </h2>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Mano de obra MXN</p>
          <h2 className="text-2xl font-bold">
            {formatCurrency(displayLaborTotalMXN, "MXN")}
          </h2>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Tipo de cambio</p>
          <h2 className="text-2xl font-bold">
            {formatNumber(quoteData.exchange_rate || 1)}
          </h2>
          <p className="text-xs text-[#77777D] mt-2">
            {quoteData.exchange_rate_source || "manual"}{" "}
            {quoteData.exchange_rate_date || ""}
          </p>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Total estimado MXN</p>
          <h2 className="text-2xl font-bold text-[#9E1B32]">
            {formatCurrency(totalMXN, "MXN")}
          </h2>
        </div>
      </section>

      <section className="mb-10 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
        <h2 className="mb-6 text-2xl font-semibold">Resumen fiscal</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-1 text-[#77777D]">Subtotal MXN</p>
            <p>{formatCurrency(subtotalMXN, "MXN")}</p>
          </div>
          {discountMXN > 0 ? (
            <div>
              <p className="mb-1 text-[#77777D]">
                {quoteData.is_partner_quote
                  ? "Descuento adicional"
                  : "Descuento"}
              </p>
              <p className="text-[#F4C66A]">-{formatCurrency(discountMXN, "MXN")}</p>
            </div>
          ) : null}
          {quoteData.is_partner_quote && partnerEquipmentDiscountMXN > 0 ? (
            <div>
              <p className="mb-1 text-[#77777D]">
                Descuento aliado equipo
              </p>
              <p className="text-[#F4C66A]">
                -{formatCurrency(partnerEquipmentDiscountMXN, "MXN")}
              </p>
            </div>
          ) : null}
          {quoteData.is_partner_quote && partnerLaborDiscountMXN > 0 ? (
            <div>
              <p className="mb-1 text-[#77777D]">
                Descuento aliado mano de obra
              </p>
              <p className="text-[#F4C66A]">
                -{formatCurrency(partnerLaborDiscountMXN, "MXN")}
              </p>
            </div>
          ) : null}
          {travelTotalMXN > 0 || quoteData.includes_travel_expenses_detail ? (
            <div>
              <p className="mb-1 text-[#77777D]">Viaticos ref.</p>
              <p>{formatCurrency(travelTotalMXN, "MXN")}</p>
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[#77777D]">IVA 16%</p>
            <p>{formatCurrency(ivaMXN, "MXN")}</p>
          </div>
          <div>
            <p className="mb-1 text-[#77777D]">Total MXN</p>
            <p className="font-semibold text-[#9E1B32]">
              {formatCurrency(totalMXN, "MXN")}
            </p>
          </div>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-[#77777D]">
          El total en MXN es estimado. El tipo de cambio aplicable será el
          publicado por el DOF el día hábil de pago.
        </p>
      </section>

      <p className="text-xs text-[#77777D] leading-relaxed mb-8">
        Tipo de cambio informativo. Los pagos se liquidarán conforme al tipo de
        cambio DOF aplicable al día hábil de pago.
      </p>

      {quoteData.notes?.trim() ? (
        <section className="mb-10 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
          <h2 className="mb-4 text-2xl font-semibold">
            Aclaraciones / Notas especiales
          </h2>
          <div className="whitespace-pre-line leading-relaxed text-[#B3B3B8]">
            {quoteData.notes}
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        {quoteSections.map((section) => {
          const sectionItems = getSectionItems(section.id);
          const sectionDisplayTotals = getSectionDisplayTotals(
            section,
            sectionItems
          );
          const areaGroups = shouldGroupQuoteItemsByPresentation(sectionItems)
            ? getAreaGroups(sectionItems)
            : [
                {
                  area: "",
                  rows: sectionItems.map((item) => ({
                    item,
                    allocation: getQuoteItemAreaBreakdown(
                      item,
                      Number(quoteData.exchange_rate || 1)
                    )[0],
                  })),
                  subtotalMxn: 0,
                },
              ];

          return (
            <div
              key={section.id}
              className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6"
            >
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">
                    {section.name || "Sin nombre"}
                  </h2>

                  <p className="text-sm text-[#B3B3B8]">
                    {sectionItems.length} partidas
                  </p>
                </div>

                <div className="text-right text-sm">
                  <p>
                    Equipo:{" "}
                    {formatCurrency(
                      sectionDisplayTotals.equipmentTotalUsd,
                      "USD"
                    )}
                  </p>

                  <p className="text-[#B3B3B8]">
                    MO:{" "}
                    {formatCurrency(sectionDisplayTotals.laborTotalMxn, "MXN")}
                  </p>

                  <p className="font-semibold mt-1">
                    Total estimado:{" "}
                    {formatCurrency(sectionDisplayTotals.subtotalMxn, "MXN")}
                  </p>
                </div>
              </div>

              {sectionItems.length === 0 ? (
                <p className="text-[#77777D]">
                  No hay partidas en este sistema.
                </p>
              ) : (
                <div className="space-y-5 overflow-x-auto">
                  {areaGroups.map((areaGroup) => (
                    <div key={areaGroup.area || `section-${section.id}`}>
                      {areaGroup.area ? (
                        <div className="mb-3 flex min-w-[860px] items-center justify-between rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3">
                          <p className="text-sm font-semibold">
                            {areaGroup.area}
                          </p>
                          <p className="text-sm text-[#B3B3B8]">
                            Subtotal area:{" "}
                            <span className="font-semibold text-white">
                              {formatCurrency(areaGroup.subtotalMxn, "MXN")}
                            </span>
                          </p>
                        </div>
                      ) : null}
                      <div className="space-y-4">
                  {areaGroup.rows.map(({ item, allocation }) => (
                    <div
                      key={`${item.id}-${allocation?.sortOrder || 0}-${allocation?.area || ""}`}
                      className="grid min-w-[860px] grid-cols-[70px_1fr_90px_140px_140px_140px] items-center gap-4 rounded-xl bg-[#222228] p-4"
                    >
                      <div className="w-16 h-16 bg-[#151518] rounded-xl overflow-hidden flex items-center justify-center">
                        {item.product_image_url ? (
                          <img
                            src={item.product_image_url}
                            alt={item.product_name || "Producto"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-[#77777D]">
                            Sin img
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold">
                          {item.product_brand || "Sin marca"}{" "}
                          {item.product_model || ""}
                        </p>

                        <p className="text-sm text-[#B3B3B8]">
                          {item.product_name || "Sin nombre"}
                        </p>
                        {allocation?.supplyType === CLIENT_EXISTING_SUPPLY_TYPE ? (
                          <span className="mt-2 inline-flex rounded-full bg-[#3B2D11] px-3 py-1 text-xs font-semibold text-[#F4C66A]">
                            Equipo existente del cliente
                          </span>
                        ) : null}
                        {allocation?.supplyType === CLIENT_EXISTING_SUPPLY_TYPE &&
                        allocation.customerVisibleNote ? (
                          <p className="mt-2 text-sm text-[#D7D7DB]">
                            {allocation.customerVisibleNote}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-[#77777D] text-xs mb-1">Cant.</p>
                        <p>{allocation?.quantity || item.quantity || 0}</p>
                      </div>

                      <div>
                        <p className="text-[#77777D] text-xs mb-1">Equipo</p>
                        <p>
                          {formatCurrency(
                            allocation?.equipmentTotalUsd || 0,
                            "USD"
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[#77777D] text-xs mb-1">MO</p>
                        <p>
                          {formatCurrency(
                            allocation?.laborTotalMxn || 0,
                            "MXN"
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[#77777D] text-xs mb-1">
                          Total estimado
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(
                            allocation?.lineTotalMxn ?? getItemLineTotalMxn(item),
                            "MXN"
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
