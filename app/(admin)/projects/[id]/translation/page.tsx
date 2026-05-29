import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { syncProjectOperationalItems } from "@/lib/projectOperationalItems";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import ProjectTranslationEditor, {
  OperationalEditorItem,
  ProductOption,
  TranslationChange,
} from "./ProjectTranslationEditor";

type ClientProject = {
  id: number;
  name: string | null;
};

type OperationalItemRow = {
  id: number;
  client_project_id: number;
  system_name: string | null;
  product_id: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
  quantity: number | null;
  original_quantity: number | null;
  original_unit_cost: number | null;
  operational_unit_cost: number | null;
  cost_currency: string | null;
  status: string | null;
};

type PurchaseLine = {
  id: number;
  project_operational_item_id: number | null;
  quantity_purchased: number | null;
};

type DeliveryItem = {
  project_purchase_line_id: number | null;
  quantity_delivered: number | null;
};

function summarizeTotals(items: OperationalEditorItem[]) {
  return items.reduce(
    (totals, item) => {
      totals.original += Number(item.original_quantity || 0) * Number(item.original_unit_cost || 0);
      totals.operational += Number(item.quantity || 0) * Number(item.operational_unit_cost || 0);
      return totals;
    },
    { original: 0, operational: 0 }
  );
}

export default async function ProjectTranslationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  const projectData = project as ClientProject | null;
  let translationSqlError: string | null = null;

  try {
    await syncProjectOperationalItems(supabase, Number(id));
  } catch (error) {
    translationSqlError =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "No se pudo sincronizar la base operativa.";
  }

  const [
    operationalResult,
    productsResult,
    purchaseLinesResult,
    changesResult,
  ] = translationSqlError
    ? [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]
    : await Promise.all([
        supabase
          .from("project_operational_items")
          .select(
            "id, client_project_id, system_name, product_id, product_brand, product_model, product_name, product_image_url, quantity, original_quantity, original_unit_cost, operational_unit_cost, cost_currency, status"
          )
          .eq("client_project_id", id)
          .order("system_name", { ascending: true })
          .order("product_brand", { ascending: true }),
        supabase
          .from("products")
          .select(
            "id, sku, brand, model, name, description, category, category_id, image_url, cost_price, cost_currency, calculated_sale_price, sale_currency, labor_unit_cost, labor_unit_sale_price, is_favorite, partner_discount_eligible, product_categories(name), product_tag_assignments(product_tags(id, name))"
          )
          .eq("is_active", true)
          .order("is_favorite", { ascending: false })
          .order("brand", { ascending: true }),
        supabase
          .from("project_purchase_lines")
          .select("id, project_operational_item_id, quantity_purchased")
          .eq("client_project_id", id),
        supabase
          .from("project_translation_changes")
          .select(
            "id, change_type, old_product_name, new_product_name, old_quantity, new_quantity, old_unit_cost, new_unit_cost, cost_difference, notes, created_at"
          )
          .eq("client_project_id", id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

  if (operationalResult.error) translationSqlError = operationalResult.error.message;
  if (changesResult.error) translationSqlError = changesResult.error.message;

  const purchaseLines = (purchaseLinesResult.data || []) as PurchaseLine[];
  const purchaseLineIds = purchaseLines.map((line) => line.id);
  const { data: rawDeliveryItems } =
    purchaseLineIds.length && !translationSqlError
      ? await supabase
          .from("project_material_delivery_items")
          .select("project_purchase_line_id, quantity_delivered")
          .in("project_purchase_line_id", purchaseLineIds)
      : { data: [] };

  const purchasedByOperationalItem = purchaseLines.reduce((map, line) => {
    if (!line.project_operational_item_id) return map;
    map.set(
      line.project_operational_item_id,
      Number(map.get(line.project_operational_item_id) || 0) +
        Number(line.quantity_purchased || 0)
    );
    return map;
  }, new Map<number, number>());
  const purchaseLineToOperationalItem = new Map(
    purchaseLines
      .filter((line) => line.project_operational_item_id)
      .map((line) => [line.id, line.project_operational_item_id as number])
  );
  const deliveredByOperationalItem = ((rawDeliveryItems || []) as DeliveryItem[]).reduce(
    (map, item) => {
      if (!item.project_purchase_line_id) return map;
      const operationalItemId = purchaseLineToOperationalItem.get(item.project_purchase_line_id);
      if (!operationalItemId) return map;

      map.set(
        operationalItemId,
        Number(map.get(operationalItemId) || 0) + Number(item.quantity_delivered || 0)
      );
      return map;
    },
    new Map<number, number>()
  );

  const editorItems = ((operationalResult.data || []) as OperationalItemRow[]).map((item) => ({
    id: item.id,
    client_project_id: item.client_project_id,
    system_name: item.system_name,
    product_id: item.product_id,
    product_brand: item.product_brand,
    product_model: item.product_model,
    product_name: item.product_name,
    product_image_url: item.product_image_url,
    quantity: Number(item.quantity || 0),
    original_quantity: Number(item.original_quantity || 0),
    original_unit_cost: Number(item.original_unit_cost || 0),
    operational_unit_cost: Number(item.operational_unit_cost || 0),
    cost_currency: item.cost_currency || "USD",
    status: item.status || "active",
    quantity_purchased: Number(purchasedByOperationalItem.get(item.id) || 0),
    quantity_delivered: Number(deliveredByOperationalItem.get(item.id) || 0),
  })) satisfies OperationalEditorItem[];
  const products = (productsResult.data || []) as ProductOption[];
  const changes = (changesResult.data || []) as TranslationChange[];
  const totals = summarizeTotals(editorItems);
  const saving = Math.max(totals.original - totals.operational, 0);
  const overrun = Math.max(totals.operational - totals.original, 0);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver al proyecto
      </Link>

      <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            TRADUCCION TECNICA
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {projectData?.name || "Proyecto operativo"}
          </h1>
          <p className="mt-3 max-w-3xl text-[#B3B3B8]">
            Editor interno de la base operativa. No modifica cotizacion ni estado de cuenta.
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex w-fit rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
        >
          Crear producto nuevo
        </Link>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Costo original</p>
          <p className="mt-1 text-lg font-bold">{formatCurrency(totals.original, "USD")}</p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Costo operativo</p>
          <p className="mt-1 text-lg font-bold">{formatCurrency(totals.operational, "USD")}</p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Ahorro ingenieria</p>
          <p className="mt-1 text-lg font-bold text-[#8CE0B6]">
            {formatCurrency(saving, "USD")}
          </p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Sobrecosto</p>
          <p className="mt-1 text-lg font-bold text-[#FFB19C]">
            {formatCurrency(overrun, "USD")}
          </p>
        </div>
        <div className="rounded-lg border border-[#1F1F24] bg-[#151518] p-3">
          <p className="text-xs text-[#B3B3B8]">Variacion neta</p>
          <p className={`mt-1 text-lg font-bold ${totals.original - totals.operational >= 0 ? "text-[#8CE0B6]" : "text-[#FFB19C]"}`}>
            {formatCurrency(totals.original - totals.operational, "USD")}
          </p>
        </div>
      </section>

      {translationSqlError ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-5 text-[#F4C66A]">
          Ejecuta el SQL de traduccion tecnica para habilitar esta vista. Detalle:{" "}
          {translationSqlError}
        </section>
      ) : (
        <ProjectTranslationEditor
          projectId={Number(id)}
          initialItems={editorItems}
          products={products}
          recentChanges={changes}
        />
      )}
    </main>
  );
}
