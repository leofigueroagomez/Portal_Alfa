import AdminShell from "@/components/AdminShell";
import { redirect } from "next/navigation";
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
