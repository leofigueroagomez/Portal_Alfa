"use server";

import { revalidatePath } from "next/cache";
import { canManagePurchases } from "@/lib/permissions";
import { recalculatePurchaseLineTotals } from "@/lib/projectPurchases";
import {
  getInventoryErrorMessage,
  parseInventoryAdjustInput,
  parseInventoryConsumeInput,
  parseInventoryEntryInput,
  parseInventoryLeftoverInput,
} from "@/lib/inventoryContract";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ActionResult =
  | { ok: true; movementId: number; warning?: string }
  | { ok: false; error: string };

type InventoryMovementResult = {
  id: number;
  inventory_item_id: number;
  project_purchase_event_id: number | null;
};

async function requireInventoryProfile() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile || !canManagePurchases(profile.role)) return null;
  return profile;
}

function revalidateInventory(projectId?: number) {
  revalidatePath("/inventory");
  if (projectId) revalidatePath(`/projects/${projectId}/purchases`);
}

export async function registerInventoryEntryAction(
  raw: Record<string, unknown>
): Promise<ActionResult> {
  const profile = await requireInventoryProfile();
  if (!profile) return { ok: false, error: "No autorizado." };

  try {
    const input = parseInventoryEntryInput(raw);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("inventory_register_entry", {
      p_product_id: input.productId,
      p_location: input.location,
      p_quantity: input.quantity,
      p_unit_cost: input.unitCost,
      p_cost_currency: input.costCurrency,
      p_exchange_rate: input.exchangeRate,
      p_source_purchase_event_id: null,
      p_supplier_id: input.supplierId,
      p_invoice_reference: input.invoiceReference,
      p_notes: input.notes,
      p_created_by_user_id: profile.id,
    });
    if (error) throw error;

    revalidateInventory();
    return { ok: true, movementId: Number((data as InventoryMovementResult).id) };
  } catch (error) {
    console.error("[inventory] entry failed", error);
    return { ok: false, error: getInventoryErrorMessage(error) };
  }
}

export async function adjustInventoryAction(
  raw: Record<string, unknown>
): Promise<ActionResult> {
  const profile = await requireInventoryProfile();
  if (!profile) return { ok: false, error: "No autorizado." };

  try {
    const input = parseInventoryAdjustInput(raw);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("inventory_adjust", {
      p_inventory_item_id: input.inventoryItemId,
      p_quantity_delta: input.quantityDelta,
      p_unit_cost_mxn: input.unitCostMxn,
      p_notes: input.notes,
      p_created_by_user_id: profile.id,
    });
    if (error) throw error;

    revalidateInventory();
    return { ok: true, movementId: Number((data as InventoryMovementResult).id) };
  } catch (error) {
    console.error("[inventory] adjust failed", error);
    return { ok: false, error: getInventoryErrorMessage(error) };
  }
}

/** "Sobrante a almacen": entrada con origen en un evento de compra del proyecto.
 *  No toca el evento ni la linea: el costo ya cargado al proyecto se queda igual. */
export async function registerPurchaseLeftoverAction(
  raw: Record<string, unknown>
): Promise<ActionResult> {
  const profile = await requireInventoryProfile();
  if (!profile) return { ok: false, error: "No autorizado." };

  try {
    const input = parseInventoryLeftoverInput(raw);
    const supabase = createSupabaseAdminClient();
    const { data: purchaseEvent, error: eventError } = await supabase
      .from("project_purchase_events")
      .select("id, project_purchase_line_id, quantity, supplier, invoice_reference")
      .eq("id", input.purchaseEventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!purchaseEvent) return { ok: false, error: "Compra no encontrada." };

    // Los sobrantes acumulados de una compra nunca pueden superar lo comprado.
    // Pendiente: replicar esta regla dentro de inventory_register_entry (SQL)
    // para cerrarla tambien ante registros concurrentes.
    const { data: previousLeftovers, error: leftoversError } = await supabase
      .from("inventory_movements")
      .select("quantity")
      .eq("source_purchase_event_id", input.purchaseEventId)
      .eq("movement_type", "in");
    if (leftoversError) throw leftoversError;

    const purchasedQuantity = Number(purchaseEvent.quantity || 0);
    const leftoverQuantity = (previousLeftovers || []).reduce(
      (sum, movement) => sum + Number(movement.quantity || 0),
      0
    );
    if (leftoverQuantity + input.quantity > purchasedQuantity + 0.0001) {
      const available = Math.max(purchasedQuantity - leftoverQuantity, 0);
      return {
        ok: false,
        error: `Esta compra fue de ${purchasedQuantity} pzas y ya tiene ${leftoverQuantity} como sobrante; solo puedes regresar ${available} mas al almacen.`,
      };
    }

    const { data: line, error: lineError } = await supabase
      .from("project_purchase_lines")
      .select("id, client_project_id, product_id")
      .eq("id", purchaseEvent.project_purchase_line_id)
      .maybeSingle();
    if (lineError) throw lineError;
    if (!line || Number(line.client_project_id) !== input.projectId) {
      return { ok: false, error: "La compra no pertenece a este proyecto." };
    }
    if (!line.product_id) {
      return {
        ok: false,
        error: "La linea no esta ligada a un producto del catalogo; no se puede llevar a almacen.",
      };
    }

    let supplierId: number | null = null;
    const supplierName = String(purchaseEvent.supplier || "").trim();
    if (supplierName) {
      const { data: supplierRow } = await supabase
        .from("suppliers")
        .select("id")
        .ilike("name", supplierName.replace(/[\\%_]/g, "\\$&"))
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      supplierId = supplierRow ? Number(supplierRow.id) : null;
    }

    const { data, error } = await supabase.rpc("inventory_register_entry", {
      p_product_id: Number(line.product_id),
      p_location: input.location,
      p_quantity: input.quantity,
      p_unit_cost: input.unitCostMxn,
      p_cost_currency: "MXN",
      p_exchange_rate: null,
      p_source_purchase_event_id: input.purchaseEventId,
      p_supplier_id: supplierId,
      p_invoice_reference: purchaseEvent.invoice_reference || null,
      p_notes: [`Sobrante de la compra #${input.purchaseEventId} (proyecto ${input.projectId}).`, input.notes]
        .filter(Boolean)
        .join(" "),
      p_created_by_user_id: profile.id,
    });
    if (error) throw error;

    revalidateInventory(input.projectId);
    return { ok: true, movementId: Number((data as InventoryMovementResult).id) };
  } catch (error) {
    console.error("[inventory] leftover failed", error);
    return { ok: false, error: getInventoryErrorMessage(error) };
  }
}

