// One-off: normaliza las fotos y videos del proyecto "Casa ER" para el portafolio público.
// - Fotos: HQ JPG (decodificadas de HEIC con WIC en un paso previo de PowerShell) -> AVIF 1600px
// - Videos: transcodifica MOV/HEVC y MP4 a H.264 web (faststart, <=1280px) con ffmpeg-static
// Uso: node scripts/build-casa-er-media.mjs
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const HQ = path.resolve(
  "C:/Users/LEOFIG~1/AppData/Local/Temp/claude/C--Users-Leo-Figueroa-Desktop-alfa-portal/af3ce726-d778-46fb-855e-9c800da2d63d/scratchpad/casaer_hq"
);
const DRIVE =
  "G:/Unidades compartidas/ALFA Knowledge Base/04_Multimedia/01_Proyectos/01_Residencial/Casa Ruvalcaba";
const OUT = path.resolve("public/portfolio/casa-er");

await mkdir(OUT, { recursive: true });

// --- Fotos -> AVIF ---
// vestibulo-acceso se descartó de la galería (persona reflejada en la puerta de vidrio).
const SKIP = new Set(["vestibulo-acceso.jpg"]);
const photos = fs.readdirSync(HQ).filter((f) => f.endsWith(".jpg") && !SKIP.has(f));
for (const f of photos) {
  const name = f.replace(/\.jpg$/, ".avif");
  await sharp(path.join(HQ, f))
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .avif({ quality: 55, effort: 6 })
    .toFile(path.join(OUT, name));
  console.log("img", name, (fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0) + "KB");
}

// --- Videos -> H.264 MP4 web ---
const videos = {
  "video-audio-techo-exterior.mp4":
    "CasaRuvalaba_Audio_Bocina_VideoBocinaEmpotradasTechoYExterior_01.mp4",
  "video-audio-bocinas-muro.mp4":
    "CasaRuvalaba_Audio_Bocina_VideoBocinaEmpotradasEnMuro_01.MOV",
  "video-audio-bocinas-plafon.mp4":
    "CasaRuvalaba_Audio_Bocina_VideoBocinaEmpotradasPlafon_01.MOV",
  "video-panel-control.mp4":
    "CasaRuvalcaba_Iluminacion_ControlDeIluminacion_VideoControlEmpotradoEnMuro_01.mp4",
};
for (const [out, src] of Object.entries(videos)) {
  const inPath = path.join(DRIVE, src);
  const outPath = path.join(OUT, out);
  execFileSync(
    ffmpegPath,
    [
      "-y",
      "-i", inPath,
      "-vf", "scale='min(1280,iw)':-2",
      "-c:v", "libx264",
      "-profile:v", "high",
      "-preset", "medium",
      "-crf", "24",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
      outPath,
    ],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
  console.log("vid", out, (fs.statSync(outPath).size / 1e6).toFixed(1) + "MB");
}

console.log("done ->", OUT);
