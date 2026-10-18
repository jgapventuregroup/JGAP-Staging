-- REVIEW-ONLY SQL DRAFT. DO NOT EXECUTE ON STAGING OR PRODUCTION.
-- The Key Ahead Investor: basic property income/expense ledger.
-- Prerequisite: review authenticated role grants, RLS and test entitlement procedure.

begin;

-- A composite FK prevents a ledger entry from referencing another company's deal.
alter table public.deals
  add constraint deals_id_company_unique unique (id, company_id);

create table public.property_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  deal_id uuid not null,
  entry_date date not null,
  entry_type text not null check (entry_type in ('income','expense')),
  category text not null check (length(trim(category)) between 1 and 80),
  description text not null default '' check (length(description) <= 2000),
  amount numeric(12,2) not null check (amount > 0 and amount <= 9999999999.99),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint ledger_deal_company_fk foreign key (deal_id,company_id)
    references public.deals(id,company_id) on delete cascade
);
create index ledger_company_deal_date_idx
  on public.property_ledger_entries(company_id,deal_id,entry_date desc);

create or replace function public.prevent_ledger_identity_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.company_id is distinct from old.company_id
     or new.deal_id is distinct from old.deal_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Ledger identity fields cannot be changed';
  end if;
  return new;
end;
$$;
create trigger ledger_identity_immutable before update
on public.property_ledger_entries for each row
execute function public.prevent_ledger_identity_change();

create or replace function public.set_ledger_creator()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.created_by := (select auth.uid());
  if new.created_by is null then
    raise exception 'Authentication required';
  end if;
  return new;
end;
$$;
create trigger ledger_creator_on_insert before insert
on public.property_ledger_entries for each row
execute function public.set_ledger_creator();

alter table public.property_ledger_entries enable row level security;
revoke all on public.property_ledger_entries from anon,authenticated;
grant select,insert,update,delete on public.property_ledger_entries to authenticated;

create policy ledger_company_read on public.property_ledger_entries
  for select to authenticated
  using (public.is_company_member(company_id));

-- Writes require both an authorized company role and an active paid entitlement.
create policy ledger_paid_insert on public.property_ledger_entries
  for insert to authenticated
  with check (
    jgap_private.member_role(company_id) in ('owner','admin','editor')
    and exists (
      select 1 from public.company_subscriptions s
      where s.company_id = property_ledger_entries.company_id
        and s.plan in ('investor','pro')
        and s.billing_status = 'active'
    )
  );
create policy ledger_paid_update on public.property_ledger_entries
  for update to authenticated
  using (
    jgap_private.member_role(company_id) in ('owner','admin','editor')
    and exists (
      select 1 from public.company_subscriptions s
      where s.company_id = property_ledger_entries.company_id
        and s.plan in ('investor','pro')
        and s.billing_status = 'active'
    )
  )
  with check (
    jgap_private.member_role(company_id) in ('owner','admin','editor')
    and exists (
      select 1 from public.company_subscriptions s
      where s.company_id = property_ledger_entries.company_id
        and s.plan in ('investor','pro')
        and s.billing_status = 'active'
    )
  );
create policy ledger_paid_delete on public.property_ledger_entries
  for delete to authenticated
  using (
    jgap_private.member_role(company_id) in ('owner','admin','editor')
    and exists (
      select 1 from public.company_subscriptions s
      where s.company_id = property_ledger_entries.company_id
        and s.plan in ('investor','pro')
        and s.billing_status = 'active'
    )
  );

commit;

-- Before execution: review SQL with DBA, inspect role function permissions,
-- confirm constraints are absent, test cross-company reads/writes and downgrade,
-- and use a formal migration once approved. 
-- NOTE: RLS policy subqueries on company_subscriptions are evaluated under the
-- caller's access; test authenticated role grants and actual subscription RLS.
-- UPDATE/DELETE must be verified to reject downgrade writes, including direct API calls.
