-- STAGING ONLY. Run with psql -v ON_ERROR_STOP=1 or the staging SQL connector.
-- Synthetic companies/properties and all subscription changes roll back.
-- Existing user identity is simulated under the authenticated SQL role;
-- this is NOT the real-session two-company Passport editor release gate.
begin;
create temporary table v1_results(check_name text, outcome text);
do $test$
declare
 u uuid; c uuid; d uuid; i integer; n integer; blocked boolean;
 state record; value numeric;
begin
 select user_id into u from public.company_members limit 1;
 if u is null then raise exception 'No staging member available'; end if;
 insert into public.companies(name) values ('V1 rollback-only membership fixture') returning id into c;
 insert into public.company_members(company_id,user_id,role) values(c,u,'owner');
 insert into public.deals(company_id,name) values(c,'V1 fictional property') returning id into d;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 blocked:=false;
 begin update public.deals set passport_current_value=123456 where id=d;
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: Free direct Passport update'; end if;
 blocked:=false;
 begin perform public.update_passport_financials(c,d,null,123456,0);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: Free Passport RPC update'; end if;
 blocked:=false;
 begin insert into public.deals(company_id,name,passport_current_value) values(c,'V1 forbidden paid field',123);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: Free direct Passport insert'; end if;
 update public.deals set monthly_rent=1400 where id=d;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'FAIL: Free basic financial editing regressed'; end if;
 for i in 2..5 loop insert into public.deals(company_id,name) values(c,'V1 fictional property '||i); end loop;
 delete from public.deals where id=d;
 blocked:=false;
 begin insert into public.deals(company_id,name) values(c,'V1 forbidden sixth property');
 exception when raise_exception then
   if sqlerrm <> 'FREE_LIFETIME_PROPERTY_LIMIT_REACHED' then raise; end if;
   blocked:=true;
 end;
 if not blocked then raise exception 'FAIL: Delete restored lifetime slot'; end if;
 begin
   update public.company_subscriptions set plan='pro',billing_status='active' where company_id=c;
   get diagnostics n=row_count;
   if n<>0 then raise exception 'FAIL: Client upgraded subscription'; end if;
 exception when insufficient_privilege then null; end;
 execute 'reset role';
 insert into v1_results values ('Free direct/RPC paid-write denial and basic edit preservation','PASS'),('Free five lifetime slots; deleting does not restore quota','PASS'),('Client subscription self-upgrade denial','PASS');
 for state in select * from (values ('investor','active',true),('pro','active',true),('pro','past_due',false),('investor','canceled',false),('free','not_connected',false)) s(plan,status,allowed) loop
   update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=c;
   execute 'set local role authenticated';
   if public.can_access_passport(c) is distinct from state.allowed then raise exception 'FAIL: Passport entitlement state'; end if;
   if state.allowed then
     insert into public.deals(company_id,name) values(c,'V1 paid property') returning id into d;
     update public.deals set passport_current_value=123456 where id=d;
     perform public.update_passport_financials(c,d,'2026-01-01',234567,100000);
     for value in select * from (values (-1::numeric),('NaN'::numeric),('Infinity'::numeric)) v(amount) loop
       blocked:=false;
       begin update public.deals set passport_current_value=value where id=d;
       exception when invalid_parameter_value then blocked:=true; end;
       if not blocked then raise exception 'FAIL: Invalid numeric Passport amount accepted'; end if;
     end loop;
   else
     blocked:=false;
     begin update public.deals set passport_current_value=999 where id=d;
     exception when insufficient_privilege then blocked:=true; end;
     if not blocked then raise exception 'FAIL: Inactive/downgrade paid write'; end if;
     blocked:=false;
     begin insert into public.deals(company_id,name) values(c,'V1 inactive extra property');
     exception when raise_exception then
       if sqlerrm <> 'FREE_LIFETIME_PROPERTY_LIMIT_REACHED' then raise; end if;
       blocked:=true;
     end;
     if not blocked then raise exception 'FAIL: Inactive/downgrade quota bypass'; end if;
     select count(*) into n from public.deals where company_id=c;
     if n<>6 then raise exception 'FAIL: Downgrade lost saved properties'; end if;
   end if;
   execute 'reset role';
   insert into v1_results values(state.plan||'/'||state.status||' entitlement, writes and quota','PASS');
 end loop;
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id=c;
 update public.company_members set role='viewer' where company_id=c and user_id=u;
 execute 'set local role authenticated';
 blocked:=false;
 begin perform public.update_passport_financials(c,d,null,123456,0);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: Viewer Passport RPC write'; end if;
 update public.deals set passport_current_value=999 where id=d;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'FAIL: Viewer table write'; end if;
 execute 'reset role';
 insert into v1_results values('Paid viewer cannot write through RPC or table API','PASS');
end $test$;
select * from v1_results;
rollback;
