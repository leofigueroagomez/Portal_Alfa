import { normalizeRole, type AlfaRole } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AlfaRole;
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
    const profile = ensuredProfile as Omit<UserProfile, "role"> & {
      role: string | null;
    };
    return {
      ...profile,
      role: normalizeRole(profile.role),
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  const profile = data as Omit<UserProfile, "role"> & { role: string | null };
  return {
    ...profile,
    role: normalizeRole(profile.role),
  };
}
