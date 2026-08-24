import { NextResponse } from "next/server";
import { testGoogleCalendarConnection } from "@/lib/googleCalendarSync";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await testGoogleCalendarConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function POST() {
  const result = await testGoogleCalendarConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
