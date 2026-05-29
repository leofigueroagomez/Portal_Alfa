import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import ContractorForm, { ContractorInitial } from "../../ContractorForm";

export default async function EditContractorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("id, name, phone, email, specialty, notes, is_active")
    .eq("id", id)
    .maybeSingle();

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

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href={`/contractors/${id}`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver al contratista
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Editar contratista</h1>
        <p className="mt-3 text-[#B3B3B8]">
          {(contractor as ContractorInitial).name || "Contratista"}
        </p>
      </section>

      <ContractorForm mode="edit" initialContractor={contractor as ContractorInitial} />
    </main>
  );
}
