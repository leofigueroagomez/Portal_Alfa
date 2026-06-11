"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { addMonthsToMexicoDate, getMexicoDate } from "@/lib/mexicoDate";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  defaultInstalledSystems: string;
  defaultSupportEmail: string;
  defaultRepresentativeName: string;
};

function today() {
  return getMexicoDate();
}

function addMonths(value: string, months: number) {
  return addMonthsToMexicoDate(value, months);
}

function moneyToNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  alert(`Error en ${step}.${message}`);
}

export default function NewProjectWarrantyForm({
  projectId,
  defaultInstalledSystems,
  defaultSupportEmail,
  defaultRepresentativeName,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [warrantyDate, setWarrantyDate] = useState(today());
  const [installedSystems, setInstalledSystems] = useState(defaultInstalledSystems);
  const [equipmentMonths, setEquipmentMonths] = useState(12);
  const [equipmentStartDate, setEquipmentStartDate] = useState(today());
  const [installationMonths, setInstallationMonths] = useState(12);
  const [installationStartDate, setInstallationStartDate] = useState(today());
  const [maintenanceRequired, setMaintenanceRequired] = useState(true);
  const [maintenanceFrequencyMonths, setMaintenanceFrequencyMonths] = useState(6);
  const [maintenanceCost, setMaintenanceCost] = useState("0");
  const [managementIncludedUntil, setManagementIncludedUntil] = useState(addMonths(today(), 12));
  const [requiresContractAfter, setRequiresContractAfter] = useState(true);
  const [maintenancePolicyActive, setMaintenancePolicyActive] = useState(false);
  const [maintenancePolicyReference, setMaintenancePolicyReference] = useState("");
  const [supportEmail, setSupportEmail] = useState(defaultSupportEmail);
  const [representativeName, setRepresentativeName] = useState(defaultRepresentativeName);

  const equipmentEndDate = useMemo(
    () => addMonths(equipmentStartDate, equipmentMonths),
    [equipmentStartDate, equipmentMonths]
  );
  const installationEndDate = useMemo(
    () => addMonths(installationStartDate, installationMonths),
    [installationStartDate, installationMonths]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!warrantyDate) {
      alert("Selecciona la fecha de la carta.");
      return;
    }

    if (!installedSystems.trim()) {
      alert("Captura los sistemas instalados.");
      return;
    }

    if (!equipmentStartDate || !equipmentEndDate) {
      alert("Completa la garantia de equipos.");
      return;
    }

    if (!installationStartDate || !installationEndDate) {
      alert("Completa la garantia de instalacion.");
      return;
    }

    if (!supportEmail.trim()) {
      alert("Captura el correo de soporte.");
      return;
    }

    if (!representativeName.trim()) {
      alert("Captura el representante ALFA.");
      return;
    }

    if (maintenanceRequired && Number(maintenanceFrequencyMonths || 0) <= 0) {
      alert("Captura la frecuencia de mantenimiento preventivo.");
      return;
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

    const { data: warranty, error } = await supabase
      .from("project_warranties")
      .insert({
        client_project_id: projectId,
        warranty_date: warrantyDate,
        installed_systems: installedSystems.trim(),
        equipment_warranty_months: Number(equipmentMonths || 0),
        equipment_warranty_start_date: equipmentStartDate,
        equipment_warranty_end_date: equipmentEndDate,
        installation_warranty_months: Number(installationMonths || 0),
        installation_warranty_start_date: installationStartDate,
        installation_warranty_end_date: installationEndDate,
        preventive_maintenance_required: maintenanceRequired,
        preventive_maintenance_frequency_months: maintenanceRequired
          ? Number(maintenanceFrequencyMonths || 0)
          : null,
        preventive_maintenance_cost_mxn: maintenanceRequired
          ? moneyToNumber(maintenanceCost)
          : null,
        warranty_management_included_until: managementIncludedUntil || null,
        warranty_management_requires_contract_after: requiresContractAfter,
        maintenance_policy_active: maintenancePolicyActive,
        maintenance_policy_reference: maintenancePolicyReference.trim() || null,
        support_email: supportEmail.trim(),
        alfa_representative_name: representativeName.trim(),
        status: "issued",
        created_by_user_id: user?.id || null,
      })
      .select("id")
      .single();

    if (error || !warranty) {
      setSaving(false);
      reportError("guardar carta de garantia", error);
      return;
    }

    await supabase
      .from("client_projects")
      .update({ sales_stage: "warranty" })
      .eq("id", projectId);

    router.push(`/projects/${projectId}/warranty/${warranty.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Label text="Fecha">
            <input
              type="date"
              value={warrantyDate}
              onChange={(event) => setWarrantyDate(event.target.value)}
              className="field"
              required
            />
          </Label>
          <Label text="Correo soporte">
            <input
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              className="field"
              placeholder="soporte@alfait.com"
              required
            />
          </Label>
          <Label text="Representante ALFA">
            <input
              value={representativeName}
              onChange={(event) => setRepresentativeName(event.target.value)}
              className="field"
              placeholder="Nombre del representante"
              required
            />
          </Label>
        </div>

        <Label text="Sistemas instalados" className="mt-4">
          <textarea
            value={installedSystems}
            onChange={(event) => setInstalledSystems(event.target.value)}
            className="field min-h-32"
            placeholder="Audio, video, automatizacion, red, CCTV..."
            required
          />
        </Label>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <WarrantyBlock
          title="Garantia de Equipos"
          months={equipmentMonths}
          startDate={equipmentStartDate}
          endDate={equipmentEndDate}
          onMonthsChange={setEquipmentMonths}
          onStartDateChange={setEquipmentStartDate}
        />
        <WarrantyBlock
          title="Garantia de Instalacion"
          months={installationMonths}
          startDate={installationStartDate}
          endDate={installationEndDate}
          onMonthsChange={setInstallationMonths}
          onStartDateChange={setInstallationStartDate}
        />
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Requisitos de mantenimiento</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex h-full items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm text-[#B3B3B8]">
            <input
              type="checkbox"
              checked={maintenanceRequired}
              onChange={(event) => setMaintenanceRequired(event.target.checked)}
              className="h-4 w-4 accent-[#9E1B32]"
            />
            Requiere mantenimiento preventivo
          </label>
          <Label text="Frecuencia meses">
            <input
              type="number"
              min="1"
              value={maintenanceFrequencyMonths}
              onChange={(event) => setMaintenanceFrequencyMonths(Number(event.target.value))}
              className="field"
              disabled={!maintenanceRequired}
            />
          </Label>
          <Label text="Costo mantenimiento MXN">
            <input
              type="number"
              min="0"
              step="0.01"
              value={maintenanceCost}
              onChange={(event) => setMaintenanceCost(event.target.value)}
              className="field"
              disabled={!maintenanceRequired}
            />
          </Label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Gestion de garantia</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Label text="Gestion incluida hasta">
            <input
              type="date"
              value={managementIncludedUntil}
              onChange={(event) => setManagementIncludedUntil(event.target.value)}
              className="field"
            />
          </Label>
          <label className="flex h-full items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm text-[#B3B3B8]">
            <input
              type="checkbox"
              checked={requiresContractAfter}
              onChange={(event) => setRequiresContractAfter(event.target.checked)}
              className="h-4 w-4 accent-[#9E1B32]"
            />
            Requiere contrato o poliza posterior
          </label>
          <label className="flex h-full items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm text-[#B3B3B8]">
            <input
              type="checkbox"
              checked={maintenancePolicyActive}
              onChange={(event) => setMaintenancePolicyActive(event.target.checked)}
              className="h-4 w-4 accent-[#9E1B32]"
            />
            Existe poliza de mantenimiento vigente
          </label>
          <Label text="Referencia de poliza">
            <input
              value={maintenancePolicyReference}
              onChange={(event) => setMaintenancePolicyReference(event.target.value)}
              className="field"
              placeholder="Contrato, folio o vigencia"
            />
          </Label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-6 py-3 font-semibold hover:bg-[#B91C3C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {saving ? "Guardando..." : "Guardar carta"}
        </button>
      </div>

      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #2A2A30;
          background: #222228;
          padding: 0.75rem 1rem;
          color: white;
          outline: none;
        }

        .field:focus {
          border-color: #9E1B32;
        }

        .field:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </form>
  );
}

function Label({
  text,
  className = "",
  children,
}: {
  text: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-[#B3B3B8]">{text}</span>
      {children}
    </label>
  );
}

function WarrantyBlock({
  title,
  months,
  startDate,
  endDate,
  onMonthsChange,
  onStartDateChange,
}: {
  title: string;
  months: number;
  startDate: string;
  endDate: string;
  onMonthsChange: (value: number) => void;
  onStartDateChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
      <h2 className="mb-5 text-2xl font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Label text="Meses">
          <input
            type="number"
            min="0"
            value={months}
            onChange={(event) => onMonthsChange(Number(event.target.value))}
            className="field"
            required
          />
        </Label>
        <Label text="Inicio">
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="field"
            required
          />
        </Label>
        <Label text="Fin">
          <input type="date" value={endDate} className="field" readOnly required />
        </Label>
      </div>
    </section>
  );
}
