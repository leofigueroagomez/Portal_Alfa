import { NextResponse } from "next/server";
import { notifyAuthorizedPlanUploaded } from "@/lib/notifications";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectId = Number(body?.projectId || 0);
  const documentId = Number(body?.documentId || 0);

  if (!projectId || !documentId) {
    return NextResponse.json(
      { error: "projectId and documentId are required" },
      { status: 400 }
    );
  }

  try {
    const result = await notifyAuthorizedPlanUploaded(projectId, documentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Notification authorized-plan-uploaded failed:", error);
    return NextResponse.json({ status: "failed" }, { status: 200 });
  }
}
