-- SQL-role supplemental verification. Every synthetic company/plan change rolls back.
begin;
create temporary table seller_results(check_name text,outcome text);
do $test$
declare uid uuid;cid uuid;r jsonb;blocked boolean;state record;inputs jsonb:='{"price":300000,"noi":3000,"closing":10000,"other_costs":0,"rate":6,"years":30,"balloon_months":60}';
begin
 select id into uid from auth.users where email='jgap-test-a@example.com';
 if uid is null then raise exception 'Designated verified staging test account required';end if;
 insert into public.companies(name) values('V1 rollback seller playbook test') returning id into cid;
 insert into public.company_members(company_id,user_id,role) values(cid,uid,'owner');
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id=cid;
 perform set_config('request.jwt.claim.sub',uid::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 r:=public.calculate_seller_financing(cid,inputs);
 if (r#>>'{scenarios,0,monthly_payment}')::numeric<>1618.79 or (r#>>'{scenarios,0,monthly_cash_flow}')::numeric<>1381.21 or (r#>>'{scenarios,0,balloon_balance}')::numeric<>251246.76 or jsonb_array_length(r->'scenarios')<>3 then raise exception 'Incorrect seller result';end if;
 r:=public.calculate_seller_financing(cid,inputs||'{"rate":0}');if (r#>>'{scenarios,0,balloon_balance}')::numeric<>225000 then raise exception 'Incorrect zero-rate balloon';end if;
 r:=public.calculate_seller_financing(cid,inputs||'{"balloon_months":360}');if (r#>>'{scenarios,0,balloon_balance}')::numeric<>0 then raise exception 'Incorrect fully amortized balance';end if;
 blocked:=false;begin perform public.calculate_seller_financing(gen_random_uuid(),inputs);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign company allowed';end if;
 execute 'reset role';insert into seller_results values('Pro calculations, zero interest, final balance and foreign-company denial','PASS');
 for state in select * from (values('{"price":0}'::jsonb),('{"rate":101}'::jsonb),('{"balloon_months":361}'::jsonb),('{"years":1.5}'::jsonb),('{"noi":null}'::jsonb)) x(patch) loop
  execute 'set local role authenticated';blocked:=false;begin perform public.calculate_seller_financing(cid,inputs||state.patch);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Invalid inputs allowed';end if;execute 'reset role';
 end loop;insert into seller_results values('Invalid input denial','PASS');
 update public.company_members set role='viewer' where company_id=cid;execute 'set local role authenticated';r:=public.calculate_seller_financing(cid,inputs);execute 'reset role';insert into seller_results values('Pro viewer read-only calculator access','PASS');
 for state in select * from (values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) s(plan,status) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=cid;execute 'set local role authenticated';blocked:=false;begin perform public.calculate_seller_financing(cid,inputs);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Inactive or non-Pro access allowed';end if;execute 'reset role';
 end loop;insert into seller_results values('Free/Investor/inactive denial','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';blocked:=false;begin perform public.calculate_seller_financing(cid,inputs);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous access allowed';end if;execute 'reset role';insert into seller_results values('Anonymous execute denial','PASS');
end $test$;
select * from seller_results;
rollback;
