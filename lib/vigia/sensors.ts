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

// ===========================================================================
// Fase 1 - segundo lote (sql/20260831_vigia_phase1_batch2.sql)
// ===========================================================================

// INT-05 - Compra en USD sin tipo de cambio
type Int05Row = {
  event_id: number;
  line_id: number;
  client_project_id: number;
  product_brand: string | null;
  product_model: string | null;
  purchase_date: string | null;
  quantity: number;
  unit_cost: number;
  cost_currency: string | null;
};

export const int05: Sensor = {
  id: "INT-05",
  domain: "integridad_datos",
  title: "Compra en USD sin tipo de cambio",
  description:
    "Un evento de compra en USD sin tipo de cambio rompe todo el calculo de costo real en MXN (variacion, ahorro, sobrecosto).",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int05_purchase_missing_fx")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int05Row[]).map((row) => {
      const label = `${text(row.product_brand)} ${text(row.product_model)}`.trim() || `linea ${row.line_id}`;
      return {
        fingerprint: `INT-05:event:${row.event_id}`,
        lane: "requiere_autorizacion",
        severity: "alto",
        confidence: "alta",
        title: `Compra sin TC en proyecto ${row.client_project_id}: ${label}`,
        summary: `El evento ${row.event_id} registra ${row.quantity} pieza(s) a $${num(row.unit_cost).toFixed(2)} USD sin tipo de cambio. Captura el TC del dia de la compra para que el costo real cuadre.`,
        evidence: { ...row },
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: { type: "capturar_tc_compra", event_id: row.event_id },
      } satisfies RawFinding;
    });
  },
};

// INT-06 - Partida operativa en USD sin tipo de cambio, con compra pendiente
type Int06Row = {
  operational_item_id: number;
  client_project_id: number;
  product_id: number | null;
  product_brand: string | null;
  product_model: string | null;
  operational_unit_cost: number;
  cost_currency: string | null;
  pending_qty: number;
};

export const int06: Sensor = {
  id: "INT-06",
  domain: "integridad_datos",
  title: "Partida operativa en USD sin tipo de cambio",
  description:
    "Una partida operativa en USD sin TC y con compra pendiente hace que el costo estimado en MXN salga en cero y la variacion no se pueda calcular.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int06_operational_missing_fx")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int06Row[]).map((row) => {
      const label = `${text(row.product_brand)} ${text(row.product_model)}`.trim() || `partida ${row.operational_item_id}`;
      return {
        fingerprint: `INT-06:opitem:${row.operational_item_id}`,
        lane: "requiere_autorizacion",
        severity: "alto",
        confidence: "alta",
        title: `Partida sin TC en proyecto ${row.client_project_id}: ${label}`,
        summary: `Costo $${num(row.operational_unit_cost).toFixed(2)} USD sin tipo de cambio, con ${row.pending_qty} pieza(s) por comprar. Recalcula la base operativa desde la cotizacion o captura el TC.`,
        evidence: { ...row },
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: { type: "recalcular_base_operativa", operational_item_id: row.operational_item_id },
      } satisfies RawFinding;
    });
  },
};

// INT-07 - Cotizacion aprobada sin proyecto vinculado
type Int07Row = {
  quote_id: number;
  version: number | null;
  created_at: string | null;
  grand_total: number | null;
  total_mxn: number | null;
};

export const int07: Sensor = {
  id: "INT-07",
  domain: "integridad_datos",
  title: "Cotizacion aprobada sin proyecto",
  description:
    "Una cotizacion aprobada sin proyecto vinculado no puede sembrar base operativa ni compras.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int07_approved_quote_no_project")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int07Row[]).map((row) => ({
      fingerprint: `INT-07:quote:${row.quote_id}`,
      lane: "requiere_autorizacion",
      severity: "medio",
      confidence: "alta",
      title: `Cotizacion ${row.quote_id} aprobada sin proyecto`,
      summary: `La cotizacion ${row.quote_id} esta aprobada pero no tiene proyecto vinculado. Vinculala a un proyecto para que se pueda operar.`,
      evidence: { ...row },
      entityType: "quote",
      entityId: String(row.quote_id),
      proposedAction: { type: "vincular_cotizacion_a_proyecto", quote_id: row.quote_id },
    } satisfies RawFinding));
  },
};

