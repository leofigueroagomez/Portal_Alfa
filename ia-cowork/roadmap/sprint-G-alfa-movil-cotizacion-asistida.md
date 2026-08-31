# Sprint G — ALFA OS Móvil + Cotización Asistida

- **Autor / líder:** Claude
- **Fecha:** 2026-09-01
- **Estado:** APROBADO por Leo el 2026-09-01 ("todas las cosas que propusiste, todas las quiero hacer").
- **Depende de / se acopla con:** Sprint F (reglas de ingeniería `ING-*`). Ver §5.
- **Referencia:** conversación 2026-09-01 (Leo: cotizar simple desde el celular; el objetivo utópico es que su trabajo sea *revisar y autorizar* borradores, y que su tiempo libre sea buscar proyectos y tener vida).

---

## 1. El objetivo real

Hoy ALFA OS en PC es práctico; en celular es inusable (layouts de escritorio, tablas con scroll lateral, toques diminutos, navegación de menú lateral). Leo quiere:

1. **Corto plazo:** poder armar una cotización simple desde el celular sin sufrir.
2. **Destino:** una IA lo bastante entrenada como para que él solo **revise borradores de cotización y los autorice**. Liberar su tiempo.

Esto es la misma arquitectura del Vigía (herramientas deterministas + una llamada al modelo + humano autoriza), pero **actuando sobre la instrucción de Leo** en vez de solo observar.

---

## 2. El modelo: no es un interruptor, es una curva de confianza

"La IA cotiza, yo autorizo" se enciende **tipo de cotización por tipo**, igual que el Vigía se encendió sensor por sensor:

| Llegan primero a "solo autorizar" | Se quedan con Leo más tiempo (o siempre) |
| --- | --- |
| Paquetes estándar y repetidos: CCTV residencial 4–6 cámaras, control de acceso de 1 puerta, red de casa media, kit de alarma básico | Integraciones grandes, automatización fina, lo novedoso, lo que necesita ingeniería a la medida |

Los proyectos que se quedan con Leo son justo los interesantes — los que quiere estar buscando.

**La IA no hace la matemática.** Márgenes, costo indirecto, MISC, tipo de cambio, numeración: eso ya está escrito y es determinista. La IA solo **elige cliente + productos del catálogo + cantidades**; el sistema calcula el resto y guarda un `borrador`.

---

## 3. Fases

### G1 — Cascarón móvil (PWA + navegación)
- `manifest.json` + service worker + iconos/splash. Instalable, icono propio, pantalla completa, sin barra de URL, listo para push.
- `<MobileShell>`: barra de pestañas inferior (Inicio / Proyectos / Vigía / Buscar / + Nuevo). Detección de móvil.
- Versiones mobile-first (tarjetas, una columna, toques grandes) de las pantallas que Leo *lee* en el celular: brief/Bandeja del Vigía, proyecto de un vistazo (compras, entregas, mano de obra, pagos), lista de cotizaciones.
- Lo pesado (editar cotización de 40 líneas, admin masivo) se queda solo-escritorio y está bien.
- **Sin backend nuevo.** ~1–1.5 sem. Owner: Antigravity (UI) + Claude (review).
- Nota: el **ALFA Design System v1** (Apple/Porsche/B&O, "menos elementos, más espacio, evitar tablas y cajas") ya es una filosofía mobile-first. Esto es cumplirlo donde más importa.

### G2 — Módulo de servidor "crear/editar borrador de cotización"
- Sacar el motor de precios de `app/(admin)/quotes/new/page.tsx` (hoy vive en un componente cliente gigante) a `lib/quotes/draftBuilder.ts` (servidor).
- Contrato: dado `{ client_id, items: [{ product_id, qty, margin? }], labor?, indirect_percent?, notes? }` → arma una cotización `draft` completa y válida (secciones, `quote_items` con todos los campos derivados, MISC, FX, numeración) y la inserta.
- **Es el habilitador de todo lo demás** (plantillas, voz, IA).
- ~1.5–2 sem. Owner: Claude (tiene el contexto profundo de la matemática de precios y del trabajo post-P48).
- **Riesgo: medio.** Los totales tienen que cuadrar exacto con el cálculo del cliente. Mitigación: pruebas golden — recalcular N cotizaciones existentes con el módulo nuevo y exigir los mismos totales.

### G3 — Plantillas / paquetes estándar
- Tabla `quote_templates`: nombre, descripción, escenario objetivo, `items` por defecto (product_id + qty), mano de obra por defecto, margen por defecto.
- Leo define 5–10: "CCTV residencial 4 cám", "Control acceso 1 puerta", "Red casa media", etc.
- Flujo móvil: elegir plantilla → ajustar cantidades + cliente → borrador creado vía G2.
- **Es el atajo real de ahorro de tiempo.** Da ~70% del beneficio mucho antes que la IA completa. Ship inmediatamente después de G2.
- ~1–1.5 sem de build + tiempo de Leo para definir plantillas. Owner: Claude + Leo.

