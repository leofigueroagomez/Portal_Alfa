import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ejecutores de 1 clic de la Bandeja (Sprint B1).
 *
 * Cada ejecutor:
 *  - canApply(): verificacion de seguridad ANTES de tocar nada. Si devuelve
 *    { ok: false }, la Bandeja muestra el motivo y NO ofrece el boton.
 *  - apply(): aplica la correccion y guarda un snapshot en vigia_action_backups.
 *  - revert(): restaura desde el snapshot.
 *
 * Regla: si hay cualquier duda (varias lineas candidatas, compras en ambos lados,
 * ordenes de trabajo de por medio), el ejecutor se NIEGA y lo manda a revision
 * manual. Preferimos no actuar antes que actuar mal sobre datos de dinero.
 */

export type ExecFinding = {
  id: number;
  sensor_id: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  proposed_action: Record<string, unknown> | null;
};

export type CanApplyResult = { ok: boolean; reason?: string };
export type ApplyResult = {
  ok: boolean;
  error?: string;
  backupId?: number;
  summary?: string;
};
export type RevertResult = { ok: boolean; error?: string };

export type Executor = {
  type: string;
  label: string;
  canApply: (supabase: SupabaseClient, finding: ExecFinding) => Promise<CanApplyResult>;
  apply: (
    supabase: SupabaseClient,
    finding: ExecFinding,
    actor: string,
  ) => Promise<ApplyResult>;
  revert: (
    supabase: SupabaseClient,
    snapshot: Record<string, unknown>,
  ) => Promise<RevertResult>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function num(value: unknown): number {
  return Number(value ?? 0);
}

async function saveBackup(
  supabase: SupabaseClient,
  findingId: number,
  actionType: string,
  actor: string,
  snapshot: Record<string, unknown>,
  summary: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("vigia_action_backups")
    .insert({ finding_id: findingId, action_type: actionType, actor, snapshot, summary })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: number }).id;
}

type PurchaseEventRow = {
  quantity: number | null;
  unit_cost: number | null;
  supplier: string | null;
};

/** Recalculo de una linea de compra desde sus eventos (misma formula que
 *  app/api/projects/[id]/purchases/events/[eventId]/route.ts). */
function recomputeLineFromEvents(
  line: {
    quantity_required: number | null;
    unit_cost: number | null;
    total_required_cost: number | null;
    supplier: string | null;
  },
  events: PurchaseEventRow[],
) {
  const quantityPurchased = events.reduce((s, e) => s + num(e.quantity), 0);
  const totalPurchasedCost = events.reduce(
    (s, e) => s + num(e.quantity) * num(e.unit_cost),
    0,
  );
  const estUnit =
    num(line.quantity_required) > 0
      ? num(line.total_required_cost) / num(line.quantity_required)
      : num(line.unit_cost);
  const totalPendingCost = Math.max(
    num(line.total_required_cost) - quantityPurchased * estUnit,
    0,
  );
  const quantityRequired = num(line.quantity_required);
  const purchase_status =
    quantityPurchased <= 0
      ? "pending"
      : quantityPurchased >= quantityRequired
        ? "purchased"
        : "partial";
  const supplier =
    events.find((e) => e.supplier?.trim())?.supplier || line.supplier || null;

  return {
    quantity_purchased: quantityPurchased,
    total_purchased_cost: totalPurchasedCost,
    total_pending_cost: totalPendingCost,
    purchase_status,
    supplier,
  };
}

// ---------------------------------------------------------------------------
// Executor: recalcular_lineas_de_compra  (INT-09)
// ---------------------------------------------------------------------------

type OperationalItemRow = {
  id: number;
  product_id: number | null;
  quantity: number | null;
  operational_unit_cost: number | null;
  cost_currency: string | null;
};
type ProductCostRow = { id: number; cost_price: number | null; cost_currency: string | null };
type PurchaseLineRow = {
  id: number;
  project_operational_item_id: number | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
  total_required_cost: number | null;
  total_pending_cost: number | null;
};

