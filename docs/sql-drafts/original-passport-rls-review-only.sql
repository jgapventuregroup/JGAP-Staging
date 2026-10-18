-- REVIEW ONLY. Do not execute without explicit approval and paid-account RLS tests.
-- Requires original-passport-deal-linked-review-only.sql to be reviewed first.
-- RLS policies deliberately separate membership reads from paid editor writes.
-- Staging column audit verified company_subscriptions(company_id,plan,billing_status).
-- No grant statements are included; this draft ends with ROLLBACK.
begin;

create policy property_assets_member_read on public.property_assets
 for select to authenticated using (public.is_company_member(public.property_assets.company_id));
create policy property_assets_paid_insert on public.property_assets
 for insert to authenticated with check (
  jgap_private.member_role(public.property_assets.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_assets.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_assets_paid_update on public.property_assets
 for update to authenticated
 using (jgap_private.member_role(public.property_assets.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_assets.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(public.property_assets.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_assets.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));


create policy property_asset_services_member_read on public.property_asset_services
 for select to authenticated using (public.is_company_member(public.property_asset_services.company_id));
create policy property_asset_services_paid_insert on public.property_asset_services
 for insert to authenticated with check (
  jgap_private.member_role(public.property_asset_services.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_asset_services.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_asset_services_paid_update on public.property_asset_services
 for update to authenticated
 using (jgap_private.member_role(public.property_asset_services.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_asset_services.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(public.property_asset_services.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_asset_services.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));


create policy property_maintenance_member_read on public.property_maintenance
 for select to authenticated using (public.is_company_member(public.property_maintenance.company_id));
create policy property_maintenance_paid_insert on public.property_maintenance
 for insert to authenticated with check (
  jgap_private.member_role(public.property_maintenance.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_maintenance.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_maintenance_paid_update on public.property_maintenance
 for update to authenticated
 using (jgap_private.member_role(public.property_maintenance.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_maintenance.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(public.property_maintenance.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_maintenance.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));


create policy property_improvements_member_read on public.property_improvements
 for select to authenticated using (public.is_company_member(public.property_improvements.company_id));
create policy property_improvements_paid_insert on public.property_improvements
 for insert to authenticated with check (
  jgap_private.member_role(public.property_improvements.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_improvements.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));
create policy property_improvements_paid_update on public.property_improvements
 for update to authenticated
 using (jgap_private.member_role(public.property_improvements.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_improvements.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'))
 with check (jgap_private.member_role(public.property_improvements.company_id) in ('owner','admin','editor')
  and exists (select 1 from public.company_subscriptions s
   where s.company_id=public.property_improvements.company_id and s.plan in ('investor','pro')
   and s.billing_status='active'));

-- Identity-scope update protection proposal: reject any attempt to move a
-- Passport child row between companies, deals, or equipment owners.
-- Run only after review and with an authorized migration window.
create or replace function public.jgap_passport_reject_scope_change()
returns trigger language plpgsql set search_path = '' as $
begin
 if new.company_id is distinct from old.company_id
    or new.deal_id is distinct from old.deal_id then
  raise exception 'Passport record ownership cannot be changed';
 end if;
 if tg_table_name='property_asset_services'
    and new.asset_id is distinct from old.asset_id then
  raise exception 'Service equipment cannot be reassigned';
 end if;
 return new;
end $;
create trigger property_assets_scope_guard before update on public.property_assets
for each row execute function public.jgap_passport_reject_scope_change();
create trigger property_asset_services_scope_guard before update on public.property_asset_services
for each row execute function public.jgap_passport_reject_scope_change();
create trigger property_maintenance_scope_guard before update on public.property_maintenance
for each row execute function public.jgap_passport_reject_scope_change();
create trigger property_improvements_scope_guard before update on public.property_improvements
for each row execute function public.jgap_passport_reject_scope_change();

-- IMPORTANT: Before any deployment, enforce immutable company_id/deal_id/creator on UPDATE, and
-- validate service asset FK and user roles under actual JWTs.
-- Deliberately no GRANT statements: remains inaccessible to clients.
rollback;
