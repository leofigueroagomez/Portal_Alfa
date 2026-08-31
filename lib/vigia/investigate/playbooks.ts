import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DossierBlock, Playbook } from "./types";

/**
 * Playbooks de diagnostico (Sprint B2). Cada uno arma un expediente a punta de
 * consultas de SOLO LECTURA sobre las tablas de negocio. La conclusion la pone
 * el modelo despues; aqui solo se recopila y se dejan "senales" deterministas.
 */

const num = (v: unknown): number => Number(v ?? 0);

function block(titulo: string, datos: unknown, descripcion?: string): DossierBlock {
  return descripcion ? { titulo, descripcion, datos } : { titulo, datos };
}

// ---------------------------------------------------------------------------
// Contexto de proyecto (compartido)
// ---------------------------------------------------------------------------

async function projectContext(
  supabase: SupabaseClient,
  projectId: number,
): Promise<DossierBlock[]> {
  const [{ data: project }, { data: quotes }, { data: otherFindings }] =
    await Promise.all([
      supabase
        .from("client_projects")
        .select("id, name, sales_stage, status, created_at, updated_at")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("quotes")
        .select(
          "id, version, status, is_latest, exchange_rate, created_at, updated_at, grand_total_mxn, total_mxn",
        )
        .eq("client_project_id", projectId)
        .order("id", { ascending: true }),
      supabase
        .from("vigia_findings")
        .select("id, sensor_id, title, status, severity, impact_mxn")
        .eq("entity_type", "client_project")
        .eq("entity_id", String(projectId))
        .neq("status", "resuelto"),
    ]);

  return [
    block("Proyecto", project ?? { id: projectId, nota: "no encontrado" }),
    block(
      "Cotizaciones del proyecto",
      quotes ?? [],
      "Version, estado y is_latest de cada cotizacion. La 'vigente' es status=approved + is_latest=true.",
    ),
    block(
      "Otros hallazgos abiertos del mismo proyecto",
      otherFindings ?? [],
      "Contexto: que mas ve El Vigia en este proyecto.",
    ),
  ];
}

// ---------------------------------------------------------------------------
// INT-01 - Partidas operativas duplicadas (el patron del proyecto 48)
// ---------------------------------------------------------------------------

