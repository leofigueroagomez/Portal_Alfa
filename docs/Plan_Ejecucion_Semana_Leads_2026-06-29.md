---
title: Plan de Ejecución Semanal - Mejora de Leads
date: 2026-06-29
week: 2026-W26
priority: high
tags: [leads, plan-ejecución, seguridad, formulario, cotización]
---

# Plan de Ejecución Semanal - Mejora de Leads

**Objetivo:** Mejorar captura de leads, reducir riesgos y acelerar flujo manual comercial.

**Filosofía:** Cambios pequeños, reversibles, no destructivos. Testeados fuera de producción.

---

## Tareas de la semana

### 1. Auditoría de RLS y acceso a leads (no-code)

**Objetivo:** Documentar riesgo exacto de seguridad en tabla `leads`.

**Pasos:**

1. Ejecutar queries de diagnóstico en Supabase (SQL Editor):

```sql
-- QUERY 1: Verificar políticas RLS actuales en tabla leads
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;
```

**Interpretación esperada:**
- Debe mostrar 4 políticas: `beta_authenticated_select`, `beta_authenticated_insert`, `beta_authenticated_update`, `beta_authenticated_delete`.
- Todas con rol `authenticated` (cualquier usuario autenticado accede).
- Riesgo: cualquier usuario interno puede ver/modificar leads de otros usuarios.

```sql
-- QUERY 2: Contar accesos a leads por usuario (si hay logs)
-- Nota: Esta query depende de si hay auditoría en la tabla
SELECT COUNT(*) as total_leads, status, COUNT(DISTINCT source) as sources
FROM public.leads
GROUP BY status;
```

**Interpretación:**
- Ver distribución de leads por estado.
- Identificar si hay leads `nuevo` muy antiguos.

```sql
-- QUERY 3: Leads sin email (CRÍTICO)
SELECT COUNT(*) as leads_sin_email
FROM public.leads
WHERE (raw_payload ->> 'email' IS NULL OR raw_payload ->> 'email' = '')
  AND status IN ('nuevo', 'contactado');
```

**Interpretación:**
- Número de leads activos sin contacto de email.
- Si > 50%, es problema grave.

2. **Documentar hallazgos en tabla:**

| Métrica | Valor | Riesgo | Acción |
|---------|-------|--------|--------|
| RLS permisivo (cualquier autenticado) | SÍ | ALTO | Documentar, no cambiar esta semana |
| Leads sin email | TBD | ALTO | Proponer captura |
| Leads `nuevo` > 30 días | TBD | MEDIO | Revisar manualmente |

**Salida:** Documento en `docs/Diagnostico_RLS_Leads_2026-06-29.md` con hallazgos y propuestas de hardening futuro.

**Tiempo estimado:** 30 min (1 sesión de Supabase SQL)

---

### 2. Propuesta de cambio SQL no destructivo para email (código + test)

**Objetivo:** Preparar tabla para capturar email sin romper datos existentes.

**Paso 1: Crear migración segura**

Archivo: `sql/20260630_leads_email_capture.sql`

```sql
-- No destructiva: solo agrega columna si no existe
alter table public.leads
  add column if not exists email text;

-- Índice para búsqueda rápida de email
create index if not exists leads_email_idx
  on public.leads(email);

-- Información: hasta 2026-06-29, leads capturados sin email directo
-- El email está en raw_payload si existe; migración futura puede normalizar
```

**Paso 2: Test en staging/local**

```bash
# Conectarse a Supabase local o staging
psql $DATABASE_URL < sql/20260630_leads_email_capture.sql

# Verificar que la columna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leads' AND column_name = 'email';
```

**Paso 3: Documentar rollback (por si falla)**

```sql
-- ROLLBACK (si es necesario)
alter table public.leads drop column if exists email;
drop index if exists leads_email_idx;
```

**Paso 4: Validar en producción**

- No ejecutar en producción aún.
- Preparar para deploy la próxima semana si todo es seguro en staging.

**Salida:** Archivo SQL listo para ejecutar. Documento de rollback. Test log.

**Tiempo estimado:** 30 min (escritura + test local)

---

### 3. Captura de email en formulario público (componente)

**Objetivo:** Añadir campo email al formulario de leads sin romper flujo existente.

**Paso 1: Modificar estado del formulario**

Archivo: `components/PublicLandingClient.tsx`

**Cambios pequeños:**

1. Añadir `email` a `initialForm`:
```typescript
const initialForm = {
  name: "",
  customerType: "residencial",
  company: "",
  phone: "",
  email: "",  // NUEVO
  service: "",
  message: "",
  // ... resto
};
```

2. Añadir campo en formulario HTML (después de phone):
```tsx
<input
  type="email"
  placeholder="Correo electrónico (opcional)"
  value={form.email}
  onChange={(e) => updateField("email", e.target.value)}
  className={/* estilos existentes */}
/>
```

3. Añadir email a payload al enviar:
```typescript
const response = await fetch("/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...form,
    email: form.email.trim().toLowerCase() || undefined,  // NUEVO
  }),
});
```

4. Resetear email al limpiar formulario:
```typescript
setForm(initialForm);  // ya incluye email: ""
```

**Validación en frontend (opcional, sin romper):**

```typescript
// Validación simple de email formato
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// En handleSubmit, antes de enviar:
if (form.email && !isValidEmail(form.email)) {
  setMessage("Correo inválido. Por favor revisa el formato.");
  return;
}
```

**Salida:** Componente actualizado, campo email opcional, sin romper flujo.

**Tiempo estimado:** 45 min (cambio + test visual local)

---

### 4. Endpoint de API para aceptar email (backend)

**Objetivo:** API `/api/leads` acepta y valida email.

**Archivo:** `app/api/leads/route.ts`

**Cambios pequeños:**

