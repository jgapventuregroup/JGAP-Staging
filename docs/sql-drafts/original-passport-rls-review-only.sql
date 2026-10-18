-- REVIEW ONLY. Do not execute without explicit approval and paid-account RLS tests.
-- Requires original-passport-deal-linked-review-only.sql to be reviewed first.
-- RLS policies deliberately separate membership reads from paid editor writes.
begin;

create policy property_assets_member_read on public.property_assets
 for select to authenticated using (public.is_company_member(company_id));
create policy property_assets_paid_insert on public.property_assets
 for insert to authenticated with check (
  jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_assets_paid_update on public.property_assets
 for update to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));


create policy property_asset_services_member_read on public.property_asset_services
 for select to authenticated using (public.is_company_member(company_id));
create policy property_asset_services_paid_insert on public.property_asset_services
 for insert to authenticated with check (
  jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_asset_services_paid_update on public.property_asset_services
 for update to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));


create policy property_maintenance_member_read on public.property_maintenance
 for select to authenticated using (public.is_company_member(company_id));
create policy property_maintenance_paid_insert on public.property_maintenance
 for insert to authenticated with check (
  jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_maintenance_paid_update on public.property_maintenance
 for update to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));


create policy property_improvements_member_read on public.property_improvements
 for select to authenticated using (public.is_company_member(company_id));
create policy property_improvements_paid_insert on public.property_improvements
 for insert to authenticated with check (
  jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_improvements_paid_update on public.property_improvements
 for update to authenticated
 using (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));

-- IMPORTANT: Before any deployment, qualify correlated column references
-- explicitly, enforce immutable company_id/deal_id/creator on UPDATE, and
-- validate service asset FK and user roles under actual JWTs.
-- Deliberately no GRANT statements: remains inaccessible to clients.
rollback;
