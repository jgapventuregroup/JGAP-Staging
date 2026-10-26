-- Later-baseline add-on. No existing memberships or plans are changed by installation.
begin;
alter table public.company_invitations add column invited_role text not null default 'viewer' check(invited_role in ('admin','editor','viewer'));
alter table public.company_invitations add column expires_at timestamptz not null default (now()+interval '7 days');
alter table public.company_invitations add column invited_by uuid references auth.users(id);
-- Writes remain unavailable through the direct Data API. The private dispatcher is
-- privileged only because membership writes must never be granted to clients.
create function jgap_private.manage_team(p_action text,p_company uuid,p_target uuid default null,p_email text default null,p_role text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());actor_email text;result jsonb;inv public.company_invitations;target_role text;
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
  insert into public.company_members(company_id,user_id,role) values(p_company,actor,inv.invited_role);
  update public.company_invitations set status='accepted' where id=inv.id;
  return jsonb_build_object('company_id',p_company,'role',inv.invited_role);
 end if;
 if not public.can_access_advanced_finance(p_company) or not exists(select 1 from public.company_members where company_id=p_company and user_id=actor and role='owner') then raise exception 'Active Pro workspace owner required' using errcode='42501';end if;
 if p_action='list' then
  select jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role) order by m.created_at,m.user_id) from public.company_members m join auth.users u on u.id=m.user_id where m.company_id=p_company),'[]'),
  'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',email,'role',invited_role,'status',status,'expires_at',expires_at) order by created_at) from public.company_invitations where company_id=p_company and status='pending'),'[]')) into result;return result;
 elsif p_action='invite' then
  if p_email is null or length(btrim(p_email))>254 or btrim(p_email)!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_role is null or p_role not in ('admin','editor','viewer') then raise exception 'Valid email and invitation role required' using errcode='22023';end if;
  if exists(select 1 from public.company_members m join auth.users u on u.id=m.user_id where m.company_id=p_company and lower(btrim(u.email))=lower(btrim(p_email))) then raise exception 'Already a workspace member' using errcode='22023';end if;
  if exists(select 1 from public.company_invitations where company_id=p_company and lower(btrim(email))=lower(btrim(p_email)) and status='pending' and expires_at>now()) then raise exception 'Pending invitation already exists' using errcode='22023';end if;
  insert into public.company_invitations(company_id,email,invited_role,invited_by) values(p_company,lower(btrim(p_email)),p_role,actor) returning jsonb_build_object('id',id,'email',email,'role',invited_role,'expires_at',expires_at) into result;return result;
 elsif p_action='revoke' then
  update public.company_invitations set status='revoked' where id=p_target and company_id=p_company and status='pending';
  if not found then raise exception 'Pending invitation unavailable' using errcode='22023';end if;
 elsif p_action='role' then
  if p_role is null or p_role not in ('owner','admin','editor','viewer') then raise exception 'Valid member role required' using errcode='22023';end if;
  select role into target_role from public.company_members where company_id=p_company and user_id=p_target;
  if not found then raise exception 'Member unavailable' using errcode='22023';end if;
  if target_role='owner' and p_role<>'owner' and (select count(*) from public.company_members where company_id=p_company and role='owner')<=1 then raise exception 'Keep at least one workspace owner' using errcode='22023';end if;
  update public.company_members set role=p_role where company_id=p_company and user_id=p_target;
 else raise exception 'Unknown team operation' using errcode='22023';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function jgap_private.manage_team(text,uuid,uuid,text,text) from public,anon;
grant execute on function jgap_private.manage_team(text,uuid,uuid,text,text) to authenticated;
create function public.manage_workspace_team(p_action text,p_company uuid default null,p_target uuid default null,p_email text default null,p_role text default null)
returns jsonb language sql security invoker set search_path='' as $$ select jgap_private.manage_team(p_action,p_company,p_target,p_email,p_role) $$;
revoke all on function public.manage_workspace_team(text,uuid,uuid,text,text) from public,anon;
grant execute on function public.manage_workspace_team(text,uuid,uuid,text,text) to authenticated;
commit;
