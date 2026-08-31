-- El Vigia de ALFA OS - Sprint C: Sensores de Ventas (VTA-*) y Postventa/Servicios (SRV-*)
--
-- Crea 5 vistas de deteccion:
--   VTA-01: Leads nuevos desatendidos (> 24h sin primer contacto)
--   VTA-02: Cotizaciones dormidas de alto valor (> $100k MXN, > 7 dias sin cierre)
--   VTA-03: Proyectos ganados ('won') sin anticipo registrado (> 10 dias)
--   SRV-01: Proyectos con garantia por vencer en < 45 dias (oportunidad de poliza)
--   SRV-02: Tickets de servicio estancados (> 72h sin actualizacion)
--
-- Cambio aditivo: solo crea/reemplaza vistas public.vigia_v_*.
-- No modifica ninguna tabla ni dato existente.

-- VTA-01 - Leads nuevos desatendidos (> 24h)
create or replace view public.vigia_v_vta01_unattended_leads as
select
  l.id as lead_id,
  l.name,
  l.customer_type,
  l.company,
  l.phone,
  l.service,
  l.source,
  l.created_at,
  round(extract(epoch from (now() - l.created_at)) / 3600, 1) as age_hours
from public.leads l
where l.status = 'nuevo'
  and l.created_at < now() - interval '24 hours'
order by l.created_at asc;

-- VTA-02 - Cotizaciones dormidas de alto valor (> $100k MXN, > 7 dias)
create or replace view public.vigia_v_vta02_stale_high_value_quotes as
select
  q.id as quote_id,
  q.quote_number,
  q.client_id,
  q.client_project_id,
  q.status,
  q.currency,
  q.grand_total,
  coalesce(
    q.total_mxn,
    case
      when upper(coalesce(q.currency, 'USD')) = 'USD'
        then q.grand_total * coalesce(nullif(q.exchange_rate, 0), 18.5)
      else q.grand_total
    end
  ) as total_mxn,
  q.created_at,
  round(extract(epoch from (now() - q.created_at)) / 86400, 1) as age_days
from public.quotes q
where coalesce(q.is_latest, true) = true
  and q.status in ('draft', 'sent')
  and coalesce(
    q.total_mxn,
    case
      when upper(coalesce(q.currency, 'USD')) = 'USD'
        then q.grand_total * coalesce(nullif(q.exchange_rate, 0), 18.5)
      else q.grand_total
    end
  ) >= 100000
  and q.created_at < now() - interval '7 days'
order by total_mxn desc;

-- VTA-03 - Proyectos ganados ('won') sin anticipo (> 10 dias)
create or replace view public.vigia_v_vta03_won_project_missing_deposit as
select
  cp.id as client_project_id,
  cp.name,
  cp.client_id,
  cp.sales_stage,
  cp.created_at,
  round(extract(epoch from (now() - cp.created_at)) / 86400, 1) as age_days,
  coalesce((
    select sum(coalesce(p.amount_mxn, p.amount))
    from public.project_payments p
    where p.client_project_id = cp.id
  ), 0) as total_paid_mxn
from public.client_projects cp
where cp.sales_stage = 'won'
  and cp.created_at < now() - interval '10 days'
  and not exists (
    select 1 from public.project_payments p
    where p.client_project_id = cp.id and p.amount > 0
  )
order by cp.created_at asc;

-- SRV-01 - Garantias por vencer en < 45 dias (oferta de poliza)
create or replace view public.vigia_v_srv01_expiring_project_warranties as
select
  pw.id as warranty_id,
  pw.client_project_id,
  pw.equipment_warranty_end_date,
  pw.installation_warranty_end_date,
  least(pw.equipment_warranty_end_date, pw.installation_warranty_end_date) as earliest_end_date,
  (least(pw.equipment_warranty_end_date, pw.installation_warranty_end_date) - current_date) as days_until_expiry,
  pw.installed_systems,
  pw.maintenance_policy_active,
  pw.support_email
from public.project_warranties pw
where pw.status = 'issued'
  and coalesce(pw.maintenance_policy_active, false) = false
  and least(pw.equipment_warranty_end_date, pw.installation_warranty_end_date)
      between (current_date - interval '15 days') and (current_date + interval '45 days')
order by earliest_end_date asc;

-- SRV-02 - Tickets de servicio estancados (> 72h)
create or replace view public.vigia_v_srv02_stale_service_tickets as
select
  sr.id as service_id,
  sr.service_number,
  sr.client_id,
  sr.client_project_id,
  sr.service_date,
  sr.performed_by_name,
  sr.diagnosis,
  sr.status,
  sr.solution_status,
  sr.created_at,
  sr.updated_at,
  round(extract(epoch from (now() - sr.updated_at)) / 3600, 1) as inactive_hours
from public.service_reports sr
where sr.status in ('draft', 'pending')
  and sr.solution_status = 'pending'
  and sr.updated_at < now() - interval '72 hours'
order by sr.updated_at asc;

notify pgrst, 'reload schema';
