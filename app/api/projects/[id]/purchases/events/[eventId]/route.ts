import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireInternalUser,
} from "@/lib/apiAuth";
import { normalizeRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

type PurchaseLineForRecalculation = {
  id: number;
  client_project_id: number;
  supplier: string | null;
  quantity_required: number | null;
  unit_cost: number | null;
  total_required_cost: number | null;
};

type PurchaseEventForRecalculation = {
  quantity: number | null;
  unit_cost: number | null;
  supplier: string | null;
};

function getStatus(quantityPurchased: number, quantityRequired: number) {
  if (quantityPurchased <= 0) return "pending";
  if (quantityPurchased >= quantityRequired) return "purchased";
  return "partial";
}

function getEstimatedUnitCost(line: PurchaseLineForRecalculation) {
  const quantityRequired = Number(line.quantity_required || 0);

  return quantityRequired > 0
    ? Number(line.total_required_cost || 0) / quantityRequired
    : Number(line.unit_cost || 0);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;

  if (!profile || normalizeRole(profile.role) !== "admin") {
    return NextResponse.json(
      { error: "Solo administradores pueden editar compras registradas." },
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

    const lineId = Number(purchaseEvent.project_purchase_line_id);
    const { data: lineData, error: lineReadError } = await supabase
      .from("project_purchase_lines")
      .select("id, client_project_id, supplier, quantity_required, unit_cost, total_required_cost")
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

    const { data: lineEventsData, error: eventsReadError } = await supabase
      .from("project_purchase_events")
      .select("quantity, unit_cost, supplier")
      .eq("project_purchase_line_id", line.id);

    if (eventsReadError) throw eventsReadError;

    const lineEvents = (lineEventsData || []) as PurchaseEventForRecalculation[];
    const quantityPurchased = lineEvents.reduce(
      (sum, eventItem) => sum + Number(eventItem.quantity || 0),
      0
    );
    const totalPurchasedCost = lineEvents.reduce(
      (sum, eventItem) =>
        sum + Number(eventItem.quantity || 0) * Number(eventItem.unit_cost || 0),
      0
    );
    const estimatedPurchasedCost = quantityPurchased * getEstimatedUnitCost(line);
    const totalPendingCost = Math.max(
      Number(line.total_required_cost || 0) - estimatedPurchasedCost,
      0
    );
    const nextSupplier =
      lineEvents.find((eventItem) => eventItem.supplier?.trim())?.supplier ||
      line.supplier ||
      null;

    const { error: updateLineError } = await supabase
      .from("project_purchase_lines")
      .update({
        supplier: nextSupplier,
        quantity_purchased: quantityPurchased,
        total_purchased_cost: totalPurchasedCost,
        total_pending_cost: totalPendingCost,
        purchase_status: getStatus(quantityPurchased, Number(line.quantity_required || 0)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.id);

    if (updateLineError) throw updateLineError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError(requestId, "purchase event edit failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
