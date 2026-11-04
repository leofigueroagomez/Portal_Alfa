-- ============================================================================
-- NO EJECUTAR sin OK de Leonardo y sin respaldo previo de commercial_partners
-- y clients.
-- ============================================================================
--
-- Backfill del receptor fiscal por defecto de cada aliado comercial.
-- Requiere aplicada la migracion 20261104130000_commercial_partner_billing.sql.
--
-- Ejecutar en el SQL editor de Supabase (auth.uid() = null, por eso el
-- trigger commercial_partners_guard_billing_fields lo deja pasar).
--
-- Datos fiscales confirmados (consulta de solo lectura 2026-11-04):
--   HQE   (commercial_partners.id = 1) -> ESTIVALIS ALI DAI NUÑO MARTINEZ,
--         RFC NUME850524582, regimen 612, CP 45580, uso G03 (clients.id = 48 "Ali Nuño").
--   Kybit (commercial_partners.id = 2) -> NOWORANGE,
--         RFC NOW1709201SA, regimen 601, CP 45080, uso G03.
--         Hoy solo existe copiado dentro de clientes finales:
--         37 "Eduardo Venzor Castañeda" y 57 "Immmex".
--
-- Respaldo minimo sugerido (antes de correr):
--   create table backup_20261104_commercial_partners as select * from public.commercial_partners;
--   create table backup_20261104_clients as select * from public.clients;
--
-- Rollback:
--   update public.commercial_partners
--      set default_billing_client_id = null, updated_at = now()
--    where id in (1, 2);
--   -- y, si se uso la opcion A, borrar el cliente NOWORANGE creado
--   -- (solo si no tiene facturas: select count(*) from project_invoices where client_id = <id>).

begin;

-- ---------------------------------------------------------------------------
-- 1. HQE -> cliente 48 (Ali Nuño). Verifica que sigan siendo sus datos.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from public.clients
    where id = 48
      and upper(trim(tax_rfc)) = 'NUME850524582'
      and coalesce(fiscal_regime, tax_regime) = '612'
      and trim(tax_zip_code) = '45580'
  ) then
    raise exception 'El cliente 48 ya no tiene los datos fiscales esperados de Ali. Revisar antes de seguir.';
  end if;
end $$;

update public.commercial_partners
   set default_billing_client_id = 48,
       bill_to_partner = true,
       updated_at = now()
 where id = 1;

-- ---------------------------------------------------------------------------
-- 2. Kybit -> NOWORANGE. Elegir UNA opcion y dejar la otra comentada.
-- ---------------------------------------------------------------------------

-- OPCION A (recomendada): crear un cliente limpio "NOWORANGE".
--   Pros: el receptor del aliado ya no se confunde con un cliente final
--   (Eduardo Venzor / Immmex) en CRM, portal ni reportes.
--   Contras: un cliente mas. Las facturas ya timbradas a 37/57 NO se tocan
--   y siguen ligadas a esos clientes.
--   billing_email se copia del 37: CONFIRMAR con Leonardo que es el correo
--   fiscal de NOWORANGE antes de enviar CFDIs.
with next_number as (
  select coalesce(max(client_number), 0) + 1 as client_number from public.clients
), inserted as (
  insert into public.clients (
    client_number,
    name,
    tax_rfc,
    tax_business_name,
    tax_regime,
    fiscal_regime,
    cfdi_use,
    default_cfdi_use,
    tax_zip_code,
    billing_email
  )
  select
    n.client_number,
    'NOWORANGE',
    'NOW1709201SA',
    'NOWORANGE',
    '601',
    '601',
    'G03',
    'G03',
    '45080',
    (select billing_email from public.clients where id = 37)
  from next_number n
  where not exists (
    select 1 from public.clients
    where upper(trim(name)) = 'NOWORANGE'
      and upper(trim(tax_rfc)) = 'NOW1709201SA'
  )
  returning id
)
update public.commercial_partners
   set default_billing_client_id = coalesce(
         (select id from inserted),
         (select id from public.clients
           where upper(trim(name)) = 'NOWORANGE'
             and upper(trim(tax_rfc)) = 'NOW1709201SA'
           order by id limit 1)
       ),
       bill_to_partner = true,
       updated_at = now()
 where id = 2;

-- OPCION B (alternativa): reutilizar el cliente 37 "Eduardo Venzor Castañeda".
--   Pros: no crea registros. Contras: el receptor del aliado sigue llamandose
--   como un cliente final; es justo la confusion de Marsella 4064.
--   (El 57 "Immmex" no se recomienda: es cliente final real de 74 y 85.)
-- update public.commercial_partners
--    set default_billing_client_id = 37,
--        bill_to_partner = true,
--        updated_at = now()
--  where id = 2;

-- ---------------------------------------------------------------------------
-- 3. Verificacion: si algun aliado queda sin receptor completo, aborta todo.
-- ---------------------------------------------------------------------------
do $$
begin
  if (
    select count(*)
    from public.commercial_partners cp
    join public.clients c on c.id = cp.default_billing_client_id
    where cp.id in (1, 2)
      and nullif(trim(c.tax_rfc), '') is not null
      and nullif(trim(c.tax_business_name), '') is not null
      and nullif(trim(coalesce(c.fiscal_regime, c.tax_regime)), '') is not null
      and nullif(trim(c.tax_zip_code), '') is not null
      and nullif(trim(coalesce(c.cfdi_use, c.default_cfdi_use)), '') is not null
  ) <> 2 then
    raise exception 'HQE o Kybit quedaron sin receptor fiscal completo. Se revierte el script.';
  end if;
end $$;

commit;

-- Consulta para revisar el resultado (solo lectura):
select
  cp.id,
  cp.commercial_name,
  cp.bill_to_partner,
  c.id as billing_client_id,
  c.name,
  c.tax_rfc,
  c.tax_business_name,
  coalesce(c.fiscal_regime, c.tax_regime) as regimen,
  c.tax_zip_code,
  coalesce(c.cfdi_use, c.default_cfdi_use) as uso_cfdi
from public.commercial_partners cp
left join public.clients c on c.id = cp.default_billing_client_id
where cp.id in (1, 2)
order by cp.id;
