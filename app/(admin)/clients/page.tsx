import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import DeleteClientButton from "./DeleteClientButton";

type Client = {
  id: number;
  client_number: number | null;
  name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string | null;
};

function formatClientNumber(value: number | null) {
  return value ? String(value).padStart(3, "0") : "Sin número";
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX");
}

export default async function ClientsPage() {
  const supabase = await createSupabaseServerClient();
  // TODO: Replace with role-based visibility for admin/director users.
  const canDeleteClients = true;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, client_number, name, company_name, email, phone, address, created_at")
    .order("client_number", { ascending: true });

  const clientList = (clients || []) as Client[];

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
            ALFA OS
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Clientes
          </h1>
        </div>

        <Link
          href="/clients/new"
          className="bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl px-6 py-3 font-semibold"
        >
          Nuevo cliente
        </Link>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="grid min-w-[1180px] grid-cols-[120px_1.2fr_1.2fr_1.3fr_120px_1.4fr_120px_190px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
          <p>Número</p>
          <p>Cliente</p>
          <p>Empresa</p>
          <p>Email</p>
          <p>Teléfono</p>
          <p>Dirección</p>
          <p>Alta</p>
          <p>Acciones</p>
        </div>

        {clientList.length === 0 ? (
          <div className="p-8 text-[#B3B3B8]">
            No hay clientes registrados.
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A30]">
            {clientList.map((client) => (
              <div
                key={client.id}
                className="grid min-w-[1180px] grid-cols-[120px_1.2fr_1.2fr_1.3fr_120px_1.4fr_120px_190px] items-center gap-4 px-5 py-4 text-sm"
              >
                <Link
                  href={`/clients/${client.id}`}
                  className="font-semibold text-[#9E1B32]"
                >
                  {formatClientNumber(client.client_number)}
                </Link>

                <Link
                  href={`/clients/${client.id}`}
                  className="font-semibold"
                >
                  {client.name || "Sin nombre"}
                </Link>

                <p className="text-[#B3B3B8]">
                  {client.company_name || "Sin empresa"}
                </p>

                <p className="text-[#B3B3B8]">
                  {client.email || "Sin email"}
                </p>

                <p className="text-[#B3B3B8]">
                  {client.phone || "Sin teléfono"}
                </p>

                <p className="text-[#B3B3B8] truncate">
                  {client.address || "Sin dirección"}
                </p>

                <p className="text-[#B3B3B8]">
                  {formatDate(client.created_at)}
                </p>

                <div className="flex gap-2">
                  <Link
                    href={`/clients/${client.id}/edit`}
                    className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl px-4 py-2 text-center font-semibold"
                  >
                    Editar
                  </Link>

                  {canDeleteClients && (
                    <DeleteClientButton clientId={client.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
