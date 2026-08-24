"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppBaseUrl } from "@/lib/appUrl";
import { canManageUsers, isInternalRole } from "@/lib/permissions";
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

async function inviteContractorUser(email: string, fullName: string) {
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
      portal: "contractor",
      role: "contractor",
      user_type: "contractor_portal",
      is_internal: false,
    },
    redirectTo,
  });

  if (error) throw error;
  if (!data.user) throw new Error("No se pudo crear la invitación.");

  return data.user;
}

async function getOrInviteContractorAuthUser(email: string, fullName: string) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return { user: existing, invited: false };

  const user = await inviteContractorUser(email, fullName);
  return { user, invited: true };
}

async function ensureContractorProfile(
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

  const existingRole = String(existingProfile?.role || "");
  const isExistingInternal =
    existingProfile?.is_internal === true || isInternalRole(existingRole);

  if (
    existingProfile &&
    isExistingInternal &&
    existingRole !== "contractor" &&
    !allowInternalConversion
  ) {
    throw new Error(
      "Este correo ya pertenece a un usuario interno de ALFA. Usa otro correo para el Portal de Contratista."
    );
  }

  const { error } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName || email,
    role: "contractor",
    user_type: "contractor_portal",
    is_internal: false,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function createContractorPortalUser(contractorId: number, formData: FormData) {
  await assertCanManagePortalUsers();

  const email = getString(formData.get("email")).toLowerCase();
  const fullName = getString(formData.get("full_name"));

  if (!email || !email.includes("@")) {
    throw new Error("Email inválido.");
  }

  const admin = createSupabaseAdminClient();
  let invited = false;

  try {
    const result = await getOrInviteContractorAuthUser(email, fullName);
    invited = result.invited;
    await ensureContractorProfile(result.user.id, email, fullName, result.invited);

    const { data: portalUser, error: portalUserError } = await admin
      .from("contractor_portal_users")
      .upsert(
        {
          user_id: result.user.id,
          contractor_id: contractorId,
          is_active: true,
          invited_at: invited ? new Date().toISOString() : null,
          invitation_status: invited ? "sent" : "existing_user",
          invitation_error: null,
        },
        { onConflict: "user_id,contractor_id" }
      )
      .select("id")
      .single();

    if (portalUserError || !portalUser) {
      throw portalUserError || new Error("No se pudo registrar al usuario del contratista.");
    }
  } catch (error: any) {
    redirect(
      `/contractors/${contractorId}/portal-users?error=${encodeURIComponent(
        error?.message || "No se pudo registrar al usuario."
      )}`
    );
  }

  revalidatePath(`/contractors/${contractorId}/portal-users`);
  revalidatePath(`/contractors/${contractorId}`);
  redirect(
    `/contractors/${contractorId}/portal-users?success=${encodeURIComponent(
      invited
        ? "Invitación enviada exitosamente por correo."
        : "Usuario vinculado al contratista exitosamente."
    )}`
  );
}

export async function resendContractorPortalInvitation(
  contractorId: number,
  formData: FormData
) {
  await assertCanManagePortalUsers();

  const email = getString(formData.get("email")).toLowerCase();
  const fullName = getString(formData.get("full_name"));
  const portalUserId = Number(formData.get("portal_user_id"));

  if (!email || !email.includes("@")) {
    throw new Error("Email inválido.");
  }

  const admin = createSupabaseAdminClient();

  try {
    await inviteContractorUser(email, fullName);
    await admin
      .from("contractor_portal_users")
      .update({
        invited_at: new Date().toISOString(),
        invitation_status: "sent",
        invitation_error: null,
      })
      .eq("id", portalUserId);
  } catch (error: any) {
    redirect(
      `/contractors/${contractorId}/portal-users?error=${encodeURIComponent(
        error?.message || "No se pudo reenviar la invitación."
      )}`
    );
  }

  revalidatePath(`/contractors/${contractorId}/portal-users`);
  redirect(
    `/contractors/${contractorId}/portal-users?success=${encodeURIComponent(
      "Invitación reenviada exitosamente."
    )}`
  );
}

export async function deactivateContractorPortalUser(
  contractorId: number,
  formData: FormData
) {
  await assertCanManagePortalUsers();

  const portalUserId = Number(formData.get("portal_user_id"));
  if (!Number.isFinite(portalUserId) || portalUserId <= 0) {
    throw new Error("Usuario de portal inválido.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("contractor_portal_users")
    .update({ is_active: false })
    .eq("id", portalUserId)
    .eq("contractor_id", contractorId);

  if (error) {
    redirect(
      `/contractors/${contractorId}/portal-users?error=${encodeURIComponent(
        error.message || "No se pudo desactivar el usuario."
      )}`
    );
  }

  revalidatePath(`/contractors/${contractorId}/portal-users`);
  revalidatePath(`/contractors/${contractorId}`);
  redirect(
    `/contractors/${contractorId}/portal-users?success=${encodeURIComponent(
      "Usuario desactivado exitosamente."
    )}`
  );
}

export async function generateContractorWhatsAppLinkAction(
  contractorId: number,
  email: string,
  fullName: string,
  phone?: string
) {
  await assertCanManagePortalUsers();

  const admin = createSupabaseAdminClient();
  const appBaseUrl = getAppBaseUrl() || "https://www.alfait.com.mx";
  const redirectTo = `${appBaseUrl}/auth/accept-invite`;

  let linkUrl = "";
  const existing = await findAuthUserByEmail(email);

  if (!existing) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data: {
          full_name: fullName || email,
          portal: "contractor",
          role: "contractor",
          user_type: "contractor_portal",
          is_internal: false,
        },
      },
    });

    if (error) throw error;
    linkUrl = data.properties.action_link;

    await ensureContractorProfile(data.user.id, email, fullName, true);
    await admin.from("contractor_portal_users").upsert(
      {
        user_id: data.user.id,
        contractor_id: contractorId,
        is_active: true,
        invited_at: new Date().toISOString(),
        invitation_status: "sent",
      },
      { onConflict: "user_id,contractor_id" }
    );
  } else {
    // Existing user: generate magiclink / recovery link
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${appBaseUrl}/portal`,
      },
    });

    if (error) {
      const rec = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${appBaseUrl}/portal` },
      });
      linkUrl = rec.data?.properties?.action_link || `${appBaseUrl}/login`;
    } else {
      linkUrl = data.properties.action_link;
    }

    await ensureContractorProfile(existing.id, email, fullName, false);
    await admin.from("contractor_portal_users").upsert(
      {
        user_id: existing.id,
        contractor_id: contractorId,
        is_active: true,
      },
      { onConflict: "user_id,contractor_id" }
    );
  }

  const cleanPhone = (phone || "").replace(/\D/g, "");
  const techName = fullName || "Técnico";

  const messageText = [
    `👋 *Hola ${techName}, te damos la bienvenida a ALFA OS.*`,
    "",
    "Se ha habilitado tu acceso a la plataforma de gestión técnica de *ALFA IT*.",
    "",
    "📲 *Toca este enlace para acceder a tu cuenta y crear tu contraseña:*",
    linkUrl,
    "",
    "📋 *Desde tu celular podrás:*",
    "• 📍 Ver la dirección de tus servicios y abrir ruta en Google Maps",
    "• 📞 Ver los teléfonos de contacto del cliente en sitio",
    "• 📸 Subir fotos de evidencia y registrar tus soluciones",
    "",
    "¡Gracias por tu trabajo con el equipo de ALFA!",
  ].join("\n");

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  return {
    ok: true,
    actionLink: linkUrl,
    messageText,
    waUrl,
    phone: cleanPhone,
  };
}
