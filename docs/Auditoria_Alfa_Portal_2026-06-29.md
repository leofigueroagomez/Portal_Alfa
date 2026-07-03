---
title: Auditoría Alfa Portal
date: 2026-06-29
tags: [auditoría, alfa-portal, obsidian, supabase, nextjs]
---

# Auditoría Alfa Portal

## Resumen ejecutivo

- Proyecto: `alfa-portal`.
- Stack: Next.js 16 + React 19 + Tailwind 4 + Supabase.
- Estado general: **parcialmente funcional**, con módulos importantes construidos pero áreas críticas incompletas.
- Módulos clave presentes: comercial, operaciones, compras, contratistas, facturación, rentabilidad, postventa y portal cliente.
- Riesgos principales: duplicidad de datos, portal cliente legacy, flujos financieros incompletos y seguridad/segregación incompleta.

## Estado por dominio

### Comercial / Ventas

- Existe captura de leads y administración de clientes.
- Módulos de cotizaciones comerciales (`quotes`) e ingeniería (`engineering-quotes`).
- Funcionalidad de PDF/print de cotización y aprobación de versiones.
- Faltantes:
  - flujo lead → cliente → proyecto completo,
  - seguimiento de pipeline comercial,
  - comunicaciones automáticas para cotizaciones,
  - puente claro entre cotización técnica e interna.

### Operaciones

- Módulos construidos: proyectos, visitas de obra, órdenes de trabajo, entregas de material.
- Automatización parcial de sincronización de items operativos desde cotizaciones aprobadas.
- Faltantes:
  - agenda y control de cambios completos,
  - automatizaciones programadas / jobs,
  - normalización de documentos y evidencias,
  - integración más estrecha con compras.

### Compras

- Modelo presente de líneas de compra y eventos.
- Reportes de avance y variación de costos.
- Faltantes:
  - orden de compra formal,
  - proveedor maestro,
  - aprobación de compras,
  - facturas proveedor y cierre contable,
  - recepción y conciliación.

### Contratistas

- Gestión de contratistas, movimientos de cuenta y cargos en OTs.
- Reportes de estado de cuenta.
- Faltantes:
  - pago formal al contratista,
  - comprobantes fiscales,
  - flujo de aprobación y pago real,
  - liquidación y conciliación.

### Facturación

- Tablas de facturas de proyecto y catálogos SAT.
- Integración con Facturama para timbrado y PDF/XML.
- Faltantes:
  - envío de factura al cliente,
  - complemento de pago completo,
  - cobranza y facturas vencidas,
  - cancelación SAT robusta.

### Rentabilidad

- Cálculo de rentabilidad por proyecto y envío de reporte ejecutivo.
- Histórico de rentabilidad y marginación.
- Faltantes:
  - cierre financiero completo,
  - costos indirectos,
  - conciliación con facturas proveedor y pagos contratista,
  - validación final de margen real.

### Postventa

- Se generan PDFs postventa con garantía y políticas de mantenimiento.
- Faltantes:
  - ticketing postventa,
  - mantenimiento recurrente,
  - SLA y seguimiento.

### Portal cliente

- Existen rutas de portal cliente y gestión de usuarios portal.
- El portal actual tiene riesgo alto por uso de tablas legacy y datos no consolidados.
- Recomendación: reconstruir portal sobre `client_projects` y endurecer RLS.

## Seguridad y arquitectura

- Supabase con cliente browser, servidor SSR y admin service role.
- SQL migraciones de RLS y hardening presentes.
- Riesgos:
  - duplicidad de datos entre `projects` y `client_projects`, `quotes` y `engineering_quotes`, `documents` legacy y nuevas entidades,
  - posibles exposiciones de datos del portal cliente,
  - dependencia de `SUPABASE_SERVICE_ROLE_KEY` sin controles adicionales.

## Conclusiones

### Fortalezas

- Base sólida tecnológica.
- Uso consistente de Supabase SSR y auth.
- Avances reales en procesos de cotización, facturación SAT y operaciones.
- Buen trabajo en seguridad de RLS en SQL.

### Debilidades