const int01Playbook: Playbook = {
  id: "INT-01",
  sensorId: "INT-01",
  async run(supabase, finding) {
    const ev = finding.evidence as {
      client_project_id?: number;
      product_id?: number | null;
      operational_item_ids?: number[];
      pattern?: string;
    };
    const projectId = Number(ev.client_project_id ?? finding.entity_id);
    const productId = ev.product_id ?? null;
    const senales: string[] = [];
    const bloques: DossierBlock[] = [];

    bloques.push(...(await projectContext(supabase, projectId)));

    // 1. Todas las partidas operativas activas de ese producto en el proyecto
    let opsQuery = supabase
      .from("project_operational_items")
      .select(
        "id, status, change_origin, source_quote_id, source_quote_item_id, product_id, product_brand, product_model, quantity, operational_unit_cost, cost_currency, exchange_rate, created_at, updated_at",
      )
      .eq("client_project_id", projectId)
      .neq("status", "deleted");
    opsQuery = productId
      ? opsQuery.eq("product_id", productId)
      : opsQuery.in("id", ev.operational_item_ids ?? []);
    const { data: opsData } = await opsQuery;
    const ops = (opsData ?? []) as Array<{
      id: number;
      status: string;
      change_origin: string | null;
      source_quote_id: number | null;
      source_quote_item_id: number | null;
      quantity: number | null;
      operational_unit_cost: number | null;
    }>;
    bloques.push(
      block(
        "Partidas operativas activas para este producto",
        ops,
        "Cada fila es una partida. Si hay mas de una para el mismo producto, Compras suma sus cantidades.",
      ),
    );
    if (ops.length > 1) {
      senales.push(
        `${ops.length} partidas operativas activas para el mismo producto en el proyecto.`,
      );
    }

    // 2. Integridad del vinculo con la cotizacion (huerfanas de edicion de cotizacion)
    const sqiIds = Array.from(
      new Set(
        ops
          .map((o) => o.source_quote_item_id)
          .filter((v): v is number => Boolean(v)),
      ),
    );
    let danglingIds: number[] = [];
    if (sqiIds.length > 0) {
      const { data: qiRows } = await supabase
        .from("quote_items")
        .select("id, quote_id, quantity, product_id")
        .in("id", sqiIds);
      const existing = new Set(((qiRows ?? []) as { id: number }[]).map((r) => r.id));
      danglingIds = sqiIds.filter((id) => !existing.has(id));
      bloques.push(
        block(
          "Renglones de cotizacion que originaron las partidas",
          {
            referenciados: sqiIds,
            existen: [...existing],
            ya_no_existen: danglingIds,
            detalle: qiRows ?? [],
          },
          "Si un source_quote_item_id 'ya no existe', esa partida quedo huerfana cuando se edito la cotizacion (borra y recrea renglones).",
        ),
      );
    }
    const opsSinVinculo = ops.filter((o) => !o.source_quote_item_id).map((o) => o.id);
    if (danglingIds.length > 0) {
      senales.push(
        `Partidas apuntando a renglones de cotizacion inexistentes (huerfanas de una edicion): ${danglingIds.join(", ")}.`,
      );
    }
    if (opsSinVinculo.length > 0) {
      senales.push(
        `Partidas sin ningun vinculo a cotizacion (source_quote_item_id nulo): ${opsSinVinculo.join(", ")}.`,
      );
    }

    // 3. Huella de compras por partida
    const { data: linesData } = await supabase
      .from("project_purchase_lines")
      .select(
        "id, project_operational_item_id, quote_item_id, product_id, quantity_required, quantity_purchased, total_required_cost, total_purchased_cost, total_pending_cost, purchase_status, created_at",
      )
      .eq("client_project_id", projectId)
      .eq("product_id", productId as number);
    const lines = (linesData ?? []) as Array<{
      id: number;
      project_operational_item_id: number | null;
      quantity_required: number | null;
      quantity_purchased: number | null;
    }>;
    const lineIds = lines.map((l) => l.id);
    let events: Array<{ project_purchase_line_id: number; quantity: number | null; unit_cost: number | null }> =
      [];
    if (lineIds.length > 0) {
      const { data: evData } = await supabase
        .from("project_purchase_events")
        .select("id, project_purchase_line_id, quantity, unit_cost, cost_currency, purchase_date, supplier")
        .in("project_purchase_line_id", lineIds);
      events = (evData ?? []) as typeof events;
    }
    const eventsByLine = new Map<number, number>();
    for (const e of events) {
      eventsByLine.set(
        e.project_purchase_line_id,
        (eventsByLine.get(e.project_purchase_line_id) ?? 0) + 1,
      );
    }
    bloques.push(
      block(
        "Lineas de compra del producto",
        lines.map((l) => ({
          ...l,
          eventos_de_compra: eventsByLine.get(l.id) ?? 0,
        })),
        "A que partida operativa apunta cada linea y cuanto se ha comprado en ella.",
      ),
    );
    bloques.push(block("Eventos de compra (detalle)", events));

    const totalRequerido = lines.reduce((s, l) => s + num(l.quantity_required), 0);
    const necesidadReal = Math.max(0, ...ops.map((o) => num(o.quantity)));
    bloques.push(
      block(
        "Sintoma en la pantalla de Compras",
        {
          suma_requerido_en_lineas: totalRequerido,
          necesidad_real_estimada: necesidadReal,
          inflado_por: totalRequerido - necesidadReal,
        },
        "La vista de Compras suma quantity_required de todas las lineas. Si excede la necesidad real, ahi esta el numero inflado que ve Leo.",
      ),
    );
    if (totalRequerido > necesidadReal && necesidadReal > 0) {
      senales.push(
        `Compras pide ${totalRequerido} y la necesidad real es ~${necesidadReal} (inflado en ${totalRequerido - necesidadReal}).`,
      );
    }

    // 4. Huella de mano de obra (ordenes de trabajo) por partida
    const opIds = ops.map((o) => o.id);
    const { data: laborData } = opIds.length
      ? await supabase
          .from("project_operational_item_labor_activities")
          .select("id, project_operational_item_id, status, work_order_id, name_snapshot")
          .in("project_operational_item_id", opIds)
      : { data: [] };
    const labor = (laborData ?? []) as Array<{
      project_operational_item_id: number;
      work_order_id: number | null;
      status: string;
    }>;
    bloques.push(block("Actividades de mano de obra por partida", labor));

    // 5. Entregas de material ligadas a esas lineas
    const { data: deliveriesData } = lineIds.length
      ? await supabase
          .from("project_material_delivery_items")
          .select("id, project_purchase_line_id, quantity_delivered, created_at")
          .in("project_purchase_line_id", lineIds)
      : { data: [] };
    const deliveries = (deliveriesData ?? []) as Array<{ project_purchase_line_id: number }>;
    bloques.push(block("Entregas de material ligadas a las lineas", deliveries));

    // 6. Senal de "cual conservar"
    const footprintByOp = new Map<number, { compras: number; entregas: number; mo: number }>();
    for (const o of ops) footprintByOp.set(o.id, { compras: 0, entregas: 0, mo: 0 });
    for (const l of lines) {
      if (l.project_operational_item_id && footprintByOp.has(l.project_operational_item_id)) {
        const f = footprintByOp.get(l.project_operational_item_id)!;
        f.compras += num(l.quantity_purchased);
        f.entregas += deliveries.filter((d) => d.project_purchase_line_id === l.id).length;
      }
    }
    for (const a of labor) {
      const f = footprintByOp.get(a.project_operational_item_id);
      if (f && (a.work_order_id != null || a.status === "assigned")) f.mo += 1;
    }
    const conHuella = [...footprintByOp.entries()].filter(
      ([, f]) => f.compras > 0 || f.entregas > 0 || f.mo > 0,
    );
    const limpias = [...footprintByOp.entries()].filter(
      ([, f]) => f.compras === 0 && f.entregas === 0 && f.mo === 0,
    );
    bloques.push(
      block("Huella operativa por partida", Object.fromEntries(footprintByOp)),
    );
    if (conHuella.length === 1 && limpias.length >= 1) {
      senales.push(
        `Solo la partida ${conHuella[0][0]} tiene huella (compras/OT/entregas). Las demas (${limpias
          .map(([id]) => id)
          .join(", ")}) estan limpias: candidato a consolidacion segura conservando la ${conHuella[0][0]}.`,
      );
    } else if (conHuella.length > 1) {
      senales.push(
        `Varias partidas (${conHuella
          .map(([id]) => id)
          .join(", ")}) tienen huella operativa: consolidacion delicada, requiere re-coser historial a mano (como el proyecto 48).`,
      );
    }

    return {
      playbook: "INT-01",
      resumen: `Partidas operativas duplicadas en el proyecto ${projectId} para el producto ${productId}. ${ops.length} partidas activas, ${lines.length} lineas de compra, ${events.length} eventos de compra.`,
      bloques,
      senales,
    };
  },
};

