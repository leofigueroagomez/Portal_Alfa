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

async function ensureContractorProfile(
  userId: string,
  email: string,
  fullName: string,
  allowInternalConversion: boolean
) {
  const admin = createSupabaseAdminClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, is_internal, user_type")
    .eq("id", userId)
    .maybeSingle();

  const existingRole = String(existingProfile?.role || "");
  const isExistingInternal =
    existingProfile?.is_internal === true || isInternalRole(existingRole);

  if (
    existingProfile &&
    isExistingInternal &&
    existingRole !== "contractor" &&
    existingRole !== "instalador" &&
    !allowInternalConversion
  ) {
    throw new Error(
      "Este correo ya pertenece a un usuario interno de ALFA. Usa otro correo para el Portal de Contratista."
    );
  }

  // Intentar con rol 'contractor' y user_type 'contractor_portal'
  let { error: upsertError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName || email,
    role: "contractor",
    user_type: "contractor_portal",
    is_internal: false,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  // Si la restricción profiles_role_check aún no tiene 'contractor', fallback a 'instalador'
  if (upsertError) {
    console.warn("[ensureContractorProfile] Fallback to 'instalador':", upsertError.message);
    const { error: fallbackError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName || email,
      role: "instalador",
      user_type: "internal",
      is_internal: false,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (fallbackError) throw fallbackError;
  }
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
    let existingUser = await findAuthUserByEmail(email);
    let userId = existingUser?.id;

    if (!existingUser) {
      const appBaseUrl = getAppBaseUrl() || "https://www.alfait.com.mx";
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

      userId = data.user.id;
      invited = true;
    }

    if (userId) {
      await ensureContractorProfile(userId, email, fullName, invited);

      const { error: portalUserError } = await admin
        .from("contractor_portal_users")
        .upsert(
          {
            user_id: userId,
            contractor_id: contractorId,
            is_active: true,
            invited_at: invited ? new Date().toISOString() : null,
            invitation_status: invited ? "sent" : "existing_user",
            invitation_error: null,
          },
          { onConflict: "user_id,contractor_id" }
        );

      if (portalUserError) {
        if (portalUserError.message?.includes("relation") || portalUserError.code === "PGRST205") {
          throw new Error("La tabla 'contractor_portal_users' no existe aún en la base de datos. Por favor ejecuta el script 'sql/20260825_contractor_complete_setup.sql' en Supabase SQL Editor.");
        }
        throw portalUserError;
      }
    }
  } catch (error: any) {
    const errorMsg = error?.message || "Error al invitar al contratista.";
    redirect(
      `/contractors/${contractorId}/portal-users?error=${encodeURIComponent(errorMsg)}`
    );
  }

  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath(`/contractors/${contractorId}/portal-users`);
  redirect(
    `/contractors/${contractorId}/portal-users?success=${encodeURIComponent(
      invited ? "Invitación enviada con éxito." : "Usuario vinculado al contratista."
    )}`
  );
}

export async function resendContractorPortalInvitation(
  contractorId: number,
  formData: FormData
) {
  await assertCanManagePortalUsers();

  const portalUserId = Number(formData.get("portal_user_id"));
  const email = getString(formData.get("email")).toLowerCase();
  const fullName = getString(formData.get("full_name"));

  if (!Number.isFinite(portalUserId) || portalUserId <= 0 || !email) {
    throw new Error("Solicitud inválida.");
  }

  const admin = createSupabaseAdminClient();
  const appBaseUrl = getAppBaseUrl() || "https://www.alfait.com.mx";
  const redirectTo = `${appBaseUrl}/auth/accept-invite`;

  try {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName || email,
        portal: "contractor",
        role: "contractor",
        user_type: "contractor_portal",
        is_internal: false,
      },
      redirectTo,
    });

    if (inviteError) {
      await admin
        .from("contractor_portal_users")
        .update({
          invitation_status: "error",
          invitation_error: inviteError.message,
        })
        .eq("id", portalUserId);

      throw inviteError;
    }

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
      "Invitación reenviada correctamente."
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
    throw new Error("Usuario inválido.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("contractor_portal_users")
    .update({
      is_active: false,
    })
    .eq("id", portalUserId);

  if (error) {
    redirect(
      `/contractors/${contractorId}/portal-users?error=${encodeURIComponent(
        error.message || "No se pudo desactivar el usuario."
      )}`
    );
  }

  revalidatePath(`/contractors/${contractorId}/portal-users`);
  redirect(
    `/contractors/${contractorId}/portal-users?success=${encodeURIComponent(
      "Usuario desactivado correctamente."
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

    if (error) throw new Error(`Error de autenticación: ${error.message}`);
    
    // Usar token_hash directo para proteger el enlace contra prefetches de WhatsApp
    const tokenHash = data.properties.hashed_token;
    const verificationType = data.properties.verification_type || "invite";
    linkUrl = `${appBaseUrl}/auth/accept-invite?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(verificationType)}`;

    await ensureContractorProfile(data.user.id, email, fullName, true);
    
    const { error: upsertErr } = await admin.from("contractor_portal_users").upsert(
      {
        user_id: data.user.id,
        contractor_id: contractorId,
        is_active: true,
        invited_at: new Date().toISOString(),
        invitation_status: "sent",
      },
      { onConflict: "user_id,contractor_id" }
    );

    if (upsertErr) {
      if (upsertErr.message?.includes("relation") || upsertErr.code === "PGRST205") {
        throw new Error("Falta ejecutar la migración SQL en Supabase: 'sql/20260825_contractor_complete_setup.sql'");
      }
      throw upsertErr;
    }
  } else {
    // Existing user: generate recovery link to create/update password
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${appBaseUrl}/auth/accept-invite`,
      },
    });

    if (error) {
      const magic = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${appBaseUrl}/auth/accept-invite` },
      });
      if (magic.error) throw new Error(`Error de autenticación: ${magic.error.message}`);
      const tokenHash = magic.data.properties.hashed_token;
      const verificationType = magic.data.properties.verification_type || "magiclink";
      linkUrl = `${appBaseUrl}/auth/accept-invite?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(verificationType)}`;
    } else {
      const tokenHash = data.properties.hashed_token;
      const verificationType = data.properties.verification_type || "recovery";
      linkUrl = `${appBaseUrl}/auth/accept-invite?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(verificationType)}`;
    }

    await ensureContractorProfile(existing.id, email, fullName, false);
    
    const { error: upsertErr } = await admin.from("contractor_portal_users").upsert(
      {
        user_id: existing.id,
        contractor_id: contractorId,
        is_active: true,
      },
      { onConflict: "user_id,contractor_id" }
    );

    if (upsertErr) {
      if (upsertErr.message?.includes("relation") || upsertErr.code === "PGRST205") {
        throw new Error("Falta ejecutar la migración SQL en Supabase: 'sql/20260825_contractor_complete_setup.sql'");
      }
      throw upsertErr;
    }
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

  revalidatePath(`/contractors/${contractorId}/portal-users`);

  return {
    ok: true,
    actionLink: linkUrl,
    messageText,
    waUrl,
    phone: cleanPhone,
  };
}