const recalcularLineasDeCompra: Executor = {
  type: "recalcular_lineas_de_compra",
  label: "Recalcular lineas desde la base operativa",
  async canApply(supabase, finding) {
    const projectId = Number(
      (finding.proposed_action?.client_project_id as number | undefined) ?? finding.entity_id,
    );
    if (!projectId) return { ok: false, reason: "Falta el proyecto en el hallazgo." };

    const { count } = await supabase
      .from("project_purchase_lines")
      .select("id", { count: "exact", head: true })
      .eq("client_project_id", projectId)
      .not("project_operational_item_id", "is", null);
    if (!count) return { ok: false, reason: "El proyecto no tiene lineas ligadas a la base operativa." };
    return { ok: true };
  },
  async apply(supabase, finding, actor) {
    const projectId = Number(
      (finding.proposed_action?.client_project_id as number | undefined) ?? finding.entity_id,
    );

    const { data: linesData, error: linesErr } = await supabase
      .from("project_purchase_lines")
      .select(
        "id, project_operational_item_id, quantity_required, quantity_purchased, unit_cost, cost_currency, total_required_cost, total_pending_cost",
      )
      .eq("client_project_id", projectId)
      .not("project_operational_item_id", "is", null);
    if (linesErr) return { ok: false, error: linesErr.message };
    const lines = (linesData ?? []) as PurchaseLineRow[];
    if (lines.length === 0) return { ok: false, error: "Sin lineas para recalcular." };

    const opIds = Array.from(
      new Set(lines.map((l) => l.project_operational_item_id).filter(Boolean) as number[]),
    );
    const { data: opData } = await supabase
      .from("project_operational_items")
      .select("id, product_id, quantity, operational_unit_cost, cost_currency")
      .in("id", opIds);
    const ops = new Map(((opData ?? []) as OperationalItemRow[]).map((o) => [o.id, o]));

    const productIds = Array.from(
      new Set(
        ((opData ?? []) as OperationalItemRow[]).map((o) => o.product_id).filter(Boolean) as number[],
      ),
    );
    const { data: prodData } = productIds.length
      ? await supabase.from("products").select("id, cost_price, cost_currency").in("id", productIds)
      : { data: [] };
    const products = new Map(((prodData ?? []) as ProductCostRow[]).map((p) => [p.id, p]));

    const snapshotLines = lines.map((l) => ({
      id: l.id,
      unit_cost: l.unit_cost,
      cost_currency: l.cost_currency,
      total_required_cost: l.total_required_cost,
      total_pending_cost: l.total_pending_cost,
    }));

    let changed = 0;
    for (const line of lines) {
      const op = line.project_operational_item_id
        ? ops.get(line.project_operational_item_id)
        : null;
      if (!op) continue;
      const product = op.product_id ? products.get(op.product_id) : null;
      const unitCost = num(op.operational_unit_cost) || num(product?.cost_price);
      const costCurrency =
        (op.cost_currency || product?.cost_currency || "USD").toUpperCase() === "MXN"
          ? "MXN"
          : "USD";
      const quantityRequired = num(line.quantity_required) || num(op.quantity);
      const totalRequiredCost = unitCost * quantityRequired;
      const totalPendingCost = Math.max(
        totalRequiredCost - unitCost * num(line.quantity_purchased),
        0,
      );

      const { error: updErr } = await supabase
        .from("project_purchase_lines")
        .update({
          unit_cost: unitCost,
          cost_currency: costCurrency,
          total_required_cost: totalRequiredCost,
          total_pending_cost: totalPendingCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.id);
      if (updErr) return { ok: false, error: updErr.message };
      changed += 1;
    }

    const summary = `${changed} linea(s) de compra recalculadas desde la base operativa.`;
    const backupId = await saveBackup(
      supabase,
      finding.id,
      this.type,
      actor,
      { kind: "purchase_lines", lines: snapshotLines },
      summary,
    );
    return { ok: true, backupId, summary };
  },
  async revert(supabase, snapshot) {
    const lines = (snapshot.lines ?? []) as {
      id: number;
      unit_cost: number | null;
      cost_currency: string | null;
      total_required_cost: number | null;
      total_pending_cost: number | null;
    }[];
    for (const l of lines) {
      const { error } = await supabase
        .from("project_purchase_lines")
        .update({
          unit_cost: l.unit_cost,
          cost_currency: l.cost_currency,
          total_required_cost: l.total_required_cost,
          total_pending_cost: l.total_pending_cost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", l.id);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// Executor: fusionar_linea_huerfana  (INT-02)
// ---------------------------------------------------------------------------

type OrphanLineRow = {
  id: number;
  client_project_id: number;
  product_id: number | null;
  project_operational_item_id: number | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
  unit_cost: number | null;
  cost_currency: string | null;
  total_required_cost: number | null;
  total_purchased_cost: number | null;
  total_pending_cost: number | null;
  purchase_status: string | null;
  supplier: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  quote_item_id: number | null;
  notes: string | null;
};

async function findHealthySibling(supabase: SupabaseClient, orphan: OrphanLineRow) {
  const { data } = await supabase
    .from("project_purchase_lines")
    .select(
      "id, quantity_required, quantity_purchased, unit_cost, total_required_cost, total_purchased_cost, total_pending_cost, purchase_status, supplier, project_operational_item_id",
    )
    .eq("client_project_id", orphan.client_project_id)
    .eq("product_id", orphan.product_id as number)
    .neq("id", orphan.id);
  const rows = (data ?? []) as {
    id: number;
    project_operational_item_id: number | null;
    quantity_required: number | null;
    unit_cost: number | null;
    total_required_cost: number | null;
    supplier: string | null;
    quantity_purchased: number | null;
    total_purchased_cost: number | null;
    total_pending_cost: number | null;
    purchase_status: string | null;
  }[];
  if (rows.length === 0) return { healthy: null as (typeof rows)[number] | null, count: 0 };

  const opIds = rows.map((r) => r.project_operational_item_id).filter(Boolean) as number[];
  const { data: opData } = opIds.length
    ? await supabase.from("project_operational_items").select("id, status").in("id", opIds)
    : { data: [] };
  const activeOps = new Set(
    ((opData ?? []) as { id: number; status: string }[])
      .filter((o) => o.status !== "deleted")
      .map((o) => o.id),
  );
  const healthy = rows.filter(
    (r) => r.project_operational_item_id && activeOps.has(r.project_operational_item_id),
  );
  return { healthy: healthy[0] ?? null, count: healthy.length };
}

const fusionarLineaHuerfana: Executor = {
  type: "fusionar_linea_huerfana",
  label: "Fusionar en la linea sana y eliminar la huerfana",
  async canApply(supabase, finding) {
    const orphanId = Number(finding.proposed_action?.orphan_line_id);
    if (!orphanId) return { ok: false, reason: "Falta la linea huerfana en el hallazgo." };

    const { data: orphan } = await supabase
      .from("project_purchase_lines")
      .select("id, client_project_id, product_id, project_operational_item_id")
      .eq("id", orphanId)
      .maybeSingle();
    if (!orphan) return { ok: false, reason: "La linea huerfana ya no existe." };

    // Confirmar que sigue siendo huerfana
    if (orphan.project_operational_item_id) {
      const { data: op } = await supabase
        .from("project_operational_items")
        .select("status")
        .eq("id", orphan.project_operational_item_id)
        .maybeSingle();
      if (op && (op as { status: string }).status !== "deleted") {
        return { ok: false, reason: "La linea ya tiene una partida operativa activa; no es huerfana." };
      }
    }

    const { count: deliveryRefs } = await supabase
      .from("project_material_delivery_items")
      .select("id", { count: "exact", head: true })
      .eq("project_purchase_line_id", orphanId);
    if (deliveryRefs && deliveryRefs > 0) {
      return { ok: false, reason: "La linea huerfana esta ligada a entregas de material; requiere revision manual." };
    }

    const { healthy, count } = await findHealthySibling(supabase, orphan as OrphanLineRow);
    if (count === 0) return { ok: false, reason: "No hay una linea sana equivalente; requiere decision manual." };
    if (count > 1) return { ok: false, reason: "Hay varias lineas equivalentes; requiere decision manual." };

    const { count: healthyEvents } = await supabase
      .from("project_purchase_events")
      .select("id", { count: "exact", head: true })
      .eq("project_purchase_line_id", healthy!.id);
    if (healthyEvents && healthyEvents > 0) {
      return {
        ok: false,
        reason:
          "La linea sana ya tiene compras registradas: posible doble captura. Requiere revision manual, no fusion automatica.",
      };
    }

    return { ok: true };
  },
  async apply(supabase, finding, actor) {
    const orphanId = Number(finding.proposed_action?.orphan_line_id);

    const { data: orphanFull, error: oErr } = await supabase
      .from("project_purchase_lines")
      .select("*")
      .eq("id", orphanId)
      .single();
    if (oErr || !orphanFull) return { ok: false, error: "No se pudo leer la linea huerfana." };
    const orphan = orphanFull as OrphanLineRow;

    const pre = await this.canApply(supabase, finding);
    if (!pre.ok) return { ok: false, error: pre.reason };

    const { healthy } = await findHealthySibling(supabase, orphan);
    if (!healthy) return { ok: false, error: "No hay linea sana." };

    const { data: eventsData } = await supabase
      .from("project_purchase_events")
      .select("*")
      .eq("project_purchase_line_id", orphanId);
    const events = (eventsData ?? []) as Record<string, unknown>[];

    const snapshot = {
      kind: "merge_orphan_line",
      orphan_line: orphanFull,
      orphan_events: events,
      healthy_line_id: healthy.id,
      healthy_pre: {
        quantity_purchased: healthy.quantity_purchased,
        total_purchased_cost: healthy.total_purchased_cost,
        total_pending_cost: healthy.total_pending_cost,
        purchase_status: healthy.purchase_status,
        supplier: healthy.supplier,
      },
    };

    // 1. mover eventos
    const { error: moveErr } = await supabase
      .from("project_purchase_events")
      .update({ project_purchase_line_id: healthy.id })
      .eq("project_purchase_line_id", orphanId);
    if (moveErr) return { ok: false, error: moveErr.message };

    // 2. recalcular la linea sana
    const { data: healthyEventsData } = await supabase
      .from("project_purchase_events")
      .select("quantity, unit_cost, supplier")
      .eq("project_purchase_line_id", healthy.id);
    const recomputed = recomputeLineFromEvents(
      {
        quantity_required: healthy.quantity_required,
        unit_cost: healthy.unit_cost,
        total_required_cost: healthy.total_required_cost,
        supplier: healthy.supplier,
      },
      (healthyEventsData ?? []) as PurchaseEventRow[],
    );
    const { error: recErr } = await supabase
      .from("project_purchase_lines")
      .update({ ...recomputed, updated_at: new Date().toISOString() })
      .eq("id", healthy.id);
    if (recErr) return { ok: false, error: recErr.message };

    // 3. borrar la huerfana
    const { error: delErr } = await supabase
      .from("project_purchase_lines")
      .delete()
      .eq("id", orphanId);
    if (delErr) return { ok: false, error: delErr.message };

    const summary = `Fusionada la linea huerfana ${orphanId} (${events.length} compra/s, ${num(
      orphan.quantity_purchased,
    )} pza) en la linea sana ${healthy.id}.`;
    const backupId = await saveBackup(supabase, finding.id, this.type, actor, snapshot, summary);
    return { ok: true, backupId, summary };
  },
  async revert(supabase, snapshot) {
    const orphanLine = snapshot.orphan_line as Record<string, unknown>;
    const orphanEvents = (snapshot.orphan_events ?? []) as Record<string, unknown>[];
    const healthyId = snapshot.healthy_line_id as number;
    const healthyPre = snapshot.healthy_pre as Record<string, unknown>;

    // 1. re-crear la linea huerfana con su id original
    const { error: insErr } = await supabase.from("project_purchase_lines").insert(orphanLine);
    if (insErr) return { ok: false, error: `No se pudo recrear la linea huerfana: ${insErr.message}` };

    // 2. regresar sus eventos
    const eventIds = orphanEvents.map((e) => e.id as number).filter(Boolean);
    if (eventIds.length > 0) {
      const { error: mvErr } = await supabase
        .from("project_purchase_events")
        .update({ project_purchase_line_id: orphanLine.id as number })
        .in("id", eventIds);
      if (mvErr) return { ok: false, error: mvErr.message };
    }

    // 3. restaurar la linea sana
    const { error: hErr } = await supabase
      .from("project_purchase_lines")
      .update({ ...healthyPre, updated_at: new Date().toISOString() })
      .eq("id", healthyId);
    if (hErr) return { ok: false, error: hErr.message };

    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// Executor: consolidar_partidas_operativas  (INT-01)
// ---------------------------------------------------------------------------
// El caso limpio (juego duplicado sin ninguna huella operativa) es raro; el
// caso con huella -como el proyecto 48- es delicado y va a revision manual /
// "investigar a fondo". Por ahora este ejecutor solo diagnostica y se niega.

const consolidarPartidasOperativas: Executor = {
  type: "consolidar_partidas_operativas",
  label: "Consolidar partidas duplicadas",
  async canApply(supabase, finding) {
    const ids = (finding.proposed_action?.operational_item_ids ?? []) as number[];
    if (!Array.isArray(ids) || ids.length < 2) {
      return { ok: false, reason: "El hallazgo no trae el par de partidas a consolidar." };
    }

    const { data: lineHits } = await supabase
      .from("project_purchase_lines")
      .select("id, quantity_purchased")
      .in("project_operational_item_id", ids);
    const withPurchases = ((lineHits ?? []) as { quantity_purchased: number | null }[]).some(
      (l) => num(l.quantity_purchased) > 0,
    );

    const { data: laborHits } = await supabase
      .from("project_operational_item_labor_activities")
      .select("id, status, work_order_id")
      .in("project_operational_item_id", ids);
    const withLabor = ((laborHits ?? []) as { status: string; work_order_id: number | null }[]).some(
      (a) => a.work_order_id != null || a.status === "assigned",
    );

    if (withPurchases || withLabor) {
      return {
        ok: false,
        reason:
          "Las partidas duplicadas ya tienen compras u orden de trabajo. Consolidacion manual (ver el caso del proyecto 48) o 'Investigar a fondo'.",
      };
    }

    // Caso limpio: aun asi lo mandamos a revision hasta tener un finding real que probar.
    return {
      ok: false,
      reason: "Consolidacion automatica pendiente de validar (Sprint B posterior). Por ahora, manual.",
    };
  },
  async apply() {
    return { ok: false, error: "Ejecutor no habilitado todavia." };
  },
  async revert() {
    return { ok: false, error: "Nada que revertir." };
  },
};

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

export const EXECUTORS: Record<string, Executor> = {
  [recalcularLineasDeCompra.type]: recalcularLineasDeCompra,
  [fusionarLineaHuerfana.type]: fusionarLineaHuerfana,
  [consolidarPartidasOperativas.type]: consolidarPartidasOperativas,
};

export function getExecutor(actionType: string | undefined | null): Executor | null {
  if (!actionType) return null;
  return EXECUTORS[actionType] ?? null;
}