// INT-08 - Proyecto ganado o entregado sin cotizacion aprobada
type Int08Row = {
  client_project_id: number;
  name: string | null;
  sales_stage: string | null;
};

export const int08: Sensor = {
  id: "INT-08",
  domain: "integridad_datos",
  title: "Proyecto ganado sin cotizacion aprobada",
  description:
    "Un proyecto en etapa ganado o entregado sin ninguna cotizacion aprobada no puede armar su base operativa ni sus compras.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int08_won_project_no_approved_quote")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int08Row[]).map((row) => ({
      fingerprint: `INT-08:cp:${row.client_project_id}`,
      lane: "requiere_autorizacion",
      severity: "medio",
      confidence: "alta",
      title: `Proyecto ${row.client_project_id} (${text(row.name) || "sin nombre"}) sin cotizacion aprobada`,
      summary: `El proyecto esta en etapa "${text(row.sales_stage)}" pero ninguna de sus cotizaciones esta aprobada. Aprueba la cotizacion correcta para poder operar.`,
      evidence: { ...row },
      entityType: "client_project",
      entityId: String(row.client_project_id),
      proposedAction: { type: "aprobar_cotizacion_del_proyecto", client_project_id: row.client_project_id },
    } satisfies RawFinding));
  },
};

// INT-09 - Total estimado de la linea de compra desincronizado
type Int09Row = {
  line_id: number;
  client_project_id: number;
  product_brand: string | null;
  product_model: string | null;
  unit_cost: number;
  quantity_required: number;
  total_required_cost: number;
  expected_total: number;
  drift: number;
};

export const int09: Sensor = {
  id: "INT-09",
  domain: "integridad_datos",
  title: "Total de linea de compra desincronizado",
  description:
    "El total estimado guardado en la linea de compra no coincide con costo unitario x cantidad; hay que recalcular desde la base operativa.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int09_purchase_line_total_drift")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int09Row[]).map((row) => {
      const label = `${text(row.product_brand)} ${text(row.product_model)}`.trim() || `linea ${row.line_id}`;
      return {
        fingerprint: `INT-09:line:${row.line_id}`,
        lane: "prestar_atencion",
        severity: "bajo",
        confidence: "media",
        title: `Total desincronizado en proyecto ${row.client_project_id}: ${label}`,
        summary: `La linea guarda $${num(row.total_required_cost).toFixed(2)} pero costo x cantidad da $${num(row.expected_total).toFixed(2)} (desfase $${num(row.drift).toFixed(2)}). Usa "Recalcular lineas desde base operativa".`,
        evidence: { ...row },
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: { type: "recalcular_lineas_de_compra", client_project_id: row.client_project_id },
      } satisfies RawFinding;
    });
  },
};

// INT-10 - Cantidad de la partida operativa distinta a la del quote_item vigente
type Int10Row = {
  operational_item_id: number;
  client_project_id: number;
  product_brand: string | null;
  product_model: string | null;
  operational_qty: number;
  quote_qty: number;
  source_quote_item_id: number | null;
};

