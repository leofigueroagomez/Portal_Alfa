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
- Reparto en reticula sobre la caja envolvente del area; se descartan las celdas cuyo centro cae fuera. La separacion depende del ambiente (ver "Ambientes y volumen").
- "Area cubierta" se estima por muestreo. Es una estimacion geometrica, no un estudio acustico; el texto del simulador lo dice.

## Ambientes y volumen

El visitante no elige un "tipo de cobertura": elige un ambiente. Las llaves internas siguen siendo `ambiental`, `uniforme` y `maxima` (ya viajan en los diseños guardados); lo que cambia es como se presentan y que cada una trae un nivel objetivo.

| Llave | Se muestra como | Separacion entre bocinas | Nivel objetivo |
| --- | --- | --- | --- |
| `ambiental` | Ambiental | `D` | 65 dB |
| `uniforme` | Convivencia | `D/√2` | 78 dB |
| `maxima` | Fiesta | `D/2` | 90 dB |

Los niveles objetivo son referencias de diseño de ALFA, no una norma. Pendiente de validar con Leo.

`lib/simuladorAudio/loudness.ts` estima que tan fuerte se va a escuchar:

- Sonido directo: sensibilidad de la bocina + potencia que le toca − distancia al oyente, sumando todas las bocinas del espacio. Fuera del cono o abanico de cobertura se restan 6 dB.
- Potencia por bocina: la del canal del amplificador repartida entre las bocinas de ese canal, con tope en la potencia maxima que recomienda el fabricante de la bocina. No se cuenta la potencia extra a 4 Ω porque Sonos no la publica.
- Se restan 10 dB (`MUSIC_HEADROOM_DB`) para que el nivel sea el sostenido con musica y no el pico.
- El nivel del espacio es el que se alcanza en al menos 90% del area. Veredicto contra el objetivo: 6 dB o mas arriba "llega con margen", entre 0 y 6 "llega justo", abajo "se queda corto".
- No cuenta el rebote del cuarto. En interiores se queda corto; en exteriores se acerca mas. El texto del medidor lo dice.

En pantalla: el medidor "Asi se va a escuchar" debajo del plano, y el interruptor Cobertura / Volumen que cambia las huellas por un mapa de volumen (escala del propio espacio: del punto mas suave al mas fuerte).

Pendiente: demo de audio para comparar ambientes de oido. Necesita una pista de musica con derechos de uso.

## Presentacion

- Las fotos de los equipos viven en `public/simulador/` y se copiaron del bucket publico `product-images` de ALFA OS. Cada modelo guarda su ruta en `image`. En el catalogo interno la KEF Ci160ER y la Ci160TR tienen la misma foto.
- `app/simulador-audio/SimulatorParts.tsx`: tarjetas de bocina con foto, tarjetas de ambiente, medidor de volumen y miniaturas de "Tu sistema".
- El panel se lee en tres pasos: Tu espacio, El ambiente, Tus bocinas.

## Bocinas de muro

Un modelo con `mount: "muro"` cubre un abanico en lugar de un circulo: apertura `dispersionDeg` y alcance `reachM`. La altura del plafon y la postura no entran en ese calculo y el panel las oculta.

- La bocina vive pegada a una pared (`snapToWall`) y guarda hacia donde apunta (`angle`, en grados). Al arrastrarla se desliza sobre la pared mas cercana y queda perpendicular; el punto pequeño la gira.
- Reparto automatico (`suggestWallLayout`): busca cubrir 75% (ambiental), 90% (convivencia) o 98% (fiesta) del area. Primero arma un reparto libre sobre todo el perimetro; despues prefiere uno ordenado sobre una sola pared solo si no usa mas bocinas.
- **B&W AM-1: 90° de apertura y 6 m de alcance son criterio de diseño de ALFA**, aprobado por Leo el 2026-11-23. B&W no publica angulo, grafica polar ni archivo de simulacion de ese modelo. El simulador lo dice junto al selector y en la nota de "Tu sistema". Si Dextra consigue el dato real, se cambia en `speakers.ts` y se pone `coverageBasis: "fabricante"`.

## Catalogo de bocinas

`lib/simuladorAudio/speakers.ts`. Regla dura: `dispersionDeg` solo lleva el angulo que publica el fabricante, con su fuente. Sin precios.

- Activos de plafon: KEF Ci160ER (110°), KEF Ci160TR (160°), KEF Ci160CRds (120°), Bose DesignMax DM6C (120°).
- Activo de muro: B&W AM-1 (90° y 6 m, criterio de ALFA).
- Pendientes (`PENDING_SIMULATOR_SPEAKERS`): B&W CCM665, Sonance VPXT6R y Klipsch CS-18C (el fabricante no publica angulo); Yamaha VS4 (de muro; Yamaha publica 110° × 110°, falta definir su alcance); Sonance VXXT8RW (la ficha dice que es subwoofer; pendiente de confirmar contra el catalogo interno).

## Amplificacion

`lib/simuladorAudio/amplifiers.ts`. El simulador propone el amplificador ademas de las bocinas. Hoy solo el Sonos Amp (producto 19), que es el que ALFA instala por defecto.

- Cada espacio es una zona y lleva al menos un amplificador.
- Capacidad por amplificador: bocinas en paralelo sin bajar de la carga minima del canal ni pasar el tope del fabricante. Con el Sonos Amp (2 canales, minimo 4 Ω, maximo 4 bocinas segun Sonos) son cuatro bocinas de 8 Ω, o dos si la bocina es estereo de doble bobina (KEF Ci160CRds, `amplifierChannels: 2`). Sonos permite seis solo con sus bocinas Sonos Architectural, que no estan en el catalogo.
- Amplificadores del espacio = bocinas ÷ capacidad, redondeado hacia arriba. Sale en "Tu sistema", en el desglose por espacio y en el resumen que llega al prospecto.
- Los amplificadores de Dextra y Biamp entran cuando llegue lleno [`FORMULARIO_AMPLIFICADORES.md`](./FORMULARIO_AMPLIFICADORES.md). Ese formulario tambien pide los angulos de cobertura que faltan (B&W AM-1 y CCM665, Sonance VPXT6R, Klipsch CS-18C).
- Pendiente: elegir entre varios amplificadores, agrupar espacios en una sola zona y lineas de 70/100 V.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `SIMULADOR_ACCESS_SECRET` | Firma del pase y de los codigos. Minimo 32 caracteres. Sin ella el registro responde 503. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio del codigo (ya existen para otros correos). |
| `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` | Opcional. Sin Redis el limite de intentos es por instancia. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Opcional. Con las dos, el registro exige Cloudflare Turnstile (ver `docs/ai/SECURITY_RULES.md`). |

## Pendientes

- Probar el registro de punta a punta en produccion: correo real, codigo, prospecto en `/leads` y solicitud de propuesta (no se pudo probar en local: sin Resend ni base).
- Fase 2: mapa de nivel sonoro, bocinas de muro (B&W AM-1), amplificadores de Dextra y Biamp, recibir el plano.
- Turnstile esta en codigo (`components/TurnstileWidget.tsx`) pero apagado hasta que existan sus dos variables en Vercel. Sin ellas el registro se protege con campo trampa, limite por IP, por correo y global.
