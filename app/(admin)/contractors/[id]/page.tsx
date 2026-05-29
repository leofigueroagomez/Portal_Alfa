import Link from "next/link";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  getContractorBalance,
  getContractorBalanceLabel,
  getContractorMovementLabel,
  getContractorPaymentStatusLabel,
  getSignedContractorMovementAmount,
} from "@/lib/contractors";
import { formatWorkOrderDate, getWorkOrderStatusLabel } from "@/lib/workOrders";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import ContractorMovementForm from "../ContractorMovementForm";

type Contractor = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  notes: string | null;
  is_active: boolean | null;
};

type Movement = {
  id: number;
  movement_date: string | null;
  movement_type: string | null;
  amount_mxn: number | null;
  description: string | null;
  payment_method: string | null;
  reference: string | null;
  work_order_id: number | null;
  client_projects?: { name: string | null } | null;
  work_orders?: { work_order_number: string | null; title: string | null } | null;
};

type WorkOrder = {
  id: number;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  contractor_amount_mxn: number | null;
  contractor_payment_status: string | null;
  scheduled_start: string | null;
  client_projects?: { name: string | null } | null;
};

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const [{ data: contractor, error }, { data: movements }, { data: workOrders }] =
    await Promise.all([
      supabase
        .from("contractors")
        .select("id, name, phone, email, specialty, notes, is_active")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("contractor_account_movements")
        .select(
          "id, movement_date, movement_type, amount_mxn, description, payment_method, reference, work_order_id, client_projects(name), work_orders(work_order_number, title)"
        )
        .eq("contractor_id", id)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("work_orders")
        .select(
          "id, work_order_number, title, status, contractor_amount_mxn, contractor_payment_status, scheduled_start, client_projects(name)"
        )
        .eq("contractor_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (error || !contractor) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href="/contractors" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a contratistas
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Contratista no encontrado.
        </section>
      </main>
    );
  }

  const contractorData = contractor as Contractor;
  const movementList = (movements || []) as unknown as Movement[];
  const workOrderList = (workOrders || []) as unknown as WorkOrder[];
  const balance = getContractorBalance(movementList);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/contractors" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a contratistas
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{contractorData.name}</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {contractorData.specialty || "Contratista"} · {contractorData.phone || "Sin telefono"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/contractors/${id}/statement/print`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
          >
            <FileText size={18} />
            Imprimir estado
          </Link>
          <Link
            href={`/contractors/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            <Pencil size={18} />
            Editar
          </Link>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Saldo actual</p>
          <p className={balance < 0 ? "mt-2 text-2xl font-semibold text-[#F28B82]" : "mt-2 text-2xl font-semibold text-[#8CE0B6]"}>
            {formatCurrency(balance, "MXN")}
          </p>
          <p className="mt-1 text-xs text-[#77777D]">{getContractorBalanceLabel(balance)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Email</p>
          <p className="mt-2 font-semibold">{contractorData.email || "-"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Estado</p>
          <p className="mt-2 font-semibold">{contractorData.is_active ? "Activo" : "Inactivo"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Ordenes asignadas</p>
          <p className="mt-2 text-2xl font-semibold">{workOrderList.length}</p>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ContractorMovementForm contractorId={Number(id)} type="advance_payment" />
        <ContractorMovementForm contractorId={Number(id)} type="adjustment" />
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Movimientos</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Descripcion</th>
                <th className="px-3 py-2">Proyecto / OT</th>
                <th className="px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movementList.map((movement) => {
                const signedAmount = getSignedContractorMovementAmount(
                  movement.movement_type,
                  movement.amount_mxn
                );
                return (
                  <tr key={movement.id} className="border-b border-[#222228]">
                    <td className="px-3 py-2">{formatWorkOrderDate(movement.movement_date)}</td>
                    <td className="px-3 py-2">{getContractorMovementLabel(movement.movement_type)}</td>
                    <td className="px-3 py-2">
                      <p>{movement.description || "-"}</p>
                      <p className="text-xs text-[#77777D]">
                        {[movement.payment_method, movement.reference].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-[#B3B3B8]">
                      {movement.client_projects?.name || "-"}{" "}
                      {movement.work_orders?.work_order_number ? `· ${movement.work_orders.work_order_number}` : ""}
                    </td>
                    <td className={signedAmount < 0 ? "px-3 py-2 text-right font-semibold text-[#F28B82]" : "px-3 py-2 text-right font-semibold text-[#8CE0B6]"}>
                      {formatCurrency(signedAmount, "MXN")}
                    </td>
                  </tr>
                );
              })}
              {movementList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#77777D]">
                    Sin movimientos registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Ordenes de trabajo asignadas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                <th className="px-3 py-2">OT</th>
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Pago</th>
                <th className="px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {workOrderList.map((order) => (
                <tr key={order.id} className="border-b border-[#222228]">
                  <td className="px-3 py-2 font-semibold">
                    {order.work_order_number || `OT-${String(order.id).padStart(4, "0")}`}
                    <p className="text-xs font-normal text-[#77777D]">{order.title || ""}</p>
                  </td>
                  <td className="px-3 py-2 text-[#B3B3B8]">{order.client_projects?.name || "-"}</td>
                  <td className="px-3 py-2">{formatWorkOrderDate(order.scheduled_start)}</td>
                  <td className="px-3 py-2">{getWorkOrderStatusLabel(order.status)}</td>
                  <td className="px-3 py-2">{getContractorPaymentStatusLabel(order.contractor_payment_status)}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatCurrency(order.contractor_amount_mxn, "MXN")}
                  </td>
                </tr>
              ))}
              {workOrderList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[#77777D]">
                    Sin ordenes asignadas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
