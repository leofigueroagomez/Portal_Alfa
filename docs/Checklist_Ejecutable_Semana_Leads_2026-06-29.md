---
title: Checklist Ejecutable - Semana Leads 2026-06-29
date: 2026-06-29
tags: [leads, checklist, semana, ejecución]
---

# ✅ Checklist Ejecutable - Semana Leads

**Objetivo:** Mejorar captura de leads, reducir riesgos, acelerar flujo comercial.

**Filosofía:** Cambios pequeños, reversibles, no destructivos.

---

## Lunes 29 - Diagnóstico y planificación

- [ ] **09:00** Leer documentos de análisis (15 min)
  - [Auditoria_Alfa_Portal_2026-06-29.md](Auditoria_Alfa_Portal_2026-06-29.md) - sección leads
  - [Diagnostico_Queries_Leads_2026-06-29.sql](Diagnostico_Queries_Leads_2026-06-29.sql)

- [ ] **09:15** Conectar a Supabase SQL Editor (local o staging)
  - URL: https://[project].supabase.co/project/[id]/sql
  - O usar Supabase local si está disponible

- [ ] **09:20** Ejecutar Diagnóstico 1: RLS actual
  ```sql
  -- Copiar query de Diagnostico_Queries_Leads_2026-06-29.sql línea ~15
  SELECT schemaname, tablename, policyname, roles, qual, with_check
  FROM pg_policies WHERE tablename = 'leads' ORDER BY policyname;
  ```
  - ✅ Documentar resultado

- [ ] **09:30** Ejecutar Diagnóstico 2: Estado de leads
  ```sql
  -- Query de conteo por estado (línea ~50)
  SELECT status, COUNT(*) as total, ...
  ```
  - ✅ Documentar: ¿Cuántos leads nuevos hay? ¿Cuántos convertidos?

- [ ] **09:40** Ejecutar Diagnóstico 3: CRÍTICO - Leads sin email
  ```sql
  -- Query sin email (línea ~80)
  SELECT COUNT(*) as leads_sin_email_activos, ...
  ```
  - ✅ Documentar: ¿% de leads sin contacto de email?

- [ ] **09:50** Ejecutar Diagnóstico 4: Edad de leads
  ```sql
  -- Query antigüedad (línea ~110)
  SELECT status, COUNT(*), AVG(EXTRACT(DAY FROM now() - created_at)) as dias_promedio
  ```
  - ✅ Documentar: ¿Leads abandonados? ¿Cuántos días sin conversión?

- [ ] **10:00** Ejecutar Diagnóstico 5-8: Calidad de datos
  - ✅ Compilar hallazgos en documento

- [ ] **10:30** Crear documento: `docs/Diagnostico_RLS_Leads_2026-06-29_RESULTADOS.md`
  - Incluir:
    - Tabla de hallazgos
    - Riesgos identificados (HIGH/MEDIUM/LOW)
    - Recomendaciones
    - Validación de que es seguro proceder con cambios

- [ ] **11:00** Review con equipo (reunión 15 min)
  - ¿Hay leads sin email? ¿% de abandono?
  - ¿RLS es realmente un riesgo?
  - ¿Proceder con cambios esta semana?

---

## Martes 30 - Preparar cambios (no destructivos)

- [ ] **09:00** Revisar propuestas de código
  - Leer [Propuestas_Codigo_Leads_2026-06-29.md](Propuestas_Codigo_Leads_2026-06-29.md)

