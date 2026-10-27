import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Compara un secreto recibido contra el esperado en tiempo constante.
 * Falla cerrado si falta cualquiera de los dos. Solo se filtra la longitud
 * (inevitable con timingSafeEqual), nunca el contenido.
 *
 * Para Bearer por header usar `isAuthorizedCronRequest` (lib/cronAuth.ts); esto
 * es para el caso que no tiene header, como el `?key=` del Atajo de Siri.
 */
export function secretsMatch(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!expected?.trim() || !provided) return false;
  const actual = Buffer.from(provided);
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}
