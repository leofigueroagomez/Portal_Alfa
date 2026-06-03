import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import PrintAccountStatementButton from "./PrintAccountStatementButton";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Client = {
  name: string | null;
  company_name: string | null;
};

type Quote = {
  id: number;
  quote_number: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  total_mxn: number | null;
  grand_total: number | null;
  exchange_rate: number | null;
};

type ProjectPayment = {
  id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_category: string | null;
  currency: string | null;
  amount: number | null;
  exchange_rate: number | null;
  amount_mxn: number | null;
  notes: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getQuoteExchangeRate(quote: Quote) {
  return Number(quote.exchange_rate || 1);
}

function getQuoteTotalMxn(quote: Quote) {
  return (
    Number(quote.total_mxn) ||
    Number(quote.grand_total) ||
    Number(quote.equipment_total || 0) * getQuoteExchangeRate(quote) +
      Number(quote.labor_total || 0)
  );
}

function getCategoryLabel(category: string | null | undefined) {
  return category === "labor" ? "Mano de obra" : "Equipos";
}

function getPaymentAmountMxn(payment: ProjectPayment) {
  if (payment.amount_mxn != null) return Number(payment.amount_mxn || 0);
  if ((payment.currency || "MXN").toUpperCase() === "USD") {
    return Number(payment.amount || 0) * Number(payment.exchange_rate || 0);
  }
  return Number(payment.amount || 0);
}

export default async function ProjectAccountStatementPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, client_id, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Proyecto no encontrado</h1>
      </main>
    );
  }

  const projectData = project as ClientProject;
  const [{ data: client }, { data: approvedQuotes }, paymentsResult] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("name, company_name")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("quotes")
      .select("id, quote_number, equipment_total, labor_total, total_mxn, grand_total, exchange_rate")
      .eq("client_project_id", projectData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
    supabase
      .from("project_payments")
      .select(
        "id, payment_date, payment_method, payment_reference, payment_category, currency, amount, exchange_rate, amount_mxn, notes"
      )
      .eq("client_project_id", projectData.id)
      .order("payment_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const clientData = client as Client | null;
  const quotes = (approvedQuotes || []) as Quote[];
  const payments = paymentsResult.error ? [] : ((paymentsResult.data || []) as ProjectPayment[]);

  const totalEquipmentUsd = quotes.reduce(
    (sum, quote) => sum + Number(quote.equipment_total || 0),
    0
  );
  const totalLaborMxn = quotes.reduce(
    (sum, quote) => sum + Number(quote.labor_total || 0),
    0
  );
  const equipmentTotalMxn = quotes.reduce(
    (sum, quote) =>
      sum + Number(quote.equipment_total || 0) * getQuoteExchangeRate(quote),
    0
  );
  const projectExchangeRate =
    totalEquipmentUsd > 0
      ? equipmentTotalMxn / totalEquipmentUsd
      : quotes.find((quote) => Number(quote.exchange_rate || 0) > 0)?.exchange_rate || 1;
  const approvedTotalMxn = quotes.reduce(
    (sum, quote) => sum + getQuoteTotalMxn(quote),
    0
  );
  const paidEquipmentMxn = payments
    .filter((payment) => payment.payment_category === "equipment")
    .reduce((sum, payment) => sum + getPaymentAmountMxn(payment), 0);
  const paidEquipmentUsd = payments
    .filter((payment) => payment.payment_category === "equipment")
    .reduce((sum, payment) => {
      if ((payment.currency || "MXN").toUpperCase() === "USD") {
        return sum + Number(payment.amount || 0);
      }

      return sum + Number(payment.amount || 0) / Number(projectExchangeRate || 1);
    }, 0);
  const paidLaborMxn = payments
    .filter((payment) => payment.payment_category === "labor")
    .reduce((sum, payment) => sum + getPaymentAmountMxn(payment), 0);
  const totalPaidMxn = paidEquipmentMxn + paidLaborMxn;
  const pendingEquipmentUsd = Math.max(totalEquipmentUsd - paidEquipmentUsd, 0);
  const pendingLaborMxn = Math.max(totalLaborMxn - paidLaborMxn, 0);
  const pendingTotalMxn = Math.max(approvedTotalMxn - totalPaidMxn, 0);
  let runningPaidMxn = 0;
  const paymentRows = payments.map((payment) => {
    runningPaidMxn += getPaymentAmountMxn(payment);

    return {
      ...payment,
      updatedBalanceMxn: Math.max(approvedTotalMxn - runningPaidMxn, 0),
    };
  });

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page {
          size: letter;
          margin: 12mm;
        }

        .print-root {
          font-family: Arial, Helvetica, sans-serif;
        }

        .summary-box,
        .payment-row,
        .quote-row {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        @media print {
          html,
          body {
            background: white !important;
            font-size: 10px !important;
          }

          body > div > aside,
          body aside,
          body header:not(.quote-print-header),
          nav,
          .admin-sidebar,
          .admin-nav,
          .mobile-admin-header,
          .admin-menu-button,
          .admin-menu-overlay,
          .admin-user-card,
          .no-print,
          .print-actions {
            display: none !important;
          }

          body > div,
          .admin-print-route,
          main {
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

          .statement-table {
            font-size: 9px !important;
          }

          .statement-table thead {
            display: table-header-group;
          }

          .statement-table th,
          .statement-table td {
            padding: 4px 5px !important;
            line-height: 1.25 !important;
          }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[816px] max-w-none items-center justify-between">
        <Link
          href={`/projects/${projectData.id}/account-statement`}
          className="text-xs text-[#5F626A]"
        >
          Volver al estado de cuenta
        </Link>
        <PrintAccountStatementButton />
      </div>

      <article className="document mx-auto w-[816px] min-h-[1056px] max-w-none bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="mb-3 flex h-11 items-center">
              <img
                src="/logo-print.png"
                alt="ALFA OS"
                className="max-h-11 max-w-36"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Estado de cuenta
            </p>
          </div>

          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>Fecha de emision: {formatDate(new Date().toISOString())}</p>
            <p className="mt-2 text-xl font-semibold text-[#111318]">
              {projectData.name || "Proyecto operativo"}
            </p>
          </div>
        </header>

        <section className="summary-box mb-5 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Cliente
            </p>
            <p className="text-base font-semibold">
              {clientData?.name || "Sin cliente"}
            </p>
            <p className="mt-1 text-[#555963]">{clientData?.company_name || ""}</p>
          </div>

          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Resumen
            </p>
            <p>Total proyecto: {formatCurrency(approvedTotalMxn, "MXN")}</p>
            <p>Pagos registrados: {formatCurrency(totalPaidMxn, "MXN")}</p>
            <p>Saldo pendiente actualizado: {formatCurrency(pendingTotalMxn, "MXN")}</p>
          </div>
        </section>

        <section className="summary-box mb-6 grid grid-cols-3 gap-3 text-[11px]">
          <div className="border border-[#E1DDD5] p-3">
            <p className="text-[#555963]">Total equipos USD</p>
            <p className="font-semibold">{formatCurrency(totalEquipmentUsd, "USD")}</p>
          </div>
          <div className="border border-[#E1DDD5] p-3">
            <p className="text-[#555963]">Cobrado equipos USD</p>
            <p className="font-semibold">{formatCurrency(paidEquipmentUsd, "USD")}</p>
          </div>
          <div className="border border-[#E1DDD5] p-3">
            <p className="text-[#555963]">Saldo equipos USD</p>
            <p className="font-semibold">{formatCurrency(pendingEquipmentUsd, "USD")}</p>
          </div>
          <div className="border border-[#E1DDD5] p-3">
            <p className="text-[#555963]">Total mano obra MXN</p>
            <p className="font-semibold">{formatCurrency(totalLaborMxn, "MXN")}</p>
          </div>
          <div className="border border-[#E1DDD5] p-3">
            <p className="text-[#555963]">Cobrado mano obra MXN</p>
            <p className="font-semibold">{formatCurrency(paidLaborMxn, "MXN")}</p>
          </div>
          <div className="border border-[#E1DDD5] p-3">
            <p className="text-[#555963]">Saldo mano obra MXN</p>
            <p className="font-semibold">{formatCurrency(pendingLaborMxn, "MXN")}</p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Conceptos autorizados
          </h2>
          <table className="statement-table w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-[#E1DDD5] bg-[#F7F5F1] text-left text-[#555963]">
                <th className="px-2 py-2">Cotizacion</th>
                <th className="px-2 py-2 text-right">Equipos USD</th>
                <th className="px-2 py-2 text-right">MO MXN</th>
                <th className="px-2 py-2 text-right">TC</th>
                <th className="px-2 py-2 text-right">Total MXN</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="quote-row border-b border-[#EFECE6]">
                  <td className="px-2 py-2">
                    {quote.quote_number || `Cotizacion #${quote.id}`}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatCurrency(quote.equipment_total, "USD")}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatCurrency(quote.labor_total, "MXN")}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatNumber(getQuoteExchangeRate(quote))}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {formatCurrency(getQuoteTotalMxn(quote), "MXN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Pagos registrados
          </h2>
          {payments.length === 0 ? (
            <p className="text-[11px] text-[#555963]">Sin pagos registrados.</p>
          ) : (
            <table className="statement-table w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-[#E1DDD5] bg-[#F7F5F1] text-left text-[#555963]">
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Forma</th>
                  <th className="px-2 py-2">Referencia</th>
                  <th className="px-2 py-2">Categoria</th>
                  <th className="px-2 py-2">Moneda</th>
                  <th className="px-2 py-2 text-right">Monto</th>
                  <th className="px-2 py-2 text-right">TC</th>
                  <th className="px-2 py-2 text-right">MXN</th>
                  <th className="px-2 py-2 text-right">Saldo actualizado</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((payment) => (
                  <tr key={payment.id} className="payment-row border-b border-[#EFECE6]">
                    <td className="px-2 py-2">{formatDate(payment.payment_date)}</td>
                    <td className="px-2 py-2">{payment.payment_method || "-"}</td>
                    <td className="px-2 py-2">{payment.payment_reference || "-"}</td>
                    <td className="px-2 py-2">
                      {getCategoryLabel(payment.payment_category)}
                    </td>
                    <td className="px-2 py-2">{payment.currency || "MXN"}</td>
                    <td className="px-2 py-2 text-right">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {payment.exchange_rate ? formatNumber(payment.exchange_rate) : "-"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {formatCurrency(getPaymentAmountMxn(payment), "MXN")}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">
                      {formatCurrency(payment.updatedBalanceMxn, "MXN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="summary-box mt-6 border-t border-[#D6D1C8] pt-4 text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9E1B32]">
            Saldo pendiente actualizado
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatCurrency(pendingTotalMxn, "MXN")}
          </p>
        </section>
      </article>
    </main>
  );
}
