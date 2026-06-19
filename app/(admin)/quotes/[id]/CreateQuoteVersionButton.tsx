"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

type Props = {
  quoteId: number;
  quoteGroupId: number | null;
  quoteBaseNumber: string | null;
};

type QuoteSection = {
  id: number;
  name: string | null;
  sort_order: number | null;
  equipment_total: number | null;
  labor_total: number | null;
  total: number | null;
};

type QuoteItem = {
  id: number;
  quote_section_id: number;
  product_id: number | null;
  quantity: number | null;
  sale_currency: string | null;
  unit_equipment_price: number | null;
  unit_equipment_price_usd?: number | null;
  unit_labor_price: number | null;
  equipment_total: number | null;
  equipment_total_usd?: number | null;
  labor_total: number | null;
  line_total: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
  sort_order: number | null;
};

type QuoteItemLaborActivity = {
  quote_item_id: number;
  labor_activity_id: number | null;
  name_snapshot: string | null;
  quantity: number | null;
  unit: string | null;
  internal_unit_cost_mxn: number | null;
  sale_unit_price_mxn: number | null;
  internal_total_mxn: number | null;
  sale_total_mxn: number | null;
  assigned_role: string | null;
  notes: string | null;
  sort_order: number | null;
};

type NewQuoteItem = Omit<QuoteItem, "id"> & {
  quote_id: number;
  quote_section_id: number;
};

type SourceQuote = {
  id: number;
  quote_group_id: number;
  quote_base_number: string | null;
  client_project_id?: number | null;
  currency: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  tax_total: number | null;
  discount_total: number | null;
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
  partner_equipment_discount_percent?: number | null;
  partner_labor_discount_percent?: number | null;
  partner_equipment_discount_mxn?: number | null;
  partner_labor_discount_mxn?: number | null;
  partner_total_discount_mxn?: number | null;
  subtotal_mxn?: number | null;
  taxable_base_mxn?: number | null;
  iva_mxn?: number | null;
  total_mxn?: number | null;
  exchange_rate: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_date?: string | null;
  notes?: string | null;
};

function shouldMoveVersionProjectToQuoted(stage: string | null | undefined) {
  return ["lead", "site_visit", "engineering"].includes(stage || "");
}

