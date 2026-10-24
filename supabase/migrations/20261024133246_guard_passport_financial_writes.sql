-- Additive staging fix: the table API must enforce the same entitlement as
-- update_passport_financials. RLS already supplies company/role isolation.
-- This is an incremental migration, not a bootstrap of the existing database.
begin;
create or replace function jgap_private.guard_passport_financial_writes()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.passport_purchase_date is not distinct from old.passport_purchase_date
      and new.passport_current_value is not distinct from old.passport_current_value
      and new.passport_mortgage_balance is not distinct from old.passport_mortgage_balance
    then return new; end if;
  elsif new.passport_purchase_date is null and new.passport_current_value is null
    and new.passport_mortgage_balance is null then
    return new;
  end if;

  -- Preserve explicit server administration. Never grant these roles to clients.
  if current_user not in ('postgres','supabase_admin','service_role') then
    if (select auth.uid()) is null or not public.can_access_passport(new.company_id)
      or not exists (
        select 1 from public.company_members m
        where m.company_id = new.company_id and m.user_id = (select auth.uid())
          and m.role in ('owner','admin','editor')
      ) then
      raise exception 'Passport financial editing requires active membership and an editing role'
        using errcode = '42501';
    end if;
  end if;

  if new.passport_current_value < 0 or new.passport_mortgage_balance < 0
    or new.passport_current_value::text in ('NaN','Infinity','-Infinity')
    or new.passport_mortgage_balance::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Passport financial amounts must be finite and nonnegative'
      using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function jgap_private.guard_passport_financial_writes() from public,anon,authenticated;
create trigger guard_passport_financial_writes
before insert or update of passport_purchase_date,passport_current_value,passport_mortgage_balance
on public.deals for each row execute function jgap_private.guard_passport_financial_writes();
commit;
