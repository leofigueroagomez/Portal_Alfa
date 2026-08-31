"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellOff,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  ExternalLink,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import type { VigiaFindingRecord } from "@/lib/vigia/queries";
import {
  recognizeFindingAction,
  snoozeFindingAction,
  snoozeEntityAction,
  reactivateFindingAction,
} from "@/app/(admin)/vigia/actions";
import {
  applyFindingAction,
  revertFindingAction,
} from "@/app/(admin)/vigia/execute-actions";
import DismissFindingModal from "./DismissFindingModal";

type Props = {
  finding: VigiaFindingRecord;
  onRefresh?: () => void;
};

const SEVERITY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  critico: {
    label: "Crítico",
    bg: "bg-[#9E1B32]/10",
    text: "text-[#9E1B32]",
    border: "border-[#9E1B32]/20",
  },
  alto: {
    label: "Alto",
    bg: "bg-[#9E1B32]/10",
    text: "text-[#9E1B32]",
    border: "border-[#9E1B32]/20",
  },
  medio: {
    label: "Medio",
    bg: "bg-[#F4C66A]/15",
    text: "text-[#8F6515]",
    border: "border-[#F4C66A]/30",
  },
  bajo: {
    label: "Bajo",
    bg: "bg-black/5",
    text: "text-black/60",
    border: "border-black/10",
  },
  info: {
    label: "Info",
    bg: "bg-black/5",
    text: "text-black/60",
    border: "border-black/10",
  },
};

const LANE_CONFIG: Record<string, { label: string; color: string }> = {
  requiere_autorizacion: {
    label: "Requiere autorización",
    color: "text-[#9E1B32] font-semibold",
  },
  prestar_atencion: {
    label: "Prestar atención",
    color: "text-[#8F6515] font-medium",
  },
  auto_aplicado: {
    label: "Auto-aplicado",
    color: "text-[#1B8053] font-medium",
  },
};

function formatMoney(amount: number | null | undefined) {
  if (amount == null || Math.abs(Number(amount)) === 0) return null;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Math.abs(Number(amount)));
}

function entityHref(finding: VigiaFindingRecord): string | null {
  if (finding.entity_type === "client_project" && finding.entity_id) {
    return `/projects/${finding.entity_id}`;
  }
  if (finding.entity_type === "product" && finding.entity_id) {
    return `/products/${finding.entity_id}`;
  }
  if (finding.entity_type === "quote" && finding.entity_id) {
    return `/quotes/${finding.entity_id}`;
  }
  return null;
}

