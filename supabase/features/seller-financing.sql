-- Apply once after application baseline. Read-only Pro calculator; no saved rows.
begin;
create or replace function public.calculate_seller_financing(p_company_id uuid,p_inputs jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare price numeric;noi numeric;closing numeric;other_costs numeric;rate numeric;years numeric;balloon numeric;key text;value numeric;dp integer;principal numeric;down_cash numeric;payment numeric;balance numeric;monthly_rate numeric;months integer;rows jsonb:='[]'::jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro access required' using errcode='42501';end if;
 if p_inputs is null or jsonb_typeof(p_inputs)<>'object' then raise exception 'Invalid seller inputs' using errcode='22023';end if;
 foreach key in array array['price','noi','closing','other_costs','rate','years','balloon_months'] loop
  if jsonb_typeof(p_inputs->key) is distinct from 'number' then raise exception 'Missing or invalid seller input: %',key using errcode='22023';end if;
  value:=(p_inputs->>key)::numeric;
  if value::text in ('NaN','Infinity','-Infinity') or abs(value)>1000000000000 then raise exception 'Invalid seller input: %',key using errcode='22023';end if;
 end loop;
 price:=(p_inputs->>'price')::numeric;noi:=(p_inputs->>'noi')::numeric;closing:=(p_inputs->>'closing')::numeric;other_costs:=(p_inputs->>'other_costs')::numeric;rate:=(p_inputs->>'rate')::numeric;years:=(p_inputs->>'years')::numeric;balloon:=(p_inputs->>'balloon_months')::numeric;
 if price<=0 or closing<0 or other_costs<0 or rate<0 or rate>100 or years<1 or years>50 or years<>trunc(years) or balloon<1 or balloon>years*12 or balloon<>trunc(balloon) then raise exception 'Check seller price, costs, rate, amortization and balloon month' using errcode='22023';end if;
 months:=(years*12)::integer;monthly_rate:=rate/1200;
 foreach dp in array array[10,15,20] loop
  down_cash:=price*dp/100;principal:=price-down_cash;
  payment:=case when monthly_rate=0 then principal/months else principal*monthly_rate/(1-power(1+monthly_rate,-months)) end;
  balance:=case when balloon=months then 0 when monthly_rate=0 then principal-payment*balloon else principal*power(1+monthly_rate,balloon)-payment*(power(1+monthly_rate,balloon)-1)/monthly_rate end;
  rows:=rows||jsonb_build_array(jsonb_build_object('down_percent',dp,'down_payment',round(down_cash,2)::text,'note_amount',round(principal,2)::text,'monthly_payment',round(payment,2)::text,'monthly_cash_flow',round(noi-round(payment,2)-other_costs,2)::text,'cash_required',round(down_cash+closing,2)::text,'balloon_balance',round(greatest(balance,0),2)::text));
 end loop;
 return jsonb_build_object('company_id',p_company_id,'inputs',p_inputs,'scenarios',rows);
end $$;
revoke all on function public.calculate_seller_financing(uuid,jsonb) from public,anon;
grant execute on function public.calculate_seller_financing(uuid,jsonb) to authenticated;
commit;
