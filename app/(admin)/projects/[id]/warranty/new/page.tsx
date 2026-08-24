import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getProjectFinancialSummary } from "@/lib/projectFinancials";
import { calculatePreventiveMaintenanceCost } from "@/lib/projectWarrantyCalculator";
import { getMexicoDate } from "@/lib/mexicoDate";
import NewProjectWarrantyForm from "./NewProjectWarrantyForm";

type ClientProject = {
  id: number;
  name: string | null;
};

type OperationalItem = {
  system_name: string | null;
};

type DeliverySystem = {
  system_name: string | null;
};

export default async function NewProjectWarrantyPage({
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
  const [
    { data: deliveredSystems },
    { data: operationalItems },
    { data: latestDelivery },
    financialSummary,
  ] = await Promise.all([
    supabase
      .from("project_delivery_systems")
      .select("system_name, project_deliveries!inner(client_project_id, status)")
      .eq("project_deliveries.client_project_id", projectData.id)
      .in("project_deliveries.status", ["delivered", "accepted"]),
    supabase
      .from("project_operational_items")
      .select("system_name")
      .eq("client_project_id", projectData.id)
      .eq("status", "active"),
    supabase
      .from("project_deliveries")
      .select("id, delivery_date, client_signer_name, client_signer_email, client_signer_phone")
      .eq("client_project_id", projectData.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProjectFinancialSummary(supabase, projectData.id),
  ]);

  const deliveredSystemNames = Array.from(
    new Set(
      ((deliveredSystems || []) as DeliverySystem[])
        .map((item) => item.system_name?.trim())
        .filter(Boolean) as string[]
    )
  );
  const fallbackSystemNames = Array.from(
    new Set(
      ((operationalItems || []) as OperationalItem[])
        .map((item) => item.system_name?.trim())
        .filter(Boolean) as string[]
    )
  );
  const installedSystems = (deliveredSystemNames.length > 0
    ? deliveredSystemNames
    : fallbackSystemNames
  ).join("\n");

  const suggestedMaintenanceCost = calculatePreventiveMaintenanceCost(
    financialSummary.approvedTotalMxn
  );
  const defaultWarrantyDate = latestDelivery?.delivery_date || getMexicoDate();

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/warranty`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a garantías
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
          CARTA DE GARANTÍA OFICIAL
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Emitir Carta de Garantía</h1>
        <p className="mt-3 text-[#B3B3B8]">
          {projectData.name || "Proyecto operativo"}
        </p>
      </section>

      <NewProjectWarrantyForm
        projectId={projectData.id}
        defaultWarrantyDate={defaultWarrantyDate}
        defaultInstalledSystems={installedSystems}
        defaultMaintenanceCost={suggestedMaintenanceCost}
        defaultSupportEmail={process.env.ALFA_SUPPORT_EMAIL || "soporte@alfait.com"}
        defaultRepresentativeName={process.env.ALFA_REPRESENTATIVE_NAME || "Ingeniería y Operaciones ALFA IT"}
      />
    </main>
  );
}