export default function CreateQuoteVersionButton({
  quoteId,
  quoteGroupId,
  quoteBaseNumber,
}: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const disabled = !quoteGroupId || !quoteBaseNumber || creating;

  function reportStepError(step: string, error: unknown) {
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? ` ${error.message}`
        : "";

    console.error(`Error en ${step}:`, error);
    alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
  }

  async function handleCreateVersion() {
    if (!quoteGroupId || !quoteBaseNumber) return;

    const confirmed = window.confirm(
      "¿Crear una nueva versión de esta cotización?"
    );

    if (!confirmed) return;

    setCreating(true);

    let { data: quote, error: quoteError } = (await supabase
      .from("quotes")
      .select(
        "id, quote_group_id, quote_base_number, client_project_id, currency, equipment_total, labor_total, tax_total, discount_total, grand_total, discount_type, discount_percent, discount_amount_mxn, includes_travel_expenses_detail, travel_fuel_mxn, travel_tolls_mxn, travel_food_mxn, travel_total_mxn, is_partner_quote, commercial_partner_id, partner_equipment_discount_percent, partner_labor_discount_percent, partner_equipment_discount_mxn, partner_labor_discount_mxn, partner_total_discount_mxn, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, exchange_rate, exchange_rate_source, exchange_rate_date, notes"
      )
      .eq("id", quoteId)
      .single()) as {
      data: SourceQuote | null;
      error: { code?: string; message: string } | null;
    };

    if (
      quoteError?.code === "PGRST204" &&
      (quoteError.message.includes("exchange_rate_source") ||
        quoteError.message.includes("exchange_rate_date") ||
        quoteError.message.includes("notes") ||
        quoteError.message.includes("is_partner_quote") ||
        quoteError.message.includes("commercial_partner_id") ||
        quoteError.message.includes("total_mxn"))
    ) {
      const fallback = (await supabase
        .from("quotes")
        .select(
          "id, quote_group_id, quote_base_number, client_project_id, currency, equipment_total, labor_total, tax_total, discount_total, grand_total, exchange_rate"
        )
        .eq("id", quoteId)
        .single()) as {
        data: SourceQuote | null;
        error: { code?: string; message: string } | null;
      };

      quote = fallback.data;
      quoteError = fallback.error;
    }

    if (quoteError || !quote) {
      reportStepError(
        "leer quote actual",
        quoteError || { message: "No se recibió quote actual" }
      );
      setCreating(false);
      return;
    }

    const { data: maxVersionQuote, error: versionError } = await supabase
      .from("quotes")
      .select("version")
      .eq("quote_group_id", quoteGroupId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      reportStepError("buscar max(version)", versionError);
      setCreating(false);
      return;
    }

    const nextVersion = Number(maxVersionQuote?.version || 0) + 1;

    const { data: sections, error: sectionsError } = await supabase
      .from("quote_sections")
      .select("id, name, sort_order, equipment_total, labor_total, total")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true });

    if (sectionsError) {
      reportStepError("leer quote_sections", sectionsError);
      setCreating(false);
      return;
    }

    let { data: items, error: itemsError } = await supabase
      .from("quote_items")
      .select(
        "id, quote_section_id, product_id, quantity, sale_currency, unit_equipment_price, unit_equipment_price_usd, unit_labor_price, equipment_total, equipment_total_usd, labor_total, line_total, product_brand, product_model, product_name, product_image_url, sort_order"
      )
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true });

    if (itemsError) {
      const fallbackItems = await supabase
        .from("quote_items")
        .select(
          "id, quote_section_id, product_id, quantity, sale_currency, unit_equipment_price, unit_labor_price, equipment_total, labor_total, line_total, product_brand, product_model, product_name, product_image_url, sort_order"
        )
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

      if (fallbackItems.error) {
        reportStepError("leer quote_items", fallbackItems.error);
        setCreating(false);
        return;
      }

      items = fallbackItems.data as typeof items;
    }

    const sourceItems = (items || []) as QuoteItem[];
    const sourceItemIds = sourceItems.map((item) => item.id).filter(Boolean);
    const { data: sourceLaborActivities, error: laborActivitiesError } =
      sourceItemIds.length > 0
        ? await supabase
            .from("quote_item_labor_activities")
            .select(
              "quote_item_id, labor_activity_id, name_snapshot, quantity, unit, internal_unit_cost_mxn, sale_unit_price_mxn, internal_total_mxn, sale_total_mxn, assigned_role, notes, sort_order"
            )
            .in("quote_item_id", sourceItemIds)
            .order("sort_order", { ascending: true })
        : { data: [], error: null };

    if (laborActivitiesError) {
      reportStepError("leer actividades de mano de obra", laborActivitiesError);
      setCreating(false);
      return;
    }

    const currentQuoteGroupId = quote.quote_group_id;

    const { error: updateLatestError } = await supabase
      .from("quotes")
      .update({ is_latest: false })
      .eq("quote_group_id", currentQuoteGroupId);

    if (updateLatestError) {
      reportStepError("actualizar is_latest=false", updateLatestError);
      setCreating(false);
      return;
    }

    const newQuotePayload = {
      quote_group_id: currentQuoteGroupId,
      quote_base_number: quoteBaseNumber,
      version: nextVersion,
      quote_number: `${quoteBaseNumber}-V${nextVersion}`,
      parent_quote_id: quoteId,
      client_project_id: quote.client_project_id,
      status: "draft",
      is_latest: true,
      currency: quote.currency,
      equipment_total: quote.equipment_total,
      labor_total: quote.labor_total,
      tax_total: quote.tax_total,
      discount_total: quote.discount_total,
      grand_total: quote.grand_total,
      discount_type: quote.discount_type,
      discount_percent: quote.discount_percent,
      discount_amount_mxn: quote.discount_amount_mxn,
      includes_travel_expenses_detail: quote.includes_travel_expenses_detail,
      travel_fuel_mxn: quote.travel_fuel_mxn,
      travel_tolls_mxn: quote.travel_tolls_mxn,
      travel_food_mxn: quote.travel_food_mxn,
      travel_total_mxn: quote.travel_total_mxn,
      is_partner_quote: quote.is_partner_quote,
      commercial_partner_id: quote.commercial_partner_id,
      partner_equipment_discount_percent:
        quote.partner_equipment_discount_percent,
      partner_labor_discount_percent: quote.partner_labor_discount_percent,
      partner_equipment_discount_mxn: quote.partner_equipment_discount_mxn,
      partner_labor_discount_mxn: quote.partner_labor_discount_mxn,
      partner_total_discount_mxn: quote.partner_total_discount_mxn,
      subtotal_mxn: quote.subtotal_mxn,
      taxable_base_mxn: quote.taxable_base_mxn,
      iva_mxn: quote.iva_mxn,
      total_mxn: quote.total_mxn,
      exchange_rate: quote.exchange_rate,
      exchange_rate_source: quote.exchange_rate_source,
      exchange_rate_date: quote.exchange_rate_date,
      notes: quote.notes,
    };

    let newQuoteResult = await supabase
      .from("quotes")
      .insert(newQuotePayload)
      .select("id")
      .single();

    if (
      newQuoteResult.error?.code === "PGRST204" &&
      (newQuoteResult.error.message.includes("exchange_rate_source") ||
        newQuoteResult.error.message.includes("exchange_rate_date") ||
        newQuoteResult.error.message.includes("client_project_id") ||
        newQuoteResult.error.message.includes("notes") ||
        newQuoteResult.error.message.includes("is_partner_quote") ||
        newQuoteResult.error.message.includes("total_mxn"))
    ) {
      const {
        exchange_rate_source,
        exchange_rate_date,
        client_project_id,
        discount_type,
        discount_percent,
        discount_amount_mxn,
        includes_travel_expenses_detail,
        travel_fuel_mxn,
        travel_tolls_mxn,
        travel_food_mxn,
        travel_total_mxn,
        is_partner_quote,
        commercial_partner_id,
        partner_equipment_discount_percent,
        partner_labor_discount_percent,
        partner_equipment_discount_mxn,
        partner_labor_discount_mxn,
        partner_total_discount_mxn,
        subtotal_mxn,
        taxable_base_mxn,
        iva_mxn,
        total_mxn,
        notes,
        ...fallbackPayload
      } = newQuotePayload;

      newQuoteResult = await supabase
        .from("quotes")
        .insert(fallbackPayload)
        .select("id")
        .single();
    }

    const newQuote = newQuoteResult.data;
    const newQuoteError = newQuoteResult.error;

    if (newQuoteError || !newQuote) {
      reportStepError(
        "crear nueva quote",
        newQuoteError || { message: "No se recibió nueva quote" }
      );
      setCreating(false);
      return;
    }

    const sectionIdMap = new Map<number, number>();

    for (const section of (sections || []) as QuoteSection[]) {
      const { data: newSection, error: newSectionError } = await supabase
        .from("quote_sections")
        .insert({
          quote_id: newQuote.id,
          name: section.name,
          sort_order: section.sort_order,
          equipment_total: section.equipment_total,
          labor_total: section.labor_total,
          total: section.total,
        })
        .select("id")
        .single();

      if (newSectionError || !newSection) {
        reportStepError(
          "crear nuevas quote_sections",
          newSectionError || { message: "No se recibió nueva quote_section" }
        );
        setCreating(false);
        return;
      }

      sectionIdMap.set(section.id, newSection.id);
    }

    const itemsToInsert: NewQuoteItem[] = [];

    for (const item of sourceItems) {
      const newSectionId = sectionIdMap.get(item.quote_section_id);

      if (newSectionId) {
        itemsToInsert.push({
          quote_id: newQuote.id,
          quote_section_id: newSectionId,
          product_id: item.product_id,
          quantity: item.quantity,
          sale_currency: item.sale_currency,
          unit_equipment_price: item.unit_equipment_price,
          unit_equipment_price_usd: item.unit_equipment_price_usd,
          unit_labor_price: item.unit_labor_price,
          equipment_total: item.equipment_total,
          equipment_total_usd: item.equipment_total_usd,
          labor_total: item.labor_total,
          line_total: item.line_total,
          product_brand: item.product_brand,
          product_model: item.product_model,
          product_name: item.product_name,
          product_image_url: item.product_image_url,
          sort_order: item.sort_order,
        });
      }
    }

    if (itemsToInsert.length > 0) {
      const { data: insertedItems, error: insertItemsError } = await supabase
        .from("quote_items")
        .insert(itemsToInsert)
        .select("id, quote_section_id, sort_order");

      if (insertItemsError) {
        reportStepError("crear nuevos quote_items", insertItemsError);
        setCreating(false);
        return;
      }

      const sourceItemByNewKey = new Map<string, QuoteItem>();
      for (const sourceItem of sourceItems) {
        const newSectionId = sectionIdMap.get(sourceItem.quote_section_id);
        if (!newSectionId) continue;
        sourceItemByNewKey.set(
          `${newSectionId}:${Number(sourceItem.sort_order || 0)}`,
          sourceItem
        );
      }

      const newItemIdBySourceItemId = new Map<number, number>();
      for (const insertedItem of insertedItems || []) {
        const sourceItem = sourceItemByNewKey.get(
          `${insertedItem.quote_section_id}:${Number(insertedItem.sort_order || 0)}`
        );
        if (sourceItem) {
          newItemIdBySourceItemId.set(sourceItem.id, insertedItem.id);
        }
      }

      const laborActivitiesToInsert = (
        (sourceLaborActivities || []) as QuoteItemLaborActivity[]
      ).flatMap((activity) => {
        const newItemId = newItemIdBySourceItemId.get(activity.quote_item_id);
        if (!newItemId) return [];

        return {
          quote_item_id: newItemId,
          labor_activity_id: activity.labor_activity_id,
          name_snapshot: activity.name_snapshot || "Actividad",
          quantity: Number(activity.quantity || 0),
          unit: activity.unit || "pieza",
          internal_unit_cost_mxn: Number(activity.internal_unit_cost_mxn || 0),
          sale_unit_price_mxn: Number(activity.sale_unit_price_mxn || 0),
          internal_total_mxn: Number(activity.internal_total_mxn || 0),
          sale_total_mxn: Number(activity.sale_total_mxn || 0),
          assigned_role: activity.assigned_role,
          notes: activity.notes,
          sort_order: Number(activity.sort_order || 0),
        };
      });

      if (laborActivitiesToInsert.length > 0) {
        const { error: insertLaborActivitiesError } = await supabase
          .from("quote_item_labor_activities")
          .insert(laborActivitiesToInsert);

        if (insertLaborActivitiesError) {
          reportStepError(
            "crear actividades de mano de obra",
            insertLaborActivitiesError
          );
          setCreating(false);
          return;
        }
      }
    }

    const { data: terms, error: termsError } = await supabase
      .from("quote_terms_settings")
      .select(
        "payment_100_equipment, labor_payment_mode, payment_100_advance, is_local_guadalajara, includes_travel_expenses, includes_conduit, includes_cabling"
      )
      .eq("quote_id", quoteId)
      .maybeSingle();

    if (termsError && termsError.code !== "PGRST116") {
      reportStepError("leer quote_terms_settings", termsError);
      setCreating(false);
      return;
    }

    if (terms) {
      const { error: insertTermsError } = await supabase
        .from("quote_terms_settings")
        .insert({
          quote_id: newQuote.id,
          ...terms,
        });

      if (insertTermsError) {
        reportStepError("crear quote_terms_settings", insertTermsError);
        setCreating(false);
        return;
      }
    }

    if (quote.client_project_id) {
      const { data: project, error: projectError } = await supabase
        .from("client_projects")
        .select("sales_stage")
        .eq("id", quote.client_project_id)
        .maybeSingle();

      if (projectError) {
        reportStepError("leer etapa de oportunidad", projectError);
        setCreating(false);
        return;
      }

      if (shouldMoveVersionProjectToQuoted(project?.sales_stage)) {
        const { error: stageError } = await supabase
          .from("client_projects")
          .update({ sales_stage: "quoted" })
          .eq("id", quote.client_project_id);

        if (stageError) {
          reportStepError("actualizar etapa de oportunidad", stageError);
          setCreating(false);
          return;
        }
      }
    }

    try {
      router.push(`/quotes/${newQuote.id}`);
    } catch (error) {
      reportStepError("redirigir", error);
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreateVersion}
      disabled={disabled}
      className="bg-[#9E1B32] hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D] rounded-xl px-5 py-3 font-semibold"
    >
      {creating ? "Creando versión..." : "Crear nueva versión"}
    </button>
  );
}
