"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  ImageOff,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/services/supabase";
import BlindItemForm from "./BlindItemForm";
import { BlindReferenceImageThumbnail } from "./BlindReferenceImage";
import {
  type BlindQuoteDetailResponse,
  type BlindQuoteItem,
  type ClientOption,
  formatM2,
  formatMxn,
  type ProjectOption,
  readApiResponse,
} from "../types";

export default function BlindQuoteEditor({
  quoteId,
  canEdit,
  canDelete,
}: {
  quoteId: number;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [detail, setDetail] = useState<BlindQuoteDetailResponse | null>(null);
  const [client, setClient] = useState<ClientOption | null>(null);
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [editingItem, setEditingItem] = useState<BlindQuoteItem | null>(null);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<number | null>(
    null
  );
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const loadDetail = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
        setError("");
      }

      try {
        const response = await fetch(`/api/quotes/blinds/${quoteId}`, {
          cache: "no-store",
        });
        const payload =
          await readApiResponse<BlindQuoteDetailResponse>(response);
        setDetail(payload);

        const [clientResult, projectResult] = await Promise.all([
          payload.quote.client_id
            ? supabase
                .from("clients")
                .select("id, name")
                .eq("id", payload.quote.client_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          payload.quote.client_project_id
            ? supabase
                .from("client_projects")
                .select("id, client_id, name")
                .eq("id", payload.quote.client_project_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (clientResult.error || projectResult.error) {
          throw new Error("No fue posible cargar el contexto comercial.");
        }
        setClient((clientResult.data || null) as ClientOption | null);
        setProject((projectResult.data || null) as ProjectOption | null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar la cotización."
        );
      } finally {
        setLoading(false);
      }
    },
    [quoteId]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDetail(false), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDetail]);

  const areaGroups = useMemo(() => {
    const groups = new Map<string, BlindQuoteItem[]>();
    for (const item of detail?.items || []) {
      const area = item.area?.trim() || "General";
      groups.set(area, [...(groups.get(area) || []), item]);
    }
    return [...groups.entries()];
  }, [detail?.items]);

  const summary = useMemo(() => {
    const items = detail?.items || [];
    return {
      pieces: items.reduce((total, item) => total + Number(item.quantity || 0), 0),
      m2: items.reduce((total, item) => {
        const calculated =
          Number(item.blind_detail?.calculated_m2_per_unit || 0) *
          Number(item.quantity || 0);
        return (
          total +
          Number(item.blind_detail?.billable_m2_override ?? calculated)
        );
      }, 0),
    };
  }, [detail?.items]);

  async function handleSaved(savedMessage: string, keepOpen: boolean) {
    setMessage(savedMessage);
    setEditingItem(null);
    if (!keepOpen) setShowComposer(false);
    await loadDetail();
  }

  async function handleDelete(item: BlindQuoteItem) {
    setDeletingItemId(item.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/quotes/blinds/${quoteId}/items/${item.id}`,
        { method: "DELETE" }
      );
      await readApiResponse(response);
      setMessage("Partida eliminada correctamente.");
      await loadDetail();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No fue posible eliminar la partida."
      );
    } finally {
      setDeletingItemId(null);
      setPendingDeleteItemId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F6F3] px-5 py-10 text-[#111111] md:px-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="h-8 w-40 animate-pulse bg-black/[0.06]" />
          <div className="mt-8 h-24 max-w-2xl animate-pulse bg-black/[0.06]" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-28 animate-pulse bg-white" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error && !detail) {
    return (
      <main className="min-h-screen bg-[#F7F6F3] px-5 py-10 text-[#111111] md:px-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/quotes/blinds"
            className="inline-flex items-center gap-2 text-sm text-black/50"
          >
            <ArrowLeft size={16} />
            Volver a Persianas
          </Link>
          <section className="mt-8 border border-[#7A1F2B]/20 bg-white p-8">
            <h1 className="text-2xl font-semibold text-[#7A1F2B]">
              No se pudo abrir la cotización
            </h1>
            <p className="mt-3 text-sm text-black/55">{error}</p>
            <button
              type="button"
              onClick={() => void loadDetail(true)}
              className="mt-6 inline-flex items-center gap-2 bg-[#111111] px-5 py-3 text-sm font-semibold text-white"
            >
              <RefreshCw size={16} />
              Reintentar
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (!detail) return null;

  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-8 text-[#111111] md:px-10 xl:px-14 xl:py-12">
      <div className="mx-auto max-w-[1500px]">
        <Link
          href="/quotes/blinds"
          className="inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-[#7A1F2B]"
        >
          <ArrowLeft size={16} />
          Volver a Persianas
        </Link>

        <header className="mt-7 flex flex-col gap-7 border-b border-black/10 pb-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7A1F2B]">
                {detail.quote.quote_number || `Cotización #${quoteId}`}
              </p>
              <span className="rounded-full bg-black/[0.055] px-3 py-1 text-xs font-medium capitalize text-black/55">
                {detail.quote.status || "draft"}
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Cotización de Persianas
            </h1>
            <p className="mt-4 text-sm text-black/50">
              {client?.name || "Sin cliente"} · {project?.name || "Sin proyecto"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/api/quotes/blinds/${quoteId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-black/15 bg-white px-5 text-sm font-semibold text-black/65 transition hover:border-[#7A1F2B]/40 hover:text-[#7A1F2B]"
            >
              <FileText size={18} />
              Imprimir / PDF
            </Link>
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setShowComposer(true);
                  setMessage("");
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#7A1F2B] px-5 text-sm font-semibold text-white transition hover:bg-[#641923]"
              >
                <Plus size={18} />
                Agregar ventana
              </button>
            ) : null}
          </div>
        </header>

        <section className="mt-8 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryMetric label="Piezas" value={String(summary.pieces)} />
          <SummaryMetric label="m² facturables" value={formatM2(summary.m2)} />
          <SummaryMetric
            label="Subtotal"
            value={formatMxn(detail.quote.subtotal_mxn)}
          />
          <SummaryMetric label="IVA 16%" value={formatMxn(detail.quote.iva_mxn)} />
          <SummaryMetric
            label="Total"
            value={formatMxn(detail.quote.total_mxn)}
            emphasis
          />
        </section>

        {message ? (
          <div className="mt-6 flex items-center gap-3 border border-emerald-900/10 bg-emerald-700/[0.06] px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 size={17} />
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 border-l-2 border-[#7A1F2B] bg-[#7A1F2B]/[0.045] px-4 py-3 text-sm text-[#7A1F2B]">
            {error}
          </div>
        ) : null}

        {showComposer || editingItem ? (
          <section className="mt-8">
            <BlindItemForm
              key={editingItem ? `edit-${editingItem.id}` : "create"}
              quoteId={quoteId}
              item={editingItem}
              suggestedArea={areaGroups.at(-1)?.[0]}
              onSaved={handleSaved}
              onImageChanged={async (imageMessage) => {
                setMessage(imageMessage);
                await loadDetail();
              }}
              onCancel={() => {
                setEditingItem(null);
                setShowComposer(false);
              }}
            />
          </section>
        ) : null}

        {detail.items.length === 0 ? (
          <section className="mt-8 flex min-h-80 flex-col items-center justify-center border border-dashed border-black/15 bg-white px-6 text-center">
            <Ruler size={30} className="text-[#7A1F2B]" />
            <h2 className="mt-5 text-2xl font-semibold">Sin ventanas capturadas</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-black/50">
              Agrega la primera ventana. Después podrás seguir capturando en la
              misma ubicación sin cerrar el formulario.
            </p>
            {canEdit && !showComposer ? (
              <button
                type="button"
                onClick={() => setShowComposer(true)}
                className="mt-6 inline-flex items-center gap-2 bg-[#111111] px-5 py-3 text-sm font-semibold text-white"
              >
                <Plus size={17} />
                Agregar primera ventana
              </button>
            ) : null}
          </section>
        ) : (
          <section className="mt-10 space-y-10">
            {areaGroups.map(([area, items]) => (
              <div key={area}>
                <header className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-[#7A1F2B]" />
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.025em]">
                        {area}
                      </h2>
                      <p className="mt-1 text-xs text-black/40">
                        {items.reduce(
                          (total, item) => total + Number(item.quantity || 0),
                          0
                        )}{" "}
                        piezas · {items.length}{" "}
                        {items.length === 1 ? "partida" : "partidas"}
                      </p>
                    </div>
                  </div>
                </header>

                <div className="overflow-hidden border border-black/10 bg-white shadow-sm">
                  <div className="divide-y divide-black/10">
                    {items.map((item) => (
                      <BlindItemRow
                        key={item.id}
                        quoteId={quoteId}
                        item={item}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        deleting={deletingItemId === item.id}
                        deletePending={pendingDeleteItemId === item.id}
                        onEdit={() => {
                          setEditingItem(item);
                          setShowComposer(false);
                          setMessage("");
                          setPendingDeleteItemId(null);
                        }}
                        onRequestDelete={() => setPendingDeleteItemId(item.id)}
                        onCancelDelete={() => setPendingDeleteItemId(null)}
                        onConfirmDelete={() => void handleDelete(item)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {detail.quote.notes ? (
          <section className="mt-10 border-t border-black/10 pt-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/35">
              Notas generales
            </p>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-black/60">
              {detail.quote.notes}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SummaryMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`bg-white p-5 ${emphasis ? "text-[#7A1F2B]" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/35">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.025em]">{value}</p>
    </div>
  );
}

function BlindItemRow({
  quoteId,
  item,
  canEdit,
  canDelete,
  deleting,
  deletePending,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  quoteId: number;
  item: BlindQuoteItem;
  canEdit: boolean;
  canDelete: boolean;
  deleting: boolean;
  deletePending: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const detail = item.blind_detail;
  const calculatedTotal =
    Number(detail?.calculated_m2_per_unit || 0) * Number(item.quantity || 0);
  const billableM2 = Number(detail?.billable_m2_override ?? calculatedTotal);

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <BlindReferenceImageThumbnail
          quoteId={quoteId}
          itemId={item.id}
          hasImage={Boolean(detail?.reference_image_path)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">
              {item.product_model || item.product_name || "Persiana"}
            </h3>
            <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs text-black/50">
              {detail?.blind_type || "Sin tipo"}
            </span>
            {detail?.billable_m2_override ? (
              <span className="rounded-full bg-[#7A1F2B]/[0.08] px-3 py-1 text-xs font-medium text-[#7A1F2B]">
                m² ajustados
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-black/45">
            {item.product_brand || "Sin marca"} · {detail?.collection || "Sin colección"} ·{" "}
            {detail?.color || "Sin color"}
          </p>

          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <ItemDatum
              label="Medida"
              value={`${Number(detail?.width_cm || 0).toLocaleString("es-MX")} × ${Number(
                detail?.height_cm || 0
              ).toLocaleString("es-MX")} cm`}
            />
            <ItemDatum label="Cantidad" value={`${item.quantity} piezas`} />
            <ItemDatum label="m² unitario" value={formatM2(detail?.calculated_m2_per_unit)} />
            <ItemDatum label="m² facturables" value={formatM2(billableM2)} />
            <ItemDatum
              label="Precio m²"
              value={formatMxn(detail?.price_per_m2_mxn)}
            />
            <ItemDatum label="Total" value={formatMxn(item.line_total)} strong />
          </div>

          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-xs text-black/50">
            <span>
              <strong className="text-black/70">Mecanismo:</strong>{" "}
              {detail?.mechanism || "Sin definir"}
            </span>
            <span>
              <strong className="text-black/70">Control:</strong>{" "}
              {detail?.control || "Sin definir"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ImageOff size={13} />
              {detail?.reference_image_path
                ? "Referencia privada registrada"
                : "Sin foto"}
            </span>
          </div>

          {item.customer_visible_note ? (
            <p className="mt-4 border-l-2 border-black/10 pl-3 text-xs leading-5 text-black/55">
              <strong>Nota visible:</strong> {item.customer_visible_note}
            </p>
          ) : null}
          {detail?.internal_notes ? (
            <p className="mt-3 border-l-2 border-[#7A1F2B]/30 bg-[#7A1F2B]/[0.025] px-3 py-2 text-xs leading-5 text-[#7A1F2B]">
              <strong>Sólo ALFA:</strong> {detail.internal_notes}
            </p>
          ) : null}
          {detail?.override_reason ? (
            <p className="mt-2 text-xs leading-5 text-black/45">
              Motivo del ajuste: {detail.override_reason}
            </p>
          ) : null}
        </div>

        {canEdit || canDelete ? (
          <div className="flex shrink-0 gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-10 items-center gap-2 border border-black/10 px-3 text-xs font-semibold text-black/55 transition hover:border-[#7A1F2B]/30 hover:text-[#7A1F2B]"
              >
                <Pencil size={14} />
                Editar
              </button>
            ) : null}
            {canDelete ? (
              deletePending ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    disabled={deleting}
                    className="inline-flex h-10 items-center border border-black/10 px-3 text-xs font-semibold text-black/55 transition hover:border-black/25 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmDelete}
                    disabled={deleting}
                    className="inline-flex h-10 items-center gap-2 bg-[#7A1F2B] px-3 text-xs font-semibold text-white transition hover:bg-[#641923] disabled:opacity-50"
                  >
                    {deleting ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Confirmar eliminación
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onRequestDelete}
                  className="inline-flex h-10 items-center gap-2 border border-[#7A1F2B]/20 px-3 text-xs font-semibold text-[#7A1F2B] transition hover:bg-[#7A1F2B]/[0.05]"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ItemDatum({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-black/35">{label}</p>
      <p className={`mt-1 ${strong ? "font-semibold text-[#7A1F2B]" : ""}`}>
        {value}
      </p>
    </div>
  );
}
