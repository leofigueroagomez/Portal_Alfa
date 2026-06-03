import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import NewProjectDeliveryForm from "./NewProjectDeliveryForm";

type ClientProject = {
  id: number;
  name: string | null;
};

type OperationalItem = {
  system_name: string | null;
};

export default async function NewProjectDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/projects/${id}`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver al proyecto
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Proyecto no encontrado.
        </section>
      </main>
    );
  }

  const projectData = project as ClientProject;
  const { data: operationalItems } = await supabase
    .from("project_operational_items")
    .select("system_name")
    .eq("client_project_id", projectData.id)
    .eq("status", "active");

  const systemOptions = Array.from(
    new Set(
      ((operationalItems || []) as OperationalItem[])
        .map((item) => item.system_name?.trim())
        .filter(Boolean) as string[]
    )
  );

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/deliveries`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a entregas
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
          ENTREGA DE PROYECTO
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Nueva entrega</h1>
        <p className="mt-3 text-[#B3B3B8]">
          {projectData.name || "Proyecto operativo"}
        </p>
      </section>

      <NewProjectDeliveryForm projectId={projectData.id} systemOptions={systemOptions} />
    </main>
  );
}
