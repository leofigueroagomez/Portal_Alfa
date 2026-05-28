import { NextResponse } from "next/server";
import { notifyQuoteApproved } from "@/lib/notifications";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectId = Number(body?.projectId || 0);
  const quoteId = Number(body?.quoteId || 0);

  if (!projectId || !quoteId) {
    return NextResponse.json(
      { error: "projectId and quoteId are required" },
      { status: 400 }
    );
  }

  try {
    const result = await notifyQuoteApproved(projectId, quoteId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Notification quote-approved failed:", error);
    return NextResponse.json({ status: "failed" }, { status: 200 });
  }
}