// ---------------------------------------------------------------------------
// Playbook generico - cualquier otro sensor
// ---------------------------------------------------------------------------

const genericPlaybook: Playbook = {
  id: "generico",
  sensorId: "*",
  async run(supabase, finding) {
    const bloques: DossierBlock[] = [
      block("Hallazgo", {
        sensor: finding.sensor_id,
        titulo: finding.title,
        resumen: finding.summary,
        severidad: finding.severity,
        confianza: finding.confidence,
        impacto_mxn: finding.impact_mxn,
        accion_propuesta: finding.proposed_action,
      }),
      block("Evidencia del sensor", finding.evidence),
    ];

    if (finding.entity_type === "client_project" && finding.entity_id) {
      bloques.push(...(await projectContext(supabase, Number(finding.entity_id))));
    } else if (finding.entity_type === "product" && finding.entity_id) {
      const [{ data: product }, { data: pendingLines }, { data: approvedItems }] =
        await Promise.all([
          supabase
            .from("products")
            .select(
              "id, brand, model, name, supplier, cost_price, cost_currency, cost_updated_at, is_active, labor_unit_cost",
            )
            .eq("id", Number(finding.entity_id))
            .maybeSingle(),
          supabase
            .from("project_purchase_lines")
            .select("id, client_project_id, quantity_required, quantity_purchased, purchase_status")
            .eq("product_id", Number(finding.entity_id))
            .neq("purchase_status", "purchased"),
          supabase
            .from("quote_items")
            .select("id, quote_id, quantity, cost_unit_price, cost_currency")
            .eq("product_id", Number(finding.entity_id))
            .limit(50),
        ]);
      bloques.push(block("Producto", product ?? { id: finding.entity_id }));
      bloques.push(block("Lineas de compra pendientes de este producto", pendingLines ?? []));
      bloques.push(block("Renglones de cotizacion con este producto", approvedItems ?? []));
    } else if (finding.entity_type === "quote" && finding.entity_id) {
      const { data: quote } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", Number(finding.entity_id))
        .maybeSingle();
      bloques.push(block("Cotizacion", quote ?? { id: finding.entity_id }));
    }

    const { data: auditRows } = await supabase
      .from("vigia_audit_log")
      .select("event_type, actor, payload, created_at")
      .eq("finding_id", finding.id)
      .order("created_at", { ascending: false })
      .limit(20);
    bloques.push(block("Bitacora del hallazgo", auditRows ?? []));

    return {
      playbook: "generico",
      resumen: `Investigacion generica del hallazgo ${finding.sensor_id}: ${finding.title}`,
      bloques,
      senales: [],
    };
  },
};

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

const PLAYBOOKS: Playbook[] = [int01Playbook];

export function getPlaybook(sensorId: string): Playbook {
  return PLAYBOOKS.find((p) => p.sensorId === sensorId) ?? genericPlaybook;
}
