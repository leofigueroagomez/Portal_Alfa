import "server-only";

import dns from "node:dns";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { PDF_RENDERABLE_IMAGE_TYPES, validateUploadBytes } from "@/lib/uploadValidation";

// Descarga server-side de URLs que vienen de datos editables (imagenes de
// producto, logos de aliados, fotos de diagnostico). Reglas:
// - solo https en el puerto por defecto y sin credenciales en la URL;
// - IPs literales y nombres resueltos se rechazan si CUALQUIER direccion es
//   privada/reservada (loopback, RFC1918, CGNAT, link-local/metadata, ULA,
//   IPv4 mapeada, etc.). La validacion DNS ocurre en el `lookup` del socket,
//   asi que no hay ventana de DNS rebinding entre validar y conectar;
// - redirecciones manuales, revalidando cada salto (maximo 3);
// - limite de bytes y timeout global.

const IPV4_BLOCKED_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // "esta red"
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local / metadata de nube
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reservado + broadcast
];

function parseIPv4(value: string): number[] | null {
  if (isIP(value) !== 4) return null;
  return value.split(".").map(Number);
}

function ipv4ToInt(octets: number[]) {
  return ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
}

function isBlockedIPv4(octets: number[]) {
  const value = ipv4ToInt(octets);
  return IPV4_BLOCKED_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return ((value & mask) >>> 0) === ((ipv4ToInt(base.split(".").map(Number)) & mask) >>> 0);
  });
}

/** Expande una IPv6 (con o sin IPv4 embebida) a 8 grupos de 16 bits. */
function parseIPv6(input: string): number[] | null {
  let value = input.toLowerCase();
  const zoneIndex = value.indexOf("%");
  if (zoneIndex >= 0) value = value.slice(0, zoneIndex);
  if (isIP(value) !== 6) return null;

  const lastColon = value.lastIndexOf(":");
  const lastPart = value.slice(lastColon + 1);
  if (lastPart.includes(".")) {
    const octets = parseIPv4(lastPart);
    if (!octets) return null;
    value = `${value.slice(0, lastColon + 1)}${((octets[0] << 8) | octets[1]).toString(16)}:${(
      (octets[2] << 8) | octets[3]
    ).toString(16)}`;
  }

  const [headText, tailText] = value.split("::");
  const head = headText ? headText.split(":") : [];
  const tail = tailText ? tailText.split(":") : [];
  const missing = value.includes("::") ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array<string>(Math.max(missing, 0)).fill("0"), ...tail].map((group) =>
    Number.parseInt(group, 16)
  );
  return groups.length === 8 && groups.every((group) => group >= 0 && group <= 0xffff)
    ? groups
    : null;
}

function embeddedIPv4(high: number, low: number) {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

function isBlockedIPv6(groups: number[]) {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  const firstFiveZero = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0;

  // ::ffff:a.b.c.d (IPv4 mapeada): decide la IPv4 real.
  if (firstFiveZero && g5 === 0xffff) return isBlockedIPv4(embeddedIPv4(g6, g7));
  // ::, ::1 y el obsoleto ::a.b.c.d (IPv4 compatible).
  if (firstFiveZero && g5 === 0) return true;
  // NAT64 64:ff9b::/96 apunta a una IPv4; 64:ff9b:1::/48 es de uso local.
  if (g0 === 0x64 && g1 === 0xff9b) {
    if (g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) return isBlockedIPv4(embeddedIPv4(g6, g7));
    return true;
  }
  // 6to4 2002::/16 embebe una IPv4.
  if (g0 === 0x2002) return isBlockedIPv4(embeddedIPv4(g1, g2));
  // 2001::/23 (Teredo, benchmarking, ORCHID) y 2001:db8::/32 (documentacion).
  if (g0 === 0x2001 && (g1 < 0x200 || g1 === 0x0db8)) return true;
  // Todo lo que no sea unicast global 2000::/3 (ULA fc00::/7, link-local
  // fe80::/10, site-local fec0::/10, multicast ff00::/8, discard 100::/64...).
  return (g0 & 0xe000) !== 0x2000;
}

/** true si la IP (v4 o v6, con o sin corchetes) es privada, reservada o invalida. */
export function isPrivateOrReservedAddress(address: string): boolean {
  const value = address.trim().replace(/^\[(.*)\]$/, "$1");
  const v4 = parseIPv4(value);
  if (v4) return isBlockedIPv4(v4);
  const v6 = parseIPv6(value);
  if (v6) return isBlockedIPv6(v6);
  return true;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan"];

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[(.*)\]$/, "$1").replace(/\.+$/, "");
}

