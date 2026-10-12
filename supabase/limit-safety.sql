-- Snapshot of the October 12 staging limit safety fix.
create or replace function public.enforce_company_deal_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_plan text; v_status text; v_count integer;
begin
  if tg_op='UPDATE' then
    if new.company_id=old.company_id then return new; end if;
    raise exception 'Changing a deal workspace is not supported';
  end if;
  perform 1 from public.companies where id=new.company_id for update;
  if not found then raise exception 'Company not found'; end if;
  insert into public.company_lifetime_deal_usage(company_id,lifetime_created)
    values(new.company_id,0) on conflict(company_id) do nothing;
  select lifetime_created into v_count from public.company_lifetime_deal_usage
    where company_id=new.company_id for update;
  select plan,billing_status into v_plan,v_status from public.company_subscriptions where company_id=new.company_id;
  if not coalesce(v_plan in ('investor','pro') and v_status='active',false) and v_count>=5 then
    raise exception 'FREE_LIFETIME_PROPERTY_LIMIT_REACHED';
  end if;
  update public.company_lifetime_deal_usage set lifetime_created=lifetime_created+1 where company_id=new.company_id;
  return new;
end $$;
revoke all on function public.enforce_company_deal_limit() from public,anon,authenticated;
