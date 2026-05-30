import { NextResponse } from "next/server";
import { canManageUsers, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export type AdminUserPayload = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  auth_created_at: string | null;
  profile_created_at: string | null;
};

export async function requireAdminProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile || !canManageUsers(profile.role)) {
    return {
      profile,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile, response: null };
}

export async function listAdminUsers(): Promise<AdminUserPayload[]> {
  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (authError) throw authError;

  const authUsers = authData.users || [];
  const userIds = authUsers.map((user) => user.id);
  const { data: profiles, error: profilesError } = userIds.length
    ? await admin
        .from("profiles")
        .select("id, email, full_name, role, is_active, created_at")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const profileById = new Map(
    (profiles || []).map((profile) => [profile.id as string, profile])
  );

  return authUsers.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: profile?.email || user.email || null,
      full_name:
        profile?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        null,
      role: normalizeRole(profile?.role).toString(),
      is_active: profile?.is_active ?? true,
      auth_created_at: user.created_at || null,
      profile_created_at: profile?.created_at || null,
    };
  });
}
