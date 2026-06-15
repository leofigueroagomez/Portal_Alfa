import "server-only";

import { NextResponse } from "next/server";
import { canApproveQuotes, canViewFinancials, normalizeRole } from "@/lib/permissions";
import { getCurrentInternalUserProfile, getCurrentUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

const notificationRoles = new Set([
  "admin",
  "direccion",
  "comercial",
  "ingenieria",
  "project_manager",
]);

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function createRequestId() {
  return crypto.randomUUID();
}

export function jsonError(
  error: "Unauthorized" | "Forbidden" | "Bad Request" | "Not Found" | "Too Many Requests",
  status: 400 | 401 | 403 | 404 | 429
) {
  return NextResponse.json({ error }, { status });
}

export async function requireInternalUser() {
  const profile = await getCurrentInternalUserProfile();

  if (!profile) {
    return {
      profile: null,
      response: jsonError("Unauthorized", 401),
    };
  }

  return { profile, response: null };
}

export async function requireFinancialRole() {
  const { profile, response } = await requireInternalUser();
  if (response) return { profile: null, response };

  if (!profile || !canViewFinancials(profile.role)) {
    return {
      profile,
      response: jsonError("Forbidden", 403),
    };
  }

  return { profile, response: null };
}

export async function requireNotificationPermission() {
  const { profile, response } = await requireInternalUser();
  if (response) return { profile: null, response };

  const role = normalizeRole(profile?.role);
  if (!profile || !notificationRoles.has(role)) {
    return {
      profile,
      response: jsonError("Forbidden", 403),
    };
  }

  return { profile, response: null };
}

export async function requireQuoteNotificationPermission() {
  const { profile, response } = await requireInternalUser();
  if (response) return { profile: null, response };

  if (!profile || !canApproveQuotes(profile.role)) {
    return {
      profile,
      response: jsonError("Forbidden", 403),
    };
  }

  return { profile, response: null };
}

export async function requirePortalProjectAccess(projectId: number) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return {
      profile: null,
      response: jsonError("Unauthorized", 401),
    };
  }

  if (profile.is_internal) {
    return {
      profile,
      response: jsonError("Forbidden", 403),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: portalUser, error: portalError } = await supabase
    .from("client_portal_users")
    .select("id, client_id, is_active")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();

  if (portalError || !portalUser) {
    if (portalError) console.error("portal user access check failed:", portalError);
    return { profile, response: jsonError("Forbidden", 403) };
  }

  const { data: access, error: accessError } = await supabase
    .from("client_portal_project_access")
    .select("id")
    .eq("client_portal_user_id", portalUser.id)
    .eq("client_project_id", projectId)
    .eq("is_active", true)
    .maybeSingle();

  if (accessError || !access) {
    if (accessError) console.error("portal project access check failed:", accessError);
    return { profile, response: jsonError("Forbidden", 403) };
  }

  return {
    profile,
    portalUser,
    response: null,
  };
}

export function parsePositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkBasicRateLimit(key: string, limit = 30, windowMs = 60_000) {
  // TODO: Replace this best-effort in-memory guard with shared Redis/Vercel KV/edge rate limiting.
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function logApiError(requestId: string, message: string, error: unknown) {
  console.error(`[api:${requestId}] ${message}`, error);
}
