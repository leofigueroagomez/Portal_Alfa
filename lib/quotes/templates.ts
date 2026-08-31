import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDraftQuote, type DraftQuoteResult } from "./draftBuilder";

/**
 * Sprint G3 - Plantillas / paquetes estandar.
 *
 * Una plantilla es una lista de lineas (producto o mano de obra, con cantidad).
 * `buildDraftFromTemplate` la traduce al contrato de `buildDraftQuote` y crea un
 * borrador. ALFA cotiza a precio de catalogo, asi que las lineas no llevan margen.
 */

export type QuoteTemplateLineInput = {
  kind: "product" | "labor";
  product_id?: number | null;
  labor_activity_id?: number | null;
  quantity: number;
};

export type QuoteTemplateInput = {
  id?: number;
  name: string;
  description?: string | null;
  scenario?: string | null;
  default_notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
  lines: QuoteTemplateLineInput[];
};

export type ResolvedTemplateLine = {
  id: number;
  kind: "product" | "labor";
  product_id: number | null;
  labor_activity_id: number | null;
  quantity: number;
  sort_order: number;
  /** Etiqueta legible resuelta contra el catalogo. */
  label: string;
  /** Precio unitario de referencia (USD para equipo, MXN para mano de obra). */
  unit_price: number | null;
  unit_currency: "USD" | "MXN" | null;
  /** true si el producto/actividad referenciada ya no existe o esta inactiva. */
  broken: boolean;
};

export type QuoteTemplate = {
  id: number;
  name: string;
  description: string | null;
  scenario: string | null;
  default_notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  lines: ResolvedTemplateLine[];
  /** Cantidad de lineas con referencia rota. Si > 0 hay que arreglar la plantilla. */
  broken_line_count: number;
};

