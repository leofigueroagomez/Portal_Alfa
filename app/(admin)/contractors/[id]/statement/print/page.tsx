import Image from "next/image";
import { formatCurrency } from "@/lib/format";
import {
  getContractorBalance,
  getContractorBalanceLabel,
  getContractorMovementLabel,
  getSignedContractorMovementAmount,
} from "@/lib/contractors";
import { formatWorkOrderDate } from "@/lib/workOrders";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type Movement = {
  id: number;
  movement_date: string | null;
  movement_type: string | null;
  amount_mxn: number | null;
  description: string | null;
  reference: string | null;
  client_projects?: { name: string | null } | null;
  work_orders?: { work_order_number: string | null; title: string | null } | null;
};

export default async function ContractorStatementPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const [{ data: contractor }, { data: movements }] = await Promise.all([
    supabase
      .from("contractors")
      .select("id, name, phone, email, specialty")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("contractor_account_movements")
      .select(
        "id, movement_date, movement_type, amount_mxn, description, reference, client_projects(name), work_orders(work_order_number, title)"
      )
      .eq("contractor_id", id)
      .order("movement_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const movementList = (movements || []) as unknown as Movement[];
  const balance = getContractorBalance(movementList);

  return (
    <main className="min-h-screen bg-white p-8 text-[#111827] print:p-0">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between border-b border-[#D1D5DB] pb-6">
          <div>
            <Image src="/logo-print.png" alt="ALFA" width={140} height={56} className="mb-4 h-auto w-36" />
            <h1 className="text-3xl font-bold">Estado de cuenta de contratista</h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Documento interno de anticipos, trabajos aplicados y saldo.
            </p>
          </div>
          <div className="text-right text-sm text-[#4B5563]">
            <p>Fecha: {new Date().toLocaleDateString("es-MX")}</p>
            <p className="mt-2 font-semibold text-[#111827]">
              Saldo: {formatCurrency(balance, "MXN")}
            </p>
            <p>{getContractorBalanceLabel(balance)}</p>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-[#D1D5DB] p-4 text-sm">
          <div>
            <p className="text-[#6B7280]">Contratista</p>
            <p className="font-semibold">{contractor?.name || "-"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Telefono</p>
            <p className="font-semibold">{contractor?.phone || "-"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Email</p>
            <p className="font-semibold">{contractor?.email || "-"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Especialidad</p>
            <p className="font-semibold">{contractor?.specialty || "-"}</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold">Movimientos</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#F3F4F6] text-left">
                <th className="border border-[#D1D5DB] px-3 py-2">Fecha</th>
                <th className="border border-[#D1D5DB] px-3 py-2">Tipo</th>
                <th className="border border-[#D1D5DB] px-3 py-2">Descripcion</th>
                <th className="border border-[#D1D5DB] px-3 py-2">Proyecto / OT</th>
                <th className="border border-[#D1D5DB] px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movementList.map((movement) => {
                const signedAmount = getSignedContractorMovementAmount(
                  movement.movement_type,
                  movement.amount_mxn
                );
                return (
                  <tr key={movement.id}>
                    <td className="border border-[#D1D5DB] px-3 py-2">{formatWorkOrderDate(movement.movement_date)}</td>
                    <td className="border border-[#D1D5DB] px-3 py-2">{getContractorMovementLabel(movement.movement_type)}</td>
                    <td className="border border-[#D1D5DB] px-3 py-2">
                      {movement.description || "-"}
                      {movement.reference ? <span className="block text-xs text-[#6B7280]">{movement.reference}</span> : null}
                    </td>
                    <td className="border border-[#D1D5DB] px-3 py-2">
                      {movement.client_projects?.name || "-"}
                      {movement.work_orders?.work_order_number ? (
                        <span className="block text-xs text-[#6B7280]">
                          {movement.work_orders.work_order_number} · {movement.work_orders.title || ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="border border-[#D1D5DB] px-3 py-2 text-right font-semibold">
                      {formatCurrency(signedAmount, "MXN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
