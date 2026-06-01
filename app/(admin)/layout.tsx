import AdminShell from "@/components/AdminShell";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createSupabaseServerClient(),
  ]);
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "nuevo");

  return (
    <AdminShell profile={profile} newLeadsCount={count || 0}>
      {children}
    </AdminShell>
  );
}
