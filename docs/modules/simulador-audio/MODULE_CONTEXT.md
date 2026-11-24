# Simulador de Audio

Herramienta publica en `/simulador-audio` para que un prospecto calcule cuantas bocinas de plafon necesita su espacio y donde van. Es captacion de prospectos (inbound): quien no tiene sesion de ALFA deja sus datos y verifica su correo antes de usarla.

Estado: fase 1 en codigo (2026-11-23). La migracion `sql/20261123_simulador_audio.sql` se aplico en produccion el 2026-11-23 y `SIMULADOR_ACCESS_SECRET` existe en Vercel (solo Production). Pendiente de probar el registro de punta a punta ya desplegado.

## Rutas

| Ruta | Que hace |
| --- | --- |
| `app/simulador-audio/page.tsx` | Pagina publica. Decide en el servidor si muestra el simulador o el registro. |
| `app/simulador-audio/AccessGate.tsx` | Formulario de registro, reingreso y captura del codigo. |
| `app/simulador-audio/Simulator.tsx` | Simulador (modo medidas y modo plano), lista de equipos y solicitud de propuesta. |
| `app/simulador-audio/PlanCanvas.tsx` | Vista de planta en SVG: areas, huella de cobertura, arrastre de bocinas, escala y dibujo. |
| `app/simulador-audio/planFile.ts` | Carga del plano (PDF con `pdfjs-dist`, JPG, PNG) dentro del navegador. |
| `POST /api/simulador-audio/registro` | Alta o reingreso: manda el codigo de 6 digitos por Resend. |
| `POST /api/simulador-audio/verificar` | Valida el codigo, crea el prospecto y entrega el pase (cookie). |
| `POST /api/simulador-audio/propuesta` | Guarda el diseño del visitante y lo deja en su prospecto. |

Logica en `lib/simuladorAudio/`: `geometry.ts` (calculo), `speakers.ts` (catalogo), `design.ts` (modelo y validacion del diseño), `access.ts` (pase y codigos), `leads.ts` (prospecto), `email.ts` (correo). Pruebas en `tests/simuladorAudio.test.ts`.

## Acceso

1. **Con sesion de ALFA** (interno o portal cliente, perfil activo): entra directo. Ligas en el menu de ALFA OS (`components/AdminShell.tsx`) y en el portal cliente (`app/portal/page.tsx`). La sesion vive en el host donde se inicio, asi que la liga es relativa.
2. **Visitante**: nombre, correo, telefono y aceptacion del aviso de privacidad. Recibe un codigo de 6 digitos (vence en 15 minutos, 5 intentos). Al validarlo obtiene la cookie `alfa_sim_access` (httpOnly, 30 dias), firmada con HMAC-SHA256 y `SIMULADOR_ACCESS_SECRET`.
3. **Reingreso**: solo el correo; si ya esta verificado se le manda un codigo nuevo. La respuesta es la misma exista o no el correo.

### Por que los visitantes no son usuarios de Supabase Auth

`handle_new_user_profile()` y `ensure_current_user_profile()` dejan como interno `comercial` a cualquier usuario nuevo sin metadata de portal (ver `docs/ai/SECURITY_RULES.md`). Un alta publica sobre Auth daria acceso a ALFA OS. Por eso el visitante es una fila en `simulator_access` mas un pase firmado, sin cuenta. No cambiar esto sin corregir antes ese default.

El candado es de captacion, no de confidencialidad: el simulador corre en el navegador y no expone datos de negocio.

## Datos

- `simulator_access`: una fila por correo. Guarda el hash del codigo vigente, nunca el codigo.
- `simulator_designs`: diseño enviado con "Solicitar propuesta" (JSON validado por `sanitizeDesign`).
- `leads`: al verificar el correo se crea el prospecto con `source = 'Simulador de Audio'`, `interest = 'Audio y video'` y el correo en `raw_payload.email` (la tabla no tiene columna de correo). `customer_type` entra como `residencial` y se corrige cuando el visitante pide propuesta. Quien no verifica no genera prospecto.
- Las tres rutas escriben con `service_role`. Las tablas nuevas tienen RLS activo, sin policies y sin grants para `anon`/`authenticated`.
- El plano no se sube a ningun servidor: se queda en el navegador. Pendiente de fase 2 si se quiere recibirlo (requiere bucket privado).

## Calculo

- Diametro de cobertura: `D = 2·(H−h)·tan(A/2)`. `H` = altura del plafon, `h` = oido (sentado 1.30 m, de pie 1.75 m), `A` = angulo de cobertura del fabricante.
- `A` se limita a 120° (`MAX_EFFECTIVE_DISPERSION_DEG`): en ese borde el nivel ya cae 6 dB solo por distancia. Decision de modelado de la fase 1, pendiente de validar con Leo.
- Reparto en reticula sobre la caja envolvente del area; se descartan las celdas cuyo centro cae fuera. Separacion segun el tipo de cobertura: ambiental `D`, uniforme `D/√2`, maxima `D/2`.
- "Area cubierta" se estima por muestreo. Es una estimacion geometrica, no un estudio acustico; el texto del simulador lo dice.

## Catalogo de bocinas

`lib/simuladorAudio/speakers.ts`. Regla dura: `dispersionDeg` solo lleva el angulo que publica el fabricante, con su fuente. Sin precios.

- Activos: KEF Ci160ER (110°), KEF Ci160TR (160°), KEF Ci160CRds (120°), Bose DesignMax DM6C (120°).
- Pendientes (`PENDING_SIMULATOR_SPEAKERS`): B&W CCM665, Sonance VPXT6R y Klipsch CS-18C (el fabricante no publica angulo); B&W AM-1 y Yamaha VS4 (bocinas de muro, necesitan el modelo de fase 2); Sonance VXXT8RW (la ficha dice que es subwoofer; pendiente de confirmar contra el catalogo interno).

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SIMULADOR_ACCESS_SECRET` | Firma del pase y de los codigos. Minimo 32 caracteres. Sin ella el registro responde 503. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio del codigo (ya existen para otros correos). |
| `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` | Opcional. Sin Redis el limite de intentos es por instancia. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Opcional. Con las dos, el registro exige Cloudflare Turnstile (ver `docs/ai/SECURITY_RULES.md`). |

## Pendientes

- Probar el registro de punta a punta en produccion: correo real, codigo, prospecto en `/leads` y solicitud de propuesta (no se pudo probar en local: sin Resend ni base).
- Fase 2: mapa de nivel sonoro, bocinas de muro, zonas con amplificador, recibir el plano.
- Turnstile esta en codigo (`components/TurnstileWidget.tsx`) pero apagado hasta que existan sus dos variables en Vercel. Sin ellas el registro se protege con campo trampa, limite por IP, por correo y global.
