// One-off: descarga los renders oficiales de producto de media.sonos.com (CDN de Sonos)
// y los normaliza a /public/catalog/sonos/<key>.avif (1000x1000, fondo transparente).
// Uso: node scripts/fetch-sonos-images.mjs
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const CDN = "https://media.sonos.com/images/znqtjj88/production/";
const OUT = path.resolve("public/catalog/sonos");

// key -> archivo base en el CDN de Sonos (sin query). Fuente: og:image / galería de cada
// página oficial de producto en sonos.com/en-us/shop.
const MAP = {
  "arc-ultra": "c6e84e0ad4ee82bcada3148dee547f972f2e2d7f-2880x2880.png",
  "arc": "fed3676dd7a408ddb76669f12ae10b128e55ee26-2000x2000.png",
  "beam-gen-2": "e12ba440b45fc67e970049734783d6fb0b6b20d1-2480x2480.png",
  "ray": "66e3cfe30d0b259876278d17a526295d43f044e5-2480x2480.png",
  "era-300": "1dfecdf1513cd96cd28e789adac4957b97adf50b-1800x1800.png",
  "era-100": "c730c924a2d9fe4d3a3b9b9cb7432b7afd0ab392-2000x2000.png",
  "era-100-pro": "c730c924a2d9fe4d3a3b9b9cb7432b7afd0ab392-2000x2000.png", // Era 100 Pro no tiene render propio público
  "five": "91842eaeee11508a3d1278a7a204fb940f14b84f-2705x2656.png",
  "move-2": "87e816c0a480d8a27c1d379e02e84d84f6db5041-1280x1280.png",
  "roam-2": "110a711ffb1d9ec82743734ef7477a7d400c8d11-2400x2400.png",
  "sub-gen-4": "dd84c5bf5558b003741f581041b88c01843fad31-2328x3076.png",
  "sub-mini": "172f10868dcaeef227f3e634fbdc75aa62e382f2-1671x1672.png",
  "amp": "b61e87d3437732710e0f32418414225ef3a6c176-2000x2000.png",
  "port": "2a50cdf7497da687f9adb705e3ee1b828a86bd48-2000x2000.png",
  "ace": "6d1891b5f7a2236498c20a2fe895506dc0ba6ab9-2500x2500.png",
  "in-ceiling-6": "5d47ea9eb6ff198ded0fdffc151dcfe676564ca5-1685x1685.png",
  "in-ceiling-8": "5d47ea9eb6ff198ded0fdffc151dcfe676564ca5-1685x1685.png",
  "in-wall": "d5fdacd830fbe8c5bf1ded61e1b92d591d08a42e-1505x1527.png",
  "outdoor": "da5b9dcc02bf7e3fcbbf8c2b580b6a6f9fa63138-2000x2000.png",
  "stand-era-100": "ef7191452c7a0d4b35abb7dd5bd875df43644f24-2000x2000.png",
  "wall-mount-era-100": "8e5ff1b1f3a445409a521865d96e901e08ee2f86-2000x2000.png",
  "stand-era-300": "a57b2c8d90c191d435490e8bc636b5a582adac03-2000x2000.png",
  "wall-mount-era-300": "6499cb9789a166bed26bfe4eabf634e3f7b0fa57-2000x1793.png",
  "wall-mount-arc-ultra": "106b313970c9546250ceb030c9916b1ae4982950-2480x2480.png",
  "wall-mount-beam": "058a6eafced16eea0115f2a0ace1e27091857449-984x563.png",
  "wall-mount-ray": "2d490f26d6dc0af16aec7311a3f6593964e598f5-2188x1262.png",
  "combo-adapter": "af5c86024d32b2fa5c41cbb81dd909d02878ea12-1510x959.png",
  "line-in-adapter": "47a0e60ac5d697e707fcda68c77d9e460c1d5233-732x481.png",
  "roam-wireless-charger": "968125f5cb892529dc4f9ecb7083635b3a50f4a0-2000x885.png",
  "move-hook": "11aab4595e8d5a5d4e3d974028da907954f912c1-800x800.png",
  "move-travel-case": "d08dd44bb6c23935a5f0fe5d80e0bc0e5dff441c-1807x2000.png",
  "optical-hdmi-adapter": "ed86978e2f4d10e9a1044cf9d023cd21418f43a7-1920x345.png", // única imagen pública (banner ancho)
};

await mkdir(OUT, { recursive: true });

let ok = 0;
const fails = [];
for (const [key, file] of Object.entries(MAP)) {
  const url = `${CDN}${file}?w=1400&q=95&fit=clip&auto=format`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const out = path.join(OUT, `${key}.avif`);
    await sharp(buf)
      .resize(1000, 1000, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: false,
      })
      .avif({ quality: 68, effort: 6 })
      .toFile(out);
    ok++;
    console.log(`ok  ${key}.avif`);
  } catch (e) {
    fails.push(`${key}: ${e.message}`);
    console.log(`ERR ${key}: ${e.message}`);
  }
}
console.log(`\n${ok}/${Object.keys(MAP).length} imágenes generadas en ${OUT}`);
if (fails.length) console.log("Fallos:\n" + fails.join("\n"));
