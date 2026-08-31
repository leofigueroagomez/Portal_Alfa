# Sprint H — Cancelación fiscal completa + Uso de CFDI editable

- **Autor / líder:** Claude
- **Fecha:** 2026-09-01
- **Estado:** CODIGO COMPLETO (H1–H4) en rama `sprint-h-cancelacion-fiscal-uso-cfdi`, 2026-09-01. Migracion aplicada en prod. Falta la prueba real en sandbox Facturama con Leo (ver §5 y §8).
- **Módulo:** Facturación (`app/(admin)/invoices/**`, `lib/facturama.ts`, `project_invoices`).
- **Pedido de Leo (2026-09-01):**
  1. "Necesito poder realizar el proceso de cancelación de facturas — los 3 que existen: con relación, sin relación y el otro."
  2. "Necesito poder cambiar el tipo de gasto. A veces me piden adquisición de mercancías (G01) y a veces gastos en general (G03). Necesito poder cambiarlo."

---

## 1. Qué hay hoy (auditado en código + prod)

**Cancelación — YA existe, parcialmente.**

- `lib/facturama.ts: cancelFacturamaInvoice()` → `DELETE cfdi/{id}?type=issued&motive=..&uuidReplacement=..`. Soporta los 4 motivos SAT.
- `app/(admin)/invoices/actions.ts: cancelProjectInvoice()` — server action, valida rol `direccion`, guarda `cancellation_motive`, `cancellation_status`, `cancellation_acuse_xml`, `cancelled_at`, `cancelled_by_user_id`.
- `CancelInvoiceButton.tsx` — modal con selector de motivo (01/02/03/04) + campo UUID sustituto para el 01. Montado en `/invoices` y `/projects/[id]/invoices`.
- Columnas `cancellation_*` **existen en prod**. Todas las facturas `issued`/`paid` tienen `facturama_id` + `sat_uuid`, así que el botón sí aparece.
- RLS endurecida: el cliente público no puede poner `status` en `issued` ni `cancelled`.

**Lo que NO funciona / falta:**

| Hueco | Impacto para Leo |
| --- | --- |
| **Motivo 01 ("con relación") es impracticable.** Pide pegar a mano el UUID del CFDI sustituto, y la factura nueva que lo sustituye **no lleva la relación `04` (Sustitución)** en su XML porque `buildInvoicePayload()` no arma el nodo `Relations`. El SAT / la contadora piden que el sustituto tenga esa relación. Hoy eso solo se puede hacer entrando al portal de Facturama a mano. | No puede cancelar "con relación" de forma correcta desde ALFA OS. |
| **Cancelación pendiente (`requested`, 72 h) nunca se resuelve.** Cuando el SAT deja la cancelación esperando aceptación del receptor, `project_invoices.status` sigue en `issued` y no hay botón para volver a consultar el estado. | Facturas que "ya cancelé" siguen apareciendo como emitidas. Suma saldos que no existen. |
| **El acuse de cancelación no se ve.** `cancellation_acuse_xml` se guarda pero no hay dónde descargarlo. | La contadora pide el acuse y hay que sacarlo de Facturama. |
| **Nunca se ejecutó una cancelación real end-to-end** (el 01/02/03) contra Facturama producción. El código "se verificó contra los docs" pero no se probó con una factura de verdad. | Riesgo: puede fallar en el primer uso real. |
| **`MODULE_CONTEXT.md` dice "Cancelar CFDI: Pendiente de confirmar"** — quedó desactualizado. | Las IAs no saben que ya hay flujo. |

**Uso de CFDI (tipo de gasto) — NO existe como campo editable.**

- El `UsoCFDI` que se timbra sale **fijo del cliente**: `actions.ts` hace `receiver.cfdiUse = getCfdiUseCode(client)` (lee `clients.cfdi_use` / `clients.default_cfdi_use`).
- No hay forma de decir "esta factura va como G01 y la siguiente del mismo cliente como G03". Para cambiarlo hay que editar el cliente completo antes de timbrar y regresarlo después.
- `InvoiceForm.tsx` no muestra ni deja elegir el uso de CFDI.
- La validación por catálogo + tipo de persona ya existe (`getReceiverValidationErrors`), solo hay que alimentarla con el valor por factura.

