---
title: Propuestas de código - Cambios pequeños para leads
date: 2026-06-29
tags: [leads, código, implementación, pequeños-cambios]
---

# Propuestas de código - Cambios pequeños para captura de email y botón de cotización

## 1. Captura de email en formulario público

### Archivo: `components/PublicLandingClient.tsx`

**Cambio 1: Actualizar initialForm**

**Ubicación:** Línea ~194

```typescript
// ANTES:
const initialForm = {
  name: "",
  customerType: "residencial",
  company: "",
  phone: "",
  service: "",
  message: "",
  interest: "",
  budgetRange: "",
  timeline: "",
};

// DESPUÉS (PEQUEÑO CAMBIO):
const initialForm = {
  name: "",
  customerType: "residencial",
  company: "",
  phone: "",
  email: "",          // ← NUEVO
  service: "",
  message: "",
  interest: "",
  budgetRange: "",
  timeline: "",
};
```

**Cambio 2: Agregar campo email en formulario HTML**

**Ubicación:** Después del campo phone (línea ~825)

```jsx
// NUEVO: Campo email entre phone y service

<div>
  <label htmlFor="email" className="block text-sm font-semibold text-zinc-100">
    Correo electrónico (opcional)
  </label>
  <input
    id="email"
    type="email"
    placeholder="tu@empresa.com"
    value={form.email}
    onChange={(e) => updateField("email", e.target.value)}
    className="mt-2 w-full border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-[#7A1F2B] focus:outline-none"
  />
</div>
```

**Cambio 3: Agregar email al payload enviado**

**Ubicación:** Función handleSubmit (línea ~228)

```typescript
// ANTES:
const response = await fetch("/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...form,
  }),
});

// DESPUÉS (PEQUEÑO CAMBIO):
const response = await fetch("/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...form,
    email: form.email.trim().toLowerCase() || undefined,  // ← NUEVO: normalizar email
  }),
});
```

**Cambio 4: Incluir email en resumen de notificación (opcional, UX)**

**Ubicación:** Línea ~246 (construcción de mensaje de WhatsApp)

```typescript
// ANTES:
const details = [
  form.name ? `Nombre: ${form.name}` : null,
  // ... más campos
].filter(Boolean);

// DESPUÉS (AGREGAR):
const details = [
  form.name ? `Nombre: ${form.name}` : null,
  form.email ? `Correo: ${form.email}` : null,  // ← NUEVO
  // ... resto
].filter(Boolean);
```

---

## 2. Validación de email en API

### Archivo: `app/api/leads/route.ts`

**Cambio 1: Agregar variable de email al payload**

**Ubicación:** Función POST, donde se define `lead` (línea ~54)

```typescript
// ANTES:
const lead = {
  name: String(body?.name || "").trim(),
  customerType: String(body?.customerType || "").trim(),
  // ...
  source: normalizeSource(String(body?.source || "Landing Web").trim()),
  status: String(body?.status || "nuevo").trim(),
};

// DESPUÉS (AGREGAR):
const lead = {
  name: String(body?.name || "").trim(),
  customerType: String(body?.customerType || "").trim(),
  // ... resto
  email: String(body?.email || "").trim().toLowerCase(),  // ← NUEVO
  source: normalizeSource(String(body?.source || "Landing Web").trim()),
  status: String(body?.status || "nuevo").trim(),
};
```

**Cambio 2: Validar email (opcional pero recomendado)**

**Ubicación:** Después de validación de phone (línea ~68)

```typescript
// NUEVO: Validación de email si se proporciona
if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
  return NextResponse.json(
    { error: "Correo electrónico inválido" },
    { status: 400 }
  );
}
```

**Cambio 3: Agregar email a baseInsert**

**Ubicación:** Construcción de baseInsert (línea ~110)

```typescript
// ANTES:
const baseInsert = {
  name: lead.name,
  customer_type: lead.customerType,
  company: lead.company || null,
  phone: lead.phone,
  service: lead.service,
  // ...
};

// DESPUÉS (AGREGAR):
const baseInsert = {
  name: lead.name,
  customer_type: lead.customerType,
  company: lead.company || null,
  phone: lead.phone,
  email: lead.email || null,  // ← NUEVO
  service: lead.service,
  // ...
};
```

**Cambio 4: Usar baseInsert en insert (ya existe lógica)**

La lógica de fallback ya maneja esto; solo confirmar que email se incluya en el insert principal:

```typescript
// Esto ya funciona, solo verificar que el insert usa `baseInsert`:
const { error } = await supabase.from("leads").insert({
  ...baseInsert,  // ← Incluye email ahora
  interest: lead.interest || null,
  // ...
});
```

---

## 3. Crear botón "Crear cotización rápida"

### Archivo nuevo: `components/CreateQuoteFromClientButton.tsx`

```typescript
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

type Props = {
  clientId: number;
  clientName: string | null;
  leadService?: string;  // Sugerencia desde lead si existe
};

export default function CreateQuoteFromClientButton({
  clientId,
  clientName,
  leadService,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateQuote() {
    setIsLoading(true);
    try {
      // Construir URL con parámetros de pre-carga
      const params = new URLSearchParams({
        client_id: String(clientId),
        from_lead: "true",
        suggested_service: leadService || "",
      });

      // Redirigir a página de nueva cotización
      window.location.href = `/quotes/new?${params.toString()}`;
    } catch (error) {
      console.error("Error al crear cotización:", error);
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreateQuote}
      disabled={isLoading}
      className="flex items-center gap-2 rounded-lg bg-[#7A1F2B] px-4 py-2 text-white transition hover:bg-[#5a1620] disabled:opacity-50"
      title={`Crear cotización para ${clientName || "cliente"}`}
    >
      <Plus size={18} />
      {isLoading ? "Preparando..." : "Crear cotización"}
    </button>
  );
}
```

