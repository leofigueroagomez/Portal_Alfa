import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import PrintProjectWarrantyButton from "../../PrintProjectWarrantyButton";

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
  site_address?: string | null;
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
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function systemsList(value: string | null | undefined) {
  return (value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ProjectWarrantyPrintPage({
  params,
}: {
  params: Promise<{ id: string; warrantyId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, warrantyId } = await params;

  const { data: warranty, error } = await supabase
    .from("project_warranties")
    .select(
      "id, warranty_date, installed_systems, equipment_warranty_months, equipment_warranty_start_date, equipment_warranty_end_date, installation_warranty_months, installation_warranty_start_date, installation_warranty_end_date, preventive_maintenance_required, preventive_maintenance_frequency_months, preventive_maintenance_cost_mxn, warranty_management_included_until, warranty_management_requires_contract_after, maintenance_policy_active, maintenance_policy_reference, support_email, alfa_representative_name"
    )
    .eq("id", warrantyId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !warranty) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Carta de garantia no encontrada</h1>
      </main>
    );
  }

  const warrantyData = warranty as ProjectWarranty;
  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name, client_id, site_address")
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
  const installedSystems = systemsList(warrantyData.installed_systems);
  const clientName = clientData?.company_name || clientData?.name || "Cliente";
  const projectName = projectData?.name || "Proyecto";
  const supportEmail = warrantyData.support_email || "soporte@alfait.com";
  const representativeName = warrantyData.alfa_representative_name || "ALFA IT";

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page { size: letter; margin: 12mm; }
        .print-root { font-family: Arial, Helvetica, sans-serif; }
        .letter-section, .signature-block, .summary-box { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          html, body { background: white !important; font-size: 10.5px !important; }
          body > div > aside, body aside, body header:not(.quote-print-header), nav,
          .admin-sidebar, .admin-nav, .mobile-admin-header, .admin-menu-button,
          .admin-menu-overlay, .admin-user-card, .no-print, .print-actions {
            display: none !important;
          }
          body > div, .admin-print-route, main {
            display: block !important;
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
          .document {
            width: 816px !important;
            max-width: none !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .quote-print-logo { max-height: 28px !important; max-width: 112px !important; }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[816px] max-w-none items-center justify-between">
        <Link href={`/projects/${id}/warranty/${warrantyId}`} className="text-xs text-[#5F626A]">
          Volver a garantia
        </Link>
        <PrintProjectWarrantyButton />
      </div>

      <article className="document mx-auto w-[816px] min-h-[1056px] max-w-none bg-white px-12 py-10 shadow-xl">
        <header className="quote-print-header mb-8 flex items-start justify-between border-b border-[#D6D1C8] pb-5">
          <div>
            <div className="mb-4 flex h-11 items-center">
              <img
                src="/logo-print.png"
                alt="ALFA IT"
                className="quote-print-logo max-h-11 max-w-36"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
            Carta de Garantía
            </p>
          </div>
          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>Fecha: {formatDate(warrantyData.warranty_date)}</p>
            <p className="mt-2 text-lg font-semibold text-[#111318]">
              Folio GAR-{String(warrantyData.id).padStart(4, "0")}
            </p>
          </div>
        </header>

        <section className="summary-box mb-7 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Cliente
            </p>
            <p className="text-base font-semibold">{clientName}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Proyecto
            </p>
            <p className="text-base font-semibold">{projectName}</p>
            <p className="mt-1 text-[#555963]">{projectData?.site_address || ""}</p>
          </div>
        </section>

        <section className="mb-7 text-[12px] leading-6 text-[#30343B]">
          <p>
            Por medio de la presente, ALFA IT hace constar las condiciones de garantia
            aplicables al proyecto indicado, conforme a los sistemas instalados,
            alcances ejecutados y fecha de entrega registrada.
          </p>

          <div className="mt-4 border-l-2 border-[#9E1B32] pl-4">
            <p className="mb-2 font-semibold text-[#111318]">Sistemas instalados</p>
            {installedSystems.length === 0 ? (
              <p>Sin sistemas registrados.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                {installedSystems.map((system) => (
                  <li key={system}>- {system}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="letter-section mb-6 text-[12px] leading-6">
          <h2 className="mb-3 border-b border-[#E1DDD5] pb-2 text-[15px] font-semibold">
            1. Garantía de Equipos
          </h2>
          <p>
            Los equipos suministrados por ALFA IT cuentan con una garantia de{" "}
            <strong>{warrantyData.equipment_warranty_months || 0} meses</strong>,
            vigente del <strong>{formatDate(warrantyData.equipment_warranty_start_date)}</strong>{" "}
            al <strong>{formatDate(warrantyData.equipment_warranty_end_date)}</strong>.
            Esta garantia se limita a fallas atribuibles a defectos de fabricacion o
            funcionamiento del equipo, conforme a las condiciones del fabricante.
          </p>
        </section>

        <section className="letter-section mb-6 text-[12px] leading-6">
          <h2 className="mb-3 border-b border-[#E1DDD5] pb-2 text-[15px] font-semibold">
            2. Garantía de Instalación
          </h2>
          <p>
            La instalacion realizada por ALFA IT cuenta con una garantia de{" "}
            <strong>{warrantyData.installation_warranty_months || 0} meses</strong>,
            vigente del <strong>{formatDate(warrantyData.installation_warranty_start_date)}</strong>{" "}
            al <strong>{formatDate(warrantyData.installation_warranty_end_date)}</strong>.
            Esta garantia cubre mano de obra relacionada directamente con la instalacion
            ejecutada, siempre que los equipos y sistemas no hayan sido intervenidos,
            reubicados, modificados o manipulados por terceros.
          </p>

          {warrantyData.preventive_maintenance_required ? (
            <p className="mt-3">
              Para conservar el funcionamiento correcto de los sistemas, se requiere
              mantenimiento preventivo cada{" "}
              <strong>{warrantyData.preventive_maintenance_frequency_months || 0} meses</strong>.
              El costo registrado de mantenimiento es de{" "}
              <strong>{formatMoney(warrantyData.preventive_maintenance_cost_mxn)}</strong>.
            </p>
          ) : (
            <p className="mt-3">
              No se registraron requisitos obligatorios de mantenimiento preventivo
              para esta carta.
            </p>
          )}
        </section>

        <section className="letter-section mb-8 text-[12px] leading-6">
          <h2 className="mb-3 border-b border-[#E1DDD5] pb-2 text-[15px] font-semibold">
            3. Procedimiento de Reclamo
          </h2>
          <p>
            Cualquier solicitud de garantia debera reportarse al correo{" "}
            <strong>{supportEmail}</strong>, indicando cliente, proyecto, descripcion
            de la falla, evidencia fotografica o en video y datos de contacto para
            coordinacion de revision tecnica.
          </p>

          <p className="mt-3">
            La gestión de garantía por parte de ALFA IT estará incluida únicamente
            durante el primer año contado a partir de la fecha de entrega.
          </p>

          {warrantyData.maintenance_policy_active ? (
            <p className="mt-3">
              Al existir una poliza de mantenimiento vigente
              {warrantyData.maintenance_policy_reference
                ? ` (${warrantyData.maintenance_policy_reference})`
                : ""}
              , la gestion de garantia continuara incluida mientras dicha poliza se
              mantenga activa.
            </p>
          ) : (
            <p className="mt-3">
              Al no existir una poliza de mantenimiento vigente, las visitas tecnicas
              y mano de obra requeridas para la gestion posterior al primer año seran
              cobradas conforme a las tarifas vigentes de ALFA IT.
            </p>
          )}
        </section>

        <footer className="signature-block mt-10 grid grid-cols-2 gap-12 text-xs">
          <div>
            <div className="mb-3 h-px bg-[#111318]" />
            <p className="font-semibold">{representativeName}</p>
            <p className="text-[#555963]">Representante ALFA IT</p>
          </div>
          <div>
            <div className="mb-3 h-px bg-[#111318]" />
            <p className="font-semibold">{clientName}</p>
            <p className="text-[#555963]">Cliente</p>
          </div>
        </footer>
      </article>
    </main>
  );
}
