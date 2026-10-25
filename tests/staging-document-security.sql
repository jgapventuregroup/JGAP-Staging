-- SQL-role regression only; every fixture and plan change rolls back.
begin;
create temporary table document_results(check_name text,outcome text);
do $test$
declare u uuid; v uuid; a uuid; b uuid; da uuid; db uuid; object_id uuid; own_path text; foreign_path text; blocked boolean; n integer; state record; malformed text;
begin
 select user_id into u from public.company_members order by user_id limit 1;
 select user_id into v from public.company_members where user_id<>u order by user_id limit 1;
 if u is null or v is null then raise exception 'Two existing staging users required';end if;
 insert into public.companies(name) values('Rollback document A') returning id into a;
 insert into public.companies(name) values('Rollback document B') returning id into b;
 insert into public.company_members(company_id,user_id,role) values(a,u,'owner'),(b,v,'owner');
 insert into public.deals(company_id,name) values(a,'Rollback document property A') returning id into da;
 insert into public.deals(company_id,name) values(b,'Rollback document property B') returning id into db;
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id in(a,b);
 own_path:=a::text||'/'||da::text||'/00000000-0000-4000-8000-000000000001--QA.pdf';
 foreign_path:=b::text||'/'||db::text||'/00000000-0000-4000-8000-000000000002--QA.pdf';
 insert into storage.objects(bucket_id,name,metadata) values('passport-documents',foreign_path,'{"mimetype":"application/pdf","size":20}');
 perform set_config('request.jwt.claim.sub',u::text,true);perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into storage.objects(bucket_id,name,metadata) values('passport-documents',own_path,'{"mimetype":"application/pdf","size":20}') returning id into object_id;
 select count(*) into n from storage.objects where id=object_id;if n<>1 then raise exception 'Own document unavailable';end if;
 select count(*) into n from storage.objects where name=foreign_path;if n<>0 then raise exception 'Foreign document leaked';end if;
 blocked:=false;begin insert into storage.objects(bucket_id,name) values('passport-documents',b::text||'/'||db::text||'/00000000-0000-4000-8000-000000000003--Other.pdf');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Foreign upload allowed';end if;
 for malformed in select unnest(array[
 a::text||'/'||db::text||'/00000000-0000-4000-8000-000000000004--Other.pdf',
 a::text||'/'||da::text||'/00000000-0000-4000-8000-000000000004--unsafe.html',
 a::text||'/'||da::text||'/00000000-0000-4000-8000-000000000004/..--QA.pdf',
 a::text||'/00000000-0000-4000-8000-000000000009/00000000-0000-4000-8000-000000000004--QA.pdf'
 ]) loop
  blocked:=false;begin insert into storage.objects(bucket_id,name) values('passport-documents',malformed);exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Invalid property/path allowed';end if;
 end loop;
 update storage.objects set name=foreign_path||'.pdf' where id=object_id;get diagnostics n=row_count;if n<>0 then raise exception 'Document mutation allowed';end if;
 blocked:=false;begin delete from storage.objects where id=object_id;get diagnostics n=row_count;blocked:=n=0;exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Document removal allowed';end if;
 execute 'reset role';insert into document_results values('Pro own upload/read; foreign and malformed/property mismatch denied; immutable records','PASS');
 for state in select * from (values('investor','active'),('free','not_connected'),('pro','past_due'),('pro','canceled'))s(plan,status) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=a;
  execute 'set local role authenticated';
  select count(*) into n from storage.objects where id=object_id;if n<>0 then raise exception 'Non-Pro document read allowed';end if;
  blocked:=false;begin insert into storage.objects(bucket_id,name) values('passport-documents',a::text||'/'||da::text||'/00000000-0000-4000-8000-000000000005--Denied.pdf');exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Non-Pro upload allowed';end if;
  execute 'reset role';
 end loop;
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id=a;
 update public.company_members set role='viewer' where company_id=a and user_id=u;
 execute 'set local role authenticated';
 select count(*) into n from storage.objects where id=object_id;if n<>1 then raise exception 'Reactivated Pro viewer cannot read retained document';end if;
 blocked:=false;begin insert into storage.objects(bucket_id,name) values('passport-documents',a::text||'/'||da::text||'/00000000-0000-4000-8000-000000000006--Denied.pdf');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Viewer upload allowed';end if;
 execute 'reset role';insert into document_results values('Free/Investor/inactive denial; reactivation retention; Pro viewer read-only','PASS');
 -- Reverse direction: normal role B cannot read A and can read its own object.
 perform set_config('request.jwt.claim.sub',v::text,true);perform set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into n from storage.objects where name=own_path;if n<>0 then raise exception 'Reverse foreign document leaked';end if;
 select count(*) into n from storage.objects where name=foreign_path;if n<>1 then raise exception 'Company B own document unavailable';end if;
 blocked:=false;begin insert into storage.objects(bucket_id,name) values('passport-documents',a::text||'/'||da::text||'/00000000-0000-4000-8000-000000000007--Denied.pdf');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Reverse foreign upload allowed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 blocked:=false;begin select count(*) into n from storage.objects where bucket_id='passport-documents';blocked:=n=0;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous document read allowed';end if;
 blocked:=false;begin insert into storage.objects(bucket_id,name) values('passport-documents',own_path||'.pdf');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous upload allowed';end if;
 execute 'reset role';insert into document_results values('Reverse company isolation and anonymous read/upload denial','PASS');
end $test$;
select * from document_results;
rollback;
