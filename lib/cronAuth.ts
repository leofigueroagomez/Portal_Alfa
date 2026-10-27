import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Fail closed when the secret is missing. Never accept credentials from URLs. */
export function isAuthorizedCronRequest(request: Request, secret: string | undefined) {
  if (!secret?.trim()) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