1. Añadir validación de email a la lista de valores permitidos (ojo: email es libre, no tiene lista):

```typescript
// En función POST, después de validaciones actuales:

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (lead.email && !emailPattern.test(lead.email)) {
  return NextResponse.json(
    { error: "Correo inválido" },
    { status: 400 }
  );
}
```

2. Insertar email en tabla:

```typescript
const baseInsert = {
  name: lead.name,
  customer_type: lead.customerType,
  company: lead.company || null,
  phone: lead.phone,
  email: lead.email || null,  // NUEVO
  service: lead.service,
  message: lead.message || null,
  source: lead.source,
  status: lead.status,
  raw_payload: lead,
};
```

3. Mantener fallback para hosts antiguos sin columna email:

```typescript
// Ya existe lógica de fallback; el insert a `baseInsert` (sin interest, budget_range, timeline) funcionará
// si la nueva columna no existe en la tabla antigua.
```

**Test local:**

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "customerType": "residencial",
    "phone": "5210000000000",
    "service": "Test service",
    "email": "test@example.com"
  }'
```

**Salida:** API acepta email, valida formato, inserta en tabla.

**Tiempo estimado:** 30 min (cambio + test con curl)

---

### 5. Botón "Crear cotización rápida" en página del cliente (componente + action)

**Objetivo:** Atajo operativo para crear cotización desde cliente convertido de lead.

**Ubicación:** `app/(admin)/clients/[id]/page.tsx` o nuevo componente `CreateQuoteFromClientButton.tsx`

**Componente UI:**

```typescript
// Nuevo componente: components/CreateQuoteFromClientButton.tsx

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

type Props = {
  clientId: number;
  clientName: string | null;
  leadService?: string;  // Sugerencia desde lead
};

export default function CreateQuoteFromClientButton({ clientId, clientName, leadService }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCreateQuote() {
    setLoading(true);
    try {
      // Redirigir a página de nueva cotización pre-cargada con cliente
      const params = new URLSearchParams({
        client_id: String(clientId),
        from_lead: "true",
        suggested_service: leadService || "",
      });
      window.location.href = `/quotes/new?${params.toString()}`;
    } catch (error) {
      console.error("Error creating quote:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreateQuote}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-[#7A1F2B] px-4 py-2 text-white hover:bg-[#5a1620] disabled:opacity-50"
    >
      <Plus size={18} />
      {loading ? "Preparando..." : "Crear cotización"}
    </button>
  );
}
```

**Integración en página de cliente:**

```typescript
// En app/(admin)/clients/[id]/page.tsx, agregar al header del cliente:

<CreateQuoteFromClientButton
  clientId={client.id}
  clientName={client.name}
  leadService={lead?.service}  // Si está vinculado desde lead
/>
```

**Mejora en página `/quotes/new`:**

```typescript
// En app/(admin)/quotes/new/page.tsx, leer query params:

async function NewQuotePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const clientId = params.client_id ? Number(params.client_id) : undefined;
  const suggestedService = params.suggested_service || "";

  // Pre-cargar cliente en el formulario
  const [formData, setFormData] = useState({
    client_id: clientId,
    // ... resto del formulario
  });

  // Al renderizar el select de cliente, si hay clientId, pre-seleccionar
}
```

**Salida:** Botón que acelera creación de cotización desde cliente. No automatiza, pero reduce clics.

**Tiempo estimado:** 1 hora (componente + integración + test)

---

## Resumen de cambios

| Tarea | Tipo | Riesgo | Tiempo | Reversible |
|-------|------|--------|--------|-----------|
| Auditar RLS/leads | Query | Ninguno | 30 min | N/A |
| SQL para email | Migración | Bajo (alter) | 30 min | SÍ (drop) |
| Formulario email | UI | Bajo | 45 min | SÍ (revert) |
| API email | Backend | Bajo | 30 min | SÍ (revert) |
| Botón cotización | UI + Routing | Bajo | 1 hora | SÍ (revert) |
| **TOTAL** | | | **3 horas** | **Todos SÍ** |

---

## Orden de ejecución

### Día 1 (Lunes 29 o 30)
1. ✅ Auditoría RLS (30 min) → Documentar hallazgos
2. ✅ SQL no destructivo (30 min) → Test en local

### Día 2-3 (Martes-Miércoles 1-2)
3. ✅ Captura de email en formulario (45 min) → Test visual
4. ✅ API para email (30 min) → Test con curl
5. ✅ Integración y validación e2e

### Día 4 (Jueves 3)
6. ✅ Botón cotización rápida (1 hora) → Test en cliente
7. ✅ Documentación y preparación para staging

### Día 5 (Viernes 4)
- ✅ Deploy a staging (si todos tests pasan)
- ✅ Review con equipo
- ✅ Preparar para producción (semana siguiente)

---

## Criterios de éxito

- ✅ Leads sin email → cero
- ✅ Email capturado en formulario público
- ✅ Botón "crear cotización" funcional desde cliente
- ✅ Sin regresiones en flujo existente
- ✅ Documentación clara para rollback
- ✅ Staging test validado

---

## Próximas semanas

### Semana 2
- Deploy a producción (si todo en staging está OK)
- Monitor de leads nuevos con email
- Ajustes basados en feedback

### Semana 3+
- Automatización parcial: lead convertido → sugerir cotización
- Scoring de leads (priority basado en budget_range + timeline)
- Dashboard comercial de pipeline

---

## Notas importantes

- **No comprometer producción.** Todos los cambios primero en local/staging.
- **Reversibles.** Cada cambio tiene un rollback claro.
- **No automatizar aún.** El equipo comercial sigue usando botones; la automatización viene después de validar.
- **Comunicar cambios.** Avisar al equipo de ventas/admin antes de deploy a producción.
