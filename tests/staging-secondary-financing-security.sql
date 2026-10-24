-- STAGING ONLY. All synthetic data and subscription changes roll back.
begin;
create temporary table secondary_results(check_name text,outcome text);
do $test$
declare u uuid;c uuid;foreign_c uuid;result jsonb;denied boolean;state record;
 primary_inputs jsonb:='{"offer":180000,"rent":1800,"other":0,"vacancy":5,"expenses":600,"down":20,"rate":7,"years":30}';
begin
 select user_id into u from public.company_members limit 1;if u is null then raise exception 'Staging user required';end if;
 insert into public.companies(name) values('V1 rollback secondary finance fixture') returning id into c;
 insert into public.companies(name) values('V1 rollback foreign secondary finance fixture') returning id into foreign_c;
 insert into public.company_members(company_id,user_id,role) values(c,u,'owner');
 perform set_config('request.jwt.claim.sub',u::text,true);perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 for state in select * from (values('free','not_connected',false),('investor','active',true),('pro','active',true),('investor','past_due',false),('pro','canceled',false)) s(plan,status,allowed) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=c;
  execute 'set local role authenticated';
  if state.allowed then
   result:=public.calculate_secondary_financing(c,40000,9,primary_inputs);
   if (result->>'monthly_interest')::numeric<>300 or (result->>'annual_interest')::numeric<>3600 or abs((result->>'monthly_cash_flow')::numeric-(-148.0355533))>0.005 then raise exception 'Incorrect combined financing calculation';end if;
   result:=public.calculate_secondary_financing(c,40000,9,null);if result->>'monthly_cash_flow' is not null then raise exception 'Missing primary figures must not fabricate cash flow';end if;
   result:=public.calculate_secondary_financing(c,0,0,jsonb_set(primary_inputs,'{down}','100'));if (result->>'monthly_cash_flow')::numeric<>1110 then raise exception 'All-cash/zero secondary calculation failed';end if;
   result:=public.calculate_secondary_financing(c,40000,9,jsonb_set(primary_inputs,'{rate}','0'));if (result->>'monthly_cash_flow')::numeric<>410 then raise exception 'Zero-rate primary mortgage failed';end if;
   denied:=false;begin perform public.calculate_secondary_financing(c,40000,101);exception when invalid_parameter_value then denied:=true;end;if not denied then raise exception 'Invalid rate allowed';end if;
   denied:=false;begin perform public.calculate_secondary_financing(c,'NaN',9);exception when invalid_parameter_value then denied:=true;end;if not denied then raise exception 'NaN allowed';end if;
   denied:=false;begin perform public.calculate_secondary_financing(c,40000,9,'{"offer":180000}');exception when invalid_parameter_value then denied:=true;end;if not denied then raise exception 'Incomplete primary payload accepted';end if;
  else
   denied:=false;begin perform public.calculate_secondary_financing(c,40000,9,primary_inputs);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Free/inactive calculation bypass';end if;
  end if;
  denied:=false;begin perform public.calculate_secondary_financing(foreign_c,40000,9);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Foreign workspace allowed';end if;
  execute 'reset role';insert into secondary_results values(state.plan||'/'||state.status||': paid calculation, scope and validation','PASS');
 end loop;
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 denied:=false;begin perform public.calculate_secondary_financing(c,40000,9);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Anonymous calculation allowed';end if;
 execute 'reset role';insert into secondary_results values('Anonymous RPC denied','PASS');
end $test$;
select * from secondary_results;
rollback;
