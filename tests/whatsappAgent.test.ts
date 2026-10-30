import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedPhoneKeys,
  businessClock,
  parseInbound,
  phoneKey,
  sameTagName,
  secretsMatch,
  splitReply,
} from "../lib/whatsappAgent/format";
import { POST } from "../app/api/agent/whatsapp/route";
import { recognizeContact } from "../lib/whatsappAgent/context";
import type { SupabaseClient } from "@supabase/supabase-js";

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

test("parseInbound acepta la plantilla propia y Full Contact Data de ManyChat", () => {
  assert.deepEqual(
    parseInbound({ subscriber_id: "123", text: " hola ", phone: "+52 33 1234 5678", name: "Ana" }),
    { subscriberId: "123", text: "hola", phone: "+523312345678", name: "Ana" }
  );
  const fullContact = {
    id: 987654321,
    first_name: "Leo",
    last_name: "Figueroa",
    whatsapp_phone: "+5213312345678",
    last_input_text: "Hola\nquiero cotizar \"cámaras\"",
    custom_fields: { secreto: "no se usa" },
  };
  assert.deepEqual(parseInbound(fullContact), {
    subscriberId: "987654321",
    text: "Hola\nquiero cotizar \"cámaras\"",
    phone: "+5213312345678",
    name: "Leo Figueroa",
  });
  assert.equal(parseInbound({ contact: fullContact }).subscriberId, "987654321");
  assert.equal(parseInbound(null).subscriberId, "");
});

test("sameTagName ignora acentos, mayusculas y espacios", () => {
  assert.equal(sameTagName("Atención humana", "atencion humana "), true);
  assert.equal(sameTagName("Atención humana", "Visita por agendar"), false);
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

// Supabase minimo: cada tabla devuelve sus filas sin importar los filtros.
function fakeSupabase(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const rows = tables[table] || [];
      const builder: Record<string, unknown> = {
        then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      };
      for (const method of ["select", "eq", "not", "in", "order", "limit"]) builder[method] = () => builder;
      return builder;
    },
  } as unknown as SupabaseClient;
}

test("recognizeContact reconoce al aliado comercial antes que al cliente", async () => {
  const supabase = fakeSupabase({
    commercial_partners: [
      { id: 2, commercial_name: "Kybit", contact_name: "Cesar Rico", contact_phone: "33 2367 5636" },
    ],
    clients: [{ id: 23, name: "Cesar Rico", company: null, company_name: "Kybit", phone: "3323675636" }],
  });
  const recognition = await recognizeContact(supabase, "+5213323675636", null);
  assert.equal(recognition.clientId, null);
  assert.equal(recognition.lines.length, 1);
  assert.match(recognition.lines[0], /aliado comercial de ALFA: Cesar Rico, de Kybit/);
});

test("recognizeContact sigue reconociendo clientes que no son aliados", async () => {
  const supabase = fakeSupabase({
    commercial_partners: [
      { id: 2, commercial_name: "Kybit", contact_name: "Cesar Rico", contact_phone: "33 2367 5636" },
    ],
    clients: [{ id: 9, name: "Ana", company: null, company_name: null, phone: "33 1111 2222" }],
  });
  const recognition = await recognizeContact(supabase, "+523311112222", null);
  assert.equal(recognition.clientId, 9);
  assert.match(recognition.lines[0], /coincide con un cliente de ALFA: Ana/);
});
