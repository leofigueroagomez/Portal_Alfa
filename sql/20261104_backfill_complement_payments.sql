-- ============================================================================
-- Solo ejecutar con autorización de Leonardo y después de un respaldo de
-- project_payments y project_payment_complements.
-- ============================================================================
--
-- Backfill: complementos de pago (CFDI tipo P) timbrados sin pago ligado.
--
-- Para cada complemento issued/stamped con project_payment_id is null:
--   * link      -> existe exactamente UN pago sin ligar del mismo proyecto con la
--                  misma fecha y monto a ±$1, o con la misma referencia
--                  (referencias de menos de 6 caracteres, p.ej. "SPEI", no cuentan):
--                  se liga ese pago y no se crea otro.
--   * create    -> no hay candidato: se crea el pago con los datos del complemento
--                  (MXN, categoria equipment) y se liga. Las notas llevan el
--                  marcador backfill-complemento:<id>.
--   * ambiguous -> mas de un candidato, o el mismo pago es candidato de mas de un
--                  complemento: NO se toca; revisar a mano.
--   * marker    -> ya existe un pago con backfill-complemento:<id> (corrida previa
--                  interrumpida): se liga ese pago.
--
-- Idempotente: solo procesa complementos con project_payment_id is null y no crea
-- un pago si ya existe uno con su marcador. Una segunda corrida no hace nada.
--
-- MODO: por defecto 'dry-run' (solo SELECT + ROLLBACK). Para aplicar, cambiar la
-- linea de set_config a 'apply' y el ROLLBACK final a COMMIT.
--
-- Compatible con psql y con el SQL Editor de Supabase (no usa \set).
-- Despues de aplicar: supabase/migrations/20261104120100_payment_complement_payment_check.sql
-- ============================================================================

begin;

select set_config('alfa.backfill_mode', 'dry-run', true);  -- 'dry-run' | 'apply'

create temp table _bf_targets on commit drop as
select
  c.id as complement_id,
  c.client_project_id,
  c.project_invoice_id,
  i.internal_folio,
  c.status,
  c.payment_date,
  c.payment_form_code,
  nullif(trim(c.payment_reference), '') as payment_reference,
  coalesce(c.paid_amount_mxn, c.amount_paid_mxn) as paid_amount_mxn,
  coalesce(c.issued_by_user_id, c.created_by_user_id) as created_by_user_id
from public.project_payment_complements c
left join public.project_invoices i on i.id = c.project_invoice_id
where c.status in ('issued', 'stamped')
  and c.project_payment_id is null;

-- Pagos que ya respaldan un complemento activo no son candidatos.
create temp table _bf_unlinked_payments on commit drop as
select p.*
from public.project_payments p
where not exists (
  select 1
  from public.project_payment_complements c
  where c.project_payment_id = p.id
    and c.status in ('draft', 'validated', 'issued', 'stamped')
);

create temp table _bf_candidates on commit drop as
select
  t.complement_id,
  p.id as payment_id,
  case
    when p.notes ~ ('backfill-complemento:' || t.complement_id || '([^0-9]|$)') then 'marker'
    when p.payment_date = t.payment_date
      and abs(coalesce(p.amount_mxn, p.amount) - t.paid_amount_mxn) <= 1 then 'date_amount'
    else 'reference'
  end as matched_by
from _bf_targets t
join _bf_unlinked_payments p on p.client_project_id = t.client_project_id
where p.notes ~ ('backfill-complemento:' || t.complement_id || '([^0-9]|$)')
   or (p.payment_date = t.payment_date
       and abs(coalesce(p.amount_mxn, p.amount) - t.paid_amount_mxn) <= 1)
   or (length(coalesce(t.payment_reference, '')) >= 6
       and upper(trim(coalesce(p.payment_reference, ''))) = upper(t.payment_reference));

