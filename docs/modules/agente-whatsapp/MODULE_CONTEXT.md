# Modulo: Agente de WhatsApp (Claude)

Contexto para agentes que modifiquen el asistente de WhatsApp ("Ale") que atiende prospectos y clientes. Antes de tocar la ruta, las tablas o los secretos, revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).

Estado: codigo en rama `feat/agente-whatsapp-claude` (2026-10-28). Migracion `sql/20261028_whatsapp_agent.sql` **aplicada en sandbox** (`alfa-os-sandbox`, 2026-10-28, con smoke de insercion/borrado) y **en produccion** (Alfa IT, 2026-10-28). Piloto limitado por `WHATSAPP_AGENT_ALLOWED_PHONES` al numero de Leo. Probado localmente contra el sandbox el 2026-10-28 (prospecto con registro de lead, emergencia con handoff, soporte, fuera de zona, silencio durante handoff, agrupado de mensajes seguidos, cache de prompt). Sin probar: el envio real por ManyChat (`sendContent`, etiquetas) y el flujo de ManyChat.

Ojo: en Vercel, `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` aplican a production **y** preview (2026-10-28): un preview escribe en la base de produccion. Por eso la prueba fue local con `.env.development.local` apuntando al sandbox.

## Que Hace

ManyChat sigue siendo el canal (numero de WhatsApp, bandeja, etiquetas, asignacion a personas). El cerebro vive en ALFA OS:

1. ManyChat, en cada mensaje del cliente, hace un **External Request** a `POST /api/agent/whatsapp`.
2. La ruta valida el secreto, encola el mensaje y responde 200 de inmediato (ManyChat corta a los ~10 s).
3. Con `after()`, espera 5 s (para juntar mensajes seguidos), toma un candado por conversacion y corre a Claude.
4. Claude responde con el prompt fijo de `lib/whatsappAgent/prompt.ts`, el contexto del turno (hora en Guadalajara, cliente reconocido por telefono, garantias) y dos herramientas.
5. La respuesta sale por la API de ManyChat (`sendContent`) y se ve en la bandeja de ManyChat como cualquier mensaje.

## Herramientas Del Agente

| Herramienta | Que hace |
| --- | --- |
| `registrar_prospecto` | Crea o actualiza un lead (`source = 'WhatsApp'`) ligado a la conversacion y pone la etiqueta `MANYCHAT_TAG_LEAD` (por defecto "Visita por agendar"). |
| `pasar_a_persona` | Marca la conversacion en `handoff` (el agente deja de contestar) y pone la etiqueta `MANYCHAT_TAG_HANDOFF` (por defecto "Atención humana"). El agente retoma cuando alguien **quita esa etiqueta** en ManyChat (se revisa con `getInfo` en cada mensaje) o a las 24 h. |

En ManyChat, las automatizaciones por etiqueta deciden que pasa despues (asignar a Leonardo Figueroa, marcar como abierta).

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `app/api/agent/whatsapp/route.ts` | Entrada desde ManyChat: secreto Bearer, validacion, rate limit, cola y `after()`. |
| `lib/whatsappAgent/agent.ts` | Candado, turnos, loop de herramientas con el SDK de Anthropic, transcripcion append-only, envio. |
| `lib/whatsappAgent/prompt.ts` | Prompt fijo (voz, flujo de ventas, pasos de soporte, limites). Cambiarlo invalida la cache una vez. |
| `lib/whatsappAgent/context.ts` | Reconocimiento por telefono (clientes, contacto de obra, leads previos) y contexto por turno. |
| `lib/whatsappAgent/tools.ts` | Definicion y ejecucion de herramientas. |
| `lib/whatsappAgent/manychat.ts` | `sendContent`, `addTagByName`, `setCustomFieldByName` y `getInfo` (etiquetas) de la API de ManyChat. |
| `lib/whatsappAgent/format.ts` | Utilidades puras (telefono, partir mensajes, horario, comparacion de secretos). |
| `tests/whatsappAgent.test.ts` | `npm run test:whatsapp-agent`. |
| `sql/20261028_whatsapp_agent.sql` | Tablas `whatsapp_agent_*` y `'WhatsApp'` en `leads_source_check`. Rollback: `_rollback.sql`. |

## Tablas

- `whatsapp_agent_conversations`: una por contacto de ManyChat; estado `active`/`handoff`, lead y cliente ligados, candado de corrida.
- `whatsapp_agent_inbound`: cola de lo que llega de ManyChat.
- `whatsapp_agent_messages`: transcripcion que se reenvia a Claude. **Append-only**: no editar, borrar ni reordenar filas de una conversacion viva; Claude valida que el historial sea el mismo turno a turno (bloques de thinking) y la cache depende del prefijo. `content` es `json` (no `jsonb`) para conservar el texto exacto.

Las tres tienen RLS activo sin policies y sin grants para `anon`/`authenticated`: solo `service_role`.

## Variables De Entorno

| Variable | Uso |
| --- | --- |
| `ANTHROPIC_API_KEY` | Ya existe en produccion (Vigia, cotizacion por voz). |
| `WHATSAPP_AGENT_SECRET` | Secreto que ManyChat manda en `Authorization: Bearer`. Sin el, la ruta responde 503. |
| `MANYCHAT_API_TOKEN` | Token de la API de ManyChat (Settings > API). Sin el, el agente corre pero no envia (queda en logs). |
| `WHATSAPP_AGENT_MODEL` | Opcional. Por defecto `claude-opus-5-5`. |
| `WHATSAPP_AGENT_EFFORT` | Opcional. Por defecto `low` (chat). |
| `MANYCHAT_TAG_LEAD`, `MANYCHAT_TAG_HANDOFF` | Opcionales. Nombres exactos de etiquetas en ManyChat. |
| `MANYCHAT_FIELD_SUMMARY` | Opcional. Campo de texto del contacto (por defecto "Resumen para el equipo") donde el agente escribe el resumen al registrar un prospecto o pasar a persona. Debe existir en ManyChat. |

## Configuracion En ManyChat

Flujo "Atencion a Clientes": disparador "El usuario envía un mensaje" → bloque **Acción → External Request**:

- Metodo `POST`, URL `https://<dominio de ALFA OS>/api/agent/whatsapp`.
- Header `Authorization: Bearer <WHATSAPP_AGENT_SECRET>`.
- Body: solo **"+ Añadir Full Contact Data"** (ManyChat arma y escapa el JSON). No usar una plantilla propia con "Ultima entrada de texto": ManyChat no escapa saltos de linea ni comillas y el JSON se rompe (comprobado 2026-10-28). `parseInbound` toma `id`, `last_input_text`, `whatsapp_phone`/`phone` y el nombre; descarta el resto.
- Quitar el AI Step: si siguen los dos, el cliente recibe dos respuestas.

Confirmado el 2026-10-28 en produccion: External Request con Full Contact Data (el numero llega en `whatsapp_phone`; `phone` viene null) y respuesta entregada por `sendContent` v2. La condicion del flujo debe usar el campo **WhatsApp ID**, no "Telefono". Pendiente de confirmar: `addTagByName`.

## Riesgos

- `.env.local` apunta a la base de produccion: no correr el agente localmente con secretos reales.
- Reconocer por telefono no autentica. El prompt prohibe leer datos que el cliente no menciono; el contexto no incluye direcciones, saldos ni RFC. No agregar esos datos al contexto.
- Solo 7 de 78 clientes tienen telefono capturado (2026-10-28): el reconocimiento casi no funcionara hasta capturar telefonos.
- Si ManyChat reintenta un External Request, el mensaje se encola dos veces (no hay llave de idempotencia).
