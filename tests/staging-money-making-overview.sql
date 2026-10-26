-- SQL-role staging checks. All fictional records and plan changes roll back.
begin;
create temporary table money_results(check_name text,outcome text);
do $test$
declare uid uuid;cid uuid;did uuid;r jsonb;blocked boolean;state record;
begin
 select id into uid from auth.users where email='jgap-test-a@example.com';if uid is null then raise exception 'Designated staging test user required';end if;
 insert into public.companies(name) values('V1 rollback money overview test') returning id into cid;
 insert into public.company_members(company_id,user_id,role) values(cid,uid,'owner');update public.company_subscriptions set plan='pro',billing_status='active' where company_id=cid;
 insert into public.deals(company_id,name,status,passport_current_value,passport_mortgage_balance,monthly_rent) values(cid,'Fictional matched values','closed',200000.01,100000.02,9999) returning id into did;
 insert into public.deals(company_id,name,status,passport_current_value,passport_mortgage_balance) values(cid,'Fictional unknown debt','closed',500000,null),(cid,'Fictional zero debt','closed',10000,0),(cid,'Fictional unknown value','lead',null,100);
 perform set_config('request.jwt.claim.sub',uid::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
 insert into public.property_ledger_entries(company_id,deal_id,entry_date,entry_type,category,amount) values(cid,did,'2026-10-01','income','Rent',1000.01),(cid,did,'2026-10-02','expense','Repairs',100.02);
 r:=public.get_money_making_overview(cid,'2026-10');if (r#>>'{groups,all_saved,count}')::int<>4 or (r#>>'{groups,closed_stage,count}')::int<>3 or (r#>>'{groups,all_saved,equity_count}')::int<>2 or (r#>>'{groups,all_saved,paired_equity}')::numeric<>109999.99 or (r#>>'{groups,closed_stage,debt_total}')::numeric<>100000.02 then raise exception 'Incorrect coverage or paired equity';end if;
 if (r#>>'{recorded,totals,income}')::numeric<>1000.01 or (r#>>'{recorded,totals,net}')::numeric<>899.99 then raise exception 'Estimated rent mixed with actual income or recorded totals wrong';end if;
 blocked:=false;begin perform public.get_money_making_overview(gen_random_uuid(),'2026-10');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign overview allowed';end if;
 blocked:=false;begin perform public.get_money_making_overview(cid,'2026-13');exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Invalid month allowed';end if;
 execute 'reset role';insert into money_results values('Matched equity, coverage, zero/unknown distinction, recorded-only month, foreign and invalid month denial','PASS');
 update public.company_members set role='viewer' where company_id=cid;execute 'set local role authenticated';r:=public.get_money_making_overview(cid,'2026-10');execute 'reset role';insert into money_results values('Pro viewer read access','PASS');
 for state in select * from (values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) s(plan,status) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=cid;execute 'set local role authenticated';blocked:=false;begin perform public.get_money_making_overview(cid,'2026-10');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro or inactive overview allowed';end if;execute 'reset role';
 end loop;insert into money_results values('Free/Investor/inactive denied','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';blocked:=false;begin perform public.get_money_making_overview(cid,'2026-10');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous overview allowed';end if;execute 'reset role';insert into money_results values('Anonymous denied','PASS');
end $test$;
select * from money_results;
rollback;
