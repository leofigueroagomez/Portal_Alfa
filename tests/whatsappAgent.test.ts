import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedPhoneKeys,
  businessClock,
  phoneKey,
  secretsMatch,
  splitReply,
} from "../lib/whatsappAgent/format";
import { POST } from "../app/api/agent/whatsapp/route";

test("phoneKey normaliza telefonos mexicanos a 10 digitos", () => {
  assert.equal(phoneKey("+52 1 33 1234 5678"), "3312345678");
  assert.equal(phoneKey("(33) 1234-5678"), "3312345678");
  assert.equal(phoneKey("12345"), null);
  assert.equal(phoneKey(null), null);
});

test("splitReply separa por linea en blanco y acota a 4 mensajes", () => {
  assert.deepEqual(splitReply("Hola\n\n¿Es para casa?"), ["Hola", "¿Es para casa?"]);
  assert.deepEqual(splitReply("  uno  \n \n dos "), ["uno", "dos"]);
  const many = splitReply("a\n\nb\n\nc\n\nd\n\ne");
  assert.equal(many.length, 4);
  assert.equal(many[3], "d\n\ne");
  assert.deepEqual(splitReply("   "), []);
});

test("businessClock respeta el horario L-V 9-18 en Guadalajara", () => {
  // 2026-10-28 es miercoles; 16:00 UTC = 10:00 en Guadalajara.
  assert.equal(businessClock(new Date("2026-10-28T16:00:00Z")).inHours, true);
  // 01:00 UTC del jueves = 19:00 del miercoles en Guadalajara.
  assert.equal(businessClock(new Date("2026-10-29T01:00:00Z")).inHours, false);
  // Sabado 2026-10-31 a las 12:00 en Guadalajara.
  assert.equal(businessClock(new Date("2026-10-31T18:00:00Z")).inHours, false);
});

test("secretsMatch compara en tiempo constante", async () => {
  assert.equal(await secretsMatch("abc", "abc"), true);
  assert.equal(await secretsMatch("abc", "abcd"), false);
});

function request(body: unknown, authorization?: string) {
  return new Request("http://localhost/api/agent/whatsapp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("la ruta falla cerrada si falta WHATSAPP_AGENT_SECRET", async () => {
  delete process.env.WHATSAPP_AGENT_SECRET;
  const response = await POST(request({ subscriber_id: "1", text: "hola" }, "Bearer x"));
  assert.equal(response.status, 503);
});

test("la ruta rechaza secreto ausente o incorrecto", async () => {
  process.env.WHATSAPP_AGENT_SECRET = "secreto-de-prueba";
  assert.equal((await POST(request({ subscriber_id: "1", text: "hola" }))).status, 401);
  assert.equal(
    (await POST(request({ subscriber_id: "1", text: "hola" }, "Bearer otro"))).status,
    401
  );
  assert.equal(
    (await POST(request({ subscriber_id: "1", text: "hola" }, "secreto-de-prueba"))).status,
    401
  );
});

test("allowedPhoneKeys arma la lista del piloto", () => {
  assert.equal(allowedPhoneKeys(""), null);
  assert.equal(allowedPhoneKeys(undefined), null);
  const keys = allowedPhoneKeys("+52 1 33 1234 5678, 3398765432, basura");
  assert.deepEqual([...(keys || [])].sort(), ["3312345678", "3398765432"]);
});

test("con lista de piloto, la ruta ignora otros numeros sin tocar la base", async () => {
  process.env.WHATSAPP_AGENT_SECRET = "secreto-de-prueba";
  process.env.WHATSAPP_AGENT_ALLOWED_PHONES = "3312345678";
  try {
    const response = await POST(
      request(
        { subscriber_id: "42", text: "hola", phone: "+5213300000000" },
        "Bearer secreto-de-prueba"
      )
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ignored, true);
  } finally {
    delete process.env.WHATSAPP_AGENT_ALLOWED_PHONES;
  }
});

test("la ruta valida subscriber_id antes de tocar la base", async () => {
  process.env.WHATSAPP_AGENT_SECRET = "secreto-de-prueba";
  const response = await POST(
    request({ subscriber_id: "abc;drop", text: "hola" }, "Bearer secreto-de-prueba")
  );
  assert.equal(response.status, 400);
});
