import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export async function POST(request: Request) {
  // A native same-origin form supplies Origin. Reject cross-site logout requests.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo cerrar la sesion. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // A fixed relative destination cannot be controlled with redirect parameters.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login", "Cache-Control": "no-store" },
  });
}
