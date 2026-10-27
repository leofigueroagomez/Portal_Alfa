import { NextResponse } from "next/server";
import {
  requireAdminProfile,
} from "@/lib/adminUsers";
import { parseInternalRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile, response } = await requireAdminProfile();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const fullName = String(body?.full_name || "").trim();
  const role = parseInternalRole(body?.role);
  const isActive = Boolean(body?.is_active ?? true);

  if (!role) {
    return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
  }

  if (profile?.id === id && !isActive) {
    return NextResponse.json(
      { error: "No puedes desactivarte a ti mismo" },
      { status: 400 }
    );
  }

  try {
    const admin = createSupabaseAdminClient();

    // Solo se edita el rol de usuarios internos; nunca se promueve un perfil de portal.
    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id, role, is_internal, user_type")
      .eq("id", id)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const isPortalTarget =
      target.user_type === "client_portal" ||
      target.user_type === "contractor_portal" ||
      target.role === "client" ||
      target.role === "contractor";

    if (target.is_internal !== true || isPortalTarget) {
      return NextResponse.json(
        { error: "Solo se puede cambiar el rol de usuarios internos" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("profiles")
      .update({
        full_name: fullName || null,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_internal", true);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin users update failed:", error);
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile, response } = await requireAdminProfile();
  if (response) return response;

  const { id } = await params;

  if (profile?.id === id) {
    return NextResponse.json(
      { error: "No puedes eliminarte o desactivarte a ti mismo" },
      { status: 400 }
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    // Solo se desactiva personal interno; clientes y contratistas tienen su propio flujo.
    const { data: updated, error } = await admin
      .from("profiles")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_internal", true)
      .select("id");

    if (error) throw error;
    if (!updated?.length) {
      return NextResponse.json({ error: "Usuario interno no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin users deactivate failed:", error);
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 }
    );
  }
}