/** "Consumir de almacen": salida + project_purchase_event en MXN al costo
 *  promedio (lo crea la funcion SQL) y totales de la linea con la misma
 *  formula que "Registrar compra". */
export async function consumeInventoryToProjectAction(
  raw: Record<string, unknown>
): Promise<ActionResult> {
  const profile = await requireInventoryProfile();
  if (!profile) return { ok: false, error: "No autorizado." };

  let input;
  try {
    input = parseInventoryConsumeInput(raw);
  } catch (error) {
    return { ok: false, error: getInventoryErrorMessage(error) };
  }

  const supabase = createSupabaseAdminClient();
  let movement: InventoryMovementResult;
  try {
    const { data, error } = await supabase.rpc("inventory_consume_to_project", {
      p_inventory_item_id: input.inventoryItemId,
      p_project_purchase_line_id: input.purchaseLineId,
      p_client_project_id: input.projectId,
      p_quantity: input.quantity,
      p_purchase_date: input.purchaseDate,
      p_notes: input.notes,
      p_created_by_user_id: profile.id,
    });
    if (error) throw error;
    movement = data as InventoryMovementResult;
  } catch (error) {
    console.error("[inventory] consume failed", error);
    return { ok: false, error: getInventoryErrorMessage(error) };
  }

  const lineWarning = `La salida quedo registrada (movimiento #${movement.id}) pero no se actualizaron los totales de la linea de compra #${input.purchaseLineId}. Avisa a un administrador.`;
  try {
    // El evento sale en MXN al costo promedio; la linea puede estar en USD.
    // Se recalcula desde todos sus eventos, convirtiendo cada uno a la moneda
    // de la linea, en lugar de sumar el costo crudo al total previo.
    await recalculatePurchaseLineTotals(supabase, input.purchaseLineId);
    revalidateInventory(input.projectId);
    return { ok: true, movementId: Number(movement.id) };
  } catch (error) {
    console.error("[inventory] consume line update failed", error);
    revalidateInventory(input.projectId);
    return { ok: true, movementId: Number(movement.id), warning: lineWarning };
  }
}

export type InventoryProductOption = {
  id: number;
  brand: string | null;
  model: string | null;
  name: string | null;
  unit_name: string | null;
  cost_price: number | null;
  cost_currency: string | null;
  supplier_id: number | null;
};

export async function searchInventoryProductsAction(
  query: string
): Promise<InventoryProductOption[]> {
  const profile = await requireInventoryProfile();
  if (!profile) return [];

  // Solo caracteres seguros dentro del filtro .or() de PostgREST.
  const term = String(query || "")
    .replace(/[^\p{L}\p{N}\s\-./]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (term.length < 2) return [];

  const supabase = await createSupabaseServerClient();
  const pattern = `%${term}%`;
  const { data, error } = await supabase
    .from("products")
    .select("id, brand, model, name, unit_name, cost_price, cost_currency, supplier_id")
    .or(`model.ilike.${pattern},brand.ilike.${pattern},name.ilike.${pattern},sku.ilike.${pattern}`)
    .order("model", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[inventory] product search failed", error);
    return [];
  }
  return (data || []) as InventoryProductOption[];
}
