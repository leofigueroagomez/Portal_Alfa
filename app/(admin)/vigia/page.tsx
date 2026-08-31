import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentInternalUserProfile } from "@/services/profile";
import {
  getVigiaAuditLogs,
  getVigiaFindings,
  getVigiaOverview,
} from "@/lib/vigia/queries";
import VigiaDashboard from "@/components/vigia/VigiaDashboard";

export const dynamic = "force-dynamic";
// "Investigar a fondo" (B2) corre como server action desde esta pagina:
// playbook + 1 llamada al modelo puede tardar 1-3 min.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "El Vigía | ALFA OS",
  description: "Bandeja de decisión y vigilancia autónoma del negocio en ALFA OS.",
};

export default async function VigiaPage() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) {
    redirect("/portal");
  }

  const [overview, findings, auditLogs] = await Promise.all([
    getVigiaOverview(),
    getVigiaFindings({ status: "todos" }),
    getVigiaAuditLogs(40),
  ]);

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <VigiaDashboard
        overview={overview}
        findings={findings}
        auditLogs={auditLogs}
      />
    </div>
  );
}
