import AdminShell from "@/components/AdminShell";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildMfaChallengeUrl, getAssuranceState } from "@/lib/mfa";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentInternalUserProfile();
  let newLeadsCount = 0;
  let leadsBadgeError: { code?: string; message: string } | null = null;

  if (!profile) {
    redirect("/portal");
  }

  // MFA: solo usuarios con un factor verificado (nextLevel = aal2) deben subir
  // la sesion a AAL2. Sin factores, nextLevel = aal1 y nada cambia.
  const assurance = await getAssuranceState(await createSupabaseServerClient());

  if (assurance.error) {
    console.warn("[admin-layout] mfa assurance lookup failed; not enforcing", {
      error: assurance.error,
    });
  }

  if (assurance.needsChallenge) {
    // Los layouts no reciben pathname; si el proxy expone la ruta original se
    // conserva como destino (saneado), si no se vuelve a /dashboard.
    const requestHeaders = await headers();
    redirect(buildMfaChallengeUrl(requestHeaders.get("x-alfa-pathname")));
  }

  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient();
    const { count, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "nuevo");

    newLeadsCount = count || 0;
    leadsBadgeError = error
      ? {
          code: error.code,
          message: error.message,
        }
      : null;
  } catch (error) {
    leadsBadgeError = {
      message: error instanceof Error ? error.message : "Error cargando leads nuevos.",
    };
  }

  console.info("[admin-layout] leads badge query", {
    table: "leads",
    filters: {
      status: "nuevo",
      user_id: "none",
      owner_id: "none",
      assigned_to: "none",
      archived: "none",
      deleted: "none",
    },
    found: newLeadsCount,
    error: leadsBadgeError,
  });

  return (
    <AdminShell profile={profile} newLeadsCount={newLeadsCount}>
      {children}
    </AdminShell>
  );
}
