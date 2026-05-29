"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, X } from "lucide-react";
import ProductLibraryPicker, {
  ProductLibraryProduct,
} from "@/components/ProductLibraryPicker";
import { formatCurrency, formatNumber } from "@/lib/format";
import { supabase } from "@/services/supabase";

export type OperationalEditorItem = {
  id: number;
  client_project_id: number;
  system_name: string | null;
  product_id: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
  quantity: number;
  original_quantity: number;
  original_unit_cost: number;
  operational_unit_cost: number;
  cost_currency: string;
  status: string;
  quantity_purchased: number;
  quantity_delivered: number;
};

export type ProductOption = ProductLibraryProduct;

export type TranslationChange = {
  id: number;
  change_type: string | null;
  old_product_name: string | null;
  new_product_name: string | null;
  old_quantity: number | null;
  new_quantity: number | null;
  old_unit_cost: number | null;
  new_unit_cost: number | null;
  cost_difference: number | null;
  notes: string | null;
  created_at: string | null;
};

type Props = {
  projectId: number;
  initialItems: OperationalEditorItem[];
  products: ProductOption[];
  recentChanges: TranslationChange[];
};

type ModalMode = "substitute" | "quantity" | "add" | null;

function reportError(step: string, error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? ` ${error.message}`
      : "";

  console.error(`Error en ${step}:`, error);
  alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
}

function productLabel(product: ProductOption | null | undefined) {
  if (!product) return "Selecciona producto";
  return `${product.brand || "Sin marca"} ${product.model || ""} / ${
    product.name || "Sin descripcion"
  }`;
}

function itemProductName(item: OperationalEditorItem) {
  return `${item.product_brand || "Sin marca"} ${item.product_model || ""} / ${
    item.product_name || "Sin descripcion"
  }`;
}

function getTotals(items: OperationalEditorItem[]) {
  return items.reduce(
    (totals, item) => {
      totals.original += item.original_quantity * item.original_unit_cost;
      totals.operational += item.quantity * item.operational_unit_cost;
      return totals;
    },
    { original: 0, operational: 0 }
  );
}

function getStatusLabel(status: string) {
  if (status === "pending_director_approval") return "Pendiente direccion";
  if (status === "purchased") return "Comprado";
  if (status === "partially_purchased") return "Compra parcial";
  if (status === "delivered") return "Entregado";
  if (status === "locked") return "Bloqueado";
  return "Activo";
}

