import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireInternalUser,
} from "@/lib/apiAuth";
import { isAdminLike } from "@/lib/permissions";
import { recalculatePurchaseLineTotals } from "@/lib/projectPurchases";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

type PurchaseLineForRecalculation = {
  id: number;
  client_project_id: number;
  supplier: string | null;
};

function isMissingTableError(error: { code?: string | null }) {
  return error.code === "42P01" || error.code === "PGRST205";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;

  if (!profile || !isAdminLike(profile.role)) {
    return NextResponse.json(
      { error: "Solo administracion o direccion pueden editar compras registradas." },
      { status: 403 }
    );
  }

  const { id, eventId } = await params;
  const projectId = parsePositiveInteger(id);
  const purchaseEventId = parsePositiveInteger(eventId);
  const body = await request.json().catch(() => null);
  const purchaseDate = String(body?.purchase_date || "").trim();
  const quantity = Number(body?.quantity);
  const unitCost = Number(body?.unit_cost);
  const costCurrency = String(body?.cost_currency || "USD").toUpperCase();
  const exchangeRate = costCurrency === "USD" ? Number(body?.exchange_rate) : null;
  const supplier = String(body?.supplier || "").trim();
  const invoiceReference = String(body?.invoice_reference || "").trim();
  const notes = String(body?.notes || "").trim();

  if (!projectId || !purchaseEventId) {
    return jsonError("Bad Request", 400);
  }

  if (!purchaseDate) {
    return NextResponse.json({ error: "Fecha de compra requerida." }, { status: 400 });
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Cantidad invalida." }, { status: 400 });
  }

  if (!Number.isFinite(unitCost) || unitCost < 0) {
    return NextResponse.json({ error: "Costo unitario invalido." }, { status: 400 });
  }

  if (!["USD", "MXN"].includes(costCurrency)) {
    return NextResponse.json({ error: "Moneda invalida." }, { status: 400 });
  }

  if (costCurrency === "USD" && (!exchangeRate || exchangeRate <= 0)) {
    return NextResponse.json(
      { error: "Tipo de cambio requerido para compras en USD." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: purchaseEvent, error: eventReadError } = await supabase
      .from("project_purchase_events")
      .select("id, project_purchase_line_id")
      .eq("id", purchaseEventId)
      .maybeSingle();

    if (eventReadError) throw eventReadError;
    if (!purchaseEvent) {
      return NextResponse.json({ error: "Compra no encontrada." }, { status: 404 });
    }

    // Un consumo de almacen se corrige con un ajuste en /inventory, no editando
    // el evento (desalinearia existencias y costo). Solo se tolera que la tabla
    // aun no exista (42P01 / PGRST205); cualquier otro error falla cerrado.
    const { data: inventoryMovement, error: inventoryReadError } = await supabase
      .from("inventory_movements")
      .select("id")
      .eq("project_purchase_event_id", purchaseEventId)
      .limit(1)
      .maybeSingle();

    if (inventoryReadError && !isMissingTableError(inventoryReadError)) {
      throw inventoryReadError;
    }

    if (!inventoryReadError && inventoryMovement) {
      return NextResponse.json(
        {
          error:
            "Esta compra salio del almacen (movimiento #" +
            inventoryMovement.id +
            "). Corrigela con un ajuste de inventario.",
        },
        { status: 409 }
      );
    }

    const lineId = Number(purchaseEvent.project_purchase_line_id);
    const { data: lineData, error: lineReadError } = await supabase
      .from("project_purchase_lines")
      .select("id, client_project_id, supplier")
      .eq("id", lineId)
      .maybeSingle();

    if (lineReadError) throw lineReadError;
    if (!lineData || Number(lineData.client_project_id) !== projectId) {
      return NextResponse.json(
        { error: "La compra no pertenece a este proyecto." },
        { status: 404 }
      );
    }

    const line = lineData as PurchaseLineForRecalculation;
    const { error: updateEventError } = await supabase
      .from("project_purchase_events")
      .update({
        purchase_date: purchaseDate,
        quantity,
        unit_cost: unitCost,
        cost_currency: costCurrency,
        exchange_rate: exchangeRate,
        supplier: supplier || line.supplier || null,
        invoice_reference: invoiceReference || null,
        notes: notes || null,
      })
      .eq("id", purchaseEventId);

    if (updateEventError) throw updateEventError;

    await recalculatePurchaseLineTotals(supabase, line.id, { syncSupplierFromEvents: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError(requestId, "purchase event edit failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