/** true si el hostname (de `URL.hostname`, con corchetes IPv6 incluidos) no es destino publico. */
export function isBlockedHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (isIP(host) || host.includes(":")) return isPrivateOrReservedAddress(host);
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return true;
  }
  // Nombres de una sola etiqueta se resuelven con dominios de busqueda internos.
  return !host.includes(".");
}

/** Devuelve la URL solo si es https publica (puerto por defecto, sin credenciales). */
export function parseSafeRemoteUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    if (isBlockedHostname(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function isPublicFetchableUrl(value: string) {
  return parseSafeRemoteUrl(value) !== null;
}

type LookupAddress = { address: string; family: number };
type Resolver = (
  hostname: string,
  options: dns.LookupAllOptions,
  callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void
) => void;

/**
 * `lookup` para sockets: resuelve todas las direcciones y falla si alguna es
 * privada/reservada. El resolver es inyectable para pruebas.
 */
export function createGuardedLookup(resolver: Resolver = dns.lookup as unknown as Resolver): LookupFunction {
  return ((hostname: string, options: dns.LookupOptions, callback: (...args: unknown[]) => void) => {
    resolver(
      hostname,
      { all: true, family: options?.family ?? 0 } as dns.LookupAllOptions,
      (error, addresses) => {
        if (error) {
          callback(error);
          return;
        }
        if (!addresses?.length || addresses.some((entry) => isPrivateOrReservedAddress(entry.address))) {
          const blocked = Object.assign(new Error(`Destino no permitido: ${hostname}`), {
            code: "ERR_SSRF_BLOCKED",
          });
          callback(blocked);
          return;
        }
        if (options?.all) {
          callback(null, addresses);
          return;
        }
        callback(null, addresses[0].address, addresses[0].family);
      }
    );
  }) as unknown as LookupFunction;
}

const guardedLookup = createGuardedLookup();

type FetchLimits = {
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  accept?: string;
};

type HopResult =
  | { kind: "ok"; body: Buffer }
  | { kind: "redirect"; location: string | null }
  | { kind: "failed" };

function requestOnce(url: URL, signal: AbortSignal, limits: FetchLimits) {
  return new Promise<HopResult>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "GET",
        agent: false,
        lookup: guardedLookup,
        signal,
        headers: {
          accept: limits.accept || "image/*",
          "accept-encoding": "identity",
          "user-agent": "ALFA-OS-PDF/1.0",
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ kind: "redirect", location: response.headers.location || null });
          return;
        }
        const declaredLength = Number(response.headers["content-length"] || 0);
        if (status !== 200 || declaredLength > limits.maxBytes) {
          response.destroy();
          resolve({ kind: "failed" });
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        response.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > limits.maxBytes) {
            response.destroy();
            resolve({ kind: "failed" });
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({ kind: "ok", body: Buffer.concat(chunks) }));
        response.on("error", reject);
      }
    );
    request.on("error", reject);
    request.end();
  });
}

/** GET acotado a destinos publicos. Devuelve null ante cualquier bloqueo o error. */
export async function safeFetchBytes(rawUrl: string, limits: FetchLimits): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), limits.timeoutMs ?? 6_000);
  const maxRedirects = limits.maxRedirects ?? 3;

  try {
    let current = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const url = parseSafeRemoteUrl(current);
      if (!url) return null;

      const result = await requestOnce(url, controller.signal, limits);
      if (result.kind === "redirect") {
        if (!result.location) return null;
        current = new URL(result.location, url).toString();
        continue;
      }
      return result.kind === "ok" ? result.body : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Descarga una imagen publica y la devuelve como data URL con el tipo real detectado. */
export async function fetchRemoteImageAsDataUrl(
  url: string,
  options: { maxBytes?: number; timeoutMs?: number } = {}
) {
  const maxBytes = options.maxBytes ?? 3 * 1024 * 1024;
  const bytes = await safeFetchBytes(url, { maxBytes, timeoutMs: options.timeoutMs });
  if (!bytes) return null;
  const image = validateUploadBytes(bytes, { allowed: PDF_RENDERABLE_IMAGE_TYPES, maxBytes });
  if (!image) return null;
  return { dataUrl: `data:${image.mime};base64,${image.buffer.toString("base64")}`, ...image };
}
