-- STAGING ONLY; psql -v ON_ERROR_STOP=1. All fixtures and plan changes roll back.
-- Database-role verification is supplemental; not a real-session Passport gate.
begin;
create temporary table operations_results(check_name text,outcome text);
do $test$
declare
 users uuid[]; companies uuid[]; deals uuid[]; other_deals uuid[];
 ids uuid[]; fixture uuid; creator uuid; created timestamptz;
 spec record; state record; side integer; other_side integer; n integer;
 denied boolean; caps jsonb;
begin
 select array_agg(user_id) into users from (select distinct user_id from public.company_members limit 2) u;
 if cardinality(users)<>2 then raise exception 'Two existing staging users required'; end if;
 for side in 1..2 loop
   insert into public.companies(name) values('V1 rollback operations fixture '||side) returning id into fixture;
   companies[side]:=fixture;
   insert into public.company_members(company_id,user_id,role) values(fixture,users[side],'owner');
   insert into public.deals(company_id,name) values(fixture,'Operations fictional property') returning id into fixture;
   deals[side]:=fixture;
   insert into public.deals(company_id,name) values(companies[side],'Second fictional property') returning id into fixture;
   other_deals[side]:=fixture;
   update public.company_subscriptions set plan='investor',billing_status='active' where company_id=companies[side];
 end loop;
 for spec in select * from (values
  ('property_ledger_entries','entry_date,entry_type,category,amount', $$date '2026-01-01','income','Rent',100$$,'description'),
  ('property_repairs','title,opened_on', $$'Fictional repair',date '2026-01-01'$$,'description'),
  ('property_tasks','title', $$'Fictional task'$$,'details')
 ) s(table_name,columns_sql,values_sql,text_field) loop
   for side in 1..2 loop
     perform set_config('request.jwt.claim.sub',users[side]::text,true);
     perform set_config('request.jwt.claims',json_build_object('sub',users[side],'role','authenticated')::text,true);
     execute 'set local role authenticated';
     execute format('insert into public.%I(company_id,deal_id,created_by,created_at,%s) values($1,$2,$3,$4,%s) returning id,created_by,created_at',spec.table_name,spec.columns_sql,spec.values_sql)
       into fixture,creator,created using companies[side],deals[side],users[3-side],timestamptz '2000-01-01';
     ids[side]:=fixture;
     if creator<>users[side] or created=timestamptz '2000-01-01' then raise exception 'Creator/timestamp spoofing allowed'; end if;
     execute format('update public.%I set %I=$1 where id=$2',spec.table_name,spec.text_field) using 'Own edit persisted',fixture;
     get diagnostics n=row_count; if n<>1 then raise exception 'Own update failed'; end if;
     execute format('select count(*) from public.%I where id=$1 and %I=$2',spec.table_name,spec.text_field) into n using fixture,'Own edit persisted';
     if n<>1 then raise exception 'Own update persistence failed'; end if;
     caps:=public.property_operations_access(companies[side]);
     if caps<>jsonb_build_object('read',true,'write',true) then raise exception 'Paid capability mismatch'; end if;
     execute 'reset role';
   end loop;
   for side in 1..2 loop
     other_side:=3-side;
     perform set_config('request.jwt.claim.sub',users[side]::text,true);
     perform set_config('request.jwt.claims',json_build_object('sub',users[side],'role','authenticated')::text,true);
     execute 'set local role authenticated';
     execute format('select count(*) from public.%I where id=$1 or company_id=$2',spec.table_name) into n using ids[other_side],companies[other_side];
     if n<>0 then raise exception 'Foreign SELECT leaked records'; end if;
     denied:=false;
     begin
       execute format('insert into public.%I(company_id,deal_id,%s) values($1,$2,%s)',spec.table_name,spec.columns_sql,spec.values_sql) using companies[other_side],deals[other_side];
     exception when insufficient_privilege then denied:=true; end;
     if not denied then raise exception 'Foreign INSERT allowed'; end if;
     execute format('update public.%I set %I=$1 where id=$2',spec.table_name,spec.text_field) using 'Forbidden edit',ids[other_side];
     get diagnostics n=row_count; if n<>0 then raise exception 'Foreign UPDATE allowed'; end if;
     denied:=false;
     begin execute format('update public.%I set company_id=$1,deal_id=$2 where id=$3',spec.table_name) using companies[other_side],deals[other_side],ids[side];
     exception when insufficient_privilege then denied:=true; end;
     if not denied then raise exception 'Company reassignment allowed'; end if;
     denied:=false;
     begin execute format('update public.%I set deal_id=$1 where id=$2',spec.table_name) using other_deals[side],ids[side];
     exception when insufficient_privilege then denied:=true; end;
     if not denied then raise exception 'Property reassignment allowed'; end if;
     denied:=false;
     begin execute format('update public.%I set created_by=$1 where id=$2',spec.table_name) using users[other_side],ids[side];
     exception when insufficient_privilege then denied:=true; end;
     if not denied then raise exception 'Creator reassignment allowed'; end if;
     denied:=false;
     begin execute format('insert into public.%I(company_id,deal_id,%s) values($1,$2,%s)',spec.table_name,spec.columns_sql,spec.values_sql) using companies[side],deals[other_side];
     exception when foreign_key_violation then denied:=true; end;
     if not denied then raise exception 'Foreign deal linkage allowed'; end if;
     execute 'reset role';
   end loop;
   insert into operations_results values(spec.table_name||': two-company SELECT/INSERT/UPDATE isolation, positive persistence, immutable identity, attribution and composite FK','PASS');
   for state in select * from (values ('free','not_connected'),('investor','past_due'),('pro','canceled')) s(plan,status) loop
     update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=companies[1];
     perform set_config('request.jwt.claim.sub',users[1]::text,true);
     perform set_config('request.jwt.claims',json_build_object('sub',users[1],'role','authenticated')::text,true);
     execute 'set local role authenticated';
     caps:=public.property_operations_access(companies[1]);
     if caps<>jsonb_build_object('read',true,'write',false) then raise exception 'Inactive capability mismatch'; end if;
     execute format('select count(*) from public.%I where id=$1',spec.table_name) into n using ids[1];
     if n<>1 then raise exception 'Downgrade lost history'; end if;
     execute format('update public.%I set %I=$1 where id=$2',spec.table_name,spec.text_field) using 'Forbidden downgrade edit',ids[1];
     get diagnostics n=row_count; if n<>0 then raise exception 'Inactive update allowed'; end if;
     denied:=false;
     begin execute format('insert into public.%I(company_id,deal_id,%s) values($1,$2,%s)',spec.table_name,spec.columns_sql,spec.values_sql) using companies[1],deals[1];
     exception when insufficient_privilege then denied:=true; end;
     if not denied then raise exception 'Inactive insert allowed'; end if;
     execute 'reset role';
   end loop;
   update public.company_subscriptions set plan='pro',billing_status='active' where company_id=companies[1];
   update public.company_members set role='viewer' where company_id=companies[1];
   execute 'set local role authenticated';
   caps:=public.property_operations_access(companies[1]);
   if caps<>jsonb_build_object('read',true,'write',false) then raise exception 'Viewer capability mismatch'; end if;
   execute format('update public.%I set %I=$1 where id=$2',spec.table_name,spec.text_field) using 'Forbidden viewer edit',ids[1];
   get diagnostics n=row_count; if n<>0 then raise exception 'Viewer update allowed'; end if;
   denied:=false;
   begin execute format('insert into public.%I(company_id,deal_id,%s) values($1,$2,%s)',spec.table_name,spec.columns_sql,spec.values_sql) using companies[1],deals[1];
   exception when insufficient_privilege then denied:=true; end;
   if not denied then raise exception 'Viewer insert allowed'; end if;
   execute 'reset role';
   update public.company_members set role='owner' where company_id=companies[1];
   execute 'set local role authenticated';
   execute format('update public.%I set %I=$1 where id=$2',spec.table_name,spec.text_field) using 'Pro edit persisted',ids[1];
   get diagnostics n=row_count; if n<>1 then raise exception 'Active Pro update failed'; end if;
   if spec.table_name='property_tasks' then
     update public.property_tasks set status='done',completed_at=timestamptz '2000-01-01' where id=ids[1] returning completed_at into created;
     if created is null or created=timestamptz '2000-01-01' then raise exception 'Task completion timestamp not server-derived'; end if;
     update public.property_tasks set status='open' where id=ids[1] returning completed_at into created;
     if created is not null then raise exception 'Reopened task retains completion stamp'; end if;
   end if;
   execute 'reset role';
   perform set_config('request.jwt.claim.sub','',true);
   perform set_config('request.jwt.claims','{"role":"anon"}',true);
   execute 'set local role anon';
   denied:=false;
   begin execute format('select count(*) from public.%I',spec.table_name) into n;
   exception when insufficient_privilege then denied:=true; end;
   if not denied then raise exception 'Anonymous SELECT allowed'; end if;
   denied:=false;
   begin execute format('insert into public.%I(company_id,deal_id,%s) values($1,$2,%s)',spec.table_name,spec.columns_sql,spec.values_sql) using companies[1],deals[1];
   exception when insufficient_privilege then denied:=true; end;
   if not denied then raise exception 'Anonymous INSERT allowed'; end if;
   denied:=false;
   begin execute format('update public.%I set %I=$1 where id=$2',spec.table_name,spec.text_field) using 'Anonymous edit',ids[1];
   exception when insufficient_privilege then denied:=true; end;
   if not denied then raise exception 'Anonymous UPDATE allowed'; end if;
   denied:=false;
   begin perform public.property_operations_access(companies[1]);
   exception when insufficient_privilege then denied:=true; end;
   if not denied then raise exception 'Anonymous capability RPC allowed'; end if;
   execute 'reset role';
   insert into operations_results values(spec.table_name||': downgrade/inactive retention, viewer denial, Pro editing, anonymous denial','PASS');
   update public.company_subscriptions set plan='investor',billing_status='active' where company_id=companies[1];
 end loop;
end $test$;
select * from operations_results;
rollback;
