import assert from "node:assert/strict";
import test from "node:test";
import {
  createAccessToken,
  generateVerificationCode,
  hashVerificationCode,
  normalizeEmail,
  normalizePhone,
  verificationCodeMatches,
  verifyAccessToken,
} from "@/lib/simuladorAudio/access";
import {
  DEFAULT_SIMULATOR_AMPLIFIER,
  amplifiersForRoom,
  speakersPerAmplifier,
} from "@/lib/simuladorAudio/amplifiers";
import {
  amplifierPlan,
  sanitizeDesign,
  summarizeDesign,
} from "@/lib/simuladorAudio/design";
import { getSimulatorSpeaker } from "@/lib/simuladorAudio/speakers";
import {
  coverageDiameter,
  coverageRatio,
  pointInPolygon,
  polygonArea,
  rectanglePolygon,
  suggestLayout,
} from "@/lib/simuladorAudio/geometry";

const SECRET = "s".repeat(40);

test("coverageDiameter usa D = 2·(H−h)·tan(A/2)", () => {
  // Mismo caso que el Prediseñador de Audio de Syscom: 110°, H 3.00 m, h 1.30 m → 4.86 m.
  assert.equal(coverageDiameter(110, 3, 1.3).toFixed(2), "4.86");
  assert.equal(coverageDiameter(110, 1.2, 1.3), 0);
  assert.equal(coverageDiameter(180, 3, 1.3), 0);

  // Más de 120° no agranda la cobertura: en ese borde el nivel ya cayó 6 dB.
  assert.equal(coverageDiameter(160, 2.7, 1.3), coverageDiameter(120, 2.7, 1.3));
  assert.equal(coverageDiameter(120, 2.7, 1.3).toFixed(2), "4.85");
});

test("suggestLayout reparte en retícula dentro del área", () => {
  const room = rectanglePolygon(20, 15);
  const diameter = coverageDiameter(110, 3, 1.3);

  // Borde con borde: 5 columnas × 4 filas, igual que el ejemplo de Syscom.
  const ambient = suggestLayout(room, diameter, "ambiental");
  assert.equal(ambient.length, 20);
  assert.ok(ambient.every((speaker) => pointInPolygon(speaker, room)));

  const uniform = suggestLayout(room, diameter, "uniforme");
  assert.ok(uniform.length > ambient.length);
  assert.ok(coverageRatio(room, uniform, diameter / 2) > 0.99);
  assert.ok(coverageRatio(room, ambient, diameter / 2) < 0.99);
});

test("suggestLayout respeta formas en L y nunca deja el área sin bocina", () => {
  const lShape = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 6 },
    { x: 0, y: 6 },
  ];

  assert.equal(polygonArea(lShape), 27);
  const speakers = suggestLayout(lShape, 2, "ambiental");
  assert.ok(speakers.length > 0);
  assert.ok(speakers.every((speaker) => pointInPolygon(speaker, lShape)));

  assert.equal(suggestLayout(rectanglePolygon(1, 1), 8, "ambiental").length, 1);
  assert.ok(suggestLayout(rectanglePolygon(60, 60), 0.2, "maxima").length <= 200);
});

test("el pase firmado solo vale con el secreto correcto y antes de vencer", () => {
  const now = Date.UTC(2026, 10, 23);
  const token = createAccessToken(SECRET, 42, now);

  assert.deepEqual(verifyAccessToken(SECRET, token, now)?.accessId, 42);
  assert.equal(verifyAccessToken("x".repeat(40), token, now), null);
  assert.equal(verifyAccessToken(SECRET, token.replace(".42.", ".43."), now), null);
  assert.equal(verifyAccessToken(SECRET, token, now + 31 * 24 * 60 * 60 * 1000), null);
  assert.equal(verifyAccessToken(SECRET, "", now), null);
  assert.equal(verifyAccessToken(SECRET, null, now), null);
});

