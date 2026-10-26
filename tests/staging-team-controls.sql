-- Fictional workspaces and all invitation/membership/plan changes roll back.
begin;
create temporary table team_results(check_name text,outcome text);
do $test$
declare a uuid;b uuid;c uuid;d uuid;r jsonb;i uuid;blocked boolean;s record;
begin
 select id into strict a from auth.users where email='jgap-test-a@example.com' and email_confirmed_at is not null;
 select id into strict b from auth.users where email='jgap-test-b@example.com' and email_confirmed_at is not null;
 insert into public.companies(name) values('V1 rollback team A') returning id into c;
 insert into public.companies(name) values('V1 rollback team B') returning id into d;
 insert into public.company_members(company_id,user_id,role) values(c,a,'owner'),(d,b,'owner');
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id in(c,d);
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);execute 'set local role authenticated';
 r:=public.manage_workspace_team('list',c);if jsonb_array_length(r->'members')<>1 then raise exception 'Roster wrong';end if;
 blocked:=false;begin perform public.manage_workspace_team('list',d);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign roster allowed';end if;
 blocked:=false;begin perform public.manage_workspace_team('role',c,a,null,'viewer');exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Last owner demoted';end if;
 blocked:=false;begin perform public.manage_workspace_team('remove',c,a);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Last owner removed';end if;
 if has_table_privilege('authenticated','public.company_members','UPDATE') or has_table_privilege('authenticated','public.company_invitations','INSERT') then raise exception 'Unexpected direct team write grant';end if;
 r:=public.manage_workspace_team('invite',c,null,'jgap-test-b@example.com','viewer');i:=(r->>'id')::uuid;
 execute 'reset role';insert into team_results values('Owner roster, foreign isolation, last-owner and direct-write restrictions','PASS');
 perform set_config('request.jwt.claim.sub',b::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);execute 'set local role authenticated';
 r:=public.manage_workspace_team('inbox');if not exists(select 1 from jsonb_array_elements(r) v where v->>'id'=i::text) then raise exception 'Invitation not in recipient inbox';end if;
 r:=public.manage_workspace_team('accept',c,i);if r->>'role'<>'viewer' then raise exception 'Acceptance role wrong';end if;
 blocked:=false;begin perform public.manage_workspace_team('role',c,b,null,'owner');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Viewer escalated';end if;
 blocked:=false;begin perform public.manage_workspace_team('accept',c,i);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Invitation replay allowed';end if;
 execute 'reset role';insert into team_results values('Verified recipient inbox/acceptance, replay denial and viewer escalation denial','PASS');
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);execute 'set local role authenticated';
 perform public.manage_workspace_team('role',c,b,null,'owner');perform public.manage_workspace_team('role',c,a,null,'viewer');
 blocked:=false;begin perform public.manage_workspace_team('list',c);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Former owner retained access';end if;
 execute 'reset role';if (select count(*) from public.company_members where company_id=c and role='owner')<>1 then raise exception 'Owner count wrong';end if;
 insert into team_results values('Owner handoff and immediate former-owner management denial','PASS');
 insert into public.deals(company_id,name) values(c,'V1 rollback retained shared property');
 perform set_config('request.jwt.claim.sub',b::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);execute 'set local role authenticated';
 perform public.manage_workspace_team('remove',c,a);execute 'reset role';
 if exists(select 1 from public.company_members where company_id=c and user_id=a) or not exists(select 1 from public.deals where company_id=c and name='V1 rollback retained shared property') then raise exception 'Removal did not preserve shared property';end if;
 insert into team_results values('Member removal revokes membership and retains shared property','PASS');
 perform set_config('request.jwt.claim.sub',b::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 for s in select * from(values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) v(plan,status) loop
 update public.company_subscriptions set plan=s.plan,billing_status=s.status where company_id=c;execute 'set local role authenticated';
 blocked:=false;begin perform public.manage_workspace_team('list',c);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Inactive/non-Pro owner allowed';end if;execute 'reset role';
 end loop;
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 blocked:=false;begin perform public.manage_workspace_team('inbox');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous inbox allowed';end if;
 execute 'reset role';insert into team_results values('Free, Investor, inactive and anonymous restrictions','PASS');
end $test$;
select * from team_results;
rollback;