export default function FindingCard({ finding, onRefresh }: Props) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medio;
  const lane = LANE_CONFIG[finding.lane] || {
    label: finding.lane,
    color: "text-black/70",
  };
  const impactFormatted = formatMoney(finding.impact_mxn);
  const href = entityHref(finding);

  async function handleRecognize() {
    startTransition(async () => {
      await recognizeFindingAction(finding.id);
      onRefresh?.();
    });
  }

  async function handleSnooze(days: number) {
    startTransition(async () => {
      await snoozeFindingAction(finding.id, days);
      onRefresh?.();
    });
  }

  async function handleSnoozeEntity(days: number) {
    if (!finding.entity_type || !finding.entity_id) return;
    startTransition(async () => {
      await snoozeEntityAction(finding.entity_type!, finding.entity_id!, days);
      onRefresh?.();
    });
  }

  async function handleReactivate() {
    startTransition(async () => {
      await reactivateFindingAction(finding.id);
      onRefresh?.();
    });
  }

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  async function handleApplyAction() {
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    startTransition(async () => {
      const res = await applyFindingAction(finding.id);
      if (res.ok) {
        setActionSuccessMsg(res.summary ?? "Corrección aplicada con éxito.");
        onRefresh?.();
      } else {
        setActionErrorMsg(res.error ?? "No se pudo aplicar la corrección.");
      }
    });
  }

  async function handleRevertAction() {
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    startTransition(async () => {
      const res = await revertFindingAction(finding.id);
      if (res.ok) {
        setActionSuccessMsg("Corrección revertida con éxito.");
        onRefresh?.();
      } else {
        setActionErrorMsg(res.error ?? "No se pudo revertir la corrección.");
      }
    });
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:border-black/20 hover:shadow-md">
        {/* Barra superior de identificadores */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#9E1B32]/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#9E1B32]">
              {finding.sensor_id}
            </span>

            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sev.bg} ${sev.text} ${sev.border}`}
            >
              {sev.label}
            </span>

            <span className={`text-xs ${lane.color}`}>
              &bull; {lane.label}
            </span>

            {finding.status === "reconocido" && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                Reconocido
              </span>
            )}
            {finding.status === "pospuesto" && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 border border-amber-200">
                Pospuesto {finding.snooze_until ? `hasta ${new Intl.DateTimeFormat("es-MX", { dateStyle: "short" }).format(new Date(finding.snooze_until))}` : ""}
              </span>
            )}
            {finding.status === "descartado" && (
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/60">
                Descartado
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-black/40">
            {finding.seen_count > 1 && (
              <span>Visto {finding.seen_count} veces</span>
            )}
            <span>
              {new Intl.DateTimeFormat("es-MX", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(finding.last_seen_at))}
            </span>
          </div>
        </div>

        {/* Titulo y Entidad */}
        <div className="mt-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-bold text-[#111111] transition hover:text-[#9E1B32]">
              {href ? (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  {finding.title}
                  <ExternalLink size={14} className="text-black/30" />
                </Link>
              ) : (
                finding.title
              )}
            </h3>

            {impactFormatted && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#F4C66A]/20 px-3 py-1 text-xs font-bold text-[#8F6515]">
                <DollarSign size={13} />
                Impacto ≈ {impactFormatted}
              </span>
            )}
          </div>

          {finding.entity_label && (
            <div className="mt-1 text-xs font-semibold text-[#1B8053]">
              {finding.entity_label}
            </div>
          )}

          <p className="mt-2 text-sm leading-relaxed text-black/70">
            {finding.summary}
          </p>
        </div>

        {/* Mensajes de feedback de la acción de 1 clic */}
        {actionSuccessMsg && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900 flex items-center gap-2">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
        {actionErrorMsg && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900 flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        )}

        {/* Corrección de 1 clic (Sprint B1) */}
        {finding.executor_label ? (
          <div className="mt-4 rounded-xl border border-black/10 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#111111]">
                  <Sparkles size={14} className="text-[#9E1B32]" />
                  <span>{finding.executor_label}</span>
                </div>
                {finding.can_apply ? (
                  <p className="mt-1 text-xs text-black/60">
                    Corrección automática segura y 100% reversible. Guarda respaldo previo.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-black/50 italic">
                    {finding.can_apply_reason || "Corrección automática no disponible para este caso."}
                  </p>
                )}
              </div>

              {finding.can_apply && finding.status !== "resuelto" && (
                <button
                  type="button"
                  onClick={handleApplyAction}
                  disabled={isPending}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#9E1B32] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#7A1F2B] disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Play size={13} fill="currentColor" />
                  )}
                  Autorizar y ejecutar
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Accion Propuesta generica si no hay ejecutor */
          finding.proposed_action && (
            <div className="mt-4 rounded-xl border border-black/5 bg-[#F7F6F3] p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-black/90">
                <Wrench size={13} className="text-[#9E1B32]" />
                <span>Acción sugerida:</span>
                <span className="font-mono text-[11px] text-black/60">
                  {String(finding.proposed_action.type || "revisión")}
                </span>
              </div>
              {Boolean(finding.proposed_action.criterio) ? (
                <p className="mt-1 text-black/60">
                  Criterio: {String(finding.proposed_action.criterio)}
                </p>
              ) : null}
            </div>
          )
        )}

        {/* Nota de decision si existe */}
        {finding.decision_note && (
          <div className="mt-3 rounded-lg border border-black/5 bg-blue-50/50 p-2.5 text-xs text-blue-900">
            <span className="font-semibold">Nota registrada:</span> {finding.decision_note}
            {finding.decided_by && (
              <span className="ml-1 text-blue-700">({finding.decided_by})</span>
            )}
          </div>
        )}

        {/* Evidencia Colapsable */}
        {finding.evidence && Object.keys(finding.evidence).length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="inline-flex items-center gap-1 text-xs font-medium text-black/40 hover:text-black"
            >
              <Info size={12} />
              <span>{showEvidence ? "Ocultar evidencia técnica" : "Ver evidencia técnica"}</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${showEvidence ? "rotate-180" : ""}`}
              />
            </button>

            {showEvidence && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-[#0F0F0F] p-3 font-mono text-[11px] text-white/80">
                {JSON.stringify(finding.evidence, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Revertir correccion si tiene respaldo activo */}
        {finding.has_active_backup && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#1B8053]">
              <Check size={14} />
              <span>Corregido automáticamente &middot; Respaldo disponible</span>
            </div>
            <button
              type="button"
              onClick={handleRevertAction}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              Revertir corrección
            </button>
          </div>
        )}

        {/* Barra de Acciones no destructivas */}
        {finding.status !== "descartado" && finding.status !== "resuelto" && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {finding.status === "pospuesto" ? (
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm transition hover:bg-black/5 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Reactivar ahora
                </button>
              ) : (
                <>
                  {finding.status === "abierto" && (
                    <button
                      type="button"
                      onClick={handleRecognize}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm transition hover:bg-black/5 disabled:opacity-50"
                    >
                      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Reconocer
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSnooze(7)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-black/70 shadow-sm transition hover:bg-black/5 hover:text-black disabled:opacity-50"
                  >
                    <Clock size={12} />
                    Posponer 7d
                  </button>

                  {finding.entity_type === "client_project" && finding.entity_id && (
                    <button
                      type="button"
                      onClick={() => handleSnoozeEntity(14)}
                      disabled={isPending}
                      title="Silencia todos los hallazgos de este proyecto durante 14 días (ej. proyecto en pausa)"
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-black/60 shadow-sm transition hover:bg-black/5 hover:text-black disabled:opacity-50"
                    >
                      <BellOff size={12} />
                      Silenciar proyecto 14d
                    </button>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsDismissModalOpen(true)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-black/50 transition hover:bg-[#9E1B32]/10 hover:text-[#9E1B32] disabled:opacity-50"
            >
              <Trash2 size={12} />
              Descartar
            </button>
          </div>
        )}
      </div>

      <DismissFindingModal
        findingId={finding.id}
        findingTitle={finding.title}
        isOpen={isDismissModalOpen}
        onClose={() => setIsDismissModalOpen(false)}
        onSuccess={() => onRefresh?.()}
      />
    </>
  );
}
