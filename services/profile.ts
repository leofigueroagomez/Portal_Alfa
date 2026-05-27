import { createSupabaseServerClient } from "@/services/supabaseServer";

export type UserProfile = {
  id: string;
  full_name: string | null;
  role: "admin" | "sales" | "engineering";
  is_active: boolean;
};

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: ensuredProfile } = await supabase.rpc(
    "ensure_current_user_profile"
  );

  if (ensuredProfile) {
    return ensuredProfile as UserProfile;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return (data as UserProfile | null) || null;
}
