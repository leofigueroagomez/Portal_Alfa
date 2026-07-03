-- Migración segura para captura de email en leads
-- Fecha: 2026-06-30
-- Objetivo: Agregar columna email a tabla leads sin romper datos existentes
-- Reversible: SÍ (drop column if exists email)

-- PASO 1: Agregar columna email (nullable)
-- Por qué nullable: leads capturados antes no tendrán email; esto es retro-compatible
alter table public.leads
  add column if not exists email text;

-- PASO 2: Crear índice para búsquedas rápidas de email
-- Útil para deduplicación y búsqueda de leads
create index if not exists leads_email_idx
  on public.leads(email);

-- PASO 3: Crear índice compuesto client_id + email para búsquedas de leads por cliente
create index if not exists leads_client_email_idx
  on public.leads(client_id, email);

-- PASO 4: Migración de emails desde raw_payload (opcional, manual después)
-- Este query DOCUMENTA cómo extraer emails antiguos, pero NO modifica datos:
-- 
-- UPDATE public.leads
-- SET email = (raw_payload ->> 'email')
-- WHERE email IS NULL
--   AND raw_payload ->> 'email' IS NOT NULL
--   AND (raw_payload ->> 'email') != '';

-- PASO 5: Documentación de cambios
-- Tabla leads ahora tiene columna `email` para capturar contacto directo
-- Leads existentes sin email permanecen NULL; se normalizan manualmente si es necesario
-- Nuevos leads desde formulario capturarán email automáticamente
