import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import ServiceReportForm, { ServiceClient, ServiceProject } from "../ServiceReportForm";

export default async function NewServicePage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, client_number, name")
      .order("client_number", { ascending: true }),
    supabase
      .from("client_projects")
      .select("id, client_id, project_number, name")
      .order("project_number", { ascending: true }),
  ]);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/services" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a servicios
      </Link>
      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Nuevo servicio</h1>
      </section>
      <ServiceReportForm
        mode="new"
        clients={(clients || []) as ServiceClient[]}
        projects={(projects || []) as ServiceProject[]}
      />
    </main>
  );
}
