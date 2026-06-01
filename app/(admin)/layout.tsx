import AdminShell from "@/components/AdminShell";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "nuevo");

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
    found: count || 0,
    error: error
      ? {
          code: error.code,
          message: error.message,
        }
      : null,
  });

  return (
    <AdminShell profile={profile} newLeadsCount={count || 0}>
      {children}
    </AdminShell>
  );
}