create temp table _bf_plan on commit drop as
with per_complement as (
  select
    t.complement_id,
    count(cand.payment_id) as candidate_count,
    min(cand.payment_id) filter (where cand.matched_by = 'marker') as marker_payment_id,
    min(cand.payment_id) as candidate_payment_id,
    string_agg(cand.payment_id || ':' || cand.matched_by, ', ' order by cand.payment_id) as candidates
  from _bf_targets t
  left join _bf_candidates cand on cand.complement_id = t.complement_id
  group by t.complement_id
),
shared_payments as (
  -- Un mismo pago no puede respaldar dos complementos timbrados.
  select payment_id
  from _bf_candidates
  group by payment_id
  having count(distinct complement_id) > 1
)
select
  t.*,
  pc.candidate_count,
  pc.candidates,
  case
    when pc.marker_payment_id is not null then 'marker'
    when pc.candidate_count = 0 then 'create'
    when pc.candidate_count = 1
      and pc.candidate_payment_id not in (select payment_id from shared_payments) then 'link'
    else 'ambiguous'
  end as action,
  case
    when pc.marker_payment_id is not null then pc.marker_payment_id
    when pc.candidate_count = 1 then pc.candidate_payment_id
  end as payment_id
from _bf_targets t
join per_complement pc on pc.complement_id = t.complement_id;

-- Reporte: que haria (dry-run) o que va a hacer (apply).
select
  complement_id,
  client_project_id,
  internal_folio,
  payment_date,
  paid_amount_mxn,
  payment_form_code,
  payment_reference,
  action,
  payment_id as link_to_payment_id,
  candidates
from _bf_plan
order by complement_id;

select action, count(*) as complements, sum(paid_amount_mxn) as total_mxn
from _bf_plan
group by action
order by action;

do $$
declare
  r record;
  v_payment_id bigint;
  v_linked int := 0;
  v_created int := 0;
begin
  if current_setting('alfa.backfill_mode', true) is distinct from 'apply' then
    raise notice 'backfill complementos: DRY-RUN, no se modifico nada.';
    return;
  end if;

  for r in
    select * from _bf_plan where action in ('link', 'marker') order by complement_id
  loop
    update public.project_payment_complements
       set project_payment_id = r.payment_id,
           source_payment_amount_mxn = coalesce(source_payment_amount_mxn, (
             select coalesce(p.amount_mxn, p.amount)
             from public.project_payments p
             where p.id = r.payment_id
           )),
           updated_at = now()
     where id = r.complement_id
       and project_payment_id is null;
    if found then
      v_linked := v_linked + 1;
    end if;
  end loop;

  for r in
    select * from _bf_plan where action = 'create' order by complement_id
  loop
    insert into public.project_payments (
      client_project_id,
      payment_date,
      payment_method,
      payment_reference,
      payment_category,
      currency,
      amount,
      exchange_rate,
      amount_mxn,
      payment_form_code,
      notes,
      created_by_user_id
    )
    values (
      r.client_project_id,
      r.payment_date,
      case r.payment_form_code
        when '01' then 'Efectivo'
        when '02' then 'Cheque'
        when '03' then 'Transferencia'
        when '04' then 'Tarjeta de credito'
        when '05' then 'Monedero electronico'
        when '06' then 'Dinero electronico'
        when '08' then 'Vales de despensa'
        when '28' then 'Tarjeta de debito'
        when '29' then 'Tarjeta de servicios'
        when '30' then 'Aplicacion de anticipos'
        else 'Forma SAT ' || r.payment_form_code
      end,
      r.payment_reference,
      'equipment',
      'MXN',
      r.paid_amount_mxn,
      null,
      r.paid_amount_mxn,
      r.payment_form_code,
      'Complemento P #' || r.complement_id || ' / ' || coalesce(r.internal_folio, 'sin folio')
        || ' · backfill-complemento:' || r.complement_id,
      r.created_by_user_id
    )
    returning id into v_payment_id;

    update public.project_payment_complements
       set project_payment_id = v_payment_id,
           source_payment_amount_mxn = coalesce(source_payment_amount_mxn, r.paid_amount_mxn),
           updated_at = now()
     where id = r.complement_id
       and project_payment_id is null;
    v_created := v_created + 1;
  end loop;

  raise notice 'backfill complementos: % ligados a pago existente, % pagos creados, % ambiguos sin tocar.',
    v_linked,
    v_created,
    (select count(*) from _bf_plan where action = 'ambiguous');
end;
$$;

-- Estado final dentro de la transaccion (en dry-run sigue igual que antes).
select
  count(*) filter (where project_payment_id is null) as stamped_without_payment,
  count(*) as stamped_total
from public.project_payment_complements
where status in ('issued', 'stamped');

-- dry-run: ROLLBACK. Para aplicar: cambiar a COMMIT junto con el modo 'apply'.
rollback;