---

## 2. Alcance del sprint

Cuatro entregables. **H4 primero** (independiente, bajo riesgo, alivio inmediato). Luego H3 → H2 → H1.

### H4 — Uso de CFDI editable por factura  *(el segundo pedido de Leo)*

- **Migración** `sql/2026090X_invoice_cfdi_use.sql`: `alter table project_invoices add column cfdi_use text null;` (nullable; `null` = usar el default del cliente al timbrar). Sin constraint de catálogo en SQL — la validación vive en el server action contra `cfdi_use_catalog`.
- **`InvoiceForm.tsx`**: bloque nuevo "Datos fiscales de esta factura" (o dentro de "Condiciones de pago CFDI") con selector **"Uso del CFDI (tipo de gasto)"**. Opciones de `cfdi_use_catalog` filtradas por tipo de persona inferido del RFC. Default = uso del cliente. Se guarda en `invoicePayload.cfdi_use`.
- **Editar en borrador**: server action `setInvoiceCfdiUse(invoiceId, code)` — guard rol finanzas + `status='draft'` + código válido y activo en catálogo + compatible con tipo de persona. Select inline en la fila del borrador (patrón `InvoiceStatusSelect`). *(No editar vía cliente público; va por admin client, consistente con el endurecimiento previo.)*
- **`actions.ts: stampProjectInvoice`**: agregar `cfdi_use` al `select`; `receiver.cfdiUse = invoice.cfdi_use?.trim() || getCfdiUseCode(client)`. El resto de la validación no cambia.
- **Mostrar** el uso efectivo en la lista de facturas y en el contexto de correo/PDF, para que se vea con qué se timbró.
- **Riesgo: bajo.** No toca cálculo de importes ni IVA. **Codex-ready** con esta spec.
- Owner: **Codex** (implementación) + Claude (review).

### H3 — Endurecer y probar de verdad lo que ya existe (02, 03)

- **Prueba real en sandbox**: timbrar una factura desechable y cancelarla con motivo **02** y con **03**; confirmar que `status` pasa a `cancelled`, que llega el acuse y que la UI lo refleja.
- **Descargar acuse de cancelación**: botón/enlace en facturas `cancelled` → `cancellation_acuse_xml` (y PDF si Facturama lo da). Ruta API con las mismas guardas de acceso fiscal que PDF/XML de factura.
- **Errores legibles**: mapear respuestas de Facturama al cancelar (ya cancelada, en proceso, no encontrada, receptor debe aceptar) a mensajes claros en el modal.
- **Confirmar prod**: el timbrado ya funciona en producción (hay UUIDs reales), así que el `DELETE` debería also — verificar flags y permisos de cancelación en la cuenta Facturama.
- **Actualizar** `docs/modules/facturacion/MODULE_CONTEXT.md`: las filas "Cancelar CFDI / Pendiente de confirmar" pasan a describir el flujo real.
- **Riesgo: medio** (fiscal, pero es sobre todo verificación). Owner: **Claude** + Leo (autoriza la prueba).

### H2 — Resolver cancelación pendiente (`requested` → `canceled` / `rejected`)

- **`lib/facturama.ts: getFacturamaCfdiStatus(facturamaId, env?)`** — consulta el estado de cancelación ante el SAT vía Facturama. *Verificar endpoint exacto contra los docs en vivo de Facturama antes de construir (regla del repo: no adivinar de memoria).*
- **`checkInvoiceCancellationStatus(invoiceId)`** server action (rol `direccion`): re-consulta y actualiza:
  - SAT confirma cancelada → `status='cancelled'`, `cancelled_at`, guarda acuse.
  - SAT rechaza → `cancellation_status='rejected'` + motivo visible.
  - Sigue pendiente → no cambia nada, muestra "esperando aceptación del receptor".
- **UI**: en facturas con `cancellation_status='requested'`, botón "Consultar estado ante el SAT" + badge de estado de cancelación.
- **Gancho opcional** (no se construye aquí): sensor Vigía `FSC-04` "cancelación pendiente > 48 h" — se coordina con el Sprint E.
- **Riesgo: medio.** Owner: **Claude**; wiring de UI **Codex-ready**.

