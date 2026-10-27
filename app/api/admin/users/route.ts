import { NextResponse } from "next/server";
import {
  listAdminUsers,
  requireAdminProfile,
} from "@/lib/adminUsers";
import { parseInternalRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdminProfile();
  if (response) return response;

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("admin users list failed:", error);
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { response } = await requireAdminProfile();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const fullName = String(body?.full_name || "").trim();
  const role = parseInternalRole(body?.role);
  const isActive = Boolean(body?.is_active ?? true);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalido" }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "La contrasena temporal debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  if (!role) {
    return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || email,
      },
    });

    if (error || !data.user) throw error || new Error("No se creo usuario");

    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName || email,
      role,
      // Explicito: no depender de defaults del trigger para marcar usuarios internos.
      user_type: "internal",
      is_internal: true,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;

    return NextResponse.json({ id: data.user.id });
  } catch (error) {
    console.error("admin users create failed:", error);
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 }
    );
  }
}
