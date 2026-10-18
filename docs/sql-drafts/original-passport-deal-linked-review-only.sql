-- REVIEW ONLY: never execute without explicit staging migration approval.
-- Restore original Passport equipment, service, maintenance and improvements.
-- Reuse public.deals(id, company_id); do not create a second properties table.
-- Prerequisite: reviewed unique (id, company_id) constraint on deals.
-- IMPORTANT: This draft is not executable as-is until that prerequisite exists.
-- No DROP TABLE or destructive migration is permitted.
begin;
create table public.property_assets (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 deal_id uuid not null,
 name text not null check (length(trim(name)) between 1 and 150),
 asset_type text,
 installed_date date,
 purchase_cost numeric(12,2) check (purchase_cost>=0),
 expected_life_years integer check (expected_life_years>0),
 warranty_expiration date,
 condition text,
 next_service_date date,
 created_at timestamptz not null default now(),
 unique (id,company_id,deal_id),
 foreign key (deal_id,company_id) references public.deals(id,company_id) on delete cascade
);
create table public.property_asset_services (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 deal_id uuid not null,
 asset_id uuid not null,
 service_name text not null check (length(trim(service_name)) between 1 and 150),
 frequency_value integer check (frequency_value>0),
 frequency_unit text check (frequency_unit in ('year','month','quarter','week')),
 last_service_date date,
 next_service_date date,
 notes text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 foreign key (asset_id,company_id,deal_id) references public.property_assets(id,company_id,deal_id) on delete cascade,
 foreign key (deal_id,company_id) references public.deals(id,company_id) on delete cascade
);
create table public.property_maintenance (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 deal_id uuid not null,
 title text not null check (length(trim(title)) between 1 and 150),
 maintenance_date date not null,
 description text,
 cost numeric(12,2) check (cost>=0),
 status text not null default 'open' check (status in ('completed','planned','open','cancelled')),
 due_date date,
 performed_by text,
 created_at timestamptz not null default now(),
 foreign key (deal_id,company_id) references public.deals(id,company_id) on delete cascade
);
create table public.property_improvements (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 deal_id uuid not null,
 title text not null check (length(trim(title)) between 1 and 150),
 improvement_date date not null,
 description text,
 cost numeric(12,2) check (cost>=0),
 category text,
 created_at timestamptz not null default now(),
 foreign key (deal_id,company_id) references public.deals(id,company_id) on delete cascade
);
-- Security defaults: NO client grants until policies and entitlement checks
-- are reviewed. All four tables must have RLS before any API exposure.
alter table public.property_assets enable row level security;
alter table public.property_asset_services enable row level security;
alter table public.property_maintenance enable row level security;
alter table public.property_improvements enable row level security;
revoke all on public.property_assets,public.property_asset_services,public.property_maintenance,public.property_improvements from anon,authenticated;
-- Verified staging metadata: both membership and role helper functions exist
-- and authenticated has EXECUTE. This is NOT a substitute for RLS testing.
-- Proposed policies use is_company_member(company_id) for SELECT and
-- jgap_private.member_role(company_id) for write roles. Confirm function grants
-- and paid entitlement lookup behavior before granting any table privileges.
commit;
-- Staging subscription audit: company_subscriptions has RLS enabled,
-- authenticated SELECT only, and a company_members/auth.uid() SELECT policy.
-- Confirm subscription statuses with isolated paid test accounts before activation.
-- Proposed read permissions: active company members only. Paid writes require
-- verified subscription and owner/admin/editor role. These policies are NOT
-- activated in this draft, because the subscription lookup authorization path
-- and migration prerequisite must be verified with two real staging accounts.
-- IMPORTANT: This draft deliberately does not enable client access. Review RLS,
-- entitlement and role permissions before approving any deployment.
