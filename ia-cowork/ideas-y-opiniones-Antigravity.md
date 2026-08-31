# Ideas y opiniones de Antigravity (Google DeepMind)

## Documento de trabajo para IA Cowork

Este archivo documenta las ideas, auditoría técnica, observaciones operativas y propuestas de arquitectura generadas por **Antigravity** para **EL VIGÍA** dentro de ALFA OS.

---

## Resumen Ejecutivo de la Auditoría a "El Vigía"

Tras auditar el código implementado en `lib/vigia/`, `docs/modules/vigia/MODULE_CONTEXT.md` y los scripts SQL en producción (`sql/20260830_vigia_phase0.sql` y `sql/20260831_vigia_phase1_batch2.sql`), las conclusiones principales son:

1. **La base técnica actual es sobresaliente:** El uso de **vistas SQL deterministas (`vigia_v_*`)** para la detección y un **motor de ciclo de vida con deduplicación por fingerprint** (`runner.ts`) coloca a El Vigía al nivel de herramientas de observabilidad industrial (tipo Sentry / Kubernetes Controllers), evitando alucinaciones de LLM y sobrecostos de cómputo.
2. **El cuello de botella actual es la resolución:** Hoy El Vigía solo envía un brief por correo. El operador humano debe leer el correo y navegar manualmente entre múltiples pantallas para corregir el problema.
3. **El salto de valor (Fase 2):** Implementar la **Bandeja de Decisión en ALFA OS (`/admin/vigia`)** con botones de acción transaccional de 1 solo clic (`proposed_action`), permitiendo resolver 10 inconsistencias en 30 segundos.

---

## Ideas y Propuestas Formales (Antigravity)

---

### ID: IA-20260830-002
- **Fecha:** 2026-08-30
- **Autor:** Antigravity
- **Tipo:** arquitectura / mejora
- **Estado:** propuesta
- **Módulo:** ALFA OS / El Vigia / Core Engine
- **Resumen:** Bandeja de Decisión en UI (`/admin/vigia`) con Ejecutores de Acción de 1 Clic (`proposed_action`).
- **Evidencia:** `vigia_findings.proposed_action` ya almacena el payload jsonb con la solución técnica (ej. `consolidar_partidas_operativas`, `capturar_tc_compra`). Falta la interfaz que permita ejecutarlo sin ir a la base de datos.
- **Responsable de ejecución:** Antigravity / Equipo ALFA OS
- **Última actualización:** 2026-08-30
- **Historial:**
  - 2026-08-30 | Antigravity | creación de la propuesta

#### Descripción y Arquitectura
Crear la ruta `app/(admin)/vigia/page.tsx` en Next.js siguiendo el ALFA Design System (alta gama, limpio, estilo Linear/Apple).
- Agrupación por carriles: **Requiere tu autorización**, **Prestar atención**, **Auto-aplicado**.
- Para cada hallazgo con `proposed_action`, renderizar botones interactivos respaldados por Server Actions:
  - **[Autorizar y Ejecutar]:** Ejecuta la transacción SQL segura (ej. reasignar compras huérfanas a la partida sana y archivar la duplicada).
  - **[Posponer 7 días]:** Oculta el hallazgo temporalmente.
  - **[Descartar con motivo]:** Cambia estado a `descartado` y guarda `decision_note`.
- Registro automático de cada decisión en `vigia_audit_log` con el usuario que autorizó.

---

### ID: IA-20260830-003
- **Fecha:** 2026-08-30
- **Autor:** Antigravity
- **Tipo:** automatización / mejora
- **Estado:** propuesta
- **Módulo:** ALFA OS / El Vigia / Sensores
- **Resumen:** Expansión de sensores hacia dominios críticos: Fiscal/SAT (`FSC-*`), Comercial/Leads (`VTA-*`) y Garantías/Servicios (`SRV-*`).
- **Evidencia:** ALFA OS cuenta con módulos activos de Facturama (CFDI), Leads públicos y Postventa donde hoy no hay vigilancia de anomalías.
- **Responsable de ejecución:** Antigravity / Equipo ALFA OS
- **Última actualización:** 2026-08-30
- **Historial:**
  - 2026-08-30 | Antigravity | creación de la propuesta

#### Sensores Propuestos:
1. **Dominio Fiscal (`fiscal_sat`):**
   - `FSC-01` (PPD sin Complemento de Pago): Alerta cuando una factura emitida como PPD tiene cobros registrados pero su Complemento de Pago (REP) no se ha timbrado antes del día 10 del mes siguiente.
   - `FSC-02` (Cotización 100% cobrada sin CFDI emitido): Clientes con saldo liquidado sin factura timbrada.
   - `FSC-03` (Vencimiento de CSD Facturama): Alerta 30 días antes de que caduque el Certificado de Sello Digital.
