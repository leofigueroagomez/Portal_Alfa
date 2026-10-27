import { inflateSync } from "node:zlib";

type ContractState = { status?: string | null; client_signed_at?: string | null };

export function canSubmitContractOnboarding(contract: ContractState) {
  return !contract.client_signed_at &&
    (contract.status === "draft" || contract.status === "pending_client_data");
}

export function canSubmitContractSignature(contract: ContractState) {
  return contract.status === "pending_signatures" && !contract.client_signed_at;
}

/** Accept the bounded PNG format produced by the signing canvas, never a URL. */
export function isValidContractSignaturePng(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 280_000) return false;
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[0].length !== value.length) return false;
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length > 200 * 1024 || bytes.length < 57 || bytes.toString("base64") !== match[1]) {
    return false;
  }
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false;
  if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") return false;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height || width > 4096 || height > 4096 || width * height > 4_000_000) return false;
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[bytes[25]];
  // The browser canvas emits non-interlaced 8-bit PNGs. Bound decompression too.
  if (bytes[24] !== 8 || !channels || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] !== 0) return false;
  const scanlineBytes = 1 + width * channels;
  const decodedBytes = scanlineBytes * height;

  let offset = 8;
  const imageChunks: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT" && length > 0) imageChunks.push(bytes.subarray(offset + 8, end - 4));
    if (type === "IEND") {
      if (length !== 0 || end !== bytes.length || !imageChunks.length) return false;
      try {
        const decoded = inflateSync(Buffer.concat(imageChunks), { maxOutputLength: decodedBytes });
        if (decoded.length !== decodedBytes) return false;
        for (let row = 0; row < height; row += 1) {
          if (decoded[row * scanlineBytes] > 4) return false;
        }
        return true;
      } catch {
        return false;
      }
    }
    offset = end;
  }
  return false;
}

export function isValidContractSignerName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

export function isValidContractCoordinates(latitude: unknown, longitude: unknown) {
  return (latitude == null || (typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90)) &&
    (longitude == null || (typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180));
}