### Archivo: `app/(admin)/clients/[id]/page.tsx`

**Cambio: Agregar botón al header del cliente**

**Ubicación:** En el header/toolbar del cliente (aproximadamente línea ~50)

```typescript
import CreateQuoteFromClientButton from "@/components/CreateQuoteFromClientButton";

// En la página del cliente, en la sección de header/acciones:

<div className="flex flex-wrap gap-3">
  {/* Botones existentes */}
  <button>...</button>
  
  {/* NUEVO: Botón crear cotización */}
  <CreateQuoteFromClientButton
    clientId={client.id}
    clientName={client.name}
    leadService={lead?.service}  // Si el cliente fue convertido desde lead
  />
</div>
```

### Archivo: `app/(admin)/quotes/new/page.tsx` (adaptación)

**Cambio: Leer parámetros de URL y pre-cargar cliente**

**Ubicación:** En el componente NewQuotePage (línea ~1)

```typescript
async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const clientIdParam = params.client_id ? Number(params.client_id) : undefined;
  const suggestedService = params.suggested_service || "";

  // Si hay clientId en parámetros, pre-cargar en el formulario
  let initialClientId = undefined;
  if (clientIdParam) {
    // Validar que el cliente existe (seguridad)
    const supabase = await createSupabaseServerClient();
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientIdParam)
      .single();

    if (client) {
      initialClientId = clientIdParam;
    }
  }

  return (
    <QuoteFormClient
      initialClientId={initialClientId}
      suggestedService={suggestedService}
    />
  );
}
```

**En el componente del formulario:**

```typescript
// En QuoteFormClient (que ya existe):
const [quote, setQuote] = useState({
  client_id: initialClientId || null,  // Pre-cargar si viene de parámetros
  service: suggestedService || "",      // Sugerencia de servicio
  // ... resto de campos
});
```

---

## 4. Test de cambios (checklist)

### Test local (antes de staging)

```bash
# 1. Formulario de leads
- [ ] Cargar http://localhost:3000
- [ ] Ver nuevo campo "Correo electrónico" en formulario de leads
- [ ] Ingresar correo con formato válido
- [ ] Ingresar correo con formato inválido → debe fallar
- [ ] Enviar lead con email → verificar en DB

# 2. API de leads
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "customerType": "residencial",
    "phone": "5210000000000",
    "service": "Test Service",
    "email": "test@example.com"
  }'
# Esperado: { "ok": true, "stored": true }

# 3. Botón de cotización
- [ ] Ir a /clients/1 (cualquier cliente existente)
- [ ] Verificar que aparece botón "Crear cotización"
- [ ] Hacer click → debe redirigir a /quotes/new?client_id=1&from_lead=true
- [ ] Verificar que cliente está pre-seleccionado en formulario de cotización
```

### Test en Supabase (después de migración SQL)

```sql
-- 1. Verificar columna email existe
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leads' AND column_name = 'email';

-- 2. Verificar índices creados
SELECT indexname FROM pg_indexes
WHERE tablename = 'leads' AND indexname LIKE 'leads_email%';

-- 3. Insertar lead de prueba con email
INSERT INTO public.leads (name, customer_type, phone, service, email, status)
VALUES ('Test', 'residencial', '5210000000000', 'Test', 'test@example.com', 'nuevo');

-- 4. Verificar que se insertó
SELECT id, email FROM public.leads WHERE email = 'test@example.com';
```

---

## 5. Rollback rápido (si algo falla)

### Revert cambios en formulario

```bash
# Git revert si solo es formulario
git revert <commit-hash>

# O revertir manualmente: eliminar lineas que dicen "NUEVO"
```

### Revert cambios en API

```bash
# Git revert si la API cambió
git revert <commit-hash>

# O revertir manualmente: eliminar líneas que dicen "NUEVO"
```

### Revert cambios en SQL

```sql
-- Eliminar columna email (si fue necesario rollback)
ALTER TABLE public.leads DROP COLUMN IF EXISTS email;
DROP INDEX IF EXISTS leads_email_idx;
DROP INDEX IF EXISTS leads_client_email_idx;
```

---

## 6. Checklist de merge

Antes de mergear a main:

- [ ] Todos los tests locales pasan
- [ ] Sin console.error() o warnings
- [ ] Código sigue convenciones del proyecto (Tailwind, imports, etc.)
- [ ] Cambios son pequeños y enfocados (una cosa por PR)
- [ ] Documentación actualizada
- [ ] Rollback está documentado y probado
- [ ] Al menos 1 código review aprobado

---

## 7. Documentación de cambios para el equipo

**Mensaje para Slack/notificación:**

```
📧 Cambios en captura de leads

✅ Agregamos campo EMAIL al formulario de leads
✅ Botón rápido "Crear cotización" en página de cliente
✅ Validación de email en backend
✅ Migraciones SQL seguras y reversibles

🎯 Beneficios:
- Leads contactables directamente por email
- Flujo más rápido de lead → cliente → cotización
- Sin riesgos: todos los cambios son reversibles

📅 Deploy: staging esta semana, producción semana siguiente
❓ Preguntas: @dev-team

Documentación: docs/Plan_Ejecucion_Semana_Leads_2026-06-29.md
```
