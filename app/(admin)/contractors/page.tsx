import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  getContractorBalance,
  getContractorBalanceLabel,
} from "@/lib/contractors";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type Contractor = {
  id: number;
  name: string | null;
  phone: string | null;
  specialty: string | null;
  is_active: boolean | null;
};

type Movement = {
  contractor_id: number;
  movement_type: string | null;
  amount_mxn: number | null;
};

export default async function ContractorsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: contractors, error }, { data: movements }] = await Promise.all([
    supabase
      .from("contractors")
      .select("id, name, phone, specialty, is_active")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("contractor_account_movements")
      .select("contractor_id, movement_type, amount_mxn"),
  ]);

  const movementMap = new Map<number, Movement[]>();
  ((movements || []) as Movement[]).forEach((movement) => {
    const current = movementMap.get(movement.contractor_id) || [];
    movementMap.set(movement.contractor_id, [...current, movement]);
  });

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Contratistas</h1>
          <p className="mt-3 text-[#B3B3B8]">
            Control de subcontratistas, anticipos y trabajos aplicados.
          </p>
        </div>
        <Link
          href="/contractors/new"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nuevo contratista
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar contratistas. Ejecuta el SQL del modulo.
        </section>
      ) : !contractors?.length ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-center text-[#B3B3B8]">
          <Users className="mx-auto mb-3" size={32} />
          No hay contratistas registrados.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Telefono</th>
                  <th className="px-4 py-3">Especialidad</th>
                  <th className="px-4 py-3 text-right">Saldo actual</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {((contractors || []) as Contractor[]).map((contractor) => {
                  const balance = getContractorBalance(
                    movementMap.get(contractor.id) || []
                  );
                  return (
                    <tr key={contractor.id} className="border-b border-[#222228] hover:bg-[#1A1A1F]">
                      <td className="px-4 py-3 font-semibold">{contractor.name}</td>
                      <td className="px-4 py-3 text-[#B3B3B8]">{contractor.phone || "-"}</td>
                      <td className="px-4 py-3 text-[#B3B3B8]">{contractor.specialty || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <p className={balance < 0 ? "font-semibold text-[#F28B82]" : "font-semibold text-[#8CE0B6]"}>
                          {formatCurrency(balance, "MXN")}
                        </p>
                        <p className="text-xs text-[#77777D]">{getContractorBalanceLabel(balance)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-xs text-[#B3B3B8]">
                          {contractor.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/contractors/${contractor.id}`}
                          className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          Ver detalle
                        </Link>
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
