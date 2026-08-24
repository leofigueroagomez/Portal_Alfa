import type { SupabaseClient } from "@supabase/supabase-js";

export type LaborActivityRate = {
  id: number;
  name: string;
  category: "cableado" | "instalacion" | "configuracion" | "general" | string;
  default_unit: string;
  subcontractor_unit_cost_mxn: number;
  default_sale_price_mxn: number;
  description: string | null;
  is_active: boolean;
};

export type GeneratedWorkOrderSummary = {
  workOrderId: number;
  workOrderNumber: string;
  title: string;
  type: string;
  activitiesCount: number;
  contractorAmountMxn: number;
  budgetedLaborAmountMxn: number;
};

/**
 * Deduce la categoría de mano de obra según el nombre o descripción de la partida / producto
 */
export function categorizeLaborActivity(
  activityName?: string | null,
  productName?: string | null,
  categoryName?: string | null
): "cableado" | "instalaciones" | "configuraciones" {
  const text = `${activityName || ""} ${productName || ""} ${categoryName || ""}`.toLowerCase();

  if (
    text.includes("cable") ||
    text.includes("cableado") ||
    text.includes("tirada") ||
    text.includes("canaliz") ||
    text.includes("tuberia") ||
    text.includes("tubería") ||
    text.includes("nodo")
  ) {
    return "cableado";
  }

  if (
    text.includes("config") ||
    text.includes("program") ||
    text.includes("puesta en marcha") ||
    text.includes("conmutador") ||
    text.includes("escena") ||
    text.includes("servidor") ||
    text.includes("red") ||
    text.includes("vlan") ||
    text.includes("nvr")
  ) {
    return "configuraciones";
  }

  return "instalaciones";
}

/**
 * Deduce la tarifa del tabulador más cercana para una actividad o producto
 */
export function matchLaborRate(
  rates: LaborActivityRate[],
  activityName: string,
  productName: string = "",
  brand: string = ""
): LaborActivityRate | null {
  const search = `${activityName} ${productName} ${brand}`.toLowerCase();

  // 1. Coincidencia exacta por nombre
  const exact = rates.find(
    (r) => r.name.toLowerCase() === activityName.toLowerCase()
  );
  if (exact) return exact;

  // 2. Coincidencias clave por reglas de negocio
  if (search.includes("cable") || search.includes("punto a")) {
    return rates.find((r) => r.name.toLowerCase().includes("cableado de punto")) || null;
  }
  if (search.includes("lutron") || search.includes("dimmer") || search.includes("caseta") || search.includes("pico")) {
    return rates.find((r) => r.name.toLowerCase().includes("lutron")) || null;
  }
  if (search.includes("conmutador") || search.includes("switch") || search.includes("router")) {
    return rates.find((r) => r.name.toLowerCase().includes("conmutador")) || null;
  }
  if (search.includes("pantalla") || search.includes("soporte") || search.includes("tv")) {
    return rates.find((r) => r.name.toLowerCase().includes("pantalla")) || null;
  }
  if (search.includes("camara") || search.includes("cámara") || search.includes("cctv") || search.includes("domo")) {
    return rates.find((r) => r.name.toLowerCase().includes("cámara ip")) || null;
  }
  if (search.includes("bocina") || search.includes("audio") || search.includes("altavoz")) {
    return rates.find((r) => r.name.toLowerCase().includes("bocina de plafón")) || null;
  }
  if (search.includes("nvr") || search.includes("dvr") || search.includes("grabador")) {
    return rates.find((r) => r.name.toLowerCase().includes("nvr")) || null;
  }
  if (search.includes("cerradura") || search.includes("chapa") || search.includes("acceso")) {
    return rates.find((r) => r.name.toLowerCase().includes("cerradura")) || null;
  }
  if (search.includes("cinta") || search.includes("doble cara") || search.includes("sensor")) {
    return rates.find((r) => r.name.toLowerCase().includes("cinta doble cara")) || null;
  }
  if (search.includes("escena") || search.includes("puesta en marcha") || search.includes("integraci")) {
    return rates.find((r) => r.name.toLowerCase().includes("puesta en marcha")) || null;
  }
  if (search.includes("taquete") || search.includes("fijacion") || search.includes("montaje")) {
    return rates.find((r) => r.name.toLowerCase().includes("con taquetes")) || null;
  }

  // Fallback a taquetes general si es instalación física
  return rates.find((r) => r.name.toLowerCase().includes("con taquetes")) || rates[0] || null;
}

/**
 * Genera automáticamente las 3 Órdenes de Trabajo especializadas para un proyecto
 */
