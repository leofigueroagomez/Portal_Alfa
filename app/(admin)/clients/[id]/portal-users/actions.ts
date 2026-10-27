"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppBaseUrl } from "@/lib/appUrl";
import { getSafeErrorMessage } from "@/lib/adminUsers";
import {
  getPortalProfileKind,
  isProtectedInternalProfile,
  normalizeEmail,
  parsePositiveId,
} from "@/lib/authzPortal";
import { canManageUsers } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

async function assertCanManagePortalUsers() {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canManageUsers(profile.role)) {
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
      role: "client",
      user_type: "client_portal",
      is_internal: false,
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

async function ensureClientPortalProfile(
  userId: string,
  email: string,
  fullName: string,
  allowInternalConversion: boolean
) {
  const admin = createSupabaseAdminClient();
  const { data: existingProfile, error: existingError } = await admin
    .from("profiles")
    .select("id, role, is_internal, user_type")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  // Solo un usuario recien invitado (perfil creado por el trigger) puede convertirse.
  if (isProtectedInternalProfile(existingProfile) && !allowInternalConversion) {
    throw new Error(
      "Este correo ya pertenece a un usuario interno ALFA. Usa otro correo para el Portal Cliente."
    );
  }

  const { error } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName || email,
    role: "client",
    user_type: "client_portal",
    is_internal: false,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

// Verifica que el usuario portal pertenezca al cliente antes de tocar accesos.
async function getClientPortalMembership(
  clientId: number,
  portalUserId: number,
  options: { requireClientPortalProfile: boolean }
) {
  const admin = createSupabaseAdminClient();
  const { data: portalUser, error } = await admin
    .from("client_portal_users")
    .select("id, user_id, client_id")
    .eq("id", portalUserId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) throw error;
  if (!portalUser?.user_id) {
    throw new Error("El usuario portal no pertenece a este cliente.");
  }

  if (options.requireClientPortalProfile) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, is_internal, user_type")
      .eq("id", portalUser.user_id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (getPortalProfileKind(profile) !== "client") {
      throw new Error("El usuario no es un usuario del Portal Cliente.");
    }
  }

  return { portalUserId: Number(portalUser.id), userId: String(portalUser.user_id) };
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
    await ensureClientPortalProfile(result.user.id, email, fullName, result.invited);

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

  const portalUserId = parsePositiveId(formData.get("portal_user_id"));
  if (!portalUserId) throw new Error("Usuario portal invalido.");

  await getClientPortalMembership(clientId, portalUserId, {
    requireClientPortalProfile: false,
  });

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

  const requestedPortalUserId = parsePositiveId(formData.get("portal_user_id"));
  const projectId = parsePositiveId(formData.get("project_id"));

  if (!requestedPortalUserId || !projectId) throw new Error("Acceso invalido.");

  const [validProjectId] = await validateClientProjectIds(clientId, [projectId]);
  if (!validProjectId) throw new Error("El proyecto no pertenece al cliente.");

  const { portalUserId } = await getClientPortalMembership(
    clientId,
    requestedPortalUserId,
    { requireClientPortalProfile: true }
  );

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

  const requestedPortalUserId = parsePositiveId(formData.get("portal_user_id"));
  const projectId = parsePositiveId(formData.get("project_id"));

  if (!requestedPortalUserId || !projectId) throw new Error("Acceso invalido.");

  const [validProjectId] = await validateClientProjectIds(clientId, [projectId]);
  if (!validProjectId) throw new Error("El proyecto no pertenece al cliente.");

  // Revocar no exige perfil de portal: siempre debe poder retirarse un acceso.
  const { portalUserId } = await getClientPortalMembership(
    clientId,
    requestedPortalUserId,
    { requireClientPortalProfile: false }
  );

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("client_portal_project_access")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("client_portal_user_id", portalUserId)
    .eq("client_project_id", validProjectId);

  if (error) throw error;

  revalidatePath(`/clients/${clientId}/portal-users`);
}

export async function resendClientPortalInvitation(clientId: number, formData: FormData) {
  await assertCanManagePortalUsers();

  const requestedPortalUserId = parsePositiveId(formData.get("portal_user_id"));
  const email = normalizeEmail(getString(formData.get("email")));
  const fullName = getString(formData.get("full_name"));

  if (!requestedPortalUserId || !email) throw new Error("Usuario portal invalido.");

  // Pertenencia y correo real se validan antes de enviar cualquier invitacion.
  const { portalUserId, userId } = await getClientPortalMembership(
    clientId,
    requestedPortalUserId,
    { requireClientPortalProfile: true }
  );

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError) throw authError;

  const authEmail = normalizeEmail(authData.user?.email);
  if (!authEmail || authEmail !== email) {
    throw new Error("El correo no coincide con el usuario portal de este cliente.");
  }

  try {
    await invitePortalUser(authEmail, fullName);
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