export const int10: Sensor = {
  id: "INT-10",
  domain: "integridad_datos",
  title: "Cantidad operativa distinta de la cotizacion",
  description:
    "La partida operativa arrastra una cantidad diferente a la del renglon de cotizacion que la origino.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_int10_operational_qty_vs_quote")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Int10Row[]).map((row) => {
      const label = `${text(row.product_brand)} ${text(row.product_model)}`.trim() || `partida ${row.operational_item_id}`;
      return {
        fingerprint: `INT-10:opitem:${row.operational_item_id}`,
        lane: "prestar_atencion",
        severity: "medio",
        confidence: "media",
        title: `Cantidad no cuadra en proyecto ${row.client_project_id}: ${label}`,
        summary: `La base operativa dice ${row.operational_qty} y la cotizacion dice ${row.quote_qty}. Recalcula la base operativa desde la cotizacion.`,
        evidence: { ...row },
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: { type: "recalcular_base_operativa", operational_item_id: row.operational_item_id },
      } satisfies RawFinding;
    });
  },
};

// CST-04 - Producto activo sin costo, usado en cotizacion aprobada o compra pendiente
type Cst04Row = {
  product_id: number;
  brand: string | null;
  model: string | null;
  name: string | null;
  supplier: string | null;
  in_approved_quote: boolean;
  in_pending_purchase: boolean;
};

export const cst04: Sensor = {
  id: "CST-04",
  domain: "costos_margenes",
  title: "Producto sin costo en uso",
  description:
    "Un producto activo con costo cero alimenta un margen falso (aparenta 100%) en una cotizacion aprobada vigente o esta por comprarse.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_cst04_product_without_cost_in_use")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Cst04Row[]).map((row) => {
      const label = `${text(row.brand)} ${text(row.model)}`.trim() || text(row.name) || `producto ${row.product_id}`;
      const where = row.in_pending_purchase
        ? "esta pendiente de comprar en un proyecto activo"
        : "alimenta el margen de una cotizacion aprobada vigente";
      return {
        fingerprint: `CST-04:prod:${row.product_id}`,
        lane: "requiere_autorizacion",
        severity: "alto",
        confidence: "alta",
        title: `Producto sin costo: ${label}`,
        summary: `Costo cero o vacio, y ${where}. El margen calculado no es real. Captura el costo de proveedor.`,
        evidence: { ...row },
        entityType: "product",
        entityId: String(row.product_id),
        proposedAction: { type: "capturar_costo_producto", product_id: row.product_id, supplier: row.supplier },
      } satisfies RawFinding;
    });
  },
};

// CST-05 - Sobrecosto acumulado de compras a nivel proyecto
type Cst05Row = {
  client_project_id: number;
  overrun_total_mxn: number;
  overrun_event_count: number;
};

export const cst05: Sensor = {
  id: "CST-05",
  domain: "costos_margenes",
  title: "Sobrecosto acumulado del proyecto",
  description:
    "La suma de los sobrecostos de compra de un proyecto supera el umbral; el proyecto va por encima de su presupuesto de equipo.",
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("vigia_v_cst05_project_purchase_overrun_total")
      .select("*");
    if (error) throw error;

    return ((data ?? []) as Cst05Row[]).map((row) => {
      const overrun = num(row.overrun_total_mxn);
      return {
        fingerprint: `CST-05:cp:${row.client_project_id}`,
        lane: "prestar_atencion",
        severity: severityFromImpact(overrun),
        confidence: "alta",
        title: `Proyecto ${row.client_project_id}: sobrecosto acumulado de compras ≈ $${overrun.toFixed(0)} MXN`,
        summary: `${row.overrun_event_count} compra(s) por encima del estimado suman $${overrun.toFixed(2)} MXN de sobrecosto en este proyecto.`,
        evidence: { ...row },
        impactMxn: -Math.abs(overrun),
        entityType: "client_project",
        entityId: String(row.client_project_id),
        proposedAction: { type: "revisar_sobrecosto_proyecto", client_project_id: row.client_project_id },
      } satisfies RawFinding;
    });
  },
};

export const SENSORS: Sensor[] = [
  int01,
  int02,
  int03,
  int04,
  int05,
  int06,
  int07,
  int08,
  int09,
  int10,
  cst01,
  cst02,
  cst03,
  cst04,
  cst05,
];