export async function generateProjectSpecializedWorkOrders(
  supabase: SupabaseClient,
  clientProjectId: number,
  quoteId?: number | null
): Promise<{
  ok: boolean;
  generatedOrders: GeneratedWorkOrderSummary[];
  error?: string;
}> {
  try {
    // 1. Obtener tabulador activo
    const { data: ratesData } = await supabase
      .from("labor_activity_catalog")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const rates: LaborActivityRate[] = (ratesData || []).map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category || "instalacion",
      default_unit: r.default_unit || "pieza",
      subcontractor_unit_cost_mxn: Number(r.subcontractor_unit_cost_mxn || r.default_internal_cost_mxn || 0),
      default_sale_price_mxn: Number(r.default_sale_price_mxn || 0),
      description: r.description,
      is_active: r.is_active,
    }));

    // 2. Obtener cotización
    let targetQuoteId = quoteId;
    if (!targetQuoteId) {
      const { data: project } = await supabase
        .from("client_projects")
        .select("id, name, quote_groups(approved_quote_id)")
        .eq("id", clientProjectId)
        .single();
      targetQuoteId = (project as any)?.quote_groups?.approved_quote_id || null;
    }

    if (!targetQuoteId) {
      // Buscar la última cotización aprobada
      const { data: approvedQuote } = await supabase
        .from("quotes")
        .select("id")
        .eq("client_project_id", clientProjectId)
        .eq("status", "approved")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      targetQuoteId = approvedQuote?.id || null;
    }

    if (!targetQuoteId) {
      return { ok: false, generatedOrders: [], error: "No se encontró cotización aprobada para el proyecto." };
    }

    // 3. Obtener partidas de la cotización y secciones
    const { data: quoteItems } = await supabase
      .from("quote_items")
      .select(`
        id, product_id, quantity, unit_labor_price,
        product_brand, product_model, product_name, area,
        quote_sections (name)
      `)
      .eq("quote_id", targetQuoteId);

    if (!quoteItems || quoteItems.length === 0) {
      return { ok: false, generatedOrders: [], error: "La cotización no contiene partidas para generar ODTs." };
    }

    const folioBase = `P${String(clientProjectId).padStart(3, "0")}`;

    // 4. Clasificar partidas en los 3 grupos de trabajo
    type WorkActivityItem = {
      system_name: string;
      product_brand: string;
      product_model: string;
      product_name: string;
      activity_name: string;
      quantity: number;
      unit: string;
      subcontractor_unit_cost: number;
      subcontractor_total_cost: number;
      unit_sale_price: number;
      total_sale_price: number;
    };

    const cableadoItems: WorkActivityItem[] = [];
    const instalacionesItems: WorkActivityItem[] = [];
    const configuracionesItems: WorkActivityItem[] = [];

    for (const item of quoteItems) {
      const qty = Number(item.quantity || 1);
      const systemName = (item.quote_sections as { name?: string } | null)?.name || "General";
      const brand = item.product_brand || "";
      const model = item.product_model || "";
      const name = item.product_name || "Equipo / Dispositivo";
      const unitLaborSale = Number(item.unit_labor_price || 0);

      // Toda partida de integración tecnológica suele requerir:
      // 1. Cableado (si aplica infraestructura)
      // 2. Instalación / Montaje Físico
      // 3. Configuración (si es equipo activo/programable)
      const matchedRate = matchLaborRate(rates, name, model, brand);
      const category = matchedRate ? (matchedRate.category === "cableado" ? "cableado" : matchedRate.category === "configuracion" ? "configuraciones" : "instalaciones") : categorizeLaborActivity(name, model, systemName);

      const subCost = matchedRate ? matchedRate.subcontractor_unit_cost_mxn : 150;
      const unit = matchedRate ? matchedRate.default_unit : "equipo";

      const activityRecord: WorkActivityItem = {
        system_name: systemName,
        product_brand: brand,
        product_model: model,
        product_name: name,
        activity_name: matchedRate ? matchedRate.name : `Instalación de ${name}`,
        quantity: qty,
        unit,
        subcontractor_unit_cost: subCost,
        subcontractor_total_cost: qty * subCost,
        unit_sale_price: unitLaborSale,
        total_sale_price: qty * unitLaborSale,
      };

      if (category === "cableado") {
        cableadoItems.push(activityRecord);
      } else if (category === "configuraciones") {
        configuracionesItems.push(activityRecord);
      } else {
        instalacionesItems.push(activityRecord);
      }

      // Si es un equipo que además requiere cableado de punto (ej. cámaras, access points, bocinas)
      const isNetworkOrAudioOrCctv = `${systemName} ${name} ${brand}`.toLowerCase();
      if (
        (isNetworkOrAudioOrCctv.includes("cámara") ||
          isNetworkOrAudioOrCctv.includes("camara") ||
          isNetworkOrAudioOrCctv.includes("access point") ||
          isNetworkOrAudioOrCctv.includes("bocina")) &&
        category !== "cableado"
      ) {
        const cableRate = rates.find((r) => r.name.toLowerCase().includes("cableado de punto")) || {
          name: "Cableado de punto A a punto B",
          subcontractor_unit_cost_mxn: 300,
          default_unit: "punto",
          default_sale_price_mxn: 600,
        };

        cableadoItems.push({
          system_name: systemName,
          product_brand: brand,
          product_model: model,
          product_name: `Tirada de cable para ${name}`,
          activity_name: "Cableado de punto A a punto B",
          quantity: qty,
          unit: "punto",
          subcontractor_unit_cost: cableRate.subcontractor_unit_cost_mxn,
          subcontractor_total_cost: qty * cableRate.subcontractor_unit_cost_mxn,
          unit_sale_price: cableRate.default_sale_price_mxn,
          total_sale_price: qty * cableRate.default_sale_price_mxn,
        });
      }
    }

    const generatedOrders: GeneratedWorkOrderSummary[] = [];

    // Definición de las 3 ODTs
    const workOrderDefs = [
      {
        type: "cableado",
        number: `ODT-${folioBase}-CAB`,
        title: "1. Cableado y Trayectorias",
        items: cableadoItems,
        notes: "Tiradas de cableado estructurado, audio y control. Dejar puntas identificadas y peinadas.",
      },
      {
        type: "instalaciones",
        number: `ODT-${folioBase}-INS`,
        title: "2. Instalaciones Físicas y Montajes",
        items: instalacionesItems,
        notes: "Montaje con taquetes, nivelación, conexiones mecánicas y fijación de equipos en muro/plafón.",
      },
      {
        type: "configuraciones",
        number: `ODT-${folioBase}-CFG`,
        title: "3. Configuraciones y Puesta en Marcha",
        items: configuracionesItems,
        notes: "Programación de switches, VLANs, NVRs, escenas de iluminación, audio multiroom y pruebas finales.",
      },
    ];

    for (const def of workOrderDefs) {
      if (def.items.length === 0) continue;

      const totalContractorAmount = def.items.reduce(
        (sum, it) => sum + it.subcontractor_total_cost,
        0
      );
      const totalBudgetedLabor = def.items.reduce(
        (sum, it) => sum + it.total_sale_price,
        0
      );

      // Verificar si ya existe esta ODT para no duplicar
      const { data: existingWo } = await supabase
        .from("work_orders")
        .select("id")
        .eq("client_project_id", clientProjectId)
        .eq("work_order_number", def.number)
        .maybeSingle();

      let workOrderId: number;

      if (existingWo) {
        workOrderId = existingWo.id;
        await supabase
          .from("work_orders")
          .update({
            title: def.title,
            work_order_type: def.type,
            contractor_amount_mxn: totalContractorAmount,
            budgeted_labor_amount_mxn: totalBudgetedLabor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workOrderId);

        // Limpiar actividades previas para re-sincronizar
        await supabase
          .from("work_order_activities")
          .delete()
          .eq("work_order_id", workOrderId);
      } else {
        const { data: newWo, error: woError } = await supabase
          .from("work_orders")
          .insert({
            client_project_id: clientProjectId,
            work_order_number: def.number,
            title: def.title,
            work_order_type: def.type,
            execution_type: "subcontractor",
            status: "draft",
            contractor_amount_mxn: totalContractorAmount,
            budgeted_labor_amount_mxn: totalBudgetedLabor,
            notes: def.notes,
          })
          .select("id")
          .single();

        if (woError || !newWo) {
          console.error("Error creando work_order:", woError);
          continue;
        }
        workOrderId = newWo.id;
      }

      // Insertar actividades en work_order_activities
      const activityInserts = def.items.map((it) => ({
        work_order_id: workOrderId,
        system_name: it.system_name,
        product_brand: it.product_brand,
        product_model: it.product_model,
        product_name: it.product_name,
        activity_name: it.activity_name,
        quantity_assigned: it.quantity,
        quantity_completed: 0,
        unit: it.unit,
        unit_cost_mxn: it.subcontractor_unit_cost,
        total_cost_mxn: it.subcontractor_total_cost,
        unit_sale_price_mxn: it.unit_sale_price,
        total_sale_price_mxn: it.total_sale_price,
        status: "pending",
      }));

      await supabase.from("work_order_activities").insert(activityInserts);

      generatedOrders.push({
        workOrderId,
        workOrderNumber: def.number,
        title: def.title,
        type: def.type,
        activitiesCount: def.items.length,
        contractorAmountMxn: totalContractorAmount,
        budgetedLaborAmountMxn: totalBudgetedLabor,
      });
    }

    return { ok: true, generatedOrders };
  } catch (err) {
    console.error("Error en generateProjectSpecializedWorkOrders:", err);
    return {
      ok: false,
      generatedOrders: [],
      error: err instanceof Error ? err.message : "Error generando órdenes de trabajo",
    };
  }
}
