import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canViewFinancials } from "@/lib/permissions";
import {
  calculateProjectProfitability,
  getLatestProfitabilityReport,
  getMarginClassification,
} from "@/lib/projectProfitability";
import { formatCurrency, formatNumber } from "@/lib/format";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Client = {
  name: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX");
}

export default async function ProjectProfitabilityPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentUserProfile();
  const { id } = await params;
  const projectId = Number(id);

  if (!profile?.is_active || !canViewFinancials(profile.role)) {
    return (
      <main className="min-h-screen bg-white p-8 text-black">
        No tienes permisos para ver rentabilidad de proyectos.
      </main>
    );
  }

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, client_id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return <main className="min-h-screen bg-white p-8 text-black">Proyecto no encontrado.</main>;
  }

  const projectData = project as ClientProject;
  const { data: client } = projectData.client_id
    ? await supabase
        .from("clients")
        .select("name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const latestReport = await getLatestProfitabilityReport(supabase, projectId).catch(
    () => null
  );
  const snapshot = await calculateProjectProfitability(
    supabase,
    projectId,
    Number(latestReport?.other_costs_mxn || 0)
  );
  const values = latestReport
    ? {
        totalSoldMxn: Number(latestReport.total_sold_mxn || 0),
        equipmentPurchaseTotalMxn: Number(latestReport.equipment_purchase_total_mxn || 0),
        workOrdersTotalMxn: Number(latestReport.work_orders_total_mxn || 0),
        otherCostsMxn: Number(latestReport.other_costs_mxn || 0),
        operatingProfitMxn: Number(latestReport.operating_profit_mxn || 0),
        operatingMarginPercent: Number(latestReport.operating_margin_percent || 0),
      }
    : snapshot;
  const classification = getMarginClassification(values.operatingMarginPercent);
  const clientData = client as Client | null;

  return (
    <main className="min-h-screen overflow-x-auto bg-[#EDEBE6] p-4 text-[#111318] print:bg-white print:p-0">
      <style>{`
        @page { size: Letter; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .print-sheet { width: 816px !important; margin: 0 auto !important; box-shadow: none !important; }
          body { background: white !important; }
          section, .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="no-print mb-4 flex gap-3">
        <Link href={`/projects/${projectId}/profitability`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold">
          <ArrowLeft size={16} />
          Volver
        </Link>
        <span className="rounded-xl bg-[#111318] px-4 py-2 font-semibold text-white">
          Usa Ctrl/Cmd + P para imprimir
        </span>
      </div>

      <article className="print-sheet mx-auto w-[816px] bg-white p-[44px] shadow-xl">
        <header className="mb-8 border-b border-[#D6D1C8] pb-6">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-[#9E1B32]">
            REPORTE INTERNO DE DIRECCION
          </p>
          <div className="flex items-start justify-between gap-8">
            <div>
              <h1 className="text-3xl font-bold">Rentabilidad del proyecto</h1>
              <p className="mt-2 text-sm text-[#555963]">
                Este documento es confidencial. No compartir con cliente.
              </p>
            </div>
            <div className="text-right text-sm text-[#555963]">
              <p>{latestReport?.report_number || "Sin folio"}</p>
              <p>{formatDateTime(latestReport?.generated_at)}</p>
            </div>
          </div>
        </header>

        <section className="avoid-break mb-8 grid grid-cols-2 gap-4">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#9E1B32]">Cliente</p>
            <p className="text-lg font-semibold">{clientData?.name || "Sin cliente"}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#9E1B32]">Proyecto</p>
            <p className="text-lg font-semibold">{projectData.name || `Proyecto ${projectId}`}</p>
          </div>
        </section>

        <section className="avoid-break mb-8 grid grid-cols-3 gap-4">
          <div className="border border-[#E1DDD5] p-4">
            <p className="text-xs text-[#555963]">Total vendido</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrency(values.totalSoldMxn, "MXN")}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="text-xs text-[#555963]">Utilidad operativa</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrency(values.operatingProfitMxn, "MXN")}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="text-xs text-[#555963]">Margen real</p>
            <p className="mt-2 text-xl font-semibold">{formatNumber(values.operatingMarginPercent)}%</p>
            <p className="mt-1 text-xs">{classification.label}</p>
          </div>
        </section>

        <section className="avoid-break mb-8">
          <h2 className="mb-4 text-xl font-semibold">Formula principal</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border-b border-[#E1DDD5] py-3">Total vendido</td>
                <td className="border-b border-[#E1DDD5] py-3 text-right">{formatCurrency(values.totalSoldMxn, "MXN")}</td>
              </tr>
              <tr>
                <td className="border-b border-[#E1DDD5] py-3">Compra de equipos</td>
                <td className="border-b border-[#E1DDD5] py-3 text-right">- {formatCurrency(values.equipmentPurchaseTotalMxn, "MXN")}</td>
              </tr>
              <tr>
                <td className="border-b border-[#E1DDD5] py-3">Ordenes de trabajo</td>
                <td className="border-b border-[#E1DDD5] py-3 text-right">- {formatCurrency(values.workOrdersTotalMxn, "MXN")}</td>
              </tr>
              <tr>
                <td className="border-b border-[#E1DDD5] py-3">Otros costos</td>
                <td className="border-b border-[#E1DDD5] py-3 text-right">- {formatCurrency(values.otherCostsMxn, "MXN")}</td>
              </tr>
              <tr>
                <td className="py-4 text-base font-semibold">Utilidad operativa</td>
                <td className="py-4 text-right text-base font-semibold">{formatCurrency(values.operatingProfitMxn, "MXN")}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {snapshot.warnings.length > 0 ? (
          <section className="avoid-break border border-[#E1DDD5] bg-[#FAF9F6] p-4">
            <h2 className="mb-3 text-lg font-semibold">Advertencias</h2>
            <ul className="space-y-2 text-sm text-[#555963]">
              {snapshot.warnings.map((warning) => (
                <li key={warning}>- {warning}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
