import { NextResponse } from "next/server";
import { notifySiteVisitCreated } from "@/lib/notifications";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectId = Number(body?.projectId || 0);
  const visitId = Number(body?.visitId || 0);

  if (!projectId || !visitId) {
    return NextResponse.json(
      { error: "projectId and visitId are required" },
      { status: 400 }
    );
  }

  try {
    const result = await notifySiteVisitCreated(projectId, visitId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Notification site-visit-created failed:", error);
    return NextResponse.json({ status: "failed" }, { status: 200 });
  }
}
