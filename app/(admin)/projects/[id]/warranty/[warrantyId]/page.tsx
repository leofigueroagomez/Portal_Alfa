import Link from "next/link";
import type React from "react";
import { ArrowLeft, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";

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
  return new Date(value).toLocaleDateString("es-MX");
}

function warrantyRange(start: string | null | undefined, end: string | null | undefined) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export default async function ProjectWarrantyDetailPage({
  params,
}: {
  params: Promise<{ id: string; warrantyId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, warrantyId } = await params;

  const { data: warranty, error } = await supabase
    .from("project_warranties")
    .select(
      "id, warranty_date, installed_systems, equipment_warranty_months, equipment_warranty_start_date, equipment_warranty_end_date, installation_warranty_months, installation_warranty_start_date, installation_warranty_end_date, preventive_maintenance_required, preventive_maintenance_frequency_months, preventive_maintenance_cost_mxn, warranty_management_included_until, warranty_management_requires_contract_after, maintenance_policy_active, maintenance_policy_reference, support_email, alfa_representative_name, status"
    )
    .eq("id", warrantyId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !warranty) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/projects/${id}/warranty`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a garantias
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Carta de garantia no encontrada.
        </section>
      </main>
    );
  }

  const warrantyData = warranty as ProjectWarranty;
  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name, client_id")
    .eq("id", id)
    .maybeSingle();
  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const clientData = client as Client | null;

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/warranty`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a garantias
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            {formatDate(warrantyData.warranty_date)}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Carta de garantia</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {clientData?.name || "Sin cliente"} / {projectData?.name || "Sin proyecto"}
          </p>
        </div>
        <Link
          href={`/projects/${id}/warranty/${warrantyId}/print`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <FileText size={18} />
          PDF de garantia
        </Link>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <InfoCard icon={<CalendarDays size={16} />} label="Fecha" value={formatDate(warrantyData.warranty_date)} />
        <InfoCard label="Equipos" value={`${warrantyData.equipment_warranty_months || 0} meses`} />
        <InfoCard label="Instalacion" value={`${warrantyData.installation_warranty_months || 0} meses`} />
        <InfoCard label="Soporte" value={warrantyData.support_email || "Sin correo"} />
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-4 text-2xl font-semibold">Sistemas instalados</h2>
        <p className="whitespace-pre-line leading-relaxed text-[#B3B3B8]">
          {warrantyData.installed_systems || "Sin sistemas registrados."}
        </p>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Garantia de Equipos</h2>
          <p className="text-[#B3B3B8]">
            {warrantyRange(warrantyData.equipment_warranty_start_date, warrantyData.equipment_warranty_end_date)}
          </p>
        </section>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Garantia de Instalacion</h2>
          <p className="text-[#B3B3B8]">
            {warrantyRange(warrantyData.installation_warranty_start_date, warrantyData.installation_warranty_end_date)}
          </p>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Mantenimiento</h2>
          {warrantyData.preventive_maintenance_required ? (
            <div className="space-y-2 text-[#B3B3B8]">
              <p>Frecuencia: cada {warrantyData.preventive_maintenance_frequency_months || 0} meses</p>
              <p>Costo: {formatCurrency(Number(warrantyData.preventive_maintenance_cost_mxn || 0), "MXN")}</p>
            </div>
          ) : (
            <p className="text-[#77777D]">No requerido.</p>
          )}
        </section>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Gestion de garantia</h2>
          <div className="space-y-2 text-[#B3B3B8]">
            <p>Incluida hasta: {formatDate(warrantyData.warranty_management_included_until)}</p>
            {warrantyData.maintenance_policy_active ? (
              <p className="inline-flex items-center gap-2 text-[#8CE0B6]">
                <ShieldCheck size={16} />
                Poliza de mantenimiento vigente.
              </p>
            ) : (
              <p>Requiere contrato despues: {warrantyData.warranty_management_requires_contract_after ? "Si" : "No"}</p>
            )}
            {warrantyData.maintenance_policy_reference ? (
              <p>Referencia: {warrantyData.maintenance_policy_reference}</p>
            ) : null}
          </div>
        </section>
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
