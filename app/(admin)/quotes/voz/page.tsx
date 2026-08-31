import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentInternalUserProfile } from "@/services/profile";
import VoiceDraftPanel from "@/components/quotes/VoiceDraftPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dictar cotización | ALFA OS",
  description: "Dicta un pedido y El asistente arma el borrador de cotización.",
};

export default async function VoiceQuotePage() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) redirect("/portal");
  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <VoiceDraftPanel />
    </div>
  );
}
