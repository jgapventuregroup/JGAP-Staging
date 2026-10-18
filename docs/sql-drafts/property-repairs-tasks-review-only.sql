-- REVIEW-ONLY SQL DRAFT. DO NOT EXECUTE ON STAGING OR PRODUCTION.
-- Prerequisite: property-ledger-review-only.sql (adds deals_id_company_unique).
-- Applies the same company/paid-write isolation to basic Investor repairs and tasks.
begin;

create table public.property_repairs (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 deal_id uuid not null,
 title text not null check (length(trim(title)) between 1 and 150),
 description text not null default '' check (length(description)<=2000),
 status text not null default 'open' check (status in ('open','in_progress','completed')),
 estimated_cost numeric(12,2) check (estimated_cost between 0 and 9999999999.99),
 actual_cost numeric(12,2) check (actual_cost between 0 and 9999999999.99),
 opened_on date not null,
 completed_on date,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 constraint repairs_deal_company_fk foreign key (deal_id,company_id) references public.deals(id,company_id) on delete cascade,
 constraint repairs_completion_check check (
   (status <> 'completed' or completed_on is not null)
   and (completed_on is null or completed_on >= opened_on)
 )
);
create index repairs_company_deal_idx on public.property_repairs(company_id,deal_id,opened_on desc);

create table public.property_tasks (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 deal_id uuid not null,
 title text not null check (length(trim(title)) between 1 and 150),
 details text not null default '' check (length(details)<=2000),
 status text not null default 'open' check (status in ('open','done')),
 due_on date,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 constraint tasks_deal_company_fk foreign key (deal_id,company_id) references public.deals(id,company_id) on delete cascade
);
create index tasks_company_deal_idx on public.property_tasks(company_id,deal_id,due_on);

-- Same immutable identity protection as ledger; deliberately reuse audited trigger.
create trigger repairs_identity_immutable before update on public.property_repairs
 for each row execute function public.prevent_ledger_identity_change();
create trigger tasks_identity_immutable before update on public.property_tasks
 for each row execute function public.prevent_ledger_identity_change();
create trigger repairs_creator_on_insert before insert on public.property_repairs
 for each row execute function public.set_ledger_creator();
create trigger tasks_creator_on_insert before insert on public.property_tasks
 for each row execute function public.set_ledger_creator();

alter table public.property_repairs enable row level security;
alter table public.property_tasks enable row level security;
revoke all on public.property_repairs,public.property_tasks from anon,authenticated;
grant select,insert,update,delete on public.property_repairs,public.property_tasks to authenticated;

-- SELECT retains data visibility after downgrade; write privileges require active paid subscription.
create policy repairs_read on public.property_repairs for select to authenticated
 using (public.is_company_member(company_id));
create policy tasks_read on public.property_tasks for select to authenticated
 using (public.is_company_member(company_id));

create policy repairs_insert on public.property_repairs for insert to authenticated
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_repairs.company_id and s.plan in ('investor','pro') and s.billing_status='active'));
create policy repairs_update on public.property_repairs for update to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_repairs.company_id and s.plan in ('investor','pro') and s.billing_status='active'))
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_repairs.company_id and s.plan in ('investor','pro') and s.billing_status='active'));
create policy repairs_delete on public.property_repairs for delete to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_repairs.company_id and s.plan in ('investor','pro') and s.billing_status='active'));

create policy tasks_insert on public.property_tasks for insert to authenticated
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_tasks.company_id and s.plan in ('investor','pro') and s.billing_status='active'));
create policy tasks_update on public.property_tasks for update to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_tasks.company_id and s.plan in ('investor','pro') and s.billing_status='active'))
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_tasks.company_id and s.plan in ('investor','pro') and s.billing_status='active'));
create policy tasks_delete on public.property_tasks for delete to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
 and exists (select 1 from public.company_subscriptions s where s.company_id=property_tasks.company_id and s.plan in ('investor','pro') and s.billing_status='active'));
commit;

-- Before migration, audit RLS, test read-only downgrade, role grants, cross-company
-- identity tampering, and paid entitlement behavior in isolated staging accounts.