- [ ] **09:30** Clonar rama feature
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/leads-email-capture-2026-06-29
  ```

- [ ] **10:00** Crear migración SQL local
  - Copiar contenido de [sql/20260630_leads_email_capture.sql](../sql/20260630_leads_email_capture.sql)
  - Ejecutar en base local: `psql $LOCAL_DB_URL < sql/20260630_leads_email_capture.sql`
  - ✅ Verificar: `SELECT column_name FROM information_schema.columns WHERE table_name='leads';`
  - ✅ Debe mostrar: `email` (nuevo)

- [ ] **10:30** Modificar formulario de leads
  - Archivo: `components/PublicLandingClient.tsx`
  - Cambio 1: Añadir `email: ""` a `initialForm` (línea ~194)
  - Cambio 2: Agregar input email en HTML (después de phone)
  - Cambio 3: Incluir email en payload JSON (línea ~228)
  - Cambio 4: Agregar email a detalles de notificación (línea ~246)
  - ✅ Guardar y verificar que no hay errores TypeScript

- [ ] **11:30** Modificar API de leads
  - Archivo: `app/api/leads/route.ts`
  - Cambio 1: Agregar `email` a variable `lead` (línea ~54)
  - Cambio 2: Validar email si existe (línea ~68, nuevo)
  - Cambio 3: Agregar email a `baseInsert` (línea ~110)
  - ✅ Guardar y verificar que no hay errores TypeScript

---

## Miércoles 01 - Test local y ajustes

- [ ] **09:00** Iniciar servidor local
  ```bash
  npm run dev
  ```

- [ ] **09:15** Test formulario de leads
  - Ir a http://localhost:3000
  - ✅ ¿Ves nuevo campo "Correo electrónico"?
  - ✅ Intenta llenar: nombre, tipo, teléfono, email válido, servicio
  - ✅ Envía el formulario
  - ✅ Verifica en console del navegador: ¿request OK?

- [ ] **09:45** Test API directamente
  ```bash
  curl -X POST http://localhost:3000/api/leads \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test User",
      "customerType": "residencial",
      "phone": "5210000000000",
      "service": "Test service",
      "email": "test@example.com"
    }'
  ```
  - ✅ Respuesta: `{"ok": true, "stored": true}`

- [ ] **10:15** Test API con email inválido
  ```bash
  curl -X POST http://localhost:3000/api/leads \
    -H "Content-Type: application/json" \
    -d '{"name": "Test", "customerType": "residencial", "phone": "123", "service": "Test", "email": "invalid-email"}'
  ```
  - ✅ Debe retornar error 400 (correo inválido)

- [ ] **10:45** Verificar base de datos local
  ```sql
  SELECT id, name, email, phone FROM public.leads ORDER BY created_at DESC LIMIT 5;
  ```
  - ✅ ¿Ves leads con email?

- [ ] **11:15** Crear componente botón cotización
  - Archivo nuevo: `components/CreateQuoteFromClientButton.tsx`
  - Copiar código completo de [Propuestas_Codigo_Leads_2026-06-29.md](Propuestas_Codigo_Leads_2026-06-29.md) sección 3
  - ✅ Guardar sin errores TypeScript

- [ ] **11:45** Integrar botón en página de cliente
  - Archivo: `app/(admin)/clients/[id]/page.tsx`
  - Importar: `import CreateQuoteFromClientButton from "@/components/CreateQuoteFromClientButton";`
  - Agregar botón en sección de acciones del cliente
  - ✅ Guardar sin errores

- [ ] **12:00** Test navegación
  - Ir a http://localhost:3000/admin (si tienes acceso)
  - Ir a cliente existente: `/admin/clients/1`
  - ✅ ¿Ves botón "Crear cotización"?
  - ✅ Click → debe redirigir a `/quotes/new?client_id=1&from_lead=true`

---

## Jueves 02 - Integración y staging

- [ ] **09:00** Commit cambios
  ```bash
  git add sql/20260630_leads_email_capture.sql
  git add components/PublicLandingClient.tsx
  git add app/api/leads/route.ts
  git add components/CreateQuoteFromClientButton.tsx
  git add app/(admin)/clients/[id]/page.tsx
  git commit -m "feat: captura de email en leads y botón cotización rápida

