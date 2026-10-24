-- Existing secondary-loan calculator is now an authenticated paid backend feature.
begin;
create or replace function public.calculate_secondary_financing(p_company_id uuid,p_amount numeric,p_rate numeric,p_primary jsonb default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare monthly numeric; principal numeric; mortgage numeric; flow numeric:=null; offer numeric; rent numeric; other_income numeric; vacancy numeric; expenses numeric; down_payment numeric; rate numeric; years numeric; monthly_rate numeric;
begin
 if not public.can_access_passport(p_company_id) then raise exception 'Active Investor or Pro membership required' using errcode='42501';end if;
 if p_amount is null or p_rate is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_rate::text in ('NaN','Infinity','-Infinity') or p_amount<0 or p_amount>1000000000000 or p_rate<0 or p_rate>100 then raise exception 'Enter a valid additional loan amount and rate' using errcode='22023';end if;
 monthly:=p_amount*p_rate/1200;
 if p_primary is not null then
  if jsonb_typeof(p_primary)<>'object' then raise exception 'Invalid primary financing inputs' using errcode='22023';end if;
  offer:=(p_primary->>'offer')::numeric;rent:=(p_primary->>'rent')::numeric;other_income:=(p_primary->>'other')::numeric;vacancy:=(p_primary->>'vacancy')::numeric;expenses:=(p_primary->>'expenses')::numeric;down_payment:=(p_primary->>'down')::numeric;rate:=(p_primary->>'rate')::numeric;years:=(p_primary->>'years')::numeric;
  if exists(select 1 from unnest(array[offer,rent,other_income,vacancy,expenses,down_payment,rate,years]) v where v is null or v::text in ('NaN','Infinity','-Infinity') or v<0 or v>1000000000000) or vacancy>100 or down_payment>100 or rate>100 or years<=0 or years>50 then raise exception 'Invalid primary financing inputs' using errcode='22023';end if;
  principal:=offer*(1-down_payment/100);monthly_rate:=rate/1200;
  mortgage:=case when principal=0 then 0 when monthly_rate=0 then principal/(years*12) else principal*monthly_rate/(1-power(1+monthly_rate,-years*12)) end;
  flow:=rent*(1-vacancy/100)+other_income-expenses-mortgage-monthly;
 end if;
 return jsonb_build_object('company_id',p_company_id,'monthly_interest',monthly::text,'annual_interest',(monthly*12)::text,'monthly_cash_flow',flow::text);
end $$;
revoke all on function public.calculate_secondary_financing(uuid,numeric,numeric,jsonb) from public,anon;
grant execute on function public.calculate_secondary_financing(uuid,numeric,numeric,jsonb) to authenticated;
commit;
