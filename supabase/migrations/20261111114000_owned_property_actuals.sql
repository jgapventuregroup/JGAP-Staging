begin;

-- Null preserves the classification and finances of every existing record.
alter table public.deals add column portfolio_actuals jsonb;

create function jgap_private.valid_portfolio_actuals(actuals jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare entry record;
begin
  if actuals is null then return true; end if;
  if jsonb_typeof(actuals) <> 'object'
    or coalesce(actuals->>'ownership', '') not in ('owned', 'potential') then
    return false;
  end if;
  for entry in select key, value from jsonb_each(actuals) loop
    case
      when entry.key = 'ownership' then
        if jsonb_typeof(entry.value) <> 'string' then return false; end if;
      when entry.key = 'escrow' then
        if jsonb_typeof(entry.value) <> 'boolean' then return false; end if;
      when entry.key in ('rent','mortgage','expenses','invested','taxes','insurance',
                         'repairs','hoa','management','vacancy','operating') then
        if jsonb_typeof(entry.value) <> 'number' then return false; end if;
        if (entry.value::text)::numeric not between 0 and 1000000000000
          or (entry.value::text)::numeric <> round((entry.value::text)::numeric, 2) then
          return false;
        end if;
      else return false;
    end case;
  end loop;
  return true;
end;
$$;
revoke all on function jgap_private.valid_portfolio_actuals(jsonb) from public;
grant execute on function jgap_private.valid_portfolio_actuals(jsonb) to authenticated, service_role;

alter table public.deals add constraint deals_valid_portfolio_actuals
  check (jgap_private.valid_portfolio_actuals(portfolio_actuals));

-- Create and classify in one transaction, retaining the existing deal insert and allowance checks.
create function public.create_classified_property(
  p_company_id uuid, p_name text, p_purchase_price numeric, p_monthly_rent numeric,
  p_portfolio_actuals jsonb
)
returns public.deals language plpgsql security invoker set search_path = '' as $$
declare saved public.deals;
begin
  saved := public.create_company_deal(
    p_company_id => p_company_id, p_name => p_name,
    p_purchase_price => p_purchase_price, p_monthly_rent => p_monthly_rent
  );
  update public.deals set portfolio_actuals = p_portfolio_actuals
    where id = saved.id and company_id = p_company_id returning * into strict saved;
  return saved;
end;
$$;
revoke all on function public.create_classified_property(uuid,text,numeric,numeric,jsonb) from public, anon;
grant execute on function public.create_classified_property(uuid,text,numeric,numeric,jsonb) to authenticated;

create function public.save_property_actuals(
  p_company_id uuid, p_deal_id uuid, p_expected jsonb, p_actuals jsonb
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  update public.deals set portfolio_actuals = p_actuals
    where id = p_deal_id and company_id = p_company_id
      and portfolio_actuals is not distinct from p_expected
    returning id into saved_id;
  if saved_id is null then
    raise exception 'Property changed or is unavailable. Refresh and try again.';
  end if;
  return saved_id;
end;
$$;
revoke all on function public.save_property_actuals(uuid,uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_property_actuals(uuid,uuid,jsonb,jsonb) to authenticated;

commit;