### G4 — Voz / texto → intención → borrador
- Superficie de captura: arrancar con **Atajo de Siri / "Oye Siri, dile a ALFA…"** → `POST /api/quotes/draft-from-intent` con el texto ya transcrito (Siri hace el speech-to-text gratis). Después: PWA con "mantén para hablar" + transcripción (Whisper).
- Motor de intención: **1 llamada al modelo** (patrón B2) con herramientas: `buscar_cliente`, `buscar_producto`, `usar_plantilla`, `crear_borrador`. Bucle de aclaración cuando hay ambigüedad → responde con una pregunta, Leo contesta (voz o toque).
- El borrador **siempre** se abre para revisión. Nunca se envía al cliente ni se timbra.
- Candado de costo mensual (patrón B2). ~$0.05–0.15 USD por comando.
- ~3–4 sem. Owner: Claude. **Riesgo: medio** (el borrador es tosco al principio; por eso siempre se revisa).

### G5 — Captura de correcciones (el volante de inercia)
- Cuando Leo edita y aprueba un borrador (venga de IA, voz o plantilla), guardar el diff: `quote_draft_revisions` — qué propuso la IA vs qué se aprobó (cambios de producto, de cantidad, líneas agregadas/quitadas, margen).
- Alimenta: el contexto del prompt de G4 ("en cotizaciones parecidas Leo suele…"), el refinamiento de plantillas, y más adelante las reglas ING.
- ~1 sem. Owner: Claude.

### G6 — Cotización asistida sin supervisión, por tipo
- Para los tipos de cotización donde G5 muestra que la tasa de corrección bajó de un umbral (p. ej. <10% de líneas cambiadas en las últimas N), el borrador recibe una insignia "listo para autorizar" y se puede aprobar desde el celular con un toque.
- **Requisito:** F2 (reglas `ING-*`) pasando sobre el borrador como red de seguridad de ingeniería (el NVR correcto para el número de cámaras, PoE suficiente, almacenamiento, cable).
- Es el destino. Continuo, no una fecha fija. Owner: Claude + Leo.

---

## 4. Guardarraíles (misma filosofía del Vigía)

- Todo lo que produce voz/IA queda en **`borrador`**. Leo revisa cada uno en una pantalla de verdad.
- La voz/IA **nunca** timbra (el CFDI es fiscal e irreversible), **nunca** manda al cliente, **nunca** mueve dinero. Empezar por **cotizaciones, no facturas**.
- Marcado visible: "generado por voz/IA, revisa todo".
- Candado de costo mensual con corte, como B2.
- Toda estructura nueva → migración en `sql/` + doc.

---

## 5. Acople con Sprint F (reglas de ingeniería)

F es el poste largo de G6. Un borrador no puede llegar a "autorizar de un toque" hasta que las reglas `ING-*` puedan confirmar que el diseño es coherente. Por eso:

- **F acelera.** Los talleres diarios (F1) alimentan a la vez los sensores `ING-*` del Vigía **y** la red de seguridad de la cotización asistida.
- Recomendación: correr F y G acoplados. Cada regla de ingeniería que Leo dicte sirve dos veces.
- Leo necesita comprometer ~30 min/día para F1. **Es lo que hay que arrancar cuanto antes.**

---

## 6. Secuencia (encaja con el roadmap vigente)

| Corre ahora, en paralelo | Owner | Depende de |
| --- | --- | --- |
| G1 cascarón móvil | Antigravity + Claude | — |
| G2 draftBuilder | Claude | — |
| F1 talleres de ingeniería | Leo + Claude | Leo agenda |
| Sprint D (síntesis dirección) | Claude + Antigravity | — |

| Después | Owner | Depende de |
| --- | --- | --- |
| G3 plantillas | Claude + Leo | G2 |
| G4 voz → borrador | Claude | G2, G3 |
| G5 captura de correcciones | Claude | G2 |
| Sprint E (fiscal + auto-remediación) | Claude + Antigravity | E1 con OK de Leo |
| F2 sensores ING | Claude | F1 |
| G6 asistida sin supervisión | Claude + Leo | G5, F2 |

**Arco realista para "todas las cosas" (A–G):** A ✓, B ✓, C ~cerrado. D + E + F + G ≈ **4–7 meses** al ritmo actual (Leo + Claude + Antigravity + ideas de ChatGPT). El alivio grande (móvil + plantillas) aterriza en el **primer mes**.

---

## 7. Backlog

| ~~G1~~ | **HECHO** (2026-09-01): Cascarón PWA (manifest.webmanifest, service worker, viewport cover, apple-web-app) + barra de navegación inferior móvil (`MobileBottomNav`) con safe-areas + drawer móvil optimizado. | Antigravity | Bajo |
| G2 | `lib/quotes/draftBuilder.ts` — motor de precios en servidor + pruebas golden | Claude | Medio |
| G3 | `quote_templates` + flujo móvil "elegir plantilla → ajustar → borrador" | Claude + Leo | Bajo |
| G4 | Voz/texto → intención (Siri Shortcut → endpoint → 1 llamada + herramientas + aclaración) | Claude | Medio |
| G5 | `quote_draft_revisions` — diff propuesto vs aprobado, alimenta G4/plantillas/ING | Claude | Bajo |
| G6 | Insignia "listo para autorizar" por tipo, con F2 como red de seguridad | Claude + Leo | Medio |

---

## 8. Primer arranque recomendado

1. **G1 (cascarón) + G2 (draftBuilder) en paralelo, ya.** Independientes, distinto owner.
2. **F1: Leo agenda el primer taller de ingeniería esta semana.** Es el poste largo.
3. En cuanto G2 esté: **G3 plantillas** — alivio inmediato sin esperar la IA.
