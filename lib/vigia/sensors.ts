import type { RawFinding, Sensor } from "./types";
import { severityFromImpact } from "./types";

/**
 * Sensores de la Fase 1: integridad de datos (INT-*) y costos/margenes (CST-*).
 * Cada sensor lee su vista de deteccion (sql/20260830_vigia_phase0.sql) y la
 * traduce a hallazgos. La logica pesada vive en SQL para que sea revisable.
 */

const num = (value: unknown): number => Number(value ?? 0);
const text = (value: unknown): string => String(value ?? "").trim();

// ---------------------------------------------------------------------------
// INT-01 - Partidas operativas duplicadas
// ---------------------------------------------------------------------------
type Int01Row = {
  client_project_id: number;
  product_id: number | null;
  source_quote_item_id: number | null;
  active_count: number;
  operational_item_ids: number[] | null;
  product_brand: string | null;
  product_model: string | null;
  pattern: string;
};

export const int01: Sensor = {
  id: "INT-01",
  domain: "integridad_datos",
  title: "Partidas operativas duplicadas",
  description:
    "Dos o mas partidas operativas activas para el mismo producto o renglon de cotizacion en un proyecto; Compras suma las cantidades e infla lo requerido.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int01_duplicate_operational_items")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int01Row[]).map((row) => {
      const ids = (row.operational_item_ids ?? []) as number[];
      const label = `${text(row.product_brand)} ${text(row.product_model)}`.trim() || `producto ${row.product_id}`;
      return {
        fingerprint: `INT-01:cp:${row.client_project_id}:prod:${row.product_id}:${row.pattern}`,
        lane: "requiere_autorizacion",
        severity: "alto",
        confidence: row.pattern === "colision_quote_item" ? "alta" : "media",
        title: `Partida duplicada en proyecto ${row.client_project_id}: ${label}`,
        summary: `${row.active_count} partidas operativas activas (${ids.join(", ")}) para el mismo producto. La vista de Compras suma las cantidades, asi que lo requerido aparece inflado.`,
        evidence: { ...row },
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: {
          type: "consolidar_partidas_operativas",
          operational_item_ids: ids,
          criterio: "conservar la que tenga orden de trabajo o compras; re-vincular a la cotizacion vigente",
        },
      } satisfies RawFinding;
    });
  },
};

// ---------------------------------------------------------------------------
// INT-02 - Lineas de compra huerfanas con historial
// ---------------------------------------------------------------------------
type Int02Row = {
  line_id: number;
  client_project_id: number;
  product_id: number | null;
  product_brand: string | null;
  product_model: string | null;
  quantity_required: number;
  quantity_purchased: number;
  total_purchased_cost: number;
  event_count: number;
  healthy_sibling_count: number;
};

export const int02: Sensor = {
  id: "INT-02",
  domain: "integridad_datos",
  title: "Lineas de compra huerfanas con historial",
  description:
    "Lineas de compra cuya partida operativa fue borrada pero que ya tienen compras registradas.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int02_orphan_purchase_lines")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int02Row[]).map((row) => {
      const label = `${text(row.product_brand)} ${text(row.product_model)}`.trim() || `producto ${row.product_id}`;
      const hasSibling = num(row.healthy_sibling_count) > 0;
      return {
        fingerprint: `INT-02:line:${row.line_id}`,
        lane: hasSibling ? "requiere_autorizacion" : "prestar_atencion",
        severity: "medio",
        confidence: hasSibling ? "alta" : "media",
        title: `Linea de compra huerfana en proyecto ${row.client_project_id}: ${label}`,
        summary: hasSibling
          ? `La linea ${row.line_id} tiene ${row.quantity_purchased} comprado(s) pero su partida operativa fue borrada, y existe una linea sana equivalente. Propuesta: mover el historial a la linea sana y eliminar esta.`
          : `La linea ${row.line_id} tiene ${row.quantity_purchased} comprado(s) para un producto que ya no esta en el alcance del proyecto. Decidir si el registro de compra se conserva.`,
        evidence: { ...row },
        impactMxn: null,
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: hasSibling
          ? { type: "fusionar_linea_huerfana", orphan_line_id: row.line_id }
          : { type: "revisar_compra_fuera_de_alcance", orphan_line_id: row.line_id },
      } satisfies RawFinding;
    });
  },
};

