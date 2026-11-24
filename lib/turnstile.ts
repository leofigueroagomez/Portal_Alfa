import "server-only";

/**
 * Verificacion de Cloudflare Turnstile en el servidor.
 *
 * Se exige solo si existe TURNSTILE_SECRET_KEY. El widget del navegador
 * (components/TurnstileWidget.tsx) aparece solo si existe
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY. Las dos variables se configuran juntas: con
 * la secreta y sin la publica, los formularios quedan bloqueados.
 */

export function isTurnstileEnforced() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export function readTurnstileToken(body: unknown) {
  const source = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  return String(source.turnstileToken || source["cf-turnstile-response"] || "")
    .trim()
    .slice(0, 2048);
}

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip && ip !== "unknown") formData.append("remoteip", ip);

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    if (!result.ok) return false;
    const json = (await result.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch {
    return false;
  }
}
