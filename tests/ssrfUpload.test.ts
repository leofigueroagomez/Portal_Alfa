import assert from "node:assert/strict";
import test from "node:test";
import {
  createGuardedLookup,
  isBlockedHostname,
  isPrivateOrReservedAddress,
  isPublicFetchableUrl,
  safeFetchBytes,
} from "../lib/ssrfGuard";
import {
  DOCUMENT_UPLOAD_TYPES,
  ID_IMAGE_UPLOAD_TYPES,
  PHOTO_UPLOAD_TYPES,
  detectFileType,
  parseValidatedDataUrl,
  validateUploadFile,
} from "../lib/uploadValidation";
import { safeHexColor } from "../lib/quotePremiumPdfHtml";

const pad = (bytes: number[], length = 32) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(length)]);
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = pad([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]);
const HEIC = pad([0, 0, 0, 0x18, ...Buffer.from("ftypheic")]);
const PDF = pad([...Buffer.from("%PDF-1.7\n")]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
const dataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString("base64")}`;

test("IPs privadas, reservadas, mapeadas y con corchetes se bloquean", () => {
  for (const address of [
    "127.0.0.1", "127.1.2.3", "0.0.0.0", "0.1.2.3", "10.0.0.1", "100.64.0.1", "100.127.255.255",
    "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "192.0.2.10", "198.18.0.1",
    "224.0.0.1", "255.255.255.255",
    "::", "::1", "[::1]", "fc00::1", "fd12:3456::1", "fe80::1", "fe80::1%eth0", "fec0::1", "ff02::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "[::ffff:169.254.169.254]", "::ffff:10.0.0.1", "::127.0.0.1",
    "64:ff9b::a9fe:a9fe", "2002:7f00:1::1", "2001:db8::1", "2001::1", "100::1",
    "not-an-ip", "",
  ]) {
    assert.equal(isPrivateOrReservedAddress(address), true, address);
  }
});

test("IPs publicas (incluida IPv4 mapeada publica) se permiten", () => {
  for (const address of [
    "8.8.8.8", "1.1.1.1", "100.63.255.255", "100.128.0.1", "172.15.0.1", "172.32.0.1",
    "2606:4700:4700::1111", "[2001:4860:4860::8888]", "::ffff:8.8.8.8", "64:ff9b::808:808",
  ]) {
    assert.equal(isPrivateOrReservedAddress(address), false, address);
  }
});

test("hostnames internos y de una etiqueta se bloquean", () => {
  for (const host of ["localhost", "LOCALHOST.", "api.localhost", "printer.local", "metadata.google.internal", "intranet", "[::1]"]) {
    assert.equal(isBlockedHostname(host), true, host);
  }
  assert.equal(isBlockedHostname("cdn.example.com"), false);
});

test("solo https publico en puerto por defecto y sin credenciales", () => {
  for (const url of [
    "http://example.com/a.png", "https://localhost/a.png", "https://127.0.0.1/a.png", "https://[::1]/a.png",
    "https://[::ffff:127.0.0.1]/a.png", "https://[fd00::1]/a.png", "https://0x7f.0.0.1/a.png",
    "https://2130706433/a.png", "https://169.254.169.254/latest/meta-data", "https://100.100.100.200/",
    "https://user:pass@example.com/a.png", "https://example.com:8443/a.png", "https://metadata.google.internal/",
    "https://intranet/a.png", "file:///etc/passwd", "ftp://example.com/a.png", "javascript:alert(1)", "no-es-url",
  ]) {
    assert.equal(isPublicFetchableUrl(url), false, url);
  }
  assert.equal(isPublicFetchableUrl("https://abc.supabase.co/storage/v1/object/public/product-images/a.png"), true);
  assert.equal(isPublicFetchableUrl("https://example.com:443/a.png"), true);
});

test("lookup guardado rechaza si cualquier direccion resuelta es privada", async () => {
  const resolveWith = (addresses: Array<{ address: string; family: number }>) =>
    createGuardedLookup((_hostname, _options, callback) => callback(null, addresses));
  const run = (lookup: ReturnType<typeof createGuardedLookup>, all: boolean) =>
    new Promise<{ error: NodeJS.ErrnoException | null; result: unknown }>((resolve) => {
      (lookup as unknown as (h: string, o: object, cb: (e: NodeJS.ErrnoException | null, r?: unknown) => void) => void)(
        "img.example.com",
        { all },
        (error, result) => resolve({ error, result })
      );
    });

  const mixed = await run(resolveWith([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }]), false);
  assert.equal(mixed.error?.code, "ERR_SSRF_BLOCKED");
  const mapped = await run(resolveWith([{ address: "::ffff:169.254.169.254", family: 6 }]), true);
  assert.equal(mapped.error?.code, "ERR_SSRF_BLOCKED");
  const empty = await run(resolveWith([]), false);
  assert.equal(empty.error?.code, "ERR_SSRF_BLOCKED");

  const single = await run(resolveWith([{ address: "93.184.216.34", family: 4 }]), false);
  assert.equal(single.error, null);
  assert.equal(single.result, "93.184.216.34");
  const all = await run(resolveWith([{ address: "2606:4700::1", family: 6 }]), true);
  assert.deepEqual(all.result, [{ address: "2606:4700::1", family: 6 }]);
});

test("safeFetchBytes no sale a la red con URLs bloqueadas", async () => {
  for (const url of ["http://example.com/a.png", "https://127.0.0.1/a.png", "https://[::1]/a.png", "https://169.254.169.254/"]) {
    assert.equal(await safeFetchBytes(url, { maxBytes: 1024, timeoutMs: 1_000 }), null, url);
  }
});

test("magic bytes: JPEG/PNG/WebP/HEIC/PDF se detectan; SVG y basura no", () => {
  assert.equal(detectFileType(JPEG), "jpeg");
  assert.equal(detectFileType(PNG), "png");
  assert.equal(detectFileType(WEBP), "webp");
  assert.equal(detectFileType(HEIC), "heic");
  assert.equal(detectFileType(PDF), "pdf");
  assert.equal(detectFileType(SVG), null);
  assert.equal(detectFileType(Buffer.from("<html><script>x</script></html>")), null);
  assert.equal(detectFileType(Buffer.from([0xff, 0xd8])), null);
});

test("data URLs: tipo por magic bytes, sin SVG, con tope y lista permitida", () => {
  const disguised = parseValidatedDataUrl(dataUrl("image/png", JPEG), { allowed: ID_IMAGE_UPLOAD_TYPES, maxBytes: 1024 });
  assert.equal(disguised?.type, "jpeg");
  assert.equal(disguised?.ext, "jpg");
  assert.equal(disguised?.mime, "image/jpeg");

  assert.equal(parseValidatedDataUrl(dataUrl("image/svg+xml", SVG), { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(parseValidatedDataUrl(dataUrl("image/svg+xml", PNG), { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(parseValidatedDataUrl(dataUrl("image/png", SVG), { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(parseValidatedDataUrl(dataUrl("text/html", PNG), { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(parseValidatedDataUrl(dataUrl("application/pdf", PDF), { allowed: ID_IMAGE_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(parseValidatedDataUrl(dataUrl("application/pdf", PDF), { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 })?.type, "pdf");
  assert.equal(parseValidatedDataUrl(dataUrl("image/jpeg", JPEG), { allowed: ID_IMAGE_UPLOAD_TYPES, maxBytes: 16 }), null);
  assert.equal(parseValidatedDataUrl("https://example.com/ine.jpg", { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(parseValidatedDataUrl("data:image/jpeg;base64,@@@", { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(parseValidatedDataUrl(null, { allowed: DOCUMENT_UPLOAD_TYPES, maxBytes: 1024 }), null);
});

test("archivos de FormData: tamano maximo y extension del tipo real", async () => {
  const heic = await validateUploadFile(new File([HEIC], "foto.php", { type: "image/heic" }), { allowed: PHOTO_UPLOAD_TYPES, maxBytes: 1024 });
  assert.equal(heic?.ext, "heic");
  assert.equal(await validateUploadFile(new File([SVG], "x.jpg", { type: "image/jpeg" }), { allowed: PHOTO_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(await validateUploadFile(new File([PDF], "x.pdf"), { allowed: PHOTO_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(await validateUploadFile(new File([JPEG], "x.jpg"), { allowed: PHOTO_UPLOAD_TYPES, maxBytes: 8 }), null);
  assert.equal(await validateUploadFile(new File([], "vacio.jpg"), { allowed: PHOTO_UPLOAD_TYPES, maxBytes: 1024 }), null);
  assert.equal(await validateUploadFile("no-file", { allowed: PHOTO_UPLOAD_TYPES, maxBytes: 1024 }), null);
});

test("colores de branding: solo hex estricto, si no el default", () => {
  assert.equal(safeHexColor("#9E1B32", "#000000"), "#9E1B32");
  assert.equal(safeHexColor(" #abc ", "#000000"), "#abc");
  for (const value of ["red", "#12345", "#1234567", "9E1B32", "#123456;}body{background:url(https://x)}", "#zzzzzz", null, undefined, 42]) {
    assert.equal(safeHexColor(value, "#15171c"), "#15171c", String(value));
  }
});