- Modelo de datos fragmentado.
- Flujos críticos de compras y pagos incompletos.
- Portal cliente con deuda técnica y riesgo de datos.
- Automatizaciones mayormente manuales.
- Falta integración entre comercial, operaciones y finanzas.

## Recomendaciones

### Fase 1: estabilización

- Unificar modelo de proyectos en `client_projects`.
- Reconstruir portal cliente sobre datos canónicos.
- Consolidar `quotes` + `engineering_quotes`.
- Revisar y documentar RLS / acceso a Storage.

### Fase 2: completar flujos críticos

- Implementar orden de compra y proveedor maestro.
- Cerrar flujo de pago a contratistas.
- Completar complemento de pago y cobranza SAT.
- Formalizar ticketing postventa.

### Fase 3: automatización y reporting

- Automatizar seguimiento comercial y pipeline.
- Crear jobs periódicos de vencimientos, garantías y costos.
- Mejorar dashboard ejecutivo para cashflow y margen.

### Fase 4: calidad y escalabilidad

- Añadir pruebas y CI/CD.
- Revisar ambiente de producción y secretos.
- Evaluar arquitectura de frontend (admin + cliente) y posible white-label.

## Prioridades inmediatas

1. Reconstruir portal cliente seguro.
2. Eliminar duplicidad de proyectos y cotizaciones.
3. Completar flujo de compras/pagos.
4. Crear dashboard financiero ejecutivo.
5. Establecer pruebas y CI.

## Notas adicionales

- `AUDITORIA_FUNCIONAL_ALFA_OS.md` ya contiene una base de revisión funcional del repositorio.
- La nota actual resume la auditoría técnica y propone un plan maestro para la evolución del proyecto.

---

# Diagnóstico técnico: Captura de leads y flujo lead → cliente → proyecto

## Resumen: estado actual de leads

- La captura de leads es **funcional** pero aislada del flujo de negocio.
- Formulario público captura y almacena, pero **no conecta directamente con cotizaciones o proyectos**.
- Conversión manual de lead → cliente **posible**, pero **sin automatización de seguimiento**.
- Riesgo alto: leads abandonados sin revisión y pipeline comercial opaco.

## 1. Formulario actual

### Ubicación y campos

**Componente:** [`components/PublicLandingClient.tsx`](components/PublicLandingClient.tsx)

**Campos capturados:**
- `name` (obligatorio)
- `customerType` (obligatorio): `residencial`, `comercial`, `corporativo`, `industrial`
- `company` (opcional)
- `phone` (obligatorio)
- `service` (obligatorio): descripción del objetivo/proyecto
- `interest` (opcional): `Audio y video`, `Redes e infraestructura`, `CCTV y seguridad`, `Control de acceso`, `Automatización`, `Soporte`, `Otro`
- `budgetRange` (opcional): rango de presupuesto
- `timeline` (opcional): `Lo antes posible`, `Este mes`, `1 a 3 meses`, `Solo estoy explorando`
- `message` (opcional): comentario libre

**Email:** NO se captura directamente en el formulario (carencia crítica).

### Validación en frontend

- Validación básica de campos requeridos.
- No hay validación de email ni teléfono.
- Sin verificación de formato de teléfono.

## 2. Destino de datos

### API de captura

**Ruta:** `POST /api/leads` ([app/api/leads/route.ts](app/api/leads/route.ts))

**Flujo:**
1. Frontend envía JSON a `/api/leads`.
2. Backend valida contra listas de valores permitidos.
3. Si la tabla no tiene todas las columnas (tolerancia de evolución), intenta fallback.
4. Inserta en tabla `leads` con estado `nuevo` y guarda payload original en JSON.

**Observación:** El fallback indica que la tabla se ha evolucionado gradualmente; hay tolerancia a campos faltantes.

## 3. Tabla de leads

### Schema

