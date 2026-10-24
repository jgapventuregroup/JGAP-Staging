-- Staging-only additive operations schema, reviewed from the existing proposals.
-- Uses the existing company/deal composite index; never creates duplicate deals.
begin;
create table public.property_ledger_entries (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null, deal_id uuid not null,
 entry_date date not null,
 entry_type text not null check(entry_type in ('income','expense')),
 category text not null check(length(trim(category)) between 1 and 80),
 description text not null default '' check(length(description)<=2000),
 amount numeric(12,2) not null check(amount>0 and amount<=9999999999.99),
 created_by uuid not null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(company_id,deal_id) references public.deals(company_id,id) on delete cascade
);
create table public.property_repairs (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null, deal_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 150),
 description text not null default '' check(length(description)<=2000),
 status text not null default 'open' check(status in ('open','in_progress','completed')),
 estimated_cost numeric(12,2) check(estimated_cost between 0 and 9999999999.99),
 actual_cost numeric(12,2) check(actual_cost between 0 and 9999999999.99),
 opened_on date not null, completed_on date,
 created_by uuid not null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(company_id,deal_id) references public.deals(company_id,id) on delete cascade,
 check((status<>'completed' or completed_on is not null) and (completed_on is null or completed_on>=opened_on))
);
create table public.property_tasks (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null, deal_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 150),
 details text not null default '' check(length(details)<=2000),
 status text not null default 'open' check(status in ('open','done')),
 due_on date, completed_at timestamptz,
 created_by uuid not null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(company_id,deal_id) references public.deals(company_id,id) on delete cascade
);

create or replace function jgap_private.stamp_property_activity()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
   if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
   new.created_by:=(select auth.uid()); new.created_at:=now();
 else
   if new.id is distinct from old.id or new.company_id is distinct from old.company_id
      or new.deal_id is distinct from old.deal_id or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
     raise exception 'Activity identity fields cannot be changed' using errcode='42501';
   end if;
 end if;
 new.updated_at:=now();
 if tg_table_name='property_tasks' then
   if new.status='done' then
     if tg_op='UPDATE' then
       new.completed_at:=case when old.status='done' then old.completed_at else now() end;
     else new.completed_at:=now(); end if;
   else new.completed_at:=null; end if;
 end if;
 return new;
end $$;
revoke all on function jgap_private.stamp_property_activity() from public,anon,authenticated;

create index property_ledger_entries_scope_idx on public.property_ledger_entries(company_id,deal_id,id);
create index property_ledger_entries_date_idx on public.property_ledger_entries(company_id,deal_id,entry_date);
create trigger stamp_activity before insert or update on public.property_ledger_entries
 for each row execute function jgap_private.stamp_property_activity();
alter table public.property_ledger_entries enable row level security;
revoke all on public.property_ledger_entries from public,anon,authenticated;
grant select,insert,update on public.property_ledger_entries to authenticated;
-- Keep customer records visible after downgrade, without permitting new writes.
create policy activity_read on public.property_ledger_entries for select to authenticated
 using(public.is_company_member(company_id));
create policy activity_insert on public.property_ledger_entries for insert to authenticated
 with check(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));
create policy activity_update on public.property_ledger_entries for update to authenticated
 using(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'))
 with check(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));

create index property_repairs_scope_idx on public.property_repairs(company_id,deal_id,id);
create index property_repairs_date_idx on public.property_repairs(company_id,deal_id,opened_on);
create trigger stamp_activity before insert or update on public.property_repairs
 for each row execute function jgap_private.stamp_property_activity();
alter table public.property_repairs enable row level security;
revoke all on public.property_repairs from public,anon,authenticated;
grant select,insert,update on public.property_repairs to authenticated;
-- Keep customer records visible after downgrade, without permitting new writes.
create policy activity_read on public.property_repairs for select to authenticated
 using(public.is_company_member(company_id));
create policy activity_insert on public.property_repairs for insert to authenticated
 with check(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));
create policy activity_update on public.property_repairs for update to authenticated
 using(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'))
 with check(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));

create index property_tasks_scope_idx on public.property_tasks(company_id,deal_id,id);
create index property_tasks_date_idx on public.property_tasks(company_id,deal_id,due_on);
create trigger stamp_activity before insert or update on public.property_tasks
 for each row execute function jgap_private.stamp_property_activity();
alter table public.property_tasks enable row level security;
revoke all on public.property_tasks from public,anon,authenticated;
grant select,insert,update on public.property_tasks to authenticated;
-- Keep customer records visible after downgrade, without permitting new writes.
create policy activity_read on public.property_tasks for select to authenticated
 using(public.is_company_member(company_id));
create policy activity_insert on public.property_tasks for insert to authenticated
 with check(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));
create policy activity_update on public.property_tasks for update to authenticated
 using(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'))
 with check(public.can_access_passport(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));

-- Presentation capability only; all operations remain enforced by table RLS.
create or replace function public.property_operations_access(p_company_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'read',coalesce((select auth.uid()) is not null and public.is_company_member(p_company_id),false),
  'write',coalesce(public.can_access_passport(p_company_id) and exists(
    select 1 from public.company_members m where m.company_id=p_company_id
    and m.user_id=(select auth.uid()) and m.role in ('owner','admin','editor')),false));
$$;
revoke all on function public.property_operations_access(uuid) from public,anon;
grant execute on function public.property_operations_access(uuid) to authenticated;
commit;