// ---------------------------------------------------------------------------
// INT-03 - Partidas operativas de una version de cotizacion superada
// ---------------------------------------------------------------------------
type Int03Row = {
  client_project_id: number;
  source_quote_id: number;
  quote_version: number | null;
  operational_item_count: number;
  operational_item_ids: number[] | null;
};

export const int03: Sensor = {
  id: "INT-03",
  domain: "integridad_datos",
  title: "Partidas operativas de una version superada",
  description:
    "Partidas operativas sembradas desde una cotizacion que ya no es la vigente, mientras existe otra version aprobada.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int03_stale_version_operational_items")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int03Row[]).map((row) => ({
      fingerprint: `INT-03:cp:${row.client_project_id}:quote:${row.source_quote_id}`,
      lane: "prestar_atencion",
      severity: "medio",
      confidence: "media",
      title: `Proyecto ${row.client_project_id}: ${row.operational_item_count} partidas de la cotizacion ${row.source_quote_id} (version superada)`,
      summary: `Estas partidas provienen de una version de cotizacion que ya no es la vigente. Pueden estar duplicando el alcance o arrastrando cantidades viejas.`,
      evidence: { ...row },
      entityType: "client_project",
      entityId: String(row.client_project_id),
      proposedAction: {
        type: "revisar_partidas_version_vieja",
        source_quote_id: row.source_quote_id,
        operational_item_ids: row.operational_item_ids ?? [],
      },
    } satisfies RawFinding));
  },
};

// ---------------------------------------------------------------------------
// INT-04 - Compras piden mas que la base operativa
// ---------------------------------------------------------------------------
type Int04Row = {
  client_project_id: number;
  product_id: number | null;
  op_qty: number;
  pl_qty: number;
  pl_purchased: number;
  diff: number;
};

export const int04: Sensor = {
  id: "INT-04",
  domain: "integridad_datos",
  title: "Compras por encima de la base operativa",
  description:
    "Las lineas de compra de un producto piden mas unidades que las que el proyecto realmente necesita.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int04_purchase_over_operational")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int04Row[]).map((row) => ({
      fingerprint: `INT-04:cp:${row.client_project_id}:prod:${row.product_id}`,
      lane: "prestar_atencion",
      severity: num(row.diff) >= 5 ? "alto" : "medio",
      confidence: "media",
      title: `Proyecto ${row.client_project_id}: se pide comprar ${row.pl_qty} y solo se necesitan ${row.op_qty} (producto ${row.product_id})`,
      summary: `Diferencia de ${row.diff} unidad(es) entre lo que piden las lineas de compra y la base operativa. ${row.pl_purchased} ya comprado(s). Puede ser doble captura o una linea duplicada.`,
      evidence: { ...row },
      entityType: "client_project",
      entityId: String(row.client_project_id),
      proposedAction: { type: "revisar_exceso_de_compra", product_id: row.product_id },
    } satisfies RawFinding));
  },
};

// ---------------------------------------------------------------------------
// CST-01 - Sobrecosto real de compra vs estimado
// ---------------------------------------------------------------------------
type Cst01Row = {
  event_id: number;
  line_id: number;
  client_project_id: number;
  product_id: number | null;
  product_brand: string | null;
  product_model: string | null;
  purchase_date: string | null;
  quantity: number;
  real_unit_mxn: number;
  est_unit_mxn: number;
};

const CST01_THRESHOLD = 1.15;

