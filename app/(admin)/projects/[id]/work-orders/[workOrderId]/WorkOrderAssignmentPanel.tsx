"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquare, Send, ShieldCheck, UserCheck, Users } from "lucide-react";
import { updateWorkOrderAssignmentAction } from "../actions";
import { formatCurrency } from "@/lib/format";

type ContractorOption = {
  id: number;
  name: string | null;
  phone: string | null;
  specialty: string | null;
};

type Props = {
  projectId: number;
  workOrderId: number;
  workOrderNumber: string;
  workOrderTitle: string;
  projectName: string;
  initialExecutionType: "subcontractor" | "internal_staff" | string;
  initialContractorId: number | null;
  initialAssignedName: string | null;
  initialAssignedPhone: string | null;
  contractorAmountMxn: number;
  contractors: ContractorOption[];
  activitiesSummary: string;
};

export default function WorkOrderAssignmentPanel({
  projectId,
  workOrderId,
  workOrderNumber,
  workOrderTitle,
  projectName,
  initialExecutionType,
  initialContractorId,
  initialAssignedName,
  initialAssignedPhone,
  contractorAmountMxn,
  contractors,
  activitiesSummary,
}: Props) {
  const router = useRouter();
  const [executionType, setExecutionType] = useState<"subcontractor" | "internal_staff">(
    initialExecutionType === "internal_staff" ? "internal_staff" : "subcontractor"
  );
  const [selectedContractorId, setSelectedContractorId] = useState<string>(
    initialContractorId ? String(initialContractorId) : ""
  );
  const [internalTechnicianName, setInternalTechnicianName] = useState<string>(
    initialExecutionType === "internal_staff" ? initialAssignedName || "" : "Técnico Interno ALFA"
  );
  const [internalTechnicianPhone, setInternalTechnicianPhone] = useState<string>(
    initialAssignedPhone || ""
  );
  const [isPending, startTransition] = useTransition();

  const selectedContractor = contractors.find(
    (c) => String(c.id) === selectedContractorId
  );

  function handleSaveAssignment() {
    startTransition(async () => {
      const assignedName =
        executionType === "internal_staff"
          ? internalTechnicianName
          : selectedContractor?.name || null;
      const assignedPhone =
        executionType === "internal_staff"
          ? internalTechnicianPhone
          : selectedContractor?.phone || null;

      const res = await updateWorkOrderAssignmentAction({
        workOrderId,
        projectId,
        executionType,
        contractorId: executionType === "subcontractor" ? Number(selectedContractorId) || null : null,
        assignedToName: assignedName,
        assignedToPhone: assignedPhone,
      });

      if (res.ok) {
        alert("Asignación guardada con éxito.");
        router.refresh();
      } else {
        alert("Error guardando asignación: " + res.error);
      }
    });
  }

  function handleSendWhatsApp() {
    const targetPhone =
      executionType === "internal_staff"
        ? internalTechnicianPhone
        : selectedContractor?.phone;

    if (!targetPhone) {
      alert("Por favor ingresa o selecciona un teléfono con WhatsApp.");
      return;
    }

    const cleanPhone = targetPhone.replace(/\D/g, "");
    const recipientName =
      executionType === "internal_staff"
        ? internalTechnicianName
        : selectedContractor?.name || "Técnico";

    const msg = `*ALFA IT - ASIGNACIÓN DE ORDEN DE TRABAJO* ⚡\n\n` +
      `Hola *${recipientName}*,\n` +
      `Se te ha asignado la siguiente orden de trabajo para el proyecto *${projectName}*:\n\n` +
      `📋 *Folio:* ${workOrderNumber}\n` +
      `🛠️ *Fase:* ${workOrderTitle}\n` +
      `💰 *Monto a liquidar (Tabulador):* ${formatCurrency(
        executionType === "internal_staff" ? 0 : contractorAmountMxn,
        "MXN"
      )}\n\n` +
      `📌 *Alcance y Actividades:* \n${activitiesSummary}\n\n` +
      `Favor de confirmar recepción y coordinar acceso a sitio.`;

    const url = `https://wa.me/${cleanPhone.startsWith("52") ? cleanPhone : `52${cleanPhone}`}?text=${encodeURIComponent(
      msg
    )}`;
    window.open(url, "_blank");
  }

  return (
    <section className="mb-8 rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 sm:p-6 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A30] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E1B32]">
            ASIGNACIÓN OPERATIVA
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            Responsable de Ejecución
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-[#0B0D0F] p-1 rounded-xl border border-[#2A2A30]">
          <button
            type="button"
            onClick={() => setExecutionType("subcontractor")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              executionType === "subcontractor"
                ? "bg-[#9E1B32] text-white shadow-lg"
                : "text-[#8E8E93] hover:text-white"
            }`}
          >
            <Users size={14} />
            Subcontratista Externo
          </button>
          <button
            type="button"
            onClick={() => setExecutionType("internal_staff")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              executionType === "internal_staff"
                ? "bg-[#143D2A] text-[#8CE0B6] shadow-lg border border-[#8CE0B6]/30"
                : "text-[#8E8E93] hover:text-white"
            }`}
          >
            <ShieldCheck size={14} />
            Personal Interno ALFA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {executionType === "subcontractor" ? (
          <div className="space-y-4">
            <label className="block space-y-1 text-xs">
              <span className="text-[#B3B3B8] font-semibold">
                Seleccionar Subcontratista Homologado:
              </span>
              <select
                value={selectedContractorId}
                onChange={(e) => setSelectedContractorId(e.target.value)}
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
              >
                <option value="">Selecciona contratista registrado...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.specialty ? `(${c.specialty})` : ""} - {c.phone || "Sin tel"}
                  </option>
                ))}
              </select>
            </label>

            {selectedContractor && (
              <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-1 text-xs">
                <p className="font-bold text-white">{selectedContractor.name}</p>
                <p className="text-[#8E8E93]">Teléfono: {selectedContractor.phone || "No registrado"}</p>
                <p className="text-[#8E8E93]">Especialidad: {selectedContractor.specialty || "General"}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="block space-y-1">
                <span className="text-[#8CE0B6] font-semibold">
                  Técnico Interno Asignado:
                </span>
                <input
                  type="text"
                  value={internalTechnicianName}
                  onChange={(e) => setInternalTechnicianName(e.target.value)}
                  placeholder="Ej. Juan Pérez (Técnico ALFA)"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#8CE0B6]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8] font-semibold">
                  WhatsApp del Técnico:
                </span>
                <input
                  type="tel"
                  value={internalTechnicianPhone}
                  onChange={(e) => setInternalTechnicianPhone(e.target.value)}
                  placeholder="10 dígitos"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#8CE0B6]"
                />
              </label>
            </div>

            <div className="rounded-xl border border-[#143D2A] bg-[#143D2A]/20 p-3 text-xs text-[#8CE0B6]">
              ✨ <strong>Ejecución Interna:</strong> El costo para subcontratistas es de $0.00 MXN. Todo el monto presupuestado de mano de obra se retiene como margen bruto para la empresa.
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[#2A2A30] bg-black/40 p-4 space-y-3 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#B3B3B8] mb-1">
              <span>Liquidación según Tabulador:</span>
              <span className="text-base font-bold text-[#F4C66A]">
                {formatCurrency(
                  executionType === "internal_staff" ? 0 : contractorAmountMxn,
                  "MXN"
                )}
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Calculado automáticamente con las tarifas oficiales de ALFA IT.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2A2A30]">
            <button
              type="button"
              onClick={handleSaveAssignment}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#9E1B32] px-4 py-2 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg disabled:opacity-50"
            >
              <UserCheck size={14} />
              {isPending ? "Guardando..." : "Guardar Asignación"}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-2 text-xs font-bold text-[#25D366] hover:bg-[#25D366] hover:text-black transition"
            >
              <MessageSquare size={14} />
              Notificar por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
