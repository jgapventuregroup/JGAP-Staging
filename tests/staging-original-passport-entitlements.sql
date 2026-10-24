-- STAGING ONLY. SQL-role regression; separate real-session isolation gate still required.
begin;
create temporary table original_entitlement_results(check_name text,outcome text);
do $test$
declare u uuid;c uuid;d uuid;ids uuid[];asset uuid;tables text[]:=array['property_assets','property_asset_services','property_maintenance','property_improvements'];
 fields text[]:=array['name','service_name','title','title'];i integer;n integer;blocked boolean;state record;
begin
 select user_id into u from public.company_members limit 1;if u is null then raise exception 'Staging user required';end if;
 insert into public.companies(name) values('V1 rollback original entitlement fixture') returning id into c;
 insert into public.company_members(company_id,user_id,role) values(c,u,'owner');
 insert into public.deals(company_id,name) values(c,'Fictional original entitlement property') returning id into d;
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id=c;
 perform set_config('request.jwt.claim.sub',u::text,true);perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.property_assets(company_id,deal_id,name) values(c,d,'Fictional equipment') returning id into asset;ids[1]:=asset;
 insert into public.property_asset_services(company_id,deal_id,asset_id,service_name,frequency_value,frequency_unit) values(c,d,asset,'Fictional service',1,'year') returning id into asset;ids[2]:=asset;
 insert into public.property_maintenance(company_id,deal_id,title,maintenance_date) values(c,d,'Fictional maintenance','2026-10-24') returning id into asset;ids[3]:=asset;
 insert into public.property_improvements(company_id,deal_id,title,improvement_date) values(c,d,'Fictional improvement','2026-10-24') returning id into asset;ids[4]:=asset;
 for i in 1..4 loop
  execute format('update public.%I set %I=$1 where id=$2 and company_id=$3',tables[i],fields[i]) using 'Pro saved edit',ids[i],c;
  get diagnostics n=row_count;if n<>1 then raise exception 'Pro edit failed: %',tables[i];end if;
 end loop;
 execute 'reset role';insert into original_entitlement_results values('Active Pro creates and edits all four original record types','PASS');
 for state in select * from (values('investor','active',true),('free','not_connected',false),('pro','past_due',false),('pro','canceled',false)) s(plan,status,can_read) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=c;
  execute 'set local role authenticated';
  for i in 1..4 loop
   execute format('select count(*) from public.%I where id=$1 and company_id=$2',tables[i]) into n using ids[i],c;
   if n<>(case when state.can_read then 1 else 0 end) then raise exception 'Read entitlement mismatch: % / %',state.plan,tables[i];end if;
   blocked:=false;begin
    execute format('update public.%I set %I=$1 where id=$2 and company_id=$3',tables[i],fields[i]) using 'Forbidden edit',ids[i],c;
    get diagnostics n=row_count;blocked:=n=0;
   exception when insufficient_privilege then blocked:=true;end;
   if not blocked then raise exception 'Non-Pro original update allowed: % / %',state.plan,tables[i];end if;
  end loop;
  blocked:=false;begin insert into public.property_assets(company_id,deal_id,name) values(c,d,'Forbidden equipment');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro equipment insert allowed';end if;
  blocked:=false;begin insert into public.property_asset_services(company_id,deal_id,asset_id,service_name,frequency_value,frequency_unit) values(c,d,ids[1],'Forbidden service',1,'year');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro service insert allowed';end if;
  blocked:=false;begin insert into public.property_maintenance(company_id,deal_id,title,maintenance_date) values(c,d,'Forbidden maintenance','2026-10-24');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro maintenance insert allowed';end if;
  blocked:=false;begin insert into public.property_improvements(company_id,deal_id,title,improvement_date) values(c,d,'Forbidden improvement','2026-10-24');exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Non-Pro improvement insert allowed';end if;
  execute 'reset role';
 end loop;
 insert into original_entitlement_results values('Investor reads retained history but cannot write; Free/inactive original access denied','PASS');
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id=c;
 update public.company_members set role='viewer' where company_id=c and user_id=u;
 execute 'set local role authenticated';
 for i in 1..4 loop
  execute format('select count(*) from public.%I where id=$1 and company_id=$2 and %I=$3',tables[i],fields[i]) into n using ids[i],c,'Pro saved edit';
  if n<>1 then raise exception 'Reactivation lost record or viewer read denied';end if;
  blocked:=false;begin execute format('update public.%I set %I=$1 where id=$2',tables[i],fields[i]) using 'Forbidden viewer edit',ids[i];get diagnostics n=row_count;blocked:=n=0;exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Viewer original write allowed';end if;
 end loop;
 execute 'reset role';insert into original_entitlement_results values('Reactivation preserves data and Pro viewers stay read-only','PASS');
end $test$;
select * from original_entitlement_results;
rollback;
