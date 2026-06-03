import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectDeliverySystemDisplay = {
  id: string;
  system_name: string;
  delivered: boolean;
  notes: string | null;
  source: "delivery" | "operational" | "quote";
};

type DeliverySystemRow = {
  id: number;
  system_name: string | null;
  delivered: boolean | null;
  notes: string | null;
};

type OperationalSystemRow = {
  system_name: string | null;
};

type QuoteRow = {
  id: number;
};

type QuoteSectionRow = {
  id: number;
  name: string | null;
};

function uniqueSystemRows(
  rows: { system_name: string | null; notes?: string | null }[],
  source: ProjectDeliverySystemDisplay["source"]
) {
  const seen = new Set<string>();
  const systems: ProjectDeliverySystemDisplay[] = [];

  rows.forEach((row, index) => {
    const name = row.system_name?.trim();
    if (!name) return;

    const key = name.toLocaleLowerCase("es-MX");
    if (seen.has(key)) return;
    seen.add(key);
    systems.push({
      id: `${source}-${index}-${key}`,
      system_name: name,
      delivered: true,
      notes: row.notes || null,
      source,
    });
  });

  return systems;
}

export async function getProjectDeliverySystemsForDisplay(
  supabase: SupabaseClient,
  projectId: number,
  deliveryId?: number | string | null
) {
  if (deliveryId) {
    const { data } = await supabase
      .from("project_delivery_systems")
      .select("id, system_name, delivered, notes")
      .eq("project_delivery_id", deliveryId)
      .order("created_at", { ascending: true });

    const deliverySystems = ((data || []) as DeliverySystemRow[])
      .filter((system) => system.delivered !== false)
      .map((system) => ({
        id: `delivery-${system.id}`,
        system_name: system.system_name?.trim() || "",
        delivered: system.delivered !== false,
        notes: system.notes,
        source: "delivery" as const,
      }))
      .filter((system) => system.system_name);

    if (deliverySystems.length > 0) return deliverySystems;
  }

  const { data: operationalItems } = await supabase
    .from("project_operational_items")
    .select("system_name")
    .eq("client_project_id", projectId)
    .neq("status", "deleted")
    .order("system_name", { ascending: true });

  const operationalSystems = uniqueSystemRows(
    (operationalItems || []) as OperationalSystemRow[],
    "operational"
  );

  if (operationalSystems.length > 0) return operationalSystems;

  const { data: approvedQuotes } = await supabase
    .from("quotes")
    .select("id")
    .eq("client_project_id", projectId)
    .eq("status", "approved");
  const quoteIds = ((approvedQuotes || []) as QuoteRow[]).map((quote) => quote.id);

  if (quoteIds.length === 0) return [];

  const { data: quoteSections } = await supabase
    .from("quote_sections")
    .select("id, name")
    .in("quote_id", quoteIds)
    .order("sort_order", { ascending: true });

  return uniqueSystemRows(
    ((quoteSections || []) as QuoteSectionRow[]).map((section) => ({
      system_name: section.name,
    })),
    "quote"
  );
}