### H1 — Sustituir factura correctamente (motivo 01, "con relación")

- **Columna** `project_invoices.replaces_invoice_id bigint null` (FK a `project_invoices`).
- **"Corregir y reemplazar"** en una factura timbrada (rol finanzas): crea un **borrador nuevo** pre-llenado desde la original (cliente, proyecto, conceptos, importes, uso de CFDI — todo editable) con `replaces_invoice_id` apuntando a la original.
- **`lib/facturama.ts: buildInvoicePayload`**: si el borrador tiene `replaces_invoice_id`, añadir al CFDI el nodo `Relations: { Type: "04", Cfdis: [uuidOriginal] }`. *Verificar el shape exacto del campo `Relations` en la API de Facturama antes de construir.*
- **Flujo guiado, dos pasos, un lugar**: (1) timbrar el sustituto → (2) cancelar la original con motivo **01** y `uuidReplacement = UUID nuevo`. El botón "Cancelar original" aparece solo cuando el sustituto ya se timbró.
- Reemplaza el copiar-pegar de UUID por un flujo entendible.
- **Riesgo: medio-alto** (fiscal + payload nuevo). Owner: **Claude** + Leo (autoriza la primera real).

---

## 3. Guardarraíles

- Todo es fiscal e irreversible. **Cancelar sigue siendo solo rol `direccion`.** Crear el borrador sustituto puede ser finanzas; **timbrar el sustituto y cancelar la original = `direccion`**.
- Sandbox primero. La primera cancelación real en producción se hace **con Leo presente**, sobre una factura conocida.
- Toda estructura nueva → migración en `sql/` + reflejo en `docs/modules/facturacion/MODULE_CONTEXT.md`.
- No relajar `requireFiscalProjectAccessForProfile`, `canViewFinancials`, `canCancelInvoices` ni la RLS de `project_invoices`.
- No tocar el cálculo de importes / IVA / prorrateo (fuera de alcance).
- No cambiar `FACTURAMA_ENV` ni `FACTURAMA_ENABLE_PRODUCTION` sin confirmación explícita de Leo.
- Endpoints de Facturama (status de cancelación, nodo `Relations`): **verificar contra los docs en vivo**, no asumir de memoria.

---

## 4. Secuencia

| Orden | Item | Owner | Riesgo | Depende de |
| --- | --- | --- | --- | --- |
| 1 | **H4** Uso de CFDI editable por factura | Codex + Claude (review) | Bajo | — |
| 2 | **H3** Probar/endurecer cancelación 02 y 03 + acuse descargable | Claude + Leo | Medio | — |
| 3 | **H2** Resolver cancelación pendiente (consultar estado SAT) | Claude (+ Codex UI) | Medio | H3 |
| 4 | **H1** Sustituir factura (motivo 01 con relación 04) | Claude + Leo | Medio-alto | H2 |

Estimado: H4 ~2–3 días · H3 ~2 días · H2 ~3–4 días · H1 ~1 semana. Total ~2.5–3 semanas de trabajo de IA + ratos de Leo para autorizar pruebas.

---

## 5. Qué necesito de Leo

1. **OK al sprint** y al orden (H4 primero).
2. **Autorizar las pruebas fiscales** y estar presente en la primera cancelación real en producción.
3. Confirmar que **la cuenta de Facturama tiene habilitada la cancelación** en producción (probablemente sí, ya que el timbrado funciona).
4. Para H4: decir cuál es el **uso de CFDI por defecto de cada cliente** (hoy varios pueden estar en blanco o mal) — o al menos de los que facturas seguido.
5. Un **caso real pendiente** de "factura con error que hay que reemplazar", si lo hay, para probar H1 con datos verdaderos en sandbox.

---

## 6. ¿Apoyo de otras IA?

