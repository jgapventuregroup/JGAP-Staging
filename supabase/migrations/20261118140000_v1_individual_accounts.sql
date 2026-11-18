-- V1 uses individual accounts. Preserve historical data and existing RLS.
begin;

lock table public.company_members, public.company_invitations in share mode;

do $$
begin
  if exists (
    select company_id from public.company_members
    group by company_id having count(*) > 1
  ) or exists (
    select 1 from public.company_invitations
    where status = 'pending' and expires_at > now()
  ) then
    raise exception 'Resolve active workspace collaboration before enabling individual-account V1';
  end if;
end;
$$;

revoke execute on function public.manage_workspace_team(text,uuid,uuid,text,text)
  from public, anon, authenticated;
revoke execute on function jgap_private.manage_team(text,uuid,uuid,text,text)
  from public, anon, authenticated;

commit;
