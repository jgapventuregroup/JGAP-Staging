-- Apply after team-controls.sql once. No customer memberships/plans are modified.
begin;
create table public.company_team_seats(
 company_id uuid primary key references public.companies(id) on delete cascade,
 additional_seats integer not null check(additional_seats between 0 and 999),
 valid_until timestamptz not null,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.company_team_seats enable row level security;
revoke all on public.company_team_seats from public,anon,authenticated;
grant select,insert,update on public.company_team_seats to service_role;
-- Billing changes and invitation mutations must acquire the same workspace lock.
create function jgap_private.lock_team_seat_entitlement()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and new.company_id is distinct from old.company_id then raise exception 'Seat workspace cannot change' using errcode='22023';end if;
 perform 1 from public.companies where id=new.company_id for update;
 new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function jgap_private.lock_team_seat_entitlement() from public,anon,authenticated;
create trigger lock_team_seat_entitlement before insert or update on public.company_team_seats
 for each row execute function jgap_private.lock_team_seat_entitlement();
-- Private helper is callable only by the authorized definer dispatcher, not clients.
create function jgap_private.team_seat_usage(p_company uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with entitlement as (
 select 1+coalesce((select e.additional_seats from public.company_team_seats e
 join public.company_subscriptions s on s.company_id=e.company_id
 where e.company_id=p_company and e.valid_until>now() and s.plan='pro' and s.billing_status='active'),0) total
 ),counts as (
 select (select count(*)::int from public.company_members where company_id=p_company) members,
 (select count(*)::int from public.company_invitations where company_id=p_company and status='pending' and invited_by is not null and expires_at>now()) reserved
 ) select jsonb_build_object('included',1,'additional',total-1,'total',total,'members',members,'reserved',reserved,
 'available',greatest(0,total-members-reserved),'over_limit',members+reserved>total) from entitlement cross join counts;
$$;
revoke all on function jgap_private.team_seat_usage(uuid) from public,anon,authenticated;
-- Named seats are checked by existing company-scoped RLS/RPC access paths.
-- The first owner is the included seat; remaining members use paid capacity in
-- stable membership order. Existing memberships are retained, never deleted.
create function jgap_private.has_current_team_seat(p_company uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select auth.uid()) is not null and exists(
 select 1 from public.company_members where company_id=p_company and user_id=(select auth.uid())) and
 (public.has_owner_preview_access(p_company) or exists(
  select 1 from (
   select user_id,row_number() over(order by (role='owner') desc,created_at,user_id) seat_number
   from public.company_members where company_id=p_company
  ) ranked where user_id=(select auth.uid()) and seat_number<=
   (jgap_private.team_seat_usage(p_company)->>'total')::integer
 )),false);
$$;
revoke all on function jgap_private.has_current_team_seat(uuid) from public,anon;
grant execute on function jgap_private.has_current_team_seat(uuid) to authenticated;
create or replace function public.is_company_member(target_company_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select jgap_private.has_current_team_seat(target_company_id);
$$;
-- Defense in depth for writes whose old policies check roles directly.
create policy team_seat_deal_access on public.deals as restrictive for all to authenticated
 using(jgap_private.has_current_team_seat(company_id)) with check(jgap_private.has_current_team_seat(company_id));
create policy team_seat_lender_access on public.lenders as restrictive for all to authenticated
 using(jgap_private.has_current_team_seat(company_id)) with check(jgap_private.has_current_team_seat(company_id));
create or replace function jgap_private.manage_team(p_action text,p_company uuid,p_target uuid default null,p_email text default null,p_role text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());actor_email text;result jsonb;inv public.company_invitations;target_role text;seat_usage jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 select lower(btrim(email)) into actor_email from auth.users where id=actor and email_confirmed_at is not null;
 if actor_email is null then raise exception 'Verified email required' using errcode='42501';end if;
 if p_action='inbox' then
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'company_id',i.company_id,'company_name',c.name,'role',i.invited_role,'expires_at',i.expires_at) order by i.created_at),'[]') into result
  from public.company_invitations i join public.companies c on c.id=i.company_id
  where lower(btrim(i.email))=actor_email and i.status='pending' and i.invited_by is not null and i.expires_at>now();
  return result;
 end if;
 -- Serialize all membership/invitation mutations in a workspace. Authorization
 -- is re-evaluated after obtaining the lock, including concurrent owner changes.
 perform 1 from public.companies where id=p_company for update;
 if not found then raise exception 'Workspace unavailable' using errcode='42501';end if;
 if p_action='accept' then
  select * into inv from public.company_invitations where id=p_target and company_id=p_company for update;
  if not found or inv.status<>'pending' or inv.invited_by is null or inv.expires_at<=now() or lower(btrim(inv.email))<>actor_email then raise exception 'Invitation unavailable' using errcode='42501';end if;
  -- Recipient is not a member yet: verify the real subscription, never preview.
  if not exists(select 1 from public.company_subscriptions where company_id=p_company and plan='pro' and billing_status='active') then raise exception 'Active Pro team access required' using errcode='42501';end if;
  if exists(select 1 from public.company_members where company_id=p_company and user_id=actor) then raise exception 'Already a workspace member' using errcode='22023';end if;
  seat_usage:=jgap_private.team_seat_usage(p_company);
  if (seat_usage->>'members')::int >= (seat_usage->>'total')::int or (seat_usage->>'over_limit')::boolean then raise exception 'No paid team seat available. Ask the owner to add seats or revoke excess invitations.' using errcode='22023';end if;
  insert into public.company_members(company_id,user_id,role) values(p_company,actor,inv.invited_role);
  update public.company_invitations set status='accepted' where id=inv.id;
  return jsonb_build_object('company_id',p_company,'role',inv.invited_role);
 end if;
 if not (public.has_owner_preview_access(p_company) or exists(select 1 from public.company_subscriptions where company_id=p_company and plan='pro' and billing_status='active')) or not exists(select 1 from public.company_members where company_id=p_company and user_id=actor and role='owner') then raise exception 'Active Pro workspace owner required' using errcode='42501';end if;
 if p_action='list' then
  select jsonb_build_object('seats',jgap_private.team_seat_usage(p_company),'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role) order by m.created_at,m.user_id) from public.company_members m join auth.users u on u.id=m.user_id where m.company_id=p_company),'[]'),
  'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',email,'role',invited_role,'status',status,'expires_at',expires_at) order by created_at) from public.company_invitations where company_id=p_company and status='pending'),'[]')) into result;return result;
 elsif p_action='invite' then
  if p_email is null or length(btrim(p_email))>254 or btrim(p_email)!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_role is null or p_role not in ('admin','editor','viewer') then raise exception 'Valid email and invitation role required' using errcode='22023';end if;
  if exists(select 1 from public.company_members m join auth.users u on u.id=m.user_id where m.company_id=p_company and lower(btrim(u.email))=lower(btrim(p_email))) then raise exception 'Already a workspace member' using errcode='22023';end if;
  if exists(select 1 from public.company_invitations where company_id=p_company and lower(btrim(email))=lower(btrim(p_email)) and status='pending' and expires_at>now()) then raise exception 'Pending invitation already exists' using errcode='22023';end if;
  seat_usage:=jgap_private.team_seat_usage(p_company);
  if (seat_usage->>'available')::int <= 0 then raise exception 'No paid team seat available. One user is included; additional users require paid seats.' using errcode='22023';end if;
  insert into public.company_invitations(company_id,email,invited_role,invited_by) values(p_company,lower(btrim(p_email)),p_role,actor) returning jsonb_build_object('id',id,'email',email,'role',invited_role,'expires_at',expires_at) into result;return result;
 elsif p_action='revoke' then
  update public.company_invitations set status='revoked' where id=p_target and company_id=p_company and status='pending';
  if not found then raise exception 'Pending invitation unavailable' using errcode='22023';end if;
 elsif p_action in ('role','remove') then
  if p_action='role' and (p_role is null or p_role not in ('owner','admin','editor','viewer')) then raise exception 'Valid member role required' using errcode='22023';end if;
  select role into target_role from public.company_members where company_id=p_company and user_id=p_target;
  if not found then raise exception 'Member unavailable' using errcode='22023';end if;
  if target_role='owner' and (p_action='remove' or p_role<>'owner') and (select count(*) from public.company_members where company_id=p_company and role='owner')<=1 then raise exception 'Keep at least one workspace owner' using errcode='22023';end if;
  if p_action='remove' then delete from public.company_members where company_id=p_company and user_id=p_target;
  else update public.company_members set role=p_role where company_id=p_company and user_id=p_target;end if;
 else raise exception 'Unknown team operation' using errcode='22023';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function jgap_private.manage_team(text,uuid,uuid,text,text) from public,anon;
grant execute on function jgap_private.manage_team(text,uuid,uuid,text,text) to authenticated;
commit;
