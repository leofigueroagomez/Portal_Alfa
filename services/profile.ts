import { normalizeRole, isInternalRole, type AlfaRole } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AlfaRole;
  is_active: boolean;
  user_type: string | null;
  is_internal: boolean;
};

type RawUserProfile = Omit<UserProfile, "role" | "is_internal"> & {
  role: string | null;
  is_internal?: boolean | null;
};

function normalizeProfile(profile: RawUserProfile): UserProfile {
  const role = normalizeRole(profile.role);

  return {
    ...profile,
    role,
    user_type: profile.user_type || null,
    is_internal: Boolean(profile.is_internal ?? isInternalRole(role)),
  };
}

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
    return normalizeProfile(ensuredProfile as RawUserProfile);
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, user_type, is_internal")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return normalizeProfile(data as RawUserProfile);
}

export async function getCurrentInternalUserProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile?.is_active || !profile.is_internal || !isInternalRole(profile.role)) {
    return null;
  }

  return profile;
}
