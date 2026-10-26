-- STAGING SQL-role checks. All fictional rows and plan changes roll back.
begin;
create temporary table dashboard_results(check_name text,outcome text);
do $test$
declare a uuid;b uuid;c uuid;d uuid;r jsonb;blocked boolean;state record;custom text[]:=array['follow_ups','tools','metrics','recent_properties'];defaults text[]:=array['tools','metrics','recent_properties','follow_ups'];
begin
 select id into strict a from auth.users where email='jgap-test-a@example.com';select id into strict b from auth.users where email='jgap-test-b@example.com';
 insert into public.companies(name) values('V1 rollback dashboard A') returning id into c;insert into public.companies(name) values('V1 rollback dashboard B') returning id into d;
 insert into public.company_members(company_id,user_id,role) values(c,a,'owner'),(c,b,'viewer'),(d,b,'owner');update public.company_subscriptions set plan='pro',billing_status='active' where company_id in(c,d);
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);execute 'set local role authenticated';
 r:=public.get_dashboard_preferences(c);if r->'widget_order'<>to_jsonb(defaults) or r->>'updated_at' is not null then raise exception 'Missing preference defaults wrong';end if;
 r:=public.save_dashboard_preferences(c,custom,array['metrics']);r:=public.get_dashboard_preferences(c);if r->'widget_order'<>to_jsonb(custom) or r->'hidden_widgets'<>'["metrics"]'::jsonb or r->>'user_id'<>a::text then raise exception 'Own save/reload mismatch';end if;
 blocked:=false;begin perform public.get_dashboard_preferences(d);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign read allowed';end if;
 blocked:=false;begin perform public.save_dashboard_preferences(d,custom,array[]::text[]);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign save allowed';end if;
 blocked:=false;begin insert into public.dashboard_preferences(company_id,user_id) values(c,b);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Other user insert allowed';end if;
 blocked:=false;begin update public.dashboard_preferences set company_id=d where company_id=c;exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Identity update allowed';end if;
 if has_table_privilege('authenticated','public.dashboard_preferences','DELETE') then raise exception 'Unexpected delete grant';end if;
 execute 'reset role';insert into dashboard_results values('Defaults, save/reload, foreign/other-user/identity/delete permissions','PASS');
 for state in select * from(values(defaults,defaults),(array['tools','tools','metrics','follow_ups'],array[]::text[]),(defaults,array['metrics','metrics']),(defaults,array['billing']),(defaults,array[null]::text[])) s(o,h) loop
  execute 'set local role authenticated';blocked:=false;begin perform public.save_dashboard_preferences(c,state.o,state.h);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Invalid layout accepted';end if;execute 'reset role';
 end loop;insert into dashboard_results values('Unknown, duplicate, null and all-hidden layouts denied','PASS');
 perform set_config('request.jwt.claim.sub',b::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);execute 'set local role authenticated';r:=public.get_dashboard_preferences(c);if r->'widget_order'<>to_jsonb(defaults) then raise exception 'Owner preferences exposed to viewer';end if;
 r:=public.save_dashboard_preferences(c,defaults,array['tools']);if exists(select 1 from public.dashboard_preferences where user_id=a) then raise exception 'Other member preferences selectable';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);execute 'set local role authenticated';r:=public.get_dashboard_preferences(c);if r->'hidden_widgets'<>'["metrics"]'::jsonb then raise exception 'Viewer overwrote owner preferences';end if;
 execute 'reset role';insert into dashboard_results values('Pro viewer may customize only their personal layout','PASS');
 for state in select * from(values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) s(plan,status) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=c;execute 'set local role authenticated';blocked:=false;begin perform public.save_dashboard_preferences(c,defaults,array[]::text[]);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro save allowed';end if;
  blocked:=false;begin perform public.get_dashboard_preferences(c);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro read allowed';end if;
  if exists(select 1 from public.dashboard_preferences where company_id=c) then raise exception 'Direct non-Pro read allowed';end if;execute 'reset role';
 end loop;update public.company_subscriptions set plan='pro',billing_status='active' where company_id=c;execute 'set local role authenticated';r:=public.get_dashboard_preferences(c);if r->'widget_order'<>to_jsonb(custom) then raise exception 'Reactivation lost layout';end if;r:=public.save_dashboard_preferences(c,defaults,array[]::text[]);if r->'widget_order'<>to_jsonb(defaults) or (select count(*) from public.dashboard_preferences where company_id=c and user_id=a)<>1 then raise exception 'Reset removed preference row';end if;
 execute 'reset role';insert into dashboard_results values('Paid status enforcement, retention and non-destructive reset','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';blocked:=false;begin perform public.get_dashboard_preferences(c);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous preferences allowed';end if;execute 'reset role';insert into dashboard_results values('Anonymous denied','PASS');
end $test$;
select * from dashboard_results;
rollback;