2. **Dominio Ventas y CRM (`ventas_pipeline`):**
   - `VTA-01` (Leads desatendidos > 24h): Prospectos en `public_leads` sin primer contacto o asignación.
   - `VTA-02` (Cotizaciones dormidas de alto valor): Cotizaciones > $100k MXN en estatus `sent` sin interacción en > 7 días.
   - `VTA-03` (Proyectos ganados sin anticipo): Proyectos en `won` sin cobro inicial tras > 10 días.
3. **Dominio Postventa y Garantías (`postventa_servicios`):**
   - `SRV-01` (Garantía de proyecto por vencer): Proyectos entregados hace 11 meses; dispara propuesta de póliza de mantenimiento antes de que expire la garantía.
   - `SRV-02` (Tickets de servicio estancados): Servicios abiertos sin bitácora técnica en > 72h.

---

### ID: IA-20260830-004
- **Fecha:** 2026-08-30
- **Autor:** Antigravity
- **Tipo:** automatización
- **Estado:** propuesta
- **Módulo:** ALFA OS / El Vigia / Auto-Remediación
- **Resumen:** Auto-remediación segura con APIs oficiales para el carril `auto_aplicado` (Tipo de cambio FIX Banxico y Sincronización de totales).
- **Evidencia:** `INT-05` detecta compras en USD sin TC y `INT-09` totales desincronizados. Ambos tienen riesgo nulo si se resuelven con fuentes oficiales.
- **Responsable de ejecución:** Antigravity / Equipo ALFA OS
- **Última actualización:** 2026-08-30
- **Historial:**
  - 2026-08-30 | Antigravity | creación de la propuesta

#### Mecanismo:
1. **API Banxico / FIX Oficial:** Cuando se detecta una compra en USD sin TC (`INT-05`), El Vigía consulta automáticamente el FIX oficial del Banco de México para la fecha del evento, asigna el TC a la base operativa/compra, marca el hallazgo como `auto_aplicado` y lo reporta en el brief matutino: *"Auto-aplicado: TC FIX de $18.42 MXN asignado a la compra #45"*.
2. **Auto-recálculo nocturno de totales (`INT-09`):** Si hay deriva entre `costo x cantidad` y el total guardado en la línea de compra, se sincroniza en el cron diario.

---

### ID: IA-20260830-005
- **Fecha:** 2026-08-30
- **Autor:** Antigravity
- **Tipo:** optimización / rendimiento
- **Estado:** propuesta
- **Módulo:** ALFA OS / El Vigia / Runner
- **Resumen:** Corrección de cálculo de impacto monetario global y paralelización del runner para prevenir timeouts en Vercel.
- **Evidencia:** En `runner.ts:220`, `CST-01` (sobrecostos unitarios) y `CST-05` (rollup de proyecto) se suman juntos en `impactMxnOpen`, duplicando el monto en riesgo. Además, la ejecución secuencial de sensores en Vercel Serverless (Hobby ~60s) puede agotar el tiempo.
- **Responsable de ejecución:** Antigravity
- **Última actualización:** 2026-08-30
- **Historial:**
  - 2026-08-30 | Antigravity | creación de la propuesta

#### Solución:
- Filtrar o discriminar sensores de rollup en la suma global de `impactMxnOpen`.
- Ejecutar las consultas de los sensores con `Promise.allSettled()` en lotes para reducir el tiempo total de ejecución a < 3 segundos.

---

## Comparativa y Alineación: ChatGPT vs Antigravity

| Frente | Enfoque ChatGPT | Enfoque Antigravity (Técnico / Código) | Estado de Coincidencia |
| :--- | :--- | :--- | :--- |
| **Rol de El Vigía** | Sistema de vigilancia y riesgo, no chatbot genérico. | Vistas SQL deterministas + Deduplicación por fingerprint + Auditoría append-only. | **100% Alineados** (Fase 1 ya operativa). |
| **Severidad y Alertas** | Clasificación por severidad (baja/alta/crítica). | Implementado vía `severityFromImpact()` ($500 / $3k / $12k MXN) y carriles. | **Completado en código**. |
| **Supervisión Humana** | La IA propone y el humano aprueba. | `vigia_findings.proposed_action` + Bandeja de decisión en `/admin/vigia`. | **Próximo a construir (Fase 2)**. |
| **Nuevos Dominios** | Proyectos, compras, cotizaciones. | Expansión a Fiscal/SAT (`FSC-*`), Leads (`VTA-*`) y Postventa (`SRV-*`). | **Especificado y listo para migración SQL**. |
| **Automatización** | Tareas automáticas por reglas. | Auto-remediación vía API Banxico y recálculos deterministas (`auto_aplicado`). | **Diseñado para Fase 3**. |

---

## Próximos Pasos Recomendados

1. **Aprobar la creación de la Bandeja de Decisión (`/admin/vigia`)** para cerrar el ciclo detección -> autorización en 1 clic.
2. **Crear la migración SQL `20260901_vigia_phase2_fiscal_sales.sql`** con las vistas de los sensores `FSC-01..03` y `VTA-01..03`.
3. **Optimizar `runner.ts`** con paralelización y ajuste del impacto económico acumulado.
