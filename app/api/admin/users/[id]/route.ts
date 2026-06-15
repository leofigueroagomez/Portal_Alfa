import { NextResponse } from "next/server";
import {
  requireAdminProfile,
} from "@/lib/adminUsers";
import { alfaRoles, normalizeRole } from "@/lib/permissions";
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
  const role = normalizeRole(body?.role);
  const isActive = Boolean(body?.is_active ?? true);

  if (!alfaRoles.includes(role as (typeof alfaRoles)[number])) {
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
    const { error } = await admin
      .from("profiles")
      .update({
        full_name: fullName || null,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

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
    const { error } = await admin
      .from("profiles")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin users deactivate failed:", error);
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 }
    );
  }
}