| IA | Rol en este sprint |
| --- | --- |
| **Claude** (líder) | H1, H2, H3 — todo lo que toca `lib/facturama.ts`, el payload CFDI, la orquestación de cancelación y la validación fiscal. Escribe la spec de las piezas de Codex y revisa todo antes de merge. |
| **Codex** | **H4 completo** (migración + campo en el form + lectura en el timbrado + select inline en borrador) y el **wiring de UI de H2** ("Consultar estado" + badges + descarga de acuse), a partir de spec de Claude. Nada de decisiones de arquitectura fiscal. |
| **Antigravity** | **No requerido este sprint.** Opcional al final: versión mobile-first del modal de cancelación y del acuse (encaja con G1). |
| **ChatGPT** | Segunda opinión barata, sin código: validar la **secuencia SAT del motivo 01** (relación tipo 04, orden timbrar-sustituto-luego-cancelar, qué pasa si el receptor no acepta) contra las reglas vigentes del SAT/CFDI 4.0. |
| **Leo** | Autoriza el sprint y cada prueba fiscal; define el uso de CFDI por cliente; presente en la primera cancelación real. |

**Resumen:** el grueso lo hace Claude porque es fiscal e irreversible. Codex acelera H4 y el UI de H2 con spec cerrada. Antigravity no hace falta. ChatGPT solo como revisor del procedimiento SAT.

---

## 8. Estado de ejecucion (2026-09-01)

Todo implementado por Claude en un solo pase, rama `sprint-h-cancelacion-fiscal-uso-cfdi`.

| Fase | Estado | Notas |
| --- | --- | --- |
| Migracion | **APLICADA en prod** (`invoice_cfdi_use_and_replacement`) | `project_invoices.cfdi_use`, `replaces_invoice_id` + indice. Aditiva. Rollback: `drop column`. Archivo espejo en `sql/20260902_invoice_cfdi_use_and_replacement.sql`. |
| H4 uso de CFDI | **CODIGO LISTO** | Selector en `InvoiceForm` + atajo inline en el borrador + `setInvoiceCfdiUse` + timbrado lee el valor por factura. Sin dependencia de Facturama, se puede probar ya. |
| H3 acuse + endurecer 02/03 | **CODIGO LISTO** | Ruta de descarga del acuse, badges de estado, mapeo de estatus de Facturama. Falta timbrar+cancelar una factura desechable en sandbox. |
| H2 resolver pendiente | **CODIGO LISTO** | `checkInvoiceCancellationStatus` + boton "Consultar estado SAT". Endpoint `GET /cfdi/status` verificado en docs; falta ejercerlo contra una cancelacion real pendiente. |
| H1 sustitucion (motivo 01) | **CODIGO LISTO** | `createReplacementInvoiceDraft` + nodo `Relations 04` + auto-UUID en la cancelacion. Falta la prueba end-to-end en sandbox (es lo mas riesgoso). |

Validado: `npx tsc --noEmit` limpio, `npm run build` OK. Lint sin errores nuevos (2 preexistentes en `InvoiceForm.tsx`).

**Lo que falta y necesita a Leo:**
1. Correr el dev server con sesion de `direccion` y revisar las 4 pantallas (crear factura con G01/G03, cambiar uso en un borrador, cancelar 02, "corregir y reemplazar").
2. En **sandbox Facturama**: timbrar una factura de prueba y cancelarla con motivo 02 y 03; confirmar acuse + `status='cancelled'`.
3. Sustitucion: "Corregir y reemplazar" -> timbrar el sustituto -> cancelar la original con motivo 01. Confirmar la relacion 04 en el XML.
4. Cuando 1-3 pasen en sandbox, repetir motivo 02 una vez en produccion con una factura real conocida, con Leo presente.
5. `git merge` de la rama a `main` tras la revision.

Limitacion conocida: el borrador de reemplazo copia importes y conceptos identicos; hoy no hay pantalla para editar importes de un borrador ya creado (solo el uso de CFDI y los datos fiscales del cliente). Para cambiar montos, se borra el borrador y se hace una factura nueva desde la cotizacion.

---

## 7. Trazabilidad

- Ideas relacionadas: pendiente de crear `idea-IA-2026090X-0YY.md` al arrancar (según `ia-cowork/README.md`).
- Al ejecutar cada fase: `status: in_progress` + entrada en `history` + PR enlazado.
- Fila en `ia-cowork/roadmap/plan-maestro-ejecucion.md` (bloque Sprint H).
