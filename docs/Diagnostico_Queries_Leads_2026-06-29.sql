-- Diagnóstico de Leads: RLS, seguridad y calidad de datos
-- Ejecutar en: Supabase SQL Editor (no requiere schema público)
-- Fecha: 2026-06-29

-- ============================================================
-- DIAGNOSTICO 1: Revisar políticas RLS en tabla leads
-- ============================================================
-- Propósito: Documentar riesgos de seguridad exactos
-- Riesgo actual: Cualquier usuario autenticado puede leer/escribir/borrar leads

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as "condition_select",
  with_check as "condition_insert_update"
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;

-- Salida esperada:
-- 4 filas con políticas: beta_authenticated_select, insert, update, delete
-- Todas con rol: "authenticated" (muy permisivo)
-- Riesgo: Cualquier usuario interno accede a todos los leads

-- ============================================================
-- DIAGNOSTICO 2: Estado actual de leads (conteo)
-- ============================================================
-- Propósito: Entender volumen y distribución

SELECT
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN client_id IS NULL THEN 1 END) as sin_cliente,
  COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) as convertidos,
  DATE(MIN(created_at)) as lead_mas_antiguo,
  DATE(MAX(created_at)) as lead_mas_reciente
FROM public.leads
GROUP BY status
ORDER BY total DESC;

-- Salida esperada:
-- Distribución de leads por estado (nuevo, contactado, calificado, convertido, descartado)
-- Identifica si hay muchos leads "nuevo" sin avanzar

-- ============================================================
-- DIAGNOSTICO 3: CRÍTICO - Leads sin email (principal problema)
-- ============================================================
-- Propósito: Contar leads activos sin contacto directo

SELECT
  COUNT(*) as leads_sin_email_activos,
  COUNT(CASE WHEN status = 'nuevo' THEN 1 END) as nuevos_sin_email,
  COUNT(CASE WHEN status = 'contactado' THEN 1 END) as contactados_sin_email,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM public.leads WHERE status IN ('nuevo', 'contactado')), 2) as porcentaje
FROM public.leads
WHERE (raw_payload ->> 'email' IS NULL OR raw_payload ->> 'email' = '')
  AND status IN ('nuevo', 'contactado');

-- Salida esperada:
-- Número total de leads activos sin email
-- % del total de leads activos
-- Riesgo: Si > 50%, es problema grave (no hay forma de contactar)

-- ============================================================
-- DIAGNOSTICO 4: Edad de leads sin conversión
-- ============================================================
-- Propósito: Identificar leads abandonados o muy antiguos

SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(DAY FROM now() - created_at)) as dias_promedio,
  MAX(EXTRACT(DAY FROM now() - created_at)) as dias_maximo
FROM public.leads
WHERE status IN ('nuevo', 'contactado')
GROUP BY status;

-- Salida esperada:
-- Qué tanto tiempo llevan los leads en estado "nuevo" o "contactado"
-- Riesgo: Si > 30 días, es posible lead abandonado

-- ============================================================
-- DIAGNOSTICO 5: Calidad de datos - phone y company
-- ============================================================
-- Propósito: Validar captura de campos importantes

SELECT
  COUNT(*) as total_leads,
  COUNT(CASE WHEN phone IS NULL OR phone = '' THEN 1 END) as sin_phone,
  COUNT(CASE WHEN company IS NULL OR company = '' THEN 1 END) as sin_company,
  COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as sin_name,
  COUNT(CASE WHEN customer_type IS NULL THEN 1 END) as sin_customer_type
FROM public.leads;

-- Salida esperada:
-- Indicadores de calidad de captura
-- Riesgo: Si sin_phone > 5%, hay problemas en validación

-- ============================================================
-- DIAGNOSTICO 6: Fuentes de leads (validar captura)
-- ============================================================
-- Propósito: Entender de dónde vienen los leads

SELECT
  source,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'convertido' THEN 1 END) as convertidos,
  ROUND(100.0 * COUNT(CASE WHEN status = 'convertido' THEN 1 END) / COUNT(*), 2) as conversion_rate
FROM public.leads
GROUP BY source
ORDER BY total DESC;

-- Salida esperada:
-- Canal de mayor volumen y tasa de conversión por canal
-- Ejemplo: Landing Web = 80%, LinkedIn = 15%, etc.

-- ============================================================
-- DIAGNOSTICO 7: Leads con conversión pero sin cliente
-- ============================================================
-- Propósito: Identificar inconsistencias

SELECT
  COUNT(*) as leads_convertidos_sin_cliente
FROM public.leads
WHERE status = 'convertido' AND client_id IS NULL;

-- Salida esperada:
-- Debería ser 0 (inconsistencia de datos si > 0)

-- ============================================================
-- DIAGNOSTICO 8: Revisar raw_payload (qué datos capturamos)
-- ============================================================
-- Propósito: Entender qué info está en JSON pero no normalizada

SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN raw_payload ->> 'email' IS NOT NULL THEN 1 END) as con_email_en_payload,
  COUNT(CASE WHEN raw_payload ->> 'interest' IS NOT NULL THEN 1 END) as con_interest,
  COUNT(CASE WHEN raw_payload ->> 'budgetRange' IS NOT NULL THEN 1 END) as con_budgetRange,
  COUNT(CASE WHEN raw_payload ->> 'timeline' IS NOT NULL THEN 1 END) as con_timeline
FROM public.leads;

-- Salida esperada:
-- Cuántos leads tienen datos en raw_payload que podrían normalizarse

-- ============================================================
-- RESUMEN RECOMENDADO (ejecutar después)
-- ============================================================
-- Después de revisar todos los diagnósticos:
--
-- 1. Si leads_sin_email > 50%: CRÍTICO - proceder con captura de email
-- 2. Si dias_maximo > 60: Algunos leads muy antiguos, revisar si automatizar arquivado
-- 3. Si conversion_rate por channel < 10%: Canal inefectivo, considerar pausar
-- 4. Si porcentaje de fallos de validación > 5%: Revisar validación en formulario

-- ============================================================
-- QUERIES DE ACCIÓN (no ejecutar aún)
-- ============================================================

-- Para normalizar emails desde raw_payload (DESPUÉS de agregar columna email):
-- UPDATE public.leads
-- SET email = (raw_payload ->> 'email')
-- WHERE email IS NULL
--   AND raw_payload ->> 'email' IS NOT NULL
--   AND (raw_payload ->> 'email') != ''
--   AND (raw_payload ->> 'email') LIKE '%@%';

-- Para archivar leads muy antiguos (ejemplo: > 90 días sin conversión):
-- UPDATE public.leads
-- SET status = 'descartado'
-- WHERE status = 'nuevo'
--   AND EXTRACT(DAY FROM now() - created_at) > 90;