export default function ProjectTranslationEditor({
  projectId,
  initialItems,
  products,
  recentChanges,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [libraryProducts, setLibraryProducts] = useState(products);
  const [changes, setChanges] = useState(recentChanges);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ModalMode>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [quantityValue, setQuantityValue] = useState("");
  const [systemName, setSystemName] = useState("");
  const [notes, setNotes] = useState("");
  const totals = useMemo(() => getTotals(items), [items]);
  const activeItem = items.find((item) => item.id === activeItemId) || null;
  const savingAmount = Math.max(totals.original - totals.operational, 0);
  const overrunAmount = Math.max(totals.operational - totals.original, 0);
  const systemOptions = Array.from(
    new Set(items.map((item) => item.system_name?.trim()).filter(Boolean) as string[])
  );

  function openSubstitute(item: OperationalEditorItem) {
    if (item.quantity_purchased > 0 || item.quantity_delivered > 0) {
      alert("No se puede sustituir un item con compras o entregas registradas.");
      return;
    }

    setActiveItemId(item.id);
    setQuantityValue("");
    setSystemName(item.system_name || "");
    setNotes("");
    setMode("substitute");
  }

  function openQuantity(item: OperationalEditorItem) {
    setActiveItemId(item.id);
    setQuantityValue(String(Number(item.quantity || 0)));
    setSystemName(item.system_name || "");
    setNotes("");
    setMode("quantity");
  }

  function openAdd() {
    setActiveItemId(null);
    setQuantityValue("1");
    setSystemName(systemOptions[0] || "");
    setNotes("");
    setMode("add");
  }

  function closeModal() {
    setMode(null);
    setActiveItemId(null);
    setQuantityValue("");
    setSystemName("");
    setNotes("");
  }

  async function getCurrentUserId() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    return user?.id || null;
  }

  function requiresDirectorApproval(nextItems: OperationalEditorItem[]) {
    const nextTotals = getTotals(nextItems);
    return nextTotals.operational > nextTotals.original + 0.0001;
  }

  function confirmOverrunIfNeeded(nextItems: OperationalEditorItem[]) {
    if (!requiresDirectorApproval(nextItems)) return true;

    return window.confirm(
      "Requiere autorizacion de direccion. Confirma que deseas dejar este cambio como pendiente de aprobacion."
    );
  }

  async function logChange(row: Omit<TranslationChange, "id" | "created_at">) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("project_translation_changes")
      .insert({
        client_project_id: projectId,
        operational_item_id:
          "operational_item_id" in row ? row.operational_item_id : null,
        change_type: row.change_type,
        old_product_name: row.old_product_name,
        new_product_name: row.new_product_name,
        old_quantity: row.old_quantity,
        new_quantity: row.new_quantity,
        old_unit_cost: row.old_unit_cost,
        new_unit_cost: row.new_unit_cost,
        cost_difference: row.cost_difference || 0,
        notes: row.notes,
        created_by_user_id: userId,
      })
      .select(
        "id, change_type, old_product_name, new_product_name, old_quantity, new_quantity, old_unit_cost, new_unit_cost, cost_difference, notes, created_at"
      )
      .single();

    if (error) throw error;
    if (data) {
      setChanges((current) => [data as TranslationChange, ...current].slice(0, 12));
    }
  }

  async function updateOpenPurchaseLine(
    itemId: number,
    values: {
      product_id?: number | null;
      product_brand?: string | null;
      product_model?: string | null;
      product_name?: string | null;
      quantity_required?: number;
      unit_cost?: number;
      cost_currency?: string | null;
    }
  ) {
    const quantityRequired = Number(values.quantity_required || 0);
    const unitCost = Number(values.unit_cost || 0);
    const patch: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };

    if ("product_id" in values) patch.product_id = values.product_id || null;
    if ("product_brand" in values) patch.product_brand = values.product_brand || null;
    if ("product_model" in values) patch.product_model = values.product_model || null;
    if ("product_name" in values) patch.product_name = values.product_name || null;
    if ("quantity_required" in values) {
      patch.quantity_required = quantityRequired;
      patch.total_required_cost = quantityRequired * unitCost;
      patch.total_pending_cost = quantityRequired * unitCost;
    }
    if ("unit_cost" in values) patch.unit_cost = unitCost;
    if ("cost_currency" in values) {
      patch.cost_currency = values.cost_currency === "MXN" ? "MXN" : "USD";
    }

    const { error } = await supabase
      .from("project_purchase_lines")
      .update(patch)
      .eq("project_operational_item_id", itemId)
      .eq("quantity_purchased", 0);

    if (error) throw error;
  }

  async function handleSubstitute(selectedProduct: ProductOption) {
    if (!activeItem) return;

    const nextItem: OperationalEditorItem = {
      ...activeItem,
      product_id: selectedProduct.id,
      product_brand: selectedProduct.brand,
      product_model: selectedProduct.model,
      product_name: selectedProduct.name,
      product_image_url: selectedProduct.image_url,
      operational_unit_cost: Number(selectedProduct.cost_price || 0),
      cost_currency: selectedProduct.cost_currency || "USD",
      status: "active",
    };
    const nextItems = items.map((item) => (item.id === activeItem.id ? nextItem : item));
    const needsApproval = requiresDirectorApproval(nextItems);

    if (!confirmOverrunIfNeeded(nextItems)) return;
    setSaving(true);

    try {
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from("project_operational_items")
        .update({
          product_id: selectedProduct.id,
          product_brand: selectedProduct.brand,
          product_model: selectedProduct.model,
          product_name: selectedProduct.name,
          product_image_url: selectedProduct.image_url,
          operational_unit_cost: Number(selectedProduct.cost_price || 0),
          cost_currency: selectedProduct.cost_currency || "USD",
          status: needsApproval ? "pending_director_approval" : "active",
          change_origin: "translation",
          updated_by_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeItem.id);

      if (error) throw error;

      await updateOpenPurchaseLine(activeItem.id, {
        product_id: selectedProduct.id,
        product_brand: selectedProduct.brand,
        product_model: selectedProduct.model,
        product_name: selectedProduct.name,
        quantity_required: activeItem.quantity,
        unit_cost: Number(selectedProduct.cost_price || 0),
        cost_currency: selectedProduct.cost_currency || "USD",
      });

      await logChange({
        operational_item_id: activeItem.id,
        change_type: "substitute",
        old_product_name: itemProductName(activeItem),
        new_product_name: productLabel(selectedProduct),
        old_quantity: activeItem.quantity,
        new_quantity: activeItem.quantity,
        old_unit_cost: activeItem.operational_unit_cost,
        new_unit_cost: Number(selectedProduct.cost_price || 0),
        cost_difference:
          activeItem.quantity * Number(selectedProduct.cost_price || 0) -
          activeItem.quantity * activeItem.operational_unit_cost,
        notes: notes.trim() || null,
      } as TranslationChange & { operational_item_id: number });

      setItems(
        items.map((item) =>
          item.id === activeItem.id
            ? {
                ...nextItem,
                status: needsApproval ? "pending_director_approval" : "active",
              }
            : item
        )
      );
      closeModal();
      router.refresh();
    } catch (error) {
      reportError("sustituir producto", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuantityChange() {
    if (!activeItem) return;

    const nextQuantity = Number(quantityValue);
    const minQuantity = Math.max(activeItem.quantity_purchased, activeItem.quantity_delivered);

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      alert("Captura una cantidad valida.");
      return;
    }

    if (nextQuantity < minQuantity - 0.0001) {
      alert("No puedes reducir por debajo de la cantidad comprada o entregada.");
      return;
    }

    const nextItem = { ...activeItem, quantity: nextQuantity, status: "active" };
    const nextItems = items.map((item) => (item.id === activeItem.id ? nextItem : item));
    const needsApproval = requiresDirectorApproval(nextItems);

    if (!confirmOverrunIfNeeded(nextItems)) return;
    setSaving(true);

    try {
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from("project_operational_items")
        .update({
          quantity: nextQuantity,
          status: needsApproval ? "pending_director_approval" : "active",
          change_origin: "translation",
          updated_by_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeItem.id);

      if (error) throw error;

      await updateOpenPurchaseLine(activeItem.id, {
        quantity_required: nextQuantity,
        unit_cost: activeItem.operational_unit_cost,
        cost_currency: activeItem.cost_currency,
      });

      await logChange({
        operational_item_id: activeItem.id,
        change_type: "quantity_change",
        old_product_name: itemProductName(activeItem),
        new_product_name: itemProductName(activeItem),
        old_quantity: activeItem.quantity,
        new_quantity: nextQuantity,
        old_unit_cost: activeItem.operational_unit_cost,
        new_unit_cost: activeItem.operational_unit_cost,
        cost_difference:
          nextQuantity * activeItem.operational_unit_cost -
          activeItem.quantity * activeItem.operational_unit_cost,
        notes: notes.trim() || null,
      } as TranslationChange & { operational_item_id: number });

      setItems(
        items.map((item) =>
          item.id === activeItem.id
            ? {
                ...nextItem,
                status: needsApproval ? "pending_director_approval" : "active",
              }
            : item
        )
      );
      closeModal();
      router.refresh();
    } catch (error) {
      reportError("cambiar cantidad", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddProduct(selectedProduct: ProductOption) {
    if (!selectedProduct) return;

    const nextQuantity = Number(quantityValue);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      alert("Captura una cantidad valida.");
      return;
    }

    const temporaryItem: OperationalEditorItem = {
      id: -Date.now(),
      client_project_id: projectId,
      system_name: systemName.trim() || null,
      product_id: selectedProduct.id,
      product_brand: selectedProduct.brand,
      product_model: selectedProduct.model,
      product_name: selectedProduct.name,
      product_image_url: selectedProduct.image_url,
      quantity: nextQuantity,
      original_quantity: 0,
      original_unit_cost: 0,
      operational_unit_cost: Number(selectedProduct.cost_price || 0),
      cost_currency: selectedProduct.cost_currency || "USD",
      status: "active",
      quantity_purchased: 0,
      quantity_delivered: 0,
    };
    const nextItems = [...items, temporaryItem];
    const needsApproval = requiresDirectorApproval(nextItems);

    if (!confirmOverrunIfNeeded(nextItems)) return;
    setSaving(true);

    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from("project_operational_items")
        .insert({
          client_project_id: projectId,
          source_quote_id: null,
          source_quote_item_id: null,
          system_name: systemName.trim() || null,
          product_id: selectedProduct.id,
          product_brand: selectedProduct.brand,
          product_model: selectedProduct.model,
          product_name: selectedProduct.name,
          product_image_url: selectedProduct.image_url,
          quantity: nextQuantity,
          original_quantity: 0,
          original_unit_cost: 0,
          operational_unit_cost: Number(selectedProduct.cost_price || 0),
          cost_currency: selectedProduct.cost_currency || "USD",
          status: needsApproval ? "pending_director_approval" : "active",
          change_origin: "translation",
          created_by_user_id: userId,
          updated_by_user_id: userId,
        })
        .select("id")
        .single();

      if (error || !data) throw error || { message: "No se recibio item creado" };

      await logChange({
        operational_item_id: data.id,
        change_type: "add",
        old_product_name: null,
        new_product_name: productLabel(selectedProduct),
        old_quantity: 0,
        new_quantity: nextQuantity,
        old_unit_cost: 0,
        new_unit_cost: Number(selectedProduct.cost_price || 0),
        cost_difference: nextQuantity * Number(selectedProduct.cost_price || 0),
        notes: notes.trim() || null,
      } as TranslationChange & { operational_item_id: number });

      setItems([
        ...items,
        {
          ...temporaryItem,
          id: data.id,
          status: needsApproval ? "pending_director_approval" : "active",
        },
      ]);
      closeModal();
      router.refresh();
    } catch (error) {
      reportError("agregar producto", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: OperationalEditorItem) {
    if (item.quantity_purchased > 0 || item.quantity_delivered > 0) {
      alert("No se puede eliminar un item con compras o entregas registradas.");
      return;
    }

    const confirmed = window.confirm("Eliminar este producto de la base operativa?");
    if (!confirmed) return;

    setSaving(true);

    try {
      await logChange({
        operational_item_id: item.id,
        change_type: "delete",
        old_product_name: itemProductName(item),
        new_product_name: null,
        old_quantity: item.quantity,
        new_quantity: 0,
        old_unit_cost: item.operational_unit_cost,
        new_unit_cost: 0,
        cost_difference: -item.quantity * item.operational_unit_cost,
        notes: "Eliminado desde traduccion tecnica",
      } as TranslationChange & { operational_item_id: number });

      const { error } = await supabase
        .from("project_operational_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      const { error: lineDeleteError } = await supabase
        .from("project_purchase_lines")
        .delete()
        .eq("project_operational_item_id", item.id)
        .eq("quantity_purchased", 0);

      if (lineDeleteError) throw lineDeleteError;

      setItems(items.filter((current) => current.id !== item.id));
      router.refresh();
    } catch (error) {
      reportError("eliminar producto", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="mb-6 rounded-xl border border-[#1F1F24] bg-[#151518]">
        <div className="flex flex-col gap-3 border-b border-[#2A2A30] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Base operativa editable</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Los items con compras o entregas bloquean sustitucion y eliminacion.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-4 py-2.5 text-sm font-semibold hover:bg-[#B91C3C]"
          >
            <Plus size={17} />
            Agregar producto
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-[#77777D]">No hay items operativos para editar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-3 py-2 font-semibold">Sistema</th>
                  <th className="px-3 py-2 font-semibold">Equipo actual</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                  <th className="px-3 py-2 text-right font-semibold">Costo operativo</th>
                  <th className="px-3 py-2 font-semibold">Moneda</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const locked = item.quantity_purchased > 0 || item.quantity_delivered > 0;

                  return (
                    <tr key={item.id} className="border-b border-[#222228] align-top hover:bg-[#1A1A1F]">
                      <td className="px-3 py-2">{item.system_name || "Sin sistema"}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold">
                          {item.product_brand || "Sin marca"} {item.product_model || ""}
                        </p>
                        <p className="max-w-[360px] truncate text-[#B3B3B8]">
                          {item.product_name || "Sin descripcion"}
                        </p>
                        {locked ? (
                          <p className="mt-1 text-[11px] text-[#F4C66A]">
                            Comprado {formatNumber(item.quantity_purchased)} / Entregado{" "}
                            {formatNumber(item.quantity_delivered)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.quantity)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(item.operational_unit_cost, item.cost_currency)}
                      </td>
                      <td className="px-3 py-2">{item.cost_currency}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] ${
                            item.status === "pending_director_approval"
                              ? "border-[#614620] bg-[#322514] text-[#F4C66A]"
                              : "border-[#2A2A30] bg-[#222228] text-[#B3B3B8]"
                          }`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-[260px] flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openSubstitute(item)}
                            disabled={locked || saving}
                            className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white disabled:text-[#555963]"
                          >
                            Sustituir
                          </button>
                          <button
                            type="button"
                            onClick={() => openQuantity(item)}
                            disabled={saving}
                            className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white disabled:text-[#555963]"
                          >
                            Cantidad
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={locked || saving}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white disabled:text-[#555963]"
                          >
                            <Trash2 size={13} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-semibold">Historial reciente</h2>
        {changes.length === 0 ? (
          <p className="text-sm text-[#77777D]">Sin cambios registrados.</p>
        ) : (
          <div className="space-y-3">
            {changes.map((change) => (
              <div
                key={change.id}
                className="grid grid-cols-1 gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] p-3 text-xs md:grid-cols-[140px_1fr_auto]"
              >
                <span className="font-semibold">{change.change_type || "change"}</span>
                <span className="text-[#B3B3B8]">
                  {change.old_product_name || "-"} -&gt; {change.new_product_name || "-"}
                </span>
                <span className={Number(change.cost_difference || 0) <= 0 ? "text-[#8CE0B6]" : "text-[#FFB19C]"}>
                  {formatCurrency(change.cost_difference, "USD")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {mode ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  {mode === "add"
                    ? "Agregar producto"
                    : mode === "quantity"
                      ? "Cambiar cantidad"
                      : "Sustituir producto"}
                </h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Cualquier cambio queda en historial de traduccion tecnica.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {mode === "add" ? (
                <label className="space-y-2">
                  <span className="text-sm text-[#B3B3B8]">Sistema</span>
                  <input
                    list="translation-system-options"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                    value={systemName}
                    onChange={(event) => setSystemName(event.target.value)}
                    placeholder="Ej. CCTV, Control de acceso"
                  />
                  <datalist id="translation-system-options">
                    {systemOptions.map((system) => (
                      <option key={system} value={system} />
                    ))}
                  </datalist>
                </label>
              ) : null}

              {mode === "quantity" || mode === "add" ? (
                <label className="space-y-2">
                  <span className="text-sm text-[#B3B3B8]">Cantidad</span>
                  <input
                    type="number"
                    step="0.01"
                    min={activeItem ? Math.max(activeItem.quantity_purchased, activeItem.quantity_delivered) : 0}
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                    value={quantityValue}
                    onChange={(event) => setQuantityValue(event.target.value)}
                  />
                </label>
              ) : null}

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Notas</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              {mode === "substitute" || mode === "add" ? (
                <ProductLibraryPicker
                  products={libraryProducts}
                  onProductsChange={setLibraryProducts}
                  priceMode="cost"
                  selectLabel={mode === "add" ? "Agregar" : "Sustituir"}
                  helperText={
                    mode === "add"
                      ? "Elige un producto para agregarlo a la base operativa."
                      : "Elige el reemplazo tecnico para esta linea."
                  }
                  onSelectProduct={
                    mode === "add" ? handleAddProduct : handleSubstitute
                  }
                />
              ) : null}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={mode === "quantity" ? handleQuantityChange : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold disabled:bg-[#222228] disabled:text-[#77777D] ${
                  mode === "quantity"
                    ? "bg-[#9E1B32] hover:bg-[#B91C3C]"
                    : "hidden"
                }`}
              >
                <Save size={18} />
                {saving ? "Guardando..." : "Aplicar cambio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
