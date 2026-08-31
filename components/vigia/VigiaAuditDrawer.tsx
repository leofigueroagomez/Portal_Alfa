"use client";

import { useState } from "react";
import { History, Shield, X, ArrowRight, UserCheck } from "lucide-react";
import type { VigiaAuditRecord } from "@/lib/vigia/queries";

type Props = {
  logs: VigiaAuditRecord[];
  isOpen: boolean;
  onClose: () => void;
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  finding_created: { label: "Hallazgo detectado", color: "text-blue-600 bg-blue-50" },
  finding_recognized: { label: "Reconocido", color: "text-indigo-600 bg-indigo-50" },
  finding_snoozed: { label: "Pospuesto", color: "text-amber-600 bg-amber-50" },
  finding_dismissed: { label: "Descartado con nota", color: "text-rose-600 bg-rose-50" },
  finding_resolved: { label: "Auto-resuelto", color: "text-emerald-600 bg-emerald-50" },
  finding_reopened: { label: "Reabierto", color: "text-orange-600 bg-orange-50" },
  entity_snoozed: { label: "Entidad silenciada", color: "text-purple-600 bg-purple-50" },
  run_completed: { label: "Diagnóstico completado", color: "text-slate-600 bg-slate-50" },
  brief_sent: { label: "Brief enviado", color: "text-slate-600 bg-slate-50" },
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(dateString));
}

export default function VigiaAuditDrawer({ logs, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black/70">
                <History size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#111111]">Bitácora de El Vigía</h2>
                <p className="text-xs text-black/40">Registro inmutable de decisiones y eventos</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-black/40 hover:bg-black/5 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>

          {/* Lista de eventos */}
          <div className="h-[calc(100vh-80px)] overflow-y-auto p-6 space-y-4">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-black/40">
                No hay eventos registrados en la bitácora todavía.
              </div>
            ) : (
              logs.map((log) => {
                const conf = EVENT_LABELS[log.event_type] || {
                  label: log.event_type,
                  color: "text-black/60 bg-black/5",
                };

                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-black/5 bg-[#F7F6F3] p-4 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-[10px] uppercase tracking-wider ${conf.color}`}
                      >
                        {conf.label}
                      </span>
                      <span className="text-[11px] text-black/40">
                        {formatDate(log.created_at)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-medium text-black/80">
                      {log.actor && log.actor !== "vigia" ? (
                        <div className="flex items-center gap-1 text-black/90">
                          <UserCheck size={12} className="text-[#9E1B32]" />
                          <span>Por: {log.actor}</span>
                        </div>
                      ) : null}
                    </div>

                    {log.sensor_id && (
                      <div className="mt-1 text-[11px] font-mono text-[#9E1B32]">
                        Sensor: {log.sensor_id}
                      </div>
                    )}

                    {log.payload && Object.keys(log.payload).length > 0 && (
                      <pre className="mt-2 max-h-24 overflow-auto rounded bg-white p-2 font-mono text-[10px] text-black/70 border border-black/5">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