```sql
create table if not exists public.leads (
  id bigint generated by default as identity primary key,
  name text not null,
  customer_type text not null,
  company text,
  phone text not null,
  service text not null,
  message text,
  interest text,
  budget_range text,
  timeline text,
  source text not null default 'Landing Web',
  status text not null default 'nuevo',
  client_id bigint references public.clients(id) on delete set null,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Estados de lead:** `nuevo`, `contactado`, `calificado`, `convertido`, `descartado`

**Índices:** `status`, `created_at`, `client_id`

**RLS:** Habilitado, pero políticas permiten lectura/escritura/actualización/borrado a cualquier usuario autenticado (abierto).

### Problemas identificados

- Sin campo de email (carencia grave).
- `raw_payload` no es normalizado; datos duplicados en JSON.
- RLS muy permisivo (cualquier usuario autenticado accede).
- Sin referencias a `client_projects`; cuando se convierte a cliente, **no genera proyecto automáticamente**.

## 4. Flujo lead → cliente

### Conversión manual de lead a cliente

**Ubicación:** [`app/(admin)/leads/actions.ts`](app/(admin)/leads/actions.ts) - función `convertLeadToClient`

**Proceso:**
1. Admin revisa lead desde `/leads`.
2. Admin hace click en botón de conversión.
3. Sistema genera nuevo `client`:
   - `client_number`: auto-generado,
   - `name`: del lead,
   - `company_name`: del lead,
   - `email`: extraído de `raw_payload` si existe,
   - `phone`: del lead,
   - `source`: mapeado desde lead.source,
   - `lead_captured_at`: timestamp del lead.

4. Lead se marca como `convertido` y se vincula con `client_id`.
5. Admin redirige a página del cliente.

**Carencias:**
- **Sin automatización:** conversión es 100% manual.
- **Sin cotización inicial:** no crea ni sugiere cotización.
- **Sin proyecto:** no vincula a `client_projects`.
- **Sin flujo comercial:** el equipo comercial debe crear la cotización desde cero.

## 5. Flujo lead → cotización → proyecto

### Estado actual

- Lead → Cliente: ✅ posible (manual)
- Cliente → Cotización: ❌ no existe flujo directo
- Cotización → Proyecto: ✅ existe (por aprobación de cotización)

### Brecha

Después de convertir lead a cliente, **no hay sugerencia de crear cotización** ni **vinculación automática con `client_projects`**.

## 6. Conexión con ALFA OS

### Portal cliente (ALFA OS)

**Ubicación:** `/portal` y `/portal/projects/[id]`

**Cómo se ve un proyecto en ALFA OS:**
- Cliente accede a `/portal` después de autenticarse.
- Ve sus proyectos desde `client_portal_users` y `client_portal_project_access`.
- Cada proyecto corresponde a un `client_project`.

**Problema:** No hay conexión automática entre lead → cliente → ALFA OS.

- Si no se crea un `client_project` después de aprobar cotización, el cliente **no verá nada en ALFA OS**.
- El flujo de visibilidad para el cliente está incompleto.

## 7. Riesgos técnicos

### Seguridad
1. **RLS muy permisivo:** cualquier usuario autenticado puede leer/escribir/borrar leads.
2. **Sin auditoría:** no hay log de cambios en leads (quién cambió el estado, cuándo).
3. **Email no capturado:** imposible contactar lead sin revisión manual de payload JSON.

### Integridad de datos
1. **Duplicidad en payload:** datos en JSON + columnas normalizadas.
2. **Sin validación de email/teléfono:** leads con contacto inválido.
3. **Sin verificación de CUIT/RFC:** para empresas.
4. **Caducidad:** leads antiguos sin conversión no se archivan.

### Flujo comercial
1. **Sin automatización:** depende 100% de acción manual admin.
2. **Sin recordatorios:** leads en `nuevo` por 30 días no disparan alerta.
3. **Sin scoring:** no hay criterio de priorización (lead calificado vs. frío).
4. **Sin integración con cotización:** crear cotización es paso completamente separado.

## 8. Campos mínimos recomendados (sin cambios en producción)

### Normalizaciones pequeñas y seguras en próximas sprints

1. **Añadir campo `email` a tabla `leads`**
   ```sql
   alter table public.leads
     add column if not exists email text;
   ```
   - Opcional por ahora (para no romper datos existentes).
   - Capturar en formulario.

2. **Añadir campo `scored_at` para tracking de revisión**
   ```sql
   alter table public.leads
     add column if not exists scored_at timestamptz;
   ```

3. **Añadir columna `days_since_contact` (computed)** para alertas de leads viejos sin contacto.

4. **Normalizadores de teléfono y email en el formulario** antes de enviar.

5. **Captura de `referrer` / `utm_source`** en formulario para mejorar tracking de origen.

6. **Añadir `conversion_notes`** al cliente (notas de conversión desde lead) para auditoría.

## 9. Propuesta de cambios para esta semana

### Fase 1: diagnóstico y seguridad (esta semana, no destructivo)

1. **Auditar RLS de leads:** documentar quién accede a `/leads`.
2. **Contar leads sin email:** hacer query para ver cuántos leads carecen de contacto.
3. **Revisar fuente de cada lead:** agrupar por `source` para validar captura.
4. **Crear vista de leads para monitor:** tablero simple de estado de leads por día.

### Fase 2: pequeños cambios seguros (próximas 2 semanas)

1. **Capturar email en formulario público** (nuevo campo, opcional en backend por ahora).
2. **Añadir validación de email/teléfono** en frontend antes de enviar.
3. **Crear botón "crear cotización" en página del cliente** que pre-cargue datos desde lead convertido.
4. **Documentar flujo lead → cliente → cotización → proyecto** en CLAUDE.md.

### Fase 3: automatización (próximo mes)

1. **Automatizar creación de `client_project`** cuando se aprueba cotización.
2. **Crear notificación interna** cuando lead es convertido.
3. **Implementar scoring de leads** basado en budget_range + timeline.
4. **Dashboard comercial** con pipeline: leads nuevos → contactados → calificados → convertidos.

## 10. Archivos clave

- Formulario: [`components/PublicLandingClient.tsx`](components/PublicLandingClient.tsx)
- API: [`app/api/leads/route.ts`](app/api/leads/route.ts)
- Tabla: [`sql/20260531_public_leads.sql`](sql/20260531_public_leads.sql)
- Conversión: [`app/(admin)/leads/actions.ts`](app/(admin)/leads/actions.ts)
- Page: [`app/(admin)/leads/page.tsx`](app/(admin)/leads/page.tsx)

---

# Documentos de implementación (esta semana)

## Materiales de trabajo

1. **Plan de ejecución semanal:** [Plan_Ejecucion_Semana_Leads_2026-06-29.md](Plan_Ejecucion_Semana_Leads_2026-06-29.md)
   - Detalles de cada tarea
   - Orden de ejecución
   - Criterios de éxito
   - Próximas semanas

2. **Queries de diagnóstico:** [Diagnostico_Queries_Leads_2026-06-29.sql](Diagnostico_Queries_Leads_2026-06-29.sql)
   - 8 queries para ejecutar en Supabase
   - Auditar RLS
   - Contar leads sin email
   - Validar integridad de datos

3. **Propuestas de código:** [Propuestas_Codigo_Leads_2026-06-29.md](Propuestas_Codigo_Leads_2026-06-29.md)
   - Cambios específicos por archivo
   - Líneas exactas de código
   - Test checklist
   - Rollback quick reference

4. **Migración SQL segura:** [sql/20260630_leads_email_capture.sql](sql/20260630_leads_email_capture.sql)
   - Agregar columna email (no destructivo)
   - Índices para búsqueda
   - Reversible con drop column

---

## Resumen: Semana de ejecución

| Actividad | Estado | Estimado | Reversible |
|-----------|--------|----------|-----------|
| Auditar RLS y datos | 📋 Plan listo | 30 min | N/A |
| SQL email + índices | 📋 Script listo | 30 min | ✅ SÍ |
| Formulario email | 📋 Código especificado | 45 min | ✅ SÍ |
| API validar email | 📋 Código especificado | 30 min | ✅ SÍ |
| Botón cotización rápida | 📋 Código especificado | 1 hora | ✅ SÍ |
| **TOTAL** | | **3 horas** | **✅ Todos** |
