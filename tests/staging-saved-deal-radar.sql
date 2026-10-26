-- Staging SQL-role checks; every fictional row/plan change rolls back.
begin;
create temporary table radar_results(check_name text,outcome text);
do $test$
declare uid uuid;cid uuid;r jsonb;blocked boolean;state record;
begin
 select id into uid from auth.users where email='jgap-test-a@example.com';if uid is null then raise exception 'Designated staging test user required';end if;
 insert into public.companies(name) values('V1 rollback saved radar test') returning id into cid;
 insert into public.company_members(company_id,user_id,role) values(cid,uid,'owner');update public.company_subscriptions set plan='pro',billing_status='active' where company_id=cid;
 insert into public.deals(company_id,name,asking_price,target_offer_price,monthly_rent,monthly_operating_expenses,units,follow_up_date) values(cid,'Fictional complete radar property',100000.01,90000.02,1000,200,2,'2026-10-26'),(cid,'Fictional incomplete radar property',null,null,0,0,null,null);
 perform set_config('request.jwt.claim.sub',uid::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
 r:=public.get_saved_deal_radar(cid,'2026-10-26');if jsonb_array_length(r->'rows')<>2 or (r#>>'{rows,0,asking_offer_gap}')::numeric<>9999.99 or (r#>>'{rows,0,follow_up_due}')::boolean is not true or jsonb_array_length(r#>'{rows,1,review_fields}')<>5 or r#>>'{rows,1,asking_offer_gap}' is not null then raise exception 'Incorrect saved-deal review';end if;
 blocked:=false;begin perform public.get_saved_deal_radar(gen_random_uuid(),'2026-10-26');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign access allowed';end if;
 blocked:=false;begin perform public.get_saved_deal_radar(cid,null);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Null review date allowed';end if;
 execute 'reset role';insert into radar_results values('Own saved rows, exact gap, follow-up, missing data, foreign and invalid date denial','PASS');
 update public.company_members set role='viewer' where company_id=cid;execute 'set local role authenticated';r:=public.get_saved_deal_radar(cid,'2026-10-26');execute 'reset role';insert into radar_results values('Pro viewer read access','PASS');
 for state in select * from (values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) s(plan,status) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=cid;execute 'set local role authenticated';blocked:=false;begin perform public.get_saved_deal_radar(cid,'2026-10-26');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro or inactive access allowed';end if;execute 'reset role';
 end loop;insert into radar_results values('Free/Investor/inactive denied','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';blocked:=false;begin perform public.get_saved_deal_radar(cid,'2026-10-26');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous access allowed';end if;execute 'reset role';insert into radar_results values('Anonymous denied','PASS');
end $test$;
select * from radar_results;
rollback;
