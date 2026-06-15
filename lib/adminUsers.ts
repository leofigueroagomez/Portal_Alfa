import { NextResponse } from "next/server";
import { canManageUsers, isInternalRole, normalizeRole } from "@/lib/permissions";
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

  if (!profile?.is_active || !profile.is_internal || !canManageUsers(profile.role)) {
    console.error("admin profile authorization failed", {
      userId: profile?.id || null,
      isActive: Boolean(profile?.is_active),
      isInternal: Boolean(profile?.is_internal),
      role: profile?.role || null,
    });

    return {
      profile,
      response: NextResponse.json(
        { error: profile ? "Forbidden" : "Unauthorized" },
        { status: profile ? 403 : 401 }
      ),
    };
  }

  return { profile, response: null };
}

export function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unknown error";
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
        .select("id, email, full_name, role, is_active, user_type, is_internal, created_at")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const profileById = new Map(
    (profiles || []).map((profile) => [profile.id as string, profile])
  );

  return authUsers.flatMap((user) => {
    const profile = profileById.get(user.id);
    const role = normalizeRole(profile?.role);
    const isInternal = Boolean(profile?.is_internal ?? isInternalRole(role));

    if (!isInternal) return [];

    return {
      id: user.id,
      email: profile?.email || user.email || null,
      full_name:
        profile?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        null,
      role: role.toString(),
      is_active: profile?.is_active ?? true,
      auth_created_at: user.created_at || null,
      profile_created_at: profile?.created_at || null,
    };
  });
}
