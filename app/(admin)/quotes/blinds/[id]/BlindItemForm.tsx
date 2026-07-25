"use client";

import { ImageOff, LoaderCircle, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  calculateQuoteBlindItemAmounts,
  parseQuoteBlindItemInput,
  QuoteBlindValidationError,
} from "@/lib/quoteBlindsContract";
import {
  type BlindQuoteItem,
  formatM2,
  formatMxn,
  readApiResponse,
} from "../types";
import { BlindReferenceImageManager } from "./BlindReferenceImage";

type FormState = {
  area: string;
  brand: string;
  model: string;
  width_cm: string;
  height_cm: string;
  blind_type: string;
  collection: string;
  color: string;
  mechanism: string;
  control: string;
  quantity: string;
  price_per_m2_mxn: string;
  billable_m2_override: string;
  override_reason: string;
  reference_image_path: string | null;
  internal_notes: string;
  customer_visible_note: string;
};

const emptyForm: FormState = {
  area: "",
  brand: "",
  model: "",
  width_cm: "",
  height_cm: "",
  blind_type: "",
  collection: "",
  color: "",
  mechanism: "",
  control: "",
  quantity: "1",
  price_per_m2_mxn: "",
  billable_m2_override: "",
  override_reason: "",
  reference_image_path: null,
  internal_notes: "",
  customer_visible_note: "",
};

function formFromItem(item: BlindQuoteItem): FormState {
  const detail = item.blind_detail;
  return {
    area: item.area || "",
    brand: item.product_brand || "",
    model: item.product_model || "",
    width_cm: String(detail?.width_cm || ""),
    height_cm: String(detail?.height_cm || ""),
    blind_type: detail?.blind_type || "",
    collection: detail?.collection || "",
    color: detail?.color || "",
    mechanism: detail?.mechanism || "",
    control: detail?.control || "",
    quantity: String(item.quantity || 1),
    price_per_m2_mxn: String(detail?.price_per_m2_mxn || ""),
    billable_m2_override:
      detail?.billable_m2_override === null ||
      detail?.billable_m2_override === undefined
        ? ""
        : String(detail.billable_m2_override),
    override_reason: detail?.override_reason || "",
    reference_image_path: detail?.reference_image_path || null,
    internal_notes: detail?.internal_notes || "",
    customer_visible_note: item.customer_visible_note || "",
  };
}