- Email campo opcional en tabla leads
- Formulario público captura email normalizado
- API valida email antes de insertar
- Botón rápido 'Crear cotización' desde cliente
- Cambios reversibles, testeados en local"
  ```

- [ ] **09:30** Push a rama feature
  ```bash
  git push origin feature/leads-email-capture-2026-06-29
  ```

- [ ] **10:00** Crear Pull Request en GitHub
  - Título: `feat: captura de email en leads y botón cotización rápida`
  - Descripción: Incluir hallazgos de diagnóstico y cambios
  - Asignar revisores

- [ ] **10:30** Desplegar a staging (si CI/CD está configurado)
  ```bash
  # O manual:
  git checkout staging
  git pull origin staging
  git merge feature/leads-email-capture-2026-06-29
  git push origin staging
  ```

- [ ] **11:00** Test en staging
  - URL: https://staging.alfa-portal.com (o equiv.)
  - ✅ Cargar formulario de leads
  - ✅ Enviar lead con email
  - ✅ Ver en dashboard admin que email se capturó
  - ✅ Test botón cotización en cliente

- [ ] **12:00** Ejecutar migración SQL en staging
  ```sql
  -- Copiar y ejecutar:
  -- sql/20260630_leads_email_capture.sql en Supabase staging
  ```
  - ✅ Verificar columna email existe
  - ✅ Verificar índices creados

- [ ] **12:30** Test completo en staging (después de migración)
  - Crear lead en staging con email
  - ✅ Verificar que se insertó con email
  - ✅ Crear cliente desde lead
  - ✅ Click botón cotización rápida
  - ✅ Pre-cargue de cliente en formulario cotización

---

## Viernes 03 - Documentación y preparación producción

- [ ] **09:00** Compilar documentación de cambios
  - [x] ¿Qué cambió?
  - [x] ¿Por qué?
  - [x] ¿Cómo revertir?
  - [x] ¿Qué monitorear?

- [ ] **09:30** Crear documento: `docs/Release_Notes_Leads_Email_2026-06-29.md`
  - Incluir:
    - Resumen de cambios
    - Cómo afecta a usuarios admin/comercial
    - Instrucciones para rollback
    - Qué monitorear después del deploy

- [ ] **10:00** Review final con equipo
  - ¿Todos los tests pasaron?
  - ¿RLS se revisó y está OK?
  - ¿Código review aprobado?
  - ¿Proceder a producción semana siguiente?

- [ ] **10:30** Preparar merge a main
  - ✅ Código review aprobado
  - ✅ Tests en staging OK
  - ✅ Documentación completa
  - ✅ Rollback probado

- [ ] **11:00** Reunión de stakeholders (opcional)
  - Mostrar cambios
  - Explicar beneficios
  - Calendario de deploy a producción

- [ ] **12:00** Crear checklist para deploy a producción (próxima semana)
  - Orden de ejecución
  - Verificaciones antes/después
  - Contactos de soporte

---

## Notas importantes

### Si algo falla

1. **Revertir en local:**
   ```bash
   git checkout components/PublicLandingClient.tsx
   git checkout app/api/leads/route.ts
   # etc.
   ```

2. **Revertir SQL:**
   ```sql
   ALTER TABLE public.leads DROP COLUMN IF EXISTS email;
   DROP INDEX IF EXISTS leads_email_idx;
   ```

3. **Comunicar bloqueantes** en el canal #dev-team

### Qué monitorear después de cada cambio

- [ ] Console errors en navegador
- [ ] Error logs en Supabase
- [ ] Funcionamiento del formulario existente (no rompas leads actuales)
- [ ] Performance de queries de leads

### Preguntas comunes

**P: ¿Necesito permisos especiales?**
R: Si, acceso a Supabase SQL editor y GitHub repo. Verifica con tu tech lead.

**P: ¿Cuándo deploy a producción?**
R: Después de validar en staging + 1 semana de observación. Semana del 07-06.

**P: ¿Y si hay leads antigos sin email?**
R: Se quedan como NULL. Normalización manual después (próximas semanas).

**P: ¿Se rompe el flujo actual?**
R: No. Email es optional. Leads sin email siguen funcionando.

---

## ✅ Éxito = 

- [ ] Formulario captura email
- [ ] API valida y almacena email
- [ ] Botón cotización rápida funciona
- [ ] Sin regresiones en flujo existente
- [ ] Código review aprobado
- [ ] Staging validado
- [ ] Documentación lista
- [ ] Rollback probado

🎉 **Si todo está✅, semana siguiente: deploy a producción**
