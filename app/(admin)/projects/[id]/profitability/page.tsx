import Link from "next/link";
import { ArrowLeft, FileText, RefreshCcw } from "lucide-react";
import { canViewFinancials } from "@/lib/permissions";
import {
  calculateProjectProfitability,
  getLatestProfitabilityReport,
  getMarginClassification,
} from "@/lib/projectProfitability";
import { formatCurrency, formatNumber } from "@/lib/format";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";
import SendProfitabilityEmailButton from "./SendProfitabilityEmailButton";
import { generateProfitabilityReport } from "./actions";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
  sales_stage: string | null;
};

type Client = {
  name: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX");
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
      <p className="mb-2 text-sm text-[#B3B3B8]">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? "text-[#9E1B32]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

export default async function ProjectProfitabilityPage({
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
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/projects/${id}`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver al proyecto
        </Link>
        <section className="rounded-2xl border border-[#6A2A2A] bg-[#351818] p-8 text-[#FFB4B4]">
          No tienes permisos para ver rentabilidad de proyectos.
        </section>
      </main>
    );
  }

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, client_id, name, sales_stage")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href="/projects" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a proyectos
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Proyecto no encontrado.
        </section>
      </main>
    );
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
  const currentValues = latestReport
    ? {
        totalSoldMxn: Number(latestReport.total_sold_mxn || 0),
        equipmentPurchaseTotalMxn: Number(latestReport.equipment_purchase_total_mxn || 0),
        workOrdersTotalMxn: Number(latestReport.work_orders_total_mxn || 0),
        otherCostsMxn: Number(latestReport.other_costs_mxn || 0),
        operatingProfitMxn: Number(latestReport.operating_profit_mxn || 0),
        operatingMarginPercent: Number(latestReport.operating_margin_percent || 0),
      }
    : snapshot;
  const classification = getMarginClassification(currentValues.operatingMarginPercent);
  const isClosedStage = ["delivered", "warranty"].includes(projectData.sales_stage || "");
  const clientData = client as Client | null;

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href={`/projects/${projectId}`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver al proyecto
      </Link>

      <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            DIRECCION
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Reporte de rentabilidad
          </h1>
          <p className="mt-3 max-w-3xl text-[#B3B3B8]">
            Reporte interno. Nunca debe compartirse con el cliente ni aparecer en documentos externos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/projects/${projectId}/profitability/print`}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
          >
            <FileText size={18} />
            Imprimir reporte
          </Link>
          <SendProfitabilityEmailButton projectId={projectId} disabled={!latestReport} />
        </div>
      </section>

      {isClosedStage && !latestReport ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-5 text-[#F4C66A]">
          Generar reporte de rentabilidad para cerrar el analisis interno del proyecto.
        </section>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total vendido" value={formatCurrency(currentValues.totalSoldMxn, "MXN")} />
        <MetricCard label="Compras de equipos" value={formatCurrency(currentValues.equipmentPurchaseTotalMxn, "MXN")} />
        <MetricCard label="Ordenes de trabajo" value={formatCurrency(currentValues.workOrdersTotalMxn, "MXN")} />
        <MetricCard label="Otros costos" value={formatCurrency(currentValues.otherCostsMxn, "MXN")} />
        <MetricCard label="Utilidad operativa" value={formatCurrency(currentValues.operatingProfitMxn, "MXN")} accent />
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Margen real</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-semibold">{formatNumber(currentValues.operatingMarginPercent)}%</p>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classification.classes}`}>
              {classification.label}
            </span>
          </div>
        </div>
      </section>

      {snapshot.warnings.length > 0 ? (
        <section className="mb-8 space-y-3">
          {snapshot.warnings.map((warning) => (
            <div key={warning} className="rounded-2xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
              {warning}
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_420px]">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-5 text-2xl font-semibold">Datos del reporte</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
              <p className="mb-2 text-sm text-[#B3B3B8]">Cliente</p>
              <p className="font-semibold">{clientData?.name || "Sin cliente"}</p>
            </div>
            <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
              <p className="mb-2 text-sm text-[#B3B3B8]">Proyecto</p>
              <p className="font-semibold">{projectData.name || `Proyecto ${projectId}`}</p>
            </div>
            <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
              <p className="mb-2 text-sm text-[#B3B3B8]">Reporte</p>
              <p className="font-semibold">{latestReport?.report_number || "Sin generar"}</p>
            </div>
            <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
              <p className="mb-2 text-sm text-[#B3B3B8]">Actualizado</p>
              <p className="font-semibold">{formatDateTime(latestReport?.generated_at)}</p>
            </div>
            <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4 md:col-span-2">
              <p className="mb-2 text-sm text-[#B3B3B8]">Correo direccion</p>
              <p className="font-semibold">
                {latestReport?.director_email_status === "sent"
                  ? `Enviado a ${latestReport.director_email_sent_to}`
                  : latestReport?.director_email_error || "Sin enviar"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-5 text-2xl font-semibold">Generar / recalcular</h2>
          <form action={generateProfitabilityReport.bind(null, projectId)} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-[#B3B3B8]">Otros costos MXN</span>
              <input
                name="other_costs_mxn"
                type="number"
                min="0"
                step="0.01"
                defaultValue={currentValues.otherCostsMxn}
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-white outline-none focus:border-[#9E1B32]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[#B3B3B8]">Notas internas</span>
              <textarea
                name="notes"
                defaultValue={latestReport?.notes || ""}
                rows={5}
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-white outline-none focus:border-[#9E1B32]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
            >
              <RefreshCcw size={18} />
              Generar / recalcular reporte
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
