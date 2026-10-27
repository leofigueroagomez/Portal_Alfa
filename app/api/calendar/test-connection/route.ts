import { NextResponse } from "next/server";
import { testGoogleCalendarConnection } from "@/lib/googleCalendarSync";
import { requireAdminProfile } from "@/lib/adminUsers";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdminProfile();
  if (response) return response;
  const result = await testGoogleCalendarConnection();
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  return GET();
}
