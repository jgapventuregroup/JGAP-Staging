-- STAGING SQL-role checks. All synthetic source, review, membership and plan rows roll back.
begin;
create temporary table alert_results(check_name text,outcome text);
do $test$
declare a uuid;b uuid;c uuid;d uuid;deal uuid;asset uuid;task uuid;r jsonb;entry jsonb;blocked boolean;state record;
begin
 select id into strict a from auth.users where email='jgap-test-a@example.com';select id into strict b from auth.users where email='jgap-test-b@example.com';
 insert into public.companies(name) values('V1 rollback in-app alerts A') returning id into c;insert into public.companies(name) values('V1 rollback in-app alerts B') returning id into d;
 insert into public.company_members(company_id,user_id,role) values(c,a,'owner'),(c,b,'viewer'),(d,b,'owner');update public.company_subscriptions set plan='pro',billing_status='active' where company_id in(c,d);
 insert into public.deals(company_id,name,follow_up_date) values(c,'Fictional due property',current_date) returning id into deal;
 insert into public.deals(company_id,name,follow_up_date) values(c,'Fictional future property',current_date+5);
 insert into public.property_assets(company_id,deal_id,name,next_service_date) values(c,deal,'Fictional equipment',current_date) returning id into asset;
 insert into public.property_asset_services(company_id,deal_id,asset_id,service_name,frequency_value,frequency_unit,next_service_date) values(c,deal,asset,'Fictional service',1,'year',current_date);
 insert into public.property_assets(company_id,deal_id,name,next_service_date) values(c,deal,'Fictional standalone equipment',current_date);
 insert into public.property_maintenance(company_id,deal_id,title,maintenance_date,due_date,status) values(c,deal,'Fictional planned work',current_date,current_date,'planned'),(c,deal,'Fictional completed work',current_date,current_date,'completed');
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);execute 'set local role authenticated';
 insert into public.property_tasks(company_id,deal_id,title,due_on) values(c,deal,'Fictional open task',current_date) returning id into task;
 insert into public.property_tasks(company_id,deal_id,title,due_on,status) values(c,deal,'Fictional done task',current_date,'done');
 r:=public.get_in_app_alerts(c,current_date);if (r->>'total_count')::int<>5 or (r->>'unreviewed_count')::int<>5 then raise exception 'Due-source count or equipment deduplication failed';end if;
 perform public.set_in_app_alert_review(c,'task',task,deal,current_date,true);r:=public.get_in_app_alerts(c,current_date);if (r->>'unreviewed_count')::int<>4 or (select status from public.property_tasks where id=task)<>'open' then raise exception 'Review count wrong or task was changed';end if;
 execute 'reset role';insert into alert_results values('Computed due sources, future/completed exclusion, equipment deduplication and review independence','PASS');
 perform set_config('request.jwt.claim.sub',b::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);execute 'set local role authenticated';
 r:=public.get_in_app_alerts(c,current_date);if (r->>'unreviewed_count')::int<>5 or exists(select 1 from public.in_app_alert_reviews where user_id=a) then raise exception 'Other member review exposed';end if;
 perform public.set_in_app_alert_review(c,'task',task,deal,current_date,true);
 execute 'reset role';perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);execute 'set local role authenticated';
 perform public.set_in_app_alert_review(c,'task',task,deal,current_date,false);r:=public.get_in_app_alerts(c,current_date);if (r->>'unreviewed_count')::int<>5 then raise exception 'Personal review reversal failed';end if;
 blocked:=false;begin perform public.get_in_app_alerts(d,current_date);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign alerts allowed';end if;
 blocked:=false;begin perform public.set_in_app_alert_review(c,'task',task,gen_random_uuid(),current_date,true);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Wrong-property review allowed';end if;
 blocked:=false;begin insert into public.in_app_alert_reviews(company_id,user_id,source_type,source_id,deal_id,due_date) values(c,b,'task',task,deal,current_date);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Other-user review insertion allowed';end if;
 if has_table_privilege('authenticated','public.in_app_alert_reviews','DELETE') then raise exception 'Unexpected delete grant';end if;
 execute 'reset role';insert into alert_results values('Personal viewer reviews, cross-user/company/property denial and delete permissions','PASS');
 execute 'set local role authenticated';update public.property_tasks set status='done' where id=task;
 blocked:=false;begin perform public.set_in_app_alert_review(c,'task',task,deal,current_date,true);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Completed-source review accepted';end if;
 r:=public.get_in_app_alerts(c,current_date);if (r->>'total_count')::int<>4 then raise exception 'Completed task retained as due alert';end if;
 execute 'reset role';insert into alert_results values('Completed or changed source rejects stale review action','PASS');
 for state in select * from(values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) s(plan,status) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=c;execute 'set local role authenticated';
  blocked:=false;begin perform public.get_in_app_alerts(c,current_date);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro alerts allowed';end if;
  if exists(select 1 from public.in_app_alert_reviews where company_id=c) then raise exception 'Non-Pro direct review read allowed';end if;execute 'reset role';
 end loop;update public.company_subscriptions set plan='pro',billing_status='active' where company_id=c;execute 'set local role authenticated';if (select count(*) from public.in_app_alert_reviews where company_id=c and user_id=a)<>1 then raise exception 'Reactivation lost personal state';end if;
 execute 'reset role';insert into alert_results values('Paid status enforcement and retained personal state','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 blocked:=false;begin perform public.get_in_app_alerts(c,current_date);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous alerts allowed';end if;execute 'reset role';insert into alert_results values('Anonymous denied','PASS');
end $test$;
select * from alert_results;
rollback;
