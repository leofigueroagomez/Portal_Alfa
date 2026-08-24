import Link from "next/link";
import type React from "react";
import { ArrowLeft, CalendarDays, Download, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import { addMonthsToMexicoDate } from "@/lib/mexicoDate";
import { getWarrantyDispatchContext } from "./actions";
import WarrantyDispatchPanel from "./WarrantyDispatchPanel";

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
  company_name?: string | null;
};

type ProjectWarranty = {
  id: number;
  warranty_date: string | null;
  installed_systems: string | null;
  equipment_warranty_months: number | null;
  equipment_warranty_start_date: string | null;
  equipment_warranty_end_date: string | null;
  installation_warranty_months: number | null;
  installation_warranty_start_date: string | null;
  installation_warranty_end_date: string | null;
  preventive_maintenance_required: boolean | null;
  preventive_maintenance_frequency_months: number | null;
  preventive_maintenance_cost_mxn: number | null;
  warranty_management_included_until: string | null;
  warranty_management_requires_contract_after: boolean | null;
  maintenance_policy_active: boolean | null;
  maintenance_policy_reference: string | null;
  support_email: string | null;
  alfa_representative_name: string | null;
  status: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value + (value.includes("T") ? "" : "T12:00:00")).toLocaleDateString("es-MX");
}

function warrantyRange(start: string | null | undefined, end: string | null | undefined) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function addMonths(value: string | null | undefined, months: number | null | undefined) {
  if (!value || !months) return null;
  return addMonthsToMexicoDate(value, months);
}

export default async function ProjectWarrantyDetailPage({
  params,
}: {
  params: Promise<{ id: string; warrantyId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, warrantyId } = await params;

  const [
    { data: warranty, error },
    dispatchData,
  ] = await Promise.all([
    supabase
      .from("project_warranties")
      .select(
        "id, warranty_date, installed_systems, equipment_warranty_months, equipment_warranty_start_date, equipment_warranty_end_date, installation_warranty_months, installation_warranty_start_date, installation_warranty_end_date, preventive_maintenance_required, preventive_maintenance_frequency_months, preventive_maintenance_cost_mxn, warranty_management_included_until, warranty_management_requires_contract_after, maintenance_policy_active, maintenance_policy_reference, support_email, alfa_representative_name, status"
      )
      .eq("id", warrantyId)
      .eq("client_project_id", id)
      .maybeSingle(),
    getWarrantyDispatchContext(Number(id), Number(warrantyId)),
  ]);

  if (error || !warranty) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/projects/${id}/warranty`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a garantías
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Carta de garantía no encontrada.
        </section>
      </main>
    );
  }

  const warrantyData = warranty as ProjectWarranty;
  const projectData = dispatchData.project as ClientProject | null;
  const nextMaintenanceDate = addMonths(
    warrantyData.installation_warranty_start_date || warrantyData.warranty_date,
    warrantyData.preventive_maintenance_frequency_months || 6
  );

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/warranty`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a garantías
      </Link>

      <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm tracking-[0.3em] text-[#9E1B32]">
              {formatDate(warrantyData.warranty_date)}
            </p>
            <span
              className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold ${
                warrantyData.status === "issued"
                  ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                  : "border-[#614620] bg-[#322514] text-[#F4C66A]"
              }`}
            >
              {warrantyData.status === "issued" ? "Garantía Emitida" : "Borrador"}
            </span>
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Carta de Garantía Oficial</h1>
          <p className="mt-2 text-[#B3B3B8]">
            {dispatchData.clientName} / {projectData?.name || "Sin proyecto"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={dispatchData.directPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C] shadow-lg"
          >
            <Download size={18} />
            Descargar PDF Oficial
          </a>
        </div>
      </section>

      {/* Módulo de Revisión de Estado de Cuenta y Despacho Multicanal */}
      <div className="mb-8">
        <WarrantyDispatchPanel
          projectId={Number(id)}
          warrantyId={Number(warrantyId)}
          clientName={dispatchData.clientName}
          projectName={projectData?.name || "Proyecto"}
          defaultEmail={dispatchData.recipientEmail}
          defaultPhone={dispatchData.recipientPhone}
          directPdfUrl={dispatchData.directPdfUrl}
          waUrl={dispatchData.waUrl}
          waText={dispatchData.waText}
          financialSummary={dispatchData.financialSummary}
          isIssued={warrantyData.status === "issued"}
        />
      </div>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <InfoCard icon={<CalendarDays size={16} />} label="Fecha de Emisión" value={formatDate(warrantyData.warranty_date)} />
        <InfoCard label="Vigencia de Cobertura" value={`${warrantyData.installation_warranty_months || 12} meses (1 Año)`} />
        <InfoCard label="Mantenimiento Obligatorio" value={`Cada ${warrantyData.preventive_maintenance_frequency_months || 6} meses`} />
        <InfoCard label="Costo Semestral" value={formatCurrency(Number(warrantyData.preventive_maintenance_cost_mxn || 1500), "MXN")} />
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-4 text-2xl font-semibold">Sistemas y Alcances Cubiertos</h2>
        <p className="whitespace-pre-line leading-relaxed text-[#B3B3B8]">
          {warrantyData.installed_systems || "Todos los sistemas instalados conforme a memoria técnica."}
        </p>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Garantía de Equipos (Fabricante)</h2>
          <p className="text-[#B3B3B8]">
            {warrantyRange(warrantyData.equipment_warranty_start_date, warrantyData.equipment_warranty_end_date)}
          </p>
          <p className="mt-2 text-xs text-[#77777D]">
            Gestión y tramitación ante fabricante incluida durante el primer año.
          </p>
        </section>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Garantía de Instalación (ALFA IT)</h2>
          <p className="text-[#B3B3B8]">
            {warrantyRange(warrantyData.installation_warranty_start_date, warrantyData.installation_warranty_end_date)}
          </p>
          <p className="mt-2 text-xs text-[#77777D]">
            Cobertura integral de conexionado, fijación, configuración y calibración.
          </p>
        </section>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-3 text-2xl font-semibold">Condición Obligatoria de Mantenimiento</h2>
        <div className="rounded-xl border border-[#322514] bg-[#221A0F] p-4 text-xs text-[#F4C66A] space-y-2">
          <p className="font-bold text-white">
            Cláusula de Mantenimiento Preventivo Semestral:
          </p>
          <p className="leading-relaxed">
            Para conservar la vigencia de la presente garantía, es condición indispensable realizar el servicio de mantenimiento preventivo cada 6 meses con personal certificado de ALFA IT. La falta o retraso en la realización de dicho mantenimiento cada 6 meses anulará de forma automática e irrevocable la cobertura de garantía de instalación y servicio.
          </p>
          <p className="pt-2 text-white font-semibold">
            Costo pactado: {formatCurrency(Number(warrantyData.preventive_maintenance_cost_mxn || 1500), "MXN")} (+ IVA) • Próximo mantenimiento sugerido: {formatDate(nextMaintenanceDate)}
          </p>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4">
      <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
        {icon}
        {label}
      </p>
      <p className="font-semibold">{value}</p>
    </section>
  );
}
