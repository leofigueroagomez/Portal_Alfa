import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileText, Plus, ShieldAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";

type ServiceReport = {
  id: number;
  service_number: string | null;
  service_location: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  solution_status: string | null;
  requires_parts: boolean | null;
  labor_sale_mxn: number | null;
  status: string | null;
  payment_status: string | null;
  client_signed_at: string | null;
  clients: { name: string | null } | null;
  client_projects: { name: string | null } | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value + (value.includes("T") ? "" : "T12:00:00")).toLocaleDateString("es-MX");
}

function solutionLabel(status: string | null | undefined) {
  if (status === "solved") return "Solucionado";
  if (status === "not_solved") return "No solucionado";
  return "Pendiente";
}

function statusLabel(status: string | null | undefined) {
  if (status === "completed") return "Finalizado";
  if (status === "in_progress") return "En proceso";
  if (status === "pending") return "Pendiente";
  if (status === "cancelled") return "Cancelado";
  return "Borrador";
}

export default async function ServicesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: reports, error } = await supabase
    .from("service_reports")
    .select(
      "id, service_number, service_location, performed_by_name, service_date, solution_status, requires_parts, labor_sale_mxn, status, payment_status, client_signed_at, clients(name), client_projects(name)"
    )
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false });

  const reportList = (reports || []) as unknown as ServiceReport[];

  // Métricas financieras y de cobranza
  const totalServices = reportList.length;
  const pendingCollectionReports = reportList.filter(
    (r) => r.payment_status === "pending_payment" || (!r.payment_status && r.status === "completed")
  );
  const totalPendingMxn = pendingCollectionReports.reduce((acc, r) => acc + (r.labor_sale_mxn || 0), 0);
  const paidReports = reportList.filter((r) => r.payment_status === "paid");
  const totalPaidMxn = paidReports.reduce((acc, r) => acc + (r.labor_sale_mxn || 0), 0);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Servicios y Cobranza</h1>
          <p className="mt-2 text-[#B3B3B8]">
            Reportes técnicos, firma digital remota y control de cobranza de servicios.
          </p>
        </div>
        <Link
          href="/services/new"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] shadow-lg"
        >
          <Plus size={18} />
          Nuevo servicio
        </Link>
      </section>

      {/* Tarjetas de Métricas de Cobranza */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 shadow-md">
          <span className="text-xs text-[#8E8E93] uppercase font-semibold">Total Servicios</span>
          <p className="mt-2 text-2xl font-bold text-white">{totalServices}</p>
        </div>
        <div className="rounded-2xl border border-[#614620] bg-[#22180C] p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#F4C66A] uppercase font-semibold flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Pendiente de Cobro
            </span>
            <span className="rounded-full bg-[#322514] px-2 py-0.5 text-[11px] font-bold text-[#F4C66A]">
              {pendingCollectionReports.length} servicios
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#FFB4B4]">{formatCurrency(totalPendingMxn, "MXN")}</p>
        </div>
        <div className="rounded-2xl border border-[#1F7A4D]/40 bg-[#12221A] p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8CE0B6] uppercase font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Cobrado / Liquidado
            </span>
            <span className="rounded-full bg-[#143D2A] px-2 py-0.5 text-[11px] font-bold text-[#8CE0B6]">
              {paidReports.length} servicios
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#8CE0B6]">{formatCurrency(totalPaidMxn, "MXN")}</p>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          Ejecuta el SQL de servicios `sql/20260824_service_reports_signature_and_collection.sql` para habilitar esta vista.
        </section>
      ) : reportList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No hay reportes de servicio registrados.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3 font-semibold">Folio</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Proyecto</th>
                  <th className="px-4 py-3 font-semibold">Técnico</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Estado Técnico</th>
                  <th className="px-4 py-3 font-semibold">Cobranza / Pago</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportList.map((report) => {
                  const isPaid = report.payment_status === "paid";
                  const isSigned = Boolean(report.client_signed_at);
                  const isPendingPay = !isPaid && (report.payment_status === "pending_payment" || isSigned || report.status === "completed");

                  return (
                    <tr key={report.id} className="border-b border-[#222228] hover:bg-[#1A1A1F]">
                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        {report.service_number || `SERV-${String(report.id).padStart(4, "0")}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{report.clients?.name || "Sin cliente"}</td>
                      <td className="px-4 py-3 text-[#B3B3B8]">{report.client_projects?.name || "-"}</td>
                      <td className="px-4 py-3 text-[#B3B3B8]">{report.performed_by_name || "-"}</td>
                      <td className="px-4 py-3 text-[#B3B3B8]">{formatDate(report.service_date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{statusLabel(report.status)}</div>
                        <div className="text-xs text-[#77777D]">
                          {solutionLabel(report.solution_status)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${
                            isPaid
                              ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                              : isPendingPay
                                ? "border-[#614620] bg-[#322514] text-[#F4C66A]"
                                : "border-[#2A2A30] bg-[#1C1D22] text-[#B3B3B8]"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 size={12} />
                              Pagado
                            </>
                          ) : isPendingPay ? (
                            <>
                              <AlertTriangle size={12} />
                              Por Cobrar: {formatCurrency(report.labor_sale_mxn || 0, "MXN")}
                            </>
                          ) : (
                            "Sin Firma"
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/services/${report.id}`}
                            className="rounded-lg border border-[#2A2A30] px-3 py-1.5 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                          >
                            Ver / Cobrar
                          </Link>
                          <a
                            href={`/api/services/${report.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#2A2A30] px-2.5 py-1.5 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                            title="Descargar PDF"
                          >
                            <Download size={13} />
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
