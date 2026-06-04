alter table public.project_invoices
  add column if not exists discount_mxn numeric(14,2) not null default 0 check (discount_mxn >= 0),
  add column if not exists taxable_subtotal_mxn numeric(14,2) not null default 0 check (taxable_subtotal_mxn >= 0);

update public.project_invoices
set discount_mxn = coalesce(discount_mxn, 0),
    taxable_subtotal_mxn = case
      when coalesce(taxable_subtotal_mxn, 0) > 0 then taxable_subtotal_mxn
      else greatest(coalesce(subtotal_mxn, subtotal, 0) - coalesce(discount_mxn, 0), 0)
    end;

alter table public.project_invoice_items
  add column if not exists gross_amount_mxn numeric(14,2) not null default 0 check (gross_amount_mxn >= 0),
  add column if not exists discount_mxn numeric(14,2) not null default 0 check (discount_mxn >= 0),
  add column if not exists net_amount_mxn numeric(14,2) not null default 0 check (net_amount_mxn >= 0);

update public.project_invoice_items
set gross_amount_mxn = case
      when coalesce(gross_amount_mxn, 0) > 0 then gross_amount_mxn
      else coalesce(subtotal_mxn, 0)
    end,
    discount_mxn = coalesce(discount_mxn, 0),
    net_amount_mxn = case
      when coalesce(net_amount_mxn, 0) > 0 then net_amount_mxn
      else greatest(coalesce(subtotal_mxn, 0) - coalesce(discount_mxn, 0), 0)
    end;

create index if not exists project_invoice_items_source_quote_item_idx
  on public.project_invoice_items(source_quote_item_id);