export const cst01: Sensor = {
  id: "CST-01",
  domain: "costos_margenes",
  title: "Sobrecosto en compra",
  description:
    "Una compra se pago mas cara (en MXN) que el costo estimado de la partida por encima del umbral.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_cst01_purchase_overrun")
      .select("*");
    if (error) throw error;

    const findings: RawFinding[] = [];
    for (const row of (data ?? []) as Cst01Row[]) {
      const real = num(row.real_unit_mxn);
      const est = num(row.est_unit_mxn);
      if (est <= 0 || real <= 0 || real <= est * CST01_THRESHOLD) continue;

      const overrun = (real - est) * num(row.quantity);
      const pct = ((real - est) / est) * 100;
      const label = `${text(row.product_brand)} ${text(row.product_model)}`.trim() || `producto ${row.product_id}`;
      findings.push({
        fingerprint: `CST-01:event:${row.event_id}`,
        lane: "prestar_atencion",
        severity: severityFromImpact(overrun),
        confidence: "alta",
        title: `Sobrecosto en proyecto ${row.client_project_id}: ${label} (+${pct.toFixed(0)}%)`,
        summary: `Se pago $${real.toFixed(2)} MXN/u contra un estimado de $${est.toFixed(2)} MXN/u en ${row.quantity} pieza(s). Sobrecosto ≈ $${overrun.toFixed(2)} MXN.`,
        evidence: { ...row, overrun_mxn: overrun, overrun_pct: pct },
        impactMxn: -Math.abs(overrun),
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: { type: "revisar_sobrecosto", event_id: row.event_id, line_id: row.line_id },
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// CST-02 - Costo de proveedor sin actualizar en producto en uso
// ---------------------------------------------------------------------------
type Cst02Row = {
  product_id: number;
  brand: string | null;
  model: string | null;
  name: string | null;
  supplier: string | null;
  cost_price: number;
  cost_currency: string | null;
  cost_updated_at: string | null;
  in_approved_quote: boolean;
  in_pending_purchase: boolean;
};

export const cst02: Sensor = {
  id: "CST-02",
  domain: "costos_margenes",
  title: "Costo de proveedor sin actualizar",
  description:
    "Un producto con costo viejo esta por comprarse o alimenta el margen de una cotizacion aprobada vigente.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_cst02_stale_supplier_cost")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Cst02Row[]).map((row) => {
      const label = `${text(row.brand)} ${text(row.model)}`.trim() || text(row.name) || `producto ${row.product_id}`;
      const age = row.cost_updated_at
        ? Math.floor((Date.now() - new Date(row.cost_updated_at).getTime()) / 86400000)
        : null;
      const where = row.in_pending_purchase
        ? "esta pendiente de comprar en un proyecto activo"
        : "alimenta el margen de una cotizacion aprobada vigente";
      return {
        fingerprint: `CST-02:prod:${row.product_id}`,
        lane: "prestar_atencion",
        severity: "medio",
        confidence: "media",
        title: `Costo viejo en producto en uso: ${label}`,
        summary: `Costo $${num(row.cost_price).toFixed(2)} ${text(row.cost_currency) || "USD"}${age !== null ? `, sin actualizar hace ${age} dias` : ", sin fecha de actualizacion"}. ${where}. Verificar antes de que afecte el margen.`,
        evidence: { ...row, age_days: age },
        entityType: "product",
        entityId: String(row.product_id),
        proposedAction: { type: "verificar_costo_producto", product_id: row.product_id, supplier: row.supplier },
      } satisfies RawFinding;
    });
  },
};

// ---------------------------------------------------------------------------
// CST-03 - Deriva entre el TC cotizado y el TC real al que se compro
// ---------------------------------------------------------------------------
type Cst03Row = {
  client_project_id: number;
  quote_fx: number;
  real_fx: number;
  usd_base: number;
  fx_diff: number;
  fx_diff_pct: number;
};

export const cst03: Sensor = {
  id: "CST-03",
  domain: "costos_margenes",
  title: "Deriva de tipo de cambio",
  description:
    "El tipo de cambio con el que se cotizo un proyecto difiere del TC real al que se compraron sus equipos.",
  async run({ supabase }) {
    const { data, error } = await supabase.from("vigia_v_cst03_fx_drift").select("*");
    if (error) throw error;

    return ((data ?? []) as Cst03Row[]).map((row) => {
      const impact = num(row.usd_base) * num(row.fx_diff);
      const pct = num(row.fx_diff_pct) * 100;
      return {
        fingerprint: `CST-03:cp:${row.client_project_id}`,
        lane: "prestar_atencion",
        severity: severityFromImpact(impact),
        confidence: "alta",
        title: `Proyecto ${row.client_project_id}: TC cotizado ${num(row.quote_fx).toFixed(2)} vs TC real ${num(row.real_fx).toFixed(2)} (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`,
        summary: `Sobre una base de $${num(row.usd_base).toFixed(0)} USD comprados, la diferencia de TC ${impact >= 0 ? "encareció" : "abarató"} el proyecto ≈ $${Math.abs(impact).toFixed(0)} MXN frente a lo cotizado.`,
        evidence: { ...row, impact_mxn: impact },
        impactMxn: impact < 0 ? impact : -impact,
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: { type: "revisar_variacion_tc", client_project_id: row.client_project_id },
      } satisfies RawFinding;
    });
  },
};

export const SENSORS: Sensor[] = [int01, int02, int03, int04, cst01, cst02, cst03];
