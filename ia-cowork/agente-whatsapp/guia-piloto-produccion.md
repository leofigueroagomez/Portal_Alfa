# Piloto en producción: el agente de WhatsApp solo para el número de Leo

> 2026-10-28. Rama `feat/agente-whatsapp-claude`. Durante el piloto, Claude contesta **solo** a tu número. A todos los demás los sigue atendiendo el flujo actual de ManyChat, sin cambios.

Hay dos candados para que ningún cliente note el piloto:
1. **En ManyChat:** una condición manda a ALFA OS solo tus mensajes.
2. **En ALFA OS:** `WHATSAPP_AGENT_ALLOWED_PHONES` ignora cualquier otro número, aunque llegue por error.

---

## Paso 1 · Tú: generar el secreto (1 min)

En la terminal del proyecto corre:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el texto que sale. Lo vas a pegar en dos lugares: en Vercel (paso 3) y en ManyChat (paso 6). No lo compartas en el chat.

## Paso 2 · Tú: token de la API de ManyChat (2 min)

En ManyChat: **Configuración → API → Generar token**. Copia el token.

## Paso 3 · Tú: variables en Vercel (5 min)

En Vercel ve a **portal-alfa → Settings → Environment Variables**. Agrega cada variable **solo en Production**, sin marcar Preview:

| Variable | Valor |
| --- | --- |
| `WHATSAPP_AGENT_SECRET` | El texto del paso 1 |
| `MANYCHAT_API_TOKEN` | El token del paso 2 |
| `WHATSAPP_AGENT_ALLOWED_PHONES` | Tu celular a 10 dígitos (por ejemplo `33XXXXXXXX`) |

`ANTHROPIC_API_KEY` ya existe en producción, así que no hay que tocarla.

## Paso 4 · Tú: etiqueta y automatización en ManyChat (3 min)

1. Crea la etiqueta **Atención humana**. "Visita por agendar" ya existe.
2. Crea una regla: **cuando se agrega la etiqueta "Atención humana"** → asignar la conversación a Leonardo Figueroa y marcarla como abierta. Son las mismas acciones de tu bloque amarillo actual.

## Paso 5 · Yo: base de datos y despliegue (cuando me digas)

Cuando termines los pasos 1 a 4:
1. Aplico la migración `20261028_whatsapp_agent` en **producción**. Solo crea tablas nuevas y agrega "WhatsApp" como origen de leads. Tiene rollback.
2. Fusiono la rama a `main` y hago push. Vercel despliega producción con las variables nuevas.
3. Compruebo que `https://portal.alfait.com.mx/api/agent/whatsapp` responda "No autorizado" a una llamada sin secreto. Eso confirma que está arriba y protegida.

## Paso 6 · Tú (yo te guío con capturas): el flujo de ManyChat (10 min)

En el flujo **Atención a Clientes**, justo después de "Cuando… el usuario envía un mensaje":

1. Agrega un bloque **Condición**: *Teléfono* contiene tus 10 dígitos.
   - **Sí** → bloque **Acción → External Request** (lo de abajo).
   - **No** → el **AI Step** actual, tal como está.
2. Configura el External Request:
   - **Método:** POST
   - **URL:** `https://portal.alfait.com.mx/api/agent/whatsapp`
   - **Headers:** `Authorization` = `Bearer ` seguido del texto del paso 1 (con un espacio después de *Bearer*).
   - **Body (JSON):**
     ```json
     {
       "subscriber_id": "{{ID del contacto}}",
       "text": "{{Última entrada de texto}}",
       "phone": "{{Teléfono}}",
       "name": "{{Nombre completo}}"
     }
     ```
     Los `{{…}}` no se escriben a mano: se insertan con el botón de campos de ManyChat. Los nombres pueden variar un poco.
   - Usa **"Probar la solicitud"**. Debe responder `{"ok":true,...}`.
3. Guarda y publica.

## Paso 7 · Los dos: prueba desde tu WhatsApp (15 min)

Escríbele al número de ALFA desde tu celular. Repite las situaciones de la prueba local: pregunta por cámaras, pregunta el precio, da tu nombre, reporta una falla y pide hablar con una persona. Yo reviso en producción la transcripción, el lead que se crea y los logs de Vercel.

Un detalle: como tu número sí está en Clientes, el agente puede reconocerte y saludarte por tu nombre.

## Para encenderlo para todos (después del piloto)

1. En ManyChat, quita la condición y el AI Step: todos los mensajes van al External Request.
2. En Vercel, borra `WHATSAPP_AGENT_ALLOWED_PHONES` y vuelve a desplegar.

## Si algo sale mal

- **Apagarlo de inmediato:** en ManyChat, quita la condición para que todo vuelva al AI Step. No hace falta tocar código.
- **Base de datos:** `sql/20261028_whatsapp_agent_rollback.sql`.
- **Código:** revertir el merge en `main`.
