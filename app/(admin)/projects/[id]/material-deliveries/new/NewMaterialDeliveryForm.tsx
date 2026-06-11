"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Eraser, PenLine, Save } from "lucide-react";
import { getPurchaseDeliveryStatus } from "@/lib/materialDeliveries";
import { formatNumber } from "@/lib/format";
import { getMexicoDate } from "@/lib/mexicoDate";
import { supabase } from "@/services/supabase";

export type AvailableDeliveryLine = {
  id: number;
  supplier: string | null;
  system_name?: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  quantity_required: number;
  quantity_purchased: number;
  quantity_delivered_previously: number;
  quantity_available: number;
  purchase_status: string | null;
};

type SelectedLine = {
  selected: boolean;
  quantity: string;
};

type Props = {
  projectId: number;
  lines: AvailableDeliveryLine[];
};

function today() {
  return getMexicoDate();
}

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

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function quantityInputValue(value: number) {
  return Number(value || 0)
    .toFixed(2)
    .replace(/\.00$/, "");
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);

  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }

  return new Blob([buffer], { type: mime });
}

export default function NewMaterialDeliveryForm({ projectId, lines }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const signedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [deliveredToName, setDeliveredToName] = useState("");
  const [deliveredToPhone, setDeliveredToPhone] = useState("");
  const [deliveredByName, setDeliveredByName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [selection, setSelection] = useState<Record<number, SelectedLine>>(() =>
    Object.fromEntries(
      lines.map((line) => [
        line.id,
        {
          selected: false,
          quantity: quantityInputValue(line.quantity_available),
        },
      ])
    )
  );

  const selectedItems = useMemo(
    () =>
      lines
        .map((line) => ({
          line,
          quantity: Number(selection[line.id]?.quantity || 0),
          selected: Boolean(selection[line.id]?.selected),
        }))
        .filter((item) => item.selected),
    [lines, selection]
  );

  function setLineSelected(line: AvailableDeliveryLine, selected: boolean) {
    setSelection((current) => ({
      ...current,
      [line.id]: {
        selected,
        quantity:
          current[line.id]?.quantity ||
          quantityInputValue(line.quantity_available),
      },
    }));
  }

  function setLineQuantity(lineId: number, quantity: string) {
    setSelection((current) => ({
      ...current,
      [lineId]: {
        selected: current[lineId]?.selected || false,
        quantity,
      },
    }));
  }

  function setEvidence(files: FileList | null) {
    const file = files?.[0];

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecciona una imagen valida para la evidencia.");
      return;
    }

    if (evidencePreviewUrl) URL.revokeObjectURL(evidencePreviewUrl);
    setEvidenceFile(file);
    setEvidencePreviewUrl(URL.createObjectURL(file));
  }

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !drawingRef.current) return;

    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111318";
    context.stroke();
    signedRef.current = true;
    setHasSignature(true);
  }

  function stopSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    signedRef.current = false;
    setHasSignature(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deliveredToName.trim()) {
      alert("Captura quien recibe el material.");
      return;
    }

    if (!deliveryDate) {
      alert("Selecciona la fecha de entrega.");
      return;
    }

    if (!evidenceFile) {
      alert("La foto de evidencia es obligatoria.");
      return;
    }

    if (selectedItems.length === 0) {
      alert("Selecciona al menos un equipo para entregar.");
      return;
    }

    for (const item of selectedItems) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        alert("Todas las cantidades seleccionadas deben ser mayores a cero.");
        return;
      }

      if (item.quantity > item.line.quantity_available + 0.0001) {
        alert(`La cantidad de ${item.line.product_model || item.line.product_name} excede lo disponible.`);
        return;
      }
    }

    if (!hasSignature) {
      const shouldContinue = window.confirm(
        "Se recomienda capturar firma del receptor. Deseas guardar sin firma?"
      );

      if (!shouldContinue) return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSaving(false);
      reportError("leer usuario actual", userError);
      return;
    }

    const pendingEvidencePath = `material-deliveries/${projectId}/pending/evidence-${Date.now()}.${getExtension(
      evidenceFile
    )}`;
    const { data: delivery, error: deliveryError } = await supabase
      .from("project_material_deliveries")
      .insert({
        client_project_id: projectId,
        delivered_to_name: deliveredToName.trim(),
        delivered_to_phone: deliveredToPhone.trim() || null,
        delivered_by_name: deliveredByName.trim() || null,
        delivery_date: deliveryDate,
        notes: notes.trim() || null,
        evidence_photo_url: pendingEvidencePath,
        signature_image_url: null,
        created_by_user_id: user?.id || null,
      })
      .select("id")
      .single();

    if (deliveryError || !delivery) {
      setSaving(false);
      reportError(
        "crear entrega",
        deliveryError || { message: "No se recibio entrega creada" }
      );
      return;
    }

    const timestamp = Date.now();
    const evidencePath = `material-deliveries/${projectId}/${delivery.id}/evidence-${timestamp}.${getExtension(
      evidenceFile
    )}`;
    const { error: evidenceError } = await supabase.storage
      .from("project-photos")
      .upload(evidencePath, evidenceFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (evidenceError) {
      await supabase.from("project_material_deliveries").delete().eq("id", delivery.id);
      setSaving(false);
      reportError("subir foto de evidencia", evidenceError);
      return;
    }

    let signaturePath: string | null = null;
    if (signedRef.current && canvasRef.current) {
      const signatureBlob = dataUrlToBlob(canvasRef.current.toDataURL("image/png"));
      signaturePath = `material-deliveries/${projectId}/${delivery.id}/signature-${timestamp}.png`;
      const { error: signatureError } = await supabase.storage
        .from("project-photos")
        .upload(signaturePath, signatureBlob, {
          cacheControl: "3600",
          contentType: "image/png",
          upsert: false,
        });

      if (signatureError) {
        await supabase.from("project_material_deliveries").delete().eq("id", delivery.id);
        setSaving(false);
        reportError("subir firma", signatureError);
        return;
      }
    }

    const { error: deliveryUpdateError } = await supabase
      .from("project_material_deliveries")
      .update({
        evidence_photo_url: evidencePath,
        signature_image_url: signaturePath,
      })
      .eq("id", delivery.id);

    if (deliveryUpdateError) {
      setSaving(false);
      reportError("actualizar evidencia de entrega", deliveryUpdateError);
      return;
    }

    const itemRows = selectedItems.map((item) => ({
      delivery_id: delivery.id,
      project_purchase_line_id: item.line.id,
      product_brand: item.line.product_brand,
      product_model: item.line.product_model,
      product_name: item.line.product_name,
      quantity_delivered: item.quantity,
    }));
    const { error: itemsError } = await supabase
      .from("project_material_delivery_items")
      .insert(itemRows);

    if (itemsError) {
      setSaving(false);
      reportError("guardar partidas entregadas", itemsError);
      return;
    }

    for (const item of selectedItems) {
      const deliveredAfter =
        Number(item.line.quantity_delivered_previously || 0) + item.quantity;
      const status = getPurchaseDeliveryStatus(
        {
          id: item.line.id,
          quantity_required: item.line.quantity_required,
          quantity_purchased: item.line.quantity_purchased,
          purchase_status: item.line.purchase_status,
        },
        deliveredAfter
      );

      const { error: statusError } = await supabase
        .from("project_purchase_lines")
        .update({
          purchase_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.line.id);

      if (statusError) {
        setSaving(false);
        reportError("actualizar estado de compra", statusError);
        return;
      }
    }

    router.push(`/projects/${projectId}/material-deliveries/${delivery.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Datos de entrega</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Entregado a / recibido por</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={deliveredToName}
              onChange={(event) => setDeliveredToName(event.target.value)}
              placeholder="Nombre del receptor"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Telefono</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={deliveredToPhone}
              onChange={(event) => setDeliveredToPhone(event.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Entregado por</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={deliveredByName}
              onChange={(event) => setDeliveredByName(event.target.value)}
              placeholder="Responsable de bodega / ALFA"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Fecha</span>
            <input
              type="date"
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-[#B3B3B8]">Notas</span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observaciones de entrega, ubicacion o condiciones."
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Equipos disponibles</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Solo se muestran equipos comprados con cantidad pendiente de entrega.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-xs text-[#B3B3B8]">
            {selectedItems.length} seleccionados
          </span>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-[#F4C66A]">
            No hay equipos disponibles para entregar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-3 py-2 font-semibold">Entregar</th>
                  <th className="px-3 py-2 font-semibold">Equipo</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 text-right font-semibold">Comprado</th>
                  <th className="px-3 py-2 text-right font-semibold">Ya entregado</th>
                  <th className="px-3 py-2 text-right font-semibold">Disponible</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const row = selection[line.id] || { selected: false, quantity: "" };

                  return (
                    <tr
                      key={line.id}
                      className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F]"
                    >
                      <td className="px-3 py-2">
                        <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#2A2A30] bg-[#222228]">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={row.selected}
                            onChange={(event) => setLineSelected(line, event.target.checked)}
                          />
                          {row.selected ? <Check size={18} /> : null}
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold">
                          {line.product_brand || "Sin marca"} {line.product_model || ""}
                        </p>
                        <p className="text-xs text-[#B3B3B8]">
                          {line.product_name || "Sin descripcion"}
                        </p>
                        {line.system_name ? (
                          <p className="mt-1 text-[11px] text-[#77777D]">
                            {line.system_name}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full border border-[#2A2A30] bg-[#222228] px-2 py-1 text-xs text-[#B3B3B8]">
                          {line.purchase_status === "in_warehouse"
                            ? "En bodega"
                            : line.purchase_status || "Comprado"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(line.quantity_purchased)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(line.quantity_delivered_previously)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-[#8CE0B6]">
                        {formatNumber(line.quantity_available)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={line.quantity_available}
                          disabled={!row.selected}
                          className="w-28 rounded-lg border border-[#2A2A30] bg-[#222228] px-3 py-2 text-right outline-none disabled:text-[#77777D]"
                          value={row.quantity}
                          onChange={(event) => setLineQuantity(line.id, event.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Foto de evidencia</h2>
              <p className="mt-1 text-sm text-[#B3B3B8]">Obligatoria.</p>
            </div>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white">
              <Camera size={16} />
              Seleccionar foto
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => setEvidence(event.target.files)}
              />
            </label>
          </div>
          {evidencePreviewUrl ? (
            <img
              src={evidencePreviewUrl}
              alt="Preview de evidencia"
              className="h-72 w-full rounded-xl border border-[#2A2A30] object-cover"
            />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-[#2A2A30] text-[#77777D]">
              Sin foto seleccionada
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Firma del receptor</h2>
              <p className="mt-1 text-sm text-[#B3B3B8]">
                Se recomienda capturar firma del receptor.
              </p>
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
            >
              <Eraser size={16} />
              Limpiar
            </button>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-white p-2">
            <canvas
              ref={canvasRef}
              width={900}
              height={320}
              className="h-72 w-full touch-none rounded-lg bg-white"
              onPointerDown={startSignature}
              onPointerMove={drawSignature}
              onPointerUp={stopSignature}
              onPointerCancel={stopSignature}
            />
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#B3B3B8]">
            <PenLine size={16} />
            {hasSignature ? "Firma capturada" : "Sin firma capturada"}
          </p>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving || lines.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
      >
        <Save size={18} />
        {saving ? "Guardando..." : "Guardar entrega"}
      </button>
    </form>
  );
}
