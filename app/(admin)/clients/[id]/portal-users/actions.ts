"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getSafeErrorMessage } from "@/lib/adminUsers";
import { canManageUsers } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

async function assertCanManagePortalUsers() {
  const profile = await getCurrentUserProfile();

  if (!profile?.is_active || !canManageUsers(profile.role)) {
    throw new Error("No tienes permisos para administrar usuarios del portal.");
  }
}

function getString(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function getProjectIds(formData: FormData) {
  return formData
    .getAll("project_ids")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

async function findAuthUserByEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw error;

  return (
    data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ||
    null
  );
}

async function invitePortalUser(email: string, fullName: string) {
  const admin = createSupabaseAdminClient();
  const appBaseUrl = getAppBaseUrl();

  if (!appBaseUrl) {
    throw new Error(
      "APP_URL o NEXT_PUBLIC_APP_URL debe estar configurado para enviar invitaciones del portal."
    );
  }

  const redirectTo = `${appBaseUrl}/auth/accept-invite`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName || email,
      portal: "client",
    },
    redirectTo,
  });

  if (error) throw error;
  if (!data.user) throw new Error("No se pudo crear la invitacion.");

  return data.user;
}

async function getOrInvitePortalAuthUser(email: string, fullName: string) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return { user: existing, invited: false };

  const user = await invitePortalUser(email, fullName);
  return { user, invited: true };
}

async function validateClientProjectIds(clientId: number, projectIds: number[]) {
  if (projectIds.length === 0) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("client_projects")
    .select("id")
    .eq("client_id", clientId)
    .in("id", projectIds);

  if (error) throw error;

  return (data || []).map((project) => Number(project.id));
}

export async function createClientPortalUser(clientId: number, formData: FormData) {
  await assertCanManagePortalUsers();

  const email = getString(formData.get("email")).toLowerCase();
  const fullName = getString(formData.get("full_name"));
  const selectedProjectIds = getProjectIds(formData);

  if (!email || !email.includes("@")) {
    throw new Error("Email invalido.");
  }

  const admin = createSupabaseAdminClient();
  const validProjectIds = await validateClientProjectIds(clientId, selectedProjectIds);
  let invited = false;
  let invitationError: string | null = null;

  try {
    const result = await getOrInvitePortalAuthUser(email, fullName);
    invited = result.invited;

    const { data: portalUser, error: portalUserError } = await admin
      .from("client_portal_users")
      .upsert(
        {
          user_id: result.user.id,
          client_id: clientId,
          is_active: true,
          invited_at: invited ? new Date().toISOString() : null,
          invitation_status: invited ? "sent" : "existing_user",
          invitation_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,client_id" }
      )
      .select("id")
      .single();

    if (portalUserError || !portalUser) {
      throw portalUserError || new Error("No se pudo crear acceso de portal.");
    }

    if (validProjectIds.length > 0) {
      const rows = validProjectIds.map((projectId) => ({
        client_portal_user_id: Number(portalUser.id),
        client_project_id: projectId,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));
      const { error: accessError } = await admin
        .from("client_portal_project_access")
        .upsert(rows, {
          onConflict: "client_portal_user_id,client_project_id",
        });

      if (accessError) throw accessError;
    }
  } catch (error) {
    invitationError = getSafeErrorMessage(error);
    throw error;
  } finally {
    if (invitationError) {
      console.error("[client-portal-users] create failed", {
        clientId,
        email,
        invitationError,
      });
    }
  }

  revalidatePath(`/clients/${clientId}/portal-users`);
  redirect(`/clients/${clientId}/portal-users`);
}

export async function deactivateClientPortalUser(clientId: number, formData: FormData) {
  await assertCanManagePortalUsers();

  const portalUserId = Number(formData.get("portal_user_id"));
  if (!portalUserId) throw new Error("Usuario portal invalido.");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("client_portal_users")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", portalUserId)
    .eq("client_id", clientId);

  if (error) throw error;

  await admin
    .from("client_portal_project_access")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("client_portal_user_id", portalUserId);

  revalidatePath(`/clients/${clientId}/portal-users`);
}

export async function assignPortalProjectAccess(clientId: number, formData: FormData) {
  await assertCanManagePortalUsers();

  const portalUserId = Number(formData.get("portal_user_id"));
  const projectId = Number(formData.get("project_id"));

  if (!portalUserId || !projectId) throw new Error("Acceso invalido.");

  const [validProjectId] = await validateClientProjectIds(clientId, [projectId]);
  if (!validProjectId) throw new Error("El proyecto no pertenece al cliente.");

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("client_portal_project_access").upsert(
    {
      client_portal_user_id: portalUserId,
      client_project_id: validProjectId,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_portal_user_id,client_project_id" }
  );

  if (error) throw error;

  revalidatePath(`/clients/${clientId}/portal-users`);
}

export async function revokePortalProjectAccess(clientId: number, formData: FormData) {
  await assertCanManagePortalUsers();

  const portalUserId = Number(formData.get("portal_user_id"));
  const projectId = Number(formData.get("project_id"));

  if (!portalUserId || !projectId) throw new Error("Acceso invalido.");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("client_portal_project_access")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("client_portal_user_id", portalUserId)
    .eq("client_project_id", projectId);

  if (error) throw error;

  revalidatePath(`/clients/${clientId}/portal-users`);
}

export async function resendClientPortalInvitation(clientId: number, formData: FormData) {
  await assertCanManagePortalUsers();

  const portalUserId = Number(formData.get("portal_user_id"));
  const email = getString(formData.get("email")).toLowerCase();
  const fullName = getString(formData.get("full_name"));

  if (!portalUserId || !email) throw new Error("Usuario portal invalido.");

  const admin = createSupabaseAdminClient();
  try {
    await invitePortalUser(email, fullName);
    const { error } = await admin
      .from("client_portal_users")
      .update({
        invited_at: new Date().toISOString(),
        invitation_status: "sent",
        invitation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", portalUserId)
      .eq("client_id", clientId);

    if (error) throw error;
  } catch (error) {
    const message = getSafeErrorMessage(error);
    await admin
      .from("client_portal_users")
      .update({
        invitation_status: "error",
        invitation_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", portalUserId)
      .eq("client_id", clientId);
    throw error;
  }

  revalidatePath(`/clients/${clientId}/portal-users`);
}