export default function BlindItemForm({
  quoteId,
  item,
  suggestedArea,
  onSaved,
  onImageChanged,
  onCancel,
}: {
  quoteId: number;
  item: BlindQuoteItem | null;
  suggestedArea?: string;
  onSaved: (message: string, keepOpen: boolean) => Promise<void>;
  onImageChanged: (message: string) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = Boolean(item);
  const [form, setForm] = useState<FormState>(() =>
    item ? formFromItem(item) : { ...emptyForm, area: suggestedArea || "" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const liveAmounts = useMemo(() => {
    const width = Number(form.width_cm);
    const height = Number(form.height_cm);
    const quantity = Number(form.quantity);
    const price = Number(form.price_per_m2_mxn);
    const override = form.billable_m2_override
      ? Number(form.billable_m2_override)
      : null;

    if (
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(height) ||
      height <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(price) ||
      price < 0 ||
      (override !== null && (!Number.isFinite(override) || override <= 0))
    ) {
      return null;
    }

    return calculateQuoteBlindItemAmounts({
      width_cm: width,
      height_cm: height,
      quantity,
      price_per_m2_mxn: price,
      billable_m2_override: override,
    });
  }, [
    form.billable_m2_override,
    form.height_cm,
    form.price_per_m2_mxn,
    form.quantity,
    form.width_cm,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = parseQuoteBlindItemInput({
        ...form,
        width_cm: form.width_cm,
        height_cm: form.height_cm,
        quantity: form.quantity,
        price_per_m2_mxn: form.price_per_m2_mxn,
        billable_m2_override: form.billable_m2_override || null,
        override_reason: form.billable_m2_override
          ? form.override_reason
          : null,
      });
      const response = await fetch(
        isEditing
          ? `/api/quotes/blinds/${quoteId}/items/${item?.id}`
          : `/api/quotes/blinds/${quoteId}/items`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      await readApiResponse(response);

      if (isEditing) {
        await onSaved("Partida actualizada.", false);
      } else {
        const capturedArea = payload.area;
        setForm({ ...emptyForm, area: capturedArea });
        await onSaved(
          `Partida guardada en ${capturedArea}. Puedes capturar otra ventana.`,
          true
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof QuoteBlindValidationError ||
          saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar la partida."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "min-h-11 w-full border border-black/10 bg-white px-3 text-sm outline-none transition placeholder:text-black/30 focus:border-[#7A1F2B]";
  const labelClass = "grid gap-2 text-xs font-semibold text-black/55";

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#7A1F2B]/20 bg-[#FBFAF8] shadow-sm"
    >
      <header className="flex items-start justify-between gap-5 border-b border-black/10 px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A1F2B]">
            {isEditing ? "Editar partida" : "Captura rápida"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
            {isEditing ? item?.product_name : "Nueva ventana"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 transition hover:text-[#7A1F2B]"
          aria-label="Cerrar captura"
        >
          <X size={18} />
        </button>
      </header>

      <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_250px]">
        <div className="space-y-7">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">
              Ubicación y producto
            </legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={`${labelClass} sm:col-span-2 lg:col-span-1`}>
                Área o ubicación *
                <input
                  autoFocus
                  required
                  value={form.area}
                  onChange={(event) => updateField("area", event.target.value)}
                  placeholder="Ej. Recámara principal"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Marca *
                <input
                  required
                  value={form.brand}
                  onChange={(event) => updateField("brand", event.target.value)}
                  placeholder="Ej. Hunter Douglas"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Modelo *
                <input
                  required
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  placeholder="Ej. Duette"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Tipo de persiana *
                <input
                  required
                  value={form.blind_type}
                  onChange={(event) =>
                    updateField("blind_type", event.target.value)
                  }
                  placeholder="Enrollables, celular…"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Colección *
                <input
                  required
                  value={form.collection}
                  onChange={(event) =>
                    updateField("collection", event.target.value)
                  }
                  placeholder="Colección"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Color *
                <input
                  required
                  value={form.color}
                  onChange={(event) => updateField("color", event.target.value)}
                  placeholder="Color / acabado"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Mecanismo *
                <input
                  required
                  value={form.mechanism}
                  onChange={(event) =>
                    updateField("mechanism", event.target.value)
                  }
                  placeholder="Manual, motorizado…"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Control *
                <input
                  required
                  value={form.control}
                  onChange={(event) =>
                    updateField("control", event.target.value)
                  }
                  placeholder="Cadena, remoto…"
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">
              Medidas y precio
            </legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className={labelClass}>
                Ancho cm *
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.width_cm}
                  onChange={(event) =>
                    updateField("width_cm", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Alto cm *
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={form.height_cm}
                  onChange={(event) =>
                    updateField("height_cm", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Cantidad *
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(event) =>
                    updateField("quantity", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Precio por m² *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.price_per_m2_mxn}
                  onChange={(event) =>
                    updateField("price_per_m2_mxn", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="border-l-2 border-[#7A1F2B]/25 pl-4">
            <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">
              Ajuste manual opcional
            </legend>
            <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
              <label className={labelClass}>
                m² facturables
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  inputMode="decimal"
                  value={form.billable_m2_override}
                  onChange={(event) =>
                    updateField("billable_m2_override", event.target.value)
                  }
                  placeholder="Sin ajuste"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Motivo del ajuste
                <input
                  required={Boolean(form.billable_m2_override)}
                  disabled={!form.billable_m2_override}
                  value={form.override_reason}
                  onChange={(event) =>
                    updateField("override_reason", event.target.value)
                  }
                  placeholder="Obligatorio cuando se ajustan los m²"
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-black/[0.035]`}
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">
              Notas
            </legend>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Nota visible para cliente
                <textarea
                  value={form.customer_visible_note}
                  onChange={(event) =>
                    updateField("customer_visible_note", event.target.value)
                  }
                  maxLength={5000}
                  placeholder="Información comercial que sí puede mostrarse."
                  className={`${inputClass} min-h-24 resize-y py-3 font-normal leading-5`}
                />
              </label>
              <label className={`${labelClass} text-[#7A1F2B]`}>
                Nota interna · Sólo ALFA
                <textarea
                  value={form.internal_notes}
                  onChange={(event) =>
                    updateField("internal_notes", event.target.value)
                  }
                  maxLength={5000}
                  placeholder="Proveedor, costo, instalación o seguimiento interno."
                  className={`${inputClass} min-h-24 resize-y border-[#7A1F2B]/20 bg-[#7A1F2B]/[0.035] py-3 font-normal leading-5 text-[#111111]`}
                />
              </label>
            </div>
          </fieldset>

          {item ? (
            <BlindReferenceImageManager
              quoteId={quoteId}
              itemId={item.id}
              hasImage={Boolean(form.reference_image_path)}
              onChanged={async (path, imageMessage) => {
                setForm((current) => ({
                  ...current,
                  reference_image_path: path,
                }));
                await onImageChanged(imageMessage);
              }}
            />
          ) : (
            <div className="flex items-center gap-3 border border-dashed border-black/15 bg-white px-4 py-4 text-sm text-black/45">
              <ImageOff size={18} />
              <span>
                Guarda la partida y después edítala para agregar su foto de
                referencia privada.
              </span>
            </div>
          )}
        </div>

        <aside className="h-fit border border-black/10 bg-white p-5 xl:sticky xl:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
            Cálculo en vivo
          </p>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-black/45">m² unitario</dt>
              <dd className="font-semibold">
                {liveAmounts
                  ? formatM2(liveAmounts.calculated_m2_per_unit)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/45">m² calculados</dt>
              <dd className="font-semibold">
                {liveAmounts
                  ? formatM2(liveAmounts.calculated_m2_total)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/45">m² facturables</dt>
              <dd className="font-semibold text-[#7A1F2B]">
                {liveAmounts ? formatM2(liveAmounts.billable_m2) : "—"}
              </dd>
            </div>
            <div className="border-t border-black/10 pt-4">
              <div className="flex justify-between gap-3">
                <dt className="text-black/45">Total partida</dt>
                <dd className="text-lg font-semibold">
                  {liveAmounts ? formatMxn(liveAmounts.line_total_mxn) : "—"}
                </dd>
              </div>
            </div>
          </dl>

          {error ? (
            <div className="mt-5 border-l-2 border-[#7A1F2B] bg-[#7A1F2B]/[0.045] px-3 py-3 text-xs leading-5 text-[#7A1F2B]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#7A1F2B] px-4 text-sm font-semibold text-white transition hover:bg-[#641923] disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/35"
          >
            {saving ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save size={17} />
                {isEditing ? "Guardar cambios" : "Guardar y capturar otra"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="mt-2 min-h-11 w-full text-sm font-semibold text-black/45 transition hover:text-[#7A1F2B]"
          >
            {isEditing ? "Cancelar edición" : "Terminar captura"}
          </button>
        </aside>
      </div>
    </form>
  );
}
