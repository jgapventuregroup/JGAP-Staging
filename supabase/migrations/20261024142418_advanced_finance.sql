-- Recovered finance-cpa feature allocation, adapted to the existing staging ledger.
-- No copied customer data, parallel transactions table, billing activation or production changes.
begin;
create or replace function public.can_access_advanced_finance(p_company_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((select auth.uid()) is not null and public.is_company_member(p_company_id)
 and (public.has_owner_preview_access(p_company_id) or exists(
  select 1 from public.company_subscriptions s where s.company_id=p_company_id and s.plan='pro' and s.billing_status='active')),false);
$$;
revoke all on function public.can_access_advanced_finance(uuid) from public,anon;
grant execute on function public.can_access_advanced_finance(uuid) to authenticated;

create unique index ledger_bookkeeping_scope_idx on public.property_ledger_entries(company_id,deal_id,id);
create table public.property_ledger_bookkeeping (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,deal_id uuid not null,ledger_entry_id uuid not null unique,
 vendor_name text not null default '' check(length(vendor_name)<=200),
 payment_method text not null default '' check(length(payment_method)<=100),
 account_name text not null default '' check(length(account_name)<=150),
 tax_treatment text not null default 'review' check(tax_treatment in ('review','deductible','capital','personal')),
 receipt_reference text not null default '' check(length(receipt_reference)<=200),
 reconciled boolean not null default false,
 bookkeeping_notes text not null default '' check(length(bookkeeping_notes)<=2000),
 created_by uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(company_id,deal_id,ledger_entry_id) references public.property_ledger_entries(company_id,deal_id,id) on delete cascade
);
create or replace function jgap_private.prevent_bookkeeping_relink()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.ledger_entry_id is distinct from old.ledger_entry_id then
  raise exception 'Bookkeeping transaction link cannot change' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function jgap_private.prevent_bookkeeping_relink() from public,anon,authenticated;
create trigger bookkeeping_link_immutable before update on public.property_ledger_bookkeeping
 for each row execute function jgap_private.prevent_bookkeeping_relink();
create trigger stamp_activity before insert or update on public.property_ledger_bookkeeping
 for each row execute function jgap_private.stamp_property_activity();
alter table public.property_ledger_bookkeeping enable row level security;
revoke all on public.property_ledger_bookkeeping from public,anon,authenticated;
grant select,insert,update on public.property_ledger_bookkeeping to authenticated;
create policy bookkeeping_read on public.property_ledger_bookkeeping for select to authenticated
 using(public.can_access_advanced_finance(company_id));
create policy bookkeeping_insert on public.property_ledger_bookkeeping for insert to authenticated
 with check(public.can_access_advanced_finance(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));
create policy bookkeeping_update on public.property_ledger_bookkeeping for update to authenticated
 using(public.can_access_advanced_finance(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'))
 with check(public.can_access_advanced_finance(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));

create or replace function public.advanced_finance_access(p_company_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('read',public.can_access_advanced_finance(p_company_id),
 'write',public.can_access_advanced_finance(p_company_id) and coalesce(jgap_private.member_role(p_company_id) in ('owner','admin','editor'),false));
$$;
revoke all on function public.advanced_finance_access(uuid) from public,anon;
grant execute on function public.advanced_finance_access(uuid) to authenticated;

create or replace function public.save_property_bookkeeping(p_company_id uuid,p_deal_id uuid,p_entry_id uuid,p_patch jsonb)
returns public.property_ledger_bookkeeping language plpgsql security invoker set search_path='' as $$
declare result public.property_ledger_bookkeeping; field text;
begin
 if not public.can_access_advanced_finance(p_company_id) or not coalesce(jgap_private.member_role(p_company_id) in ('owner','admin','editor'),false) then
  raise exception 'Active Pro membership and editing role required' using errcode='42501';
 end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then raise exception 'Bookkeeping patch must be a nonempty object' using errcode='22023'; end if;
 for field in select jsonb_object_keys(p_patch) loop
  if field not in ('vendor_name','payment_method','account_name','tax_treatment','receipt_reference','reconciled','bookkeeping_notes') then raise exception 'Unsupported bookkeeping field' using errcode='22023'; end if;
  if field='reconciled' then
   if jsonb_typeof(p_patch->field) not in ('boolean','null') then raise exception 'Reconciliation must be a boolean' using errcode='22023'; end if;
  elsif jsonb_typeof(p_patch->field) not in ('string','null') then raise exception 'Bookkeeping text must be a string' using errcode='22023'; end if;
 end loop;
 if not exists(select 1 from public.property_ledger_entries l where l.id=p_entry_id and l.company_id=p_company_id and l.deal_id=p_deal_id) then
  raise exception 'Transaction not found in selected property' using errcode='42501';
 end if;
 insert into public.property_ledger_bookkeeping as b(company_id,deal_id,ledger_entry_id,vendor_name,payment_method,account_name,tax_treatment,receipt_reference,reconciled,bookkeeping_notes)
 values(p_company_id,p_deal_id,p_entry_id,coalesce(p_patch->>'vendor_name',''),coalesce(p_patch->>'payment_method',''),coalesce(p_patch->>'account_name',''),coalesce(p_patch->>'tax_treatment','review'),coalesce(p_patch->>'receipt_reference',''),coalesce((p_patch->>'reconciled')::boolean,false),coalesce(p_patch->>'bookkeeping_notes',''))
 on conflict(ledger_entry_id) do update set
  vendor_name=case when p_patch?'vendor_name' then excluded.vendor_name else b.vendor_name end,
  payment_method=case when p_patch?'payment_method' then excluded.payment_method else b.payment_method end,
  account_name=case when p_patch?'account_name' then excluded.account_name else b.account_name end,
  tax_treatment=case when p_patch?'tax_treatment' then excluded.tax_treatment else b.tax_treatment end,
  receipt_reference=case when p_patch?'receipt_reference' then excluded.receipt_reference else b.receipt_reference end,
  reconciled=case when p_patch?'reconciled' then excluded.reconciled else b.reconciled end,
  bookkeeping_notes=case when p_patch?'bookkeeping_notes' then excluded.bookkeeping_notes else b.bookkeeping_notes end
 returning * into result;
 return result;
end $$;
revoke all on function public.save_property_bookkeeping(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_property_bookkeeping(uuid,uuid,uuid,jsonb) to authenticated;

create or replace function public.get_advanced_finance_report(p_company_id uuid,p_month text,p_deal_id uuid default null,p_reconciled boolean default null,p_tax_treatment text default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare period_start date; rows jsonb; totals jsonb; categories jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro report access required' using errcode='42501'; end if;
 if p_month is null or p_month !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then raise exception 'Select a valid report month' using errcode='22023'; end if;
 if p_tax_treatment is not null and p_tax_treatment not in ('review','deductible','capital','personal') then raise exception 'Invalid tax filter' using errcode='22023'; end if;
 period_start:=(p_month||'-01')::date;
 if p_deal_id is not null and not exists(select 1 from public.deals where id=p_deal_id and company_id=p_company_id) then raise exception 'Property not found in selected company' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.entry_date desc,r.entry_id),'[]'::jsonb) into rows from (
  select l.id as entry_id,l.company_id,l.deal_id,d.name as property_name,l.entry_date,l.entry_type,l.category,l.description,l.amount::text as amount,
   coalesce(b.vendor_name,'') as vendor_name,coalesce(b.payment_method,'') as payment_method,coalesce(b.account_name,'') as account_name,
   coalesce(b.tax_treatment,'review') as tax_treatment,coalesce(b.receipt_reference,'') as receipt_reference,coalesce(b.reconciled,false) as reconciled,
   coalesce(b.bookkeeping_notes,'') as bookkeeping_notes
  from public.property_ledger_entries l join public.deals d on d.company_id=l.company_id and d.id=l.deal_id
  left join public.property_ledger_bookkeeping b on b.company_id=l.company_id and b.deal_id=l.deal_id and b.ledger_entry_id=l.id
  where l.company_id=p_company_id and l.entry_date>=period_start and l.entry_date<(period_start+interval '1 month')::date
   and (p_deal_id is null or l.deal_id=p_deal_id)
   and (p_reconciled is null or coalesce(b.reconciled,false)=p_reconciled)
   and (p_tax_treatment is null or coalesce(b.tax_treatment,'review')=p_tax_treatment)
  order by l.entry_date desc,l.id limit 10001
 ) r;
 if jsonb_array_length(rows)>10000 then raise exception 'Report exceeds 10000 transactions; select a single property' using errcode='54000'; end if;
 select jsonb_build_object('income',coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='income'),0)::text,
  'expenses',coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='expense'),0)::text,
  'net',coalesce(sum(case when v->>'entry_type'='income' then (v->>'amount')::numeric else -(v->>'amount')::numeric end),0)::text,
  'unreconciled',count(*) filter(where (v->>'reconciled')::boolean=false),'count',count(*)) into totals from jsonb_array_elements(rows) v;
 select coalesce(jsonb_agg(to_jsonb(c) order by c.category),'[]'::jsonb) into categories from (
  select v->>'category' as category,
   coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='income'),0)::text as income,
   coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='expense'),0)::text as expenses,
   sum(case when v->>'entry_type'='income' then (v->>'amount')::numeric else -(v->>'amount')::numeric end)::text as net
  from jsonb_array_elements(rows) v group by v->>'category'
 ) c;
 return jsonb_build_object('company_id',p_company_id,'month',p_month,'deal_id',p_deal_id,'reconciled',p_reconciled,'tax_treatment',p_tax_treatment,'entries',rows,'totals',totals,'categories',categories);
end $$;
revoke all on function public.get_advanced_finance_report(uuid,text,uuid,boolean,text) from public,anon;
grant execute on function public.get_advanced_finance_report(uuid,text,uuid,boolean,text) to authenticated;
commit;
