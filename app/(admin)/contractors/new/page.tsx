import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ContractorForm from "../ContractorForm";

export default function NewContractorPage() {
  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/contractors" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a contratistas
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Nuevo contratista</h1>
        <p className="mt-3 text-[#B3B3B8]">
          Alta de subcontratista para ordenes de trabajo.
        </p>
      </section>

      <ContractorForm mode="new" />
    </main>
  );
}