test("el código de verificación queda ligado a su registro", () => {
  const code = generateVerificationCode();
  assert.match(code, /^\d{6}$/);

  const hash = hashVerificationCode(SECRET, 7, code);
  assert.equal(verificationCodeMatches(SECRET, 7, code, hash), true);
  assert.equal(verificationCodeMatches(SECRET, 8, code, hash), false);
  assert.equal(verificationCodeMatches(SECRET, 7, "12345", hash), false);
  assert.equal(verificationCodeMatches(SECRET, 7, code, null), false);
});

test("normaliza correo y teléfono", () => {
  assert.equal(normalizeEmail("  Ana@Ejemplo.MX "), "ana@ejemplo.mx");
  assert.equal(normalizeEmail("sin-arroba"), null);
  assert.equal(normalizePhone("33 1234 5678"), "33 1234 5678");
  assert.equal(normalizePhone("12345"), null);
});

test("sanitizeDesign rechaza modelos desconocidos y datos fuera de rango", () => {
  const room = {
    id: "a",
    name: "  Sala   principal ",
    points: rectanglePolygon(5, 4),
    ceilingHeight: 2.7,
    posture: "sentado",
    modelId: "kef-ci160er",
    mode: "uniforme",
    speakers: [{ x: 2.5, y: 2 }],
    manual: false,
  };

  const design = sanitizeDesign({ source: "medidas", rooms: [room] });
  assert.equal(design?.rooms[0].name, "Sala principal");
  assert.match(summarizeDesign(design!), /1 × KEF Ci160ER/);

  assert.equal(sanitizeDesign({ rooms: [{ ...room, modelId: "inventado" }] }), null);
  assert.equal(sanitizeDesign({ rooms: [{ ...room, ceilingHeight: 40 }] }), null);
  assert.equal(sanitizeDesign({ rooms: [{ ...room, points: [{ x: 0, y: "a" }] }] }), null);
  assert.equal(sanitizeDesign({ rooms: [] }), null);
  assert.equal(sanitizeDesign(null), null);
});

test("un Sonos Amp mueve cuatro bocinas de 8 Ω, o dos estéreo de doble bobina", () => {
  const amp = DEFAULT_SIMULATOR_AMPLIFIER;
  const mono = getSimulatorSpeaker("kef-ci160er")!;
  const stereo = getSimulatorSpeaker("kef-ci160crds")!;

  assert.equal(speakersPerAmplifier(amp, mono), 4);
  assert.equal(speakersPerAmplifier(amp, stereo), 2);

  assert.equal(amplifiersForRoom(amp, mono, 0), 0);
  assert.equal(amplifiersForRoom(amp, mono, 1), 1);
  assert.equal(amplifiersForRoom(amp, mono, 4), 1);
  assert.equal(amplifiersForRoom(amp, mono, 5), 2);
  assert.equal(amplifiersForRoom(amp, stereo, 3), 2);

  // Sonos no admite más de cuatro bocinas aunque la impedancia lo permitiera.
  assert.equal(speakersPerAmplifier(amp, { ...mono, impedanceOhms: 16 }), 4);

  // Una bocina de 2 Ω no se puede conectar a un amplificador con mínimo de 4 Ω.
  assert.equal(speakersPerAmplifier(amp, { ...mono, impedanceOhms: 2 }), 0);
});

test("cada espacio es una zona y lleva su propio amplificador", () => {
  const room = (id: string, speakers: number, modelId = "kef-ci160er") => ({
    id,
    name: id,
    points: rectanglePolygon(6, 5),
    ceilingHeight: 2.7,
    posture: "sentado",
    modelId,
    mode: "uniforme",
    speakers: Array.from({ length: speakers }, (_, index) => ({ x: 1 + index * 0.5, y: 2 })),
    manual: true,
  });

  const design = sanitizeDesign({
    source: "medidas",
    rooms: [room("Sala", 6), room("Terraza", 2), room("Estudio", 0)],
  })!;
  const plan = amplifierPlan(design);

  // Sala: 6 bocinas → 2 amplificadores. Terraza: 2 → 1. Estudio sin bocinas → 0.
  assert.equal(plan.total, 3);
  assert.equal(plan.zones, 2);
  assert.match(summarizeDesign(design), /Amplificación sugerida: 3 × Sonos Amp \(2 zonas\)/);
});