type TemplateRow = {
  id: number;
  name: string;
  description: string | null;
  scenario: string | null;
  default_notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type LineRow = {
  id: number;
  template_id: number;
  kind: "product" | "labor";
  product_id: number | null;
  labor_activity_id: number | null;
  quantity: number | string | null;
  sort_order: number;
};

function num(value: unknown): number {
  return Number(value ?? 0);
}

async function resolveLines(
  supabase: SupabaseClient,
  lines: LineRow[],
): Promise<ResolvedTemplateLine[]> {
  const productIds = [
    ...new Set(lines.filter((l) => l.product_id).map((l) => l.product_id as number)),
  ];
  const laborIds = [
    ...new Set(
      lines.filter((l) => l.labor_activity_id).map((l) => l.labor_activity_id as number),
    ),
  ];

  const [productsRes, laborRes] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("products")
          .select("id, brand, model, name, calculated_sale_price, sale_currency, is_active")
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    laborIds.length > 0
      ? supabase
          .from("labor_activity_catalog")
          .select("id, name, default_sale_price_mxn, is_active")
          .in("id", laborIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const products = new Map(
    ((productsRes.data ?? []) as Array<{
      id: number;
      brand: string | null;
      model: string | null;
      name: string | null;
      calculated_sale_price: number | null;
      sale_currency: string | null;
      is_active: boolean;
    }>).map((p) => [p.id, p]),
  );
  const labor = new Map(
    ((laborRes.data ?? []) as Array<{
      id: number;
      name: string | null;
      default_sale_price_mxn: number | null;
      is_active: boolean;
    }>).map((a) => [a.id, a]),
  );

  return lines
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((line) => {
      if (line.kind === "product") {
        const product = line.product_id ? products.get(line.product_id) : undefined;
        const broken = !product || product.is_active === false;
        const label = product
          ? `${(product.brand || "").trim()} ${(product.model || "").trim()}`.trim() ||
            (product.name || "").trim() ||
            `Producto ${line.product_id}`
          : `Producto ${line.product_id ?? "?"} (no disponible)`;
        return {
          id: line.id,
          kind: "product" as const,
          product_id: line.product_id,
          labor_activity_id: null,
          quantity: num(line.quantity),
          sort_order: line.sort_order,
          label,
          unit_price: product ? num(product.calculated_sale_price) : null,
          unit_currency: product
            ? (product.sale_currency || "USD").toUpperCase() === "MXN"
              ? "MXN"
              : "USD"
            : null,
          broken,
        };
      }
      const activity = line.labor_activity_id ? labor.get(line.labor_activity_id) : undefined;
      const broken = !activity || activity.is_active === false;
      return {
        id: line.id,
        kind: "labor" as const,
        product_id: null,
        labor_activity_id: line.labor_activity_id,
        quantity: num(line.quantity),
        sort_order: line.sort_order,
        label: activity
          ? (activity.name || `Actividad ${line.labor_activity_id}`).trim()
          : `Actividad ${line.labor_activity_id ?? "?"} (no disponible)`,
        unit_price: activity ? num(activity.default_sale_price_mxn) : null,
        unit_currency: activity ? "MXN" : null,
        broken,
      };
    });
}

export async function listQuoteTemplates(
  supabase: SupabaseClient,
  options?: { includeInactive?: boolean },
): Promise<QuoteTemplate[]> {
  let query = supabase
    .from("quote_templates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (!options?.includeInactive) query = query.eq("is_active", true);

  const { data: templates, error } = await query;
  if (error) throw error;
  const rows = (templates ?? []) as TemplateRow[];
  if (rows.length === 0) return [];

  const { data: lineData, error: lineError } = await supabase
    .from("quote_template_lines")
    .select("*")
    .in(
      "template_id",
      rows.map((r) => r.id),
    );
  if (lineError) throw lineError;
  const allLines = (lineData ?? []) as LineRow[];

  const resolvedByTemplate = new Map<number, ResolvedTemplateLine[]>();
  for (const row of rows) {
    const templateLines = allLines.filter((l) => l.template_id === row.id);
    resolvedByTemplate.set(row.id, await resolveLines(supabase, templateLines));
  }

  return rows.map((row) => {
    const lines = resolvedByTemplate.get(row.id) ?? [];
    return {
      ...row,
      lines,
      broken_line_count: lines.filter((l) => l.broken).length,
    };
  });
}

export async function getQuoteTemplate(
  supabase: SupabaseClient,
  id: number,
): Promise<QuoteTemplate | null> {
  const { data: template, error } = await supabase
    .from("quote_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!template) return null;

  const { data: lineData, error: lineError } = await supabase
    .from("quote_template_lines")
    .select("*")
    .eq("template_id", id);
  if (lineError) throw lineError;

  const lines = await resolveLines(supabase, (lineData ?? []) as LineRow[]);
  return {
    ...(template as TemplateRow),
    lines,
    broken_line_count: lines.filter((l) => l.broken).length,
  };
}

export type BuildDraftFromTemplateResult = DraftQuoteResult & {
  template_id: number;
  template_name: string;
  skipped_broken_lines: number;
};

/**
 * Traduce la plantilla al contrato de buildDraftQuote y crea el borrador.
 * `quantityOverrides` mapea id de linea -> nueva cantidad (para ajustar en el
 * momento). Las lineas rotas se omiten y se cuentan en el resultado.
 */
export async function buildDraftFromTemplate(
  supabase: SupabaseClient,
  params: {
    templateId: number;
    clientId: number;
    quantityOverrides?: Record<number, number>;
    notes?: string | null;
  },
): Promise<BuildDraftFromTemplateResult> {
  const template = await getQuoteTemplate(supabase, params.templateId);
  if (!template) {
    throw new Error("La plantilla no existe.");
  }

  const overrides = params.quantityOverrides ?? {};
  const usableLines = template.lines.filter((line) => !line.broken);
  const skipped = template.lines.length - usableLines.length;

  const items = usableLines
    .filter((line) => line.kind === "product" && line.product_id)
    .map((line) => ({
      product_id: line.product_id as number,
      qty: Math.max(0, Number(overrides[line.id] ?? line.quantity)),
    }))
    .filter((item) => item.qty > 0);

  const labor = usableLines
    .filter((line) => line.kind === "labor" && line.labor_activity_id)
    .map((line) => ({
      labor_activity_id: line.labor_activity_id as number,
      qty: Math.max(0, Number(overrides[line.id] ?? line.quantity)),
    }))
    .filter((item) => item.qty > 0);

  if (items.length === 0 && labor.length === 0) {
    throw new Error(
      "La plantilla no tiene lineas usables (todas rotas o en cantidad cero).",
    );
  }

  const result = await buildDraftQuote(supabase, {
    client_id: params.clientId,
    items,
    labor,
    notes: params.notes ?? template.default_notes ?? undefined,
  });

  return {
    ...result,
    template_id: template.id,
    template_name: template.name,
    skipped_broken_lines: skipped,
  };
}
