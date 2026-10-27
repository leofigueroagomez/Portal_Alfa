"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppBaseUrl } from "@/lib/appUrl";
import {
  getPortalProfileKind,
  isPlausibleEmail,
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

function getErrorText(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return typeof error.message === "string" ? error.message : "";
  }
  return "";
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

const internalEmailError =
  "Este correo ya pertenece a un usuario interno de ALFA. Usa otro correo para el Portal de Contratista.";

// Un empleado ALFA (is_internal, user_type internal o rol interno como instalador)
// nunca se convierte a contractor_portal. Se valida antes de emitir cualquier enlace.
async function assertNotInternalProfile(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: existingProfile, error } = await admin
    .from("profiles")
    .select("id, role, is_internal, user_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (isProtectedInternalProfile(existingProfile)) {
    throw new Error(internalEmailError);
  }
}

async function ensureContractorProfile(
  userId: string,
  email: string,
  fullName: string,
  allowInternalConversion: boolean
) {
  const admin = createSupabaseAdminClient();

  // Solo un usuario recien invitado (perfil creado por el trigger) puede convertirse.
  if (!allowInternalConversion) {
    await assertNotInternalProfile(userId);
  }

  const { error: upsertError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName || email,
    role: "contractor",
    user_type: "contractor_portal",
    is_internal: false,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  // Sin fallback a rol interno: si falta 'contractor' en profiles_role_check
  // se corrige con sql/20260825_contractor_complete_setup.sql.
  if (upsertError) {
    console.error("[ensureContractorProfile] upsert failed:", upsertError.message);
    throw new Error(
      "No se pudo crear el perfil de contratista. Verifica que 'sql/20260825_contractor_complete_setup.sql' este aplicado."
    );
  }
}

// Verifica que el usuario portal pertenezca al contratista.
async function getContractorPortalMembership(
  contractorId: number,
  portalUserId: number,
  options: { requireContractorProfile: boolean }
) {
  const admin = createSupabaseAdminClient();
  const { data: portalUser, error } = await admin
    .from("contractor_portal_users")
    .select("id, user_id, contractor_id")
    .eq("id", portalUserId)
    .eq("contractor_id", contractorId)
    .maybeSingle();

  if (error) throw error;
  if (!portalUser?.user_id) {
    throw new Error("El usuario no pertenece a este contratista.");
  }

  if (options.requireContractorProfile) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, is_internal, user_type")
      .eq("id", portalUser.user_id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (getPortalProfileKind(profile) !== "contractor") {
      throw new Error("El usuario no es un usuario del Portal de Contratista.");
    }
  }

  return { portalUserId: Number(portalUser.id), userId: String(portalUser.user_id) };
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
    const existingUser = await findAuthUserByEmail(email);
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
  } catch (error) {
    const errorMsg = getErrorText(error) || "Error al invitar al contratista.";
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

  const requestedPortalUserId = parsePositiveId(formData.get("portal_user_id"));
  const email = normalizeEmail(getString(formData.get("email")));
  const fullName = getString(formData.get("full_name"));

  if (!requestedPortalUserId || !email) {
    throw new Error("Solicitud inválida.");
  }

  const admin = createSupabaseAdminClient();
  const appBaseUrl = getAppBaseUrl() || "https://www.alfait.com.mx";
  const redirectTo = `${appBaseUrl}/auth/accept-invite`;

  try {
    // Pertenencia y correo real se validan antes de enviar la invitacion.
    const { portalUserId, userId } = await getContractorPortalMembership(
      contractorId,
      requestedPortalUserId,
      { requireContractorProfile: true }
    );
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError) throw authError;

    const authEmail = normalizeEmail(authData.user?.email);
    if (!authEmail || authEmail !== email) {
      throw new Error("El correo no coincide con el usuario de este contratista.");
    }

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(authEmail, {
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
        .eq("id", portalUserId)
        .eq("contractor_id", contractorId);

      throw inviteError;
    }

    await admin
      .from("contractor_portal_users")
      .update({
        invited_at: new Date().toISOString(),
        invitation_status: "sent",
        invitation_error: null,
      })
      .eq("id", portalUserId)
      .eq("contractor_id", contractorId);
  } catch (error) {
    redirect(
      `/contractors/${contractorId}/portal-users?error=${encodeURIComponent(
        getErrorText(error) || "No se pudo reenviar la invitación."
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

  const portalUserId = parsePositiveId(formData.get("portal_user_id"));
  if (!portalUserId) {
    throw new Error("Usuario inválido.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("contractor_portal_users")
    .update({
      is_active: false,
    })
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
  redirect(
    `/contractors/${contractorId}/portal-users?success=${encodeURIComponent(
      "Usuario desactivado correctamente."
    )}`
  );
}

export async function generateContractorWhatsAppLinkAction(
  contractorId: number,
  rawEmail: string,
  fullName: string,
  phone?: string
) {
  await assertCanManagePortalUsers();

  const email = normalizeEmail(rawEmail);
  if (!parsePositiveId(contractorId) || !isPlausibleEmail(email)) {
    throw new Error("Solicitud inválida.");
  }

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
    // Antes de emitir un enlace de recuperacion: rechaza correos de empleados ALFA
    // y deja el perfil como contractor_portal.
    await ensureContractorProfile(existing.id, email, fullName, false);

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
