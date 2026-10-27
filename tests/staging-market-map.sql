-- Isolated map fixtures; all companies, seats, property locations and plans roll back.
begin;
create temporary table map_results(check_name text,outcome text);
do $test$
declare a uuid;b uuid;c uuid;d uuid;p uuid;q uuid;r jsonb;blocked boolean;s record;
begin
 select id into strict a from auth.users where email='jgap-test-a@example.com' and email_confirmed_at is not null;
 select id into strict b from auth.users where email='jgap-test-b@example.com' and email_confirmed_at is not null;
 insert into public.companies(name) values('V1 rollback map A') returning id into c;insert into public.companies(name) values('V1 rollback map B') returning id into d;
 insert into public.company_members(company_id,user_id,role) values(c,a,'owner'),(c,b,'viewer'),(d,b,'owner');update public.company_subscriptions set plan='pro',billing_status='active' where company_id in(c,d);
 insert into public.company_team_seats(company_id,additional_seats,valid_until) values(c,1,now()+interval '1 day');
 insert into public.deals(company_id,name) values(c,'V1 rollback mapped property') returning id into p;insert into public.deals(company_id,name) values(d,'V1 rollback foreign map') returning id into q;
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);execute 'set local role authenticated';
 r:=public.get_market_map(c);if jsonb_array_length(r->'rows')<>1 or (r->'rows'->0->>'latitude') is not null then raise exception 'Unknown map state wrong';end if;
 r:=public.save_market_map_location(c,p,0,0);if (r->>'latitude')::numeric<>0 or r->>'verified_by'<>a::text then raise exception 'Zero coordinate save/attribution wrong';end if;
 blocked:=false;begin perform public.get_market_map(d);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign map read allowed';end if;
 blocked:=false;begin perform public.save_market_map_location(c,q,1,1);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign property pin allowed';end if;
 blocked:=false;begin perform public.save_market_map_location(c,p,null,1);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Partial coordinate accepted';end if;
 blocked:=false;begin perform public.save_market_map_location(c,p,86,0);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Out-of-range pin accepted';end if;
 if has_column_privilege('authenticated','public.property_map_locations','company_id','UPDATE') or has_table_privilege('authenticated','public.property_map_locations','DELETE') then raise exception 'Map identity/delete grants exist';end if;
 execute 'reset role';insert into map_results values('Unknown/zero coordinates, attribution, foreign scope, validation and identity protections','PASS');
 perform set_config('request.jwt.claim.sub',b::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);execute 'set local role authenticated';
 r:=public.get_market_map(c);if jsonb_array_length(r->'rows')<>1 then raise exception 'Viewer map unavailable';end if;
 blocked:=false;begin perform public.save_market_map_location(c,p,1,1);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Viewer pin write allowed';end if;
 execute 'reset role';update public.company_team_seats set valid_until=now()-interval '1 second' where company_id=c;execute 'set local role authenticated';
 blocked:=false;begin perform public.get_market_map(c);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Unlicensed seat map allowed';end if;
 execute 'reset role';insert into map_results values('Viewer reads, viewer writes denied and expired-seat denial','PASS');
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 for s in select * from(values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) v(plan,status) loop
 update public.company_subscriptions set plan=s.plan,billing_status=s.status where company_id=c;execute 'set local role authenticated';blocked:=false;begin perform public.get_market_map(c);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro/inactive map allowed';end if;execute 'reset role';end loop;
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id=c;execute 'set local role authenticated';r:=public.get_market_map(c);if (r->'rows'->0->>'latitude')::numeric<>0 then raise exception 'Plan reactivation lost map pin';end if;
 execute 'reset role';insert into map_results values('Free/Investor/inactive denial and paid reactivation retains pins','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';blocked:=false;begin perform public.get_market_map(c);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous map allowed';end if;
 execute 'reset role';insert into map_results values('Anonymous map access denied','PASS');
end $test$;
select * from map_results;
rollback;
