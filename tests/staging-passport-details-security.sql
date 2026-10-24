-- STAGING ONLY; all fictional rows and role/subscription changes roll back.
-- Database-role tests do not satisfy the original Passport real-session gate.
begin;
create temporary table passport_details_results(check_name text,outcome text);
do $test$
declare u uuid;c uuid;foreign_c uuid;d uuid;foreign_d uuid;r public.deals;blocked boolean;state record;
begin
 select user_id into u from public.company_members limit 1;if u is null then raise exception 'Staging member required';end if;
 insert into public.companies(name) values('V1 rollback profile fixture') returning id into c;
 insert into public.companies(name) values('V1 rollback foreign profile fixture') returning id into foreign_c;
 insert into public.company_members(company_id,user_id,role) values(c,u,'owner');
 insert into public.deals(company_id,name,property_type,units) values(c,'V1 fictional property','Duplex',2) returning id into d;
 insert into public.deals(company_id,name,property_type,units) values(foreign_c,'V1 fictional foreign property','Duplex',2) returning id into foreign_d;
 perform set_config('request.jwt.claim.sub',u::text,true);perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 update public.company_subscriptions set plan='investor',billing_status='active' where company_id=c;
 execute 'set local role authenticated';
 r:=public.update_company_deal(c,d,'{"property_type":"Triplex","units":3}');
 if r.id<>d or r.company_id<>c or r.property_type<>'Triplex' or r.units<>3 then raise exception 'Own profile save mismatch';end if;
 if not exists(select 1 from public.deals where id=d and company_id=c and property_type='Triplex' and units=3) then raise exception 'Profile persistence failed';end if;
 r:=public.update_company_deal(c,d,'{"units":null}');if r.units is not null then raise exception 'Unknown units not preserved';end if;
 for state in select * from (values('{"units":0}'::jsonb),('{"units":-1}'::jsonb),('{"property_type":""}'::jsonb)) s(patch) loop
  blocked:=false;begin perform public.update_company_deal(c,d,state.patch);exception when raise_exception then blocked:=true;end;
  if not blocked then raise exception 'Invalid profile accepted';end if;
 end loop;
 execute 'reset role';insert into passport_details_results values('Own save/persist, unknown units and invalid input','PASS');
 execute 'set local role authenticated';
 blocked:=false;begin perform public.update_company_deal(foreign_c,foreign_d,'{"units":4}');exception when raise_exception then if sqlerrm<>'Not authorized for selected workspace' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Foreign company allowed';end if;
 blocked:=false;begin perform public.update_company_deal(c,foreign_d,'{"property_type":"Forbidden"}');exception when raise_exception then if sqlerrm<>'Deal not found in selected workspace' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Mismatched property allowed';end if;
 execute 'reset role';if not exists(select 1 from public.deals where id=foreign_d and units=2 and property_type='Duplex') then raise exception 'Foreign profile changed';end if;
 insert into passport_details_results values('Foreign company and mismatched property denied','PASS');
 update public.company_members set role='viewer' where company_id=c and user_id=u;execute 'set local role authenticated';
 blocked:=false;begin perform public.update_company_deal(c,d,'{"units":4}');exception when raise_exception then if sqlerrm<>'Workspace role cannot edit deals' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Viewer write allowed';end if;
 execute 'reset role';insert into passport_details_results values('Viewer write denied','PASS');
 update public.company_members set role='owner' where company_id=c and user_id=u;
 update public.company_subscriptions set plan='free',billing_status='not_connected' where company_id=c;execute 'set local role authenticated';
 blocked:=false;begin perform public.update_company_deal(c,d,'{"name":"Replacement property","property_address":"New identity"}');exception when raise_exception then if sqlerrm not like 'FREE_PROPERTY_IDENTITY_LOCKED:%' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Free identity lock regressed';end if;
 execute 'reset role';insert into passport_details_results values('Free property identity remains locked','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 blocked:=false;begin perform public.update_company_deal(c,d,'{"units":4}');exception when insufficient_privilege then blocked:=true;when raise_exception then if sqlerrm<>'Not authorized for selected workspace' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Anonymous write allowed';end if;
 execute 'reset role';insert into passport_details_results values('Anonymous write denied','PASS');
end $test$;
select * from passport_details_results;
rollback;
