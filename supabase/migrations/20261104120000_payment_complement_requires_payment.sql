-- Complementos de pago (CFDI tipo P) siempre ligados a un pago de proyecto.
--
-- Problema: se podia timbrar un complemento con project_payment_id = null; el
-- proyecto quedaba sin pagos en project_payments y el Vigia (VTA-03) lo marcaba
-- como "ganado sin anticipo" aunque el cobro ya estaba timbrado.
--
-- Esta migracion:
--   1. create_and_link_complement_payment(): RPC que inserta el pago y lo liga al
--      borrador del complemento en una sola transaccion.
--   2. Trigger que impide que un complemento pase a issued/stamped (o se inserte
--      asi) sin project_payment_id, y que se desligue el pago de uno timbrado.
--      Las filas historicas sin pago NO se tocan: siguen pudiendo cancelarse o
--      consultarse mientras corre el backfill
--      (sql/20261104_backfill_complement_payments.sql).
--
-- El CHECK equivalente vive en 20261104120100_payment_complement_payment_check.sql
-- y se aplica DESPUES del backfill: un CHECK NOT VALID tambien se evalua en cada
-- UPDATE de las filas viejas, asi que aplicarlo antes bloquearia cancelar o
-- registrar errores en esos 16 complementos.
--
-- No aplicar en produccion sin sandbox, respaldo y autorizacion de Leonardo.

create or replace function public.create_and_link_complement_payment(
  p_complement_id bigint,
  p_payment jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_complement record;
  v_payment_id bigint;
  v_amount_mxn numeric(14,2);
begin
  select id, client_project_id, status, project_payment_id, paid_amount_mxn, amount_paid_mxn
    into v_complement
    from public.project_payment_complements
   where id = p_complement_id
   for update;

  if not found then
    raise exception 'Complemento % no encontrado.', p_complement_id;
  end if;
  if v_complement.status <> 'draft' then
    raise exception 'Solo se puede crear el pago de un complemento en borrador (estado actual: %).', v_complement.status;
  end if;
  if v_complement.project_payment_id is not null then
    raise exception 'El complemento % ya esta ligado al pago %.', p_complement_id, v_complement.project_payment_id;
  end if;
  if (p_payment->>'client_project_id')::bigint is distinct from v_complement.client_project_id then
    raise exception 'El pago debe pertenecer al proyecto del complemento.';
  end if;

  v_amount_mxn := (p_payment->>'amount_mxn')::numeric;
  if v_amount_mxn is null
     or abs(v_amount_mxn - coalesce(v_complement.paid_amount_mxn, v_complement.amount_paid_mxn)) > 0.01 then
    raise exception 'El monto del pago debe coincidir con el importe del complemento.';
  end if;

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
    v_complement.client_project_id,
    (p_payment->>'payment_date')::date,
    nullif(p_payment->>'payment_method', ''),
    nullif(p_payment->>'payment_reference', ''),
    coalesce(nullif(p_payment->>'payment_category', ''), 'equipment'),
    'MXN',
    v_amount_mxn,
    null,
    v_amount_mxn,
    p_payment->>'payment_form_code',
    nullif(p_payment->>'notes', ''),
    nullif(p_payment->>'created_by_user_id', '')::uuid
  )
  returning id into v_payment_id;

  update public.project_payment_complements
     set project_payment_id = v_payment_id,
         source_payment_amount_mxn = v_amount_mxn,
         updated_at = now()
   where id = p_complement_id;

  return v_payment_id;
end;
$$;

-- Solo el backend (service_role) la usa; no exponerla a sesiones de navegador.
revoke all on function public.create_and_link_complement_payment(bigint, jsonb) from public;
revoke all on function public.create_and_link_complement_payment(bigint, jsonb) from anon, authenticated;
grant execute on function public.create_and_link_complement_payment(bigint, jsonb) to service_role;

create or replace function public.enforce_payment_complement_has_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('issued', 'stamped') and new.project_payment_id is null then
    if tg_op = 'INSERT'
       or old.status is distinct from new.status
       or old.project_payment_id is not null then
      raise exception 'Un complemento de pago timbrado debe estar ligado a un pago del proyecto (project_payment_id).'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists project_payment_complements_require_payment
  on public.project_payment_complements;

create trigger project_payment_complements_require_payment
  before insert or update of status, project_payment_id
  on public.project_payment_complements
  for each row
  execute function public.enforce_payment_complement_has_payment();
