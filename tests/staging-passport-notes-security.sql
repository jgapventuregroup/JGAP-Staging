-- STAGING ONLY: synthetic fixtures and role changes always roll back.
-- Database-role checks are not the original Passport real-session editor gate.
begin;
create temporary table passport_notes_results(check_name text,outcome text);
do $test$
declare u uuid;c uuid;other_c uuid;d uuid;other_d uuid;r public.deals;blocked boolean;
begin
 select user_id into u from public.company_members limit 1;
 if u is null then raise exception 'Staging member required';end if;
 insert into public.companies(name) values('V1 rollback notes fixture') returning id into c;
 insert into public.companies(name) values('V1 rollback foreign notes fixture') returning id into other_c;
 insert into public.company_members(company_id,user_id,role) values(c,u,'owner');
 insert into public.deals(company_id,name,notes) values(c,'V1 fictional notes property','Before') returning id into d;
 insert into public.deals(company_id,name,notes) values(other_c,'V1 fictional foreign notes property','Foreign untouched') returning id into other_d;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 r:=public.update_company_deal(c,d,'{"notes":"Verified fixture notes"}');
 if r.id<>d or r.company_id<>c or r.notes<>'Verified fixture notes' then raise exception 'Own notes save mismatch';end if;
 if not exists(select 1 from public.deals where id=d and company_id=c and notes='Verified fixture notes') then raise exception 'Own notes persistence failed';end if;
 r:=public.update_company_deal(c,d,'{"notes":null}');if r.notes is not null then raise exception 'Notes clear failed';end if;
 execute 'reset role';insert into passport_notes_results values('Own company notes save, persistence and clear','PASS');
 execute 'set local role authenticated';
 blocked:=false;begin perform public.update_company_deal(other_c,other_d,'{"notes":"Forbidden"}');exception when raise_exception then if sqlerrm<>'Not authorized for selected workspace' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Foreign company write allowed';end if;
 blocked:=false;begin perform public.update_company_deal(c,other_d,'{"notes":"Forbidden"}');exception when raise_exception then if sqlerrm<>'Deal not found in selected workspace' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Foreign property ID write allowed';end if;
 execute 'reset role';
 if not exists(select 1 from public.deals where id=other_d and notes='Foreign untouched') then raise exception 'Foreign notes changed';end if;
 insert into passport_notes_results values('Foreign company and mismatched property refused','PASS');
 update public.company_members set role='viewer' where company_id=c and user_id=u;
 execute 'set local role authenticated';
 blocked:=false;begin perform public.update_company_deal(c,d,'{"notes":"Forbidden viewer edit"}');exception when raise_exception then if sqlerrm<>'Workspace role cannot edit deals' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Viewer notes write allowed';end if;
 execute 'reset role';insert into passport_notes_results values('Read-only viewer refused','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 blocked:=false;begin perform public.update_company_deal(c,d,'{"notes":"Forbidden anonymous edit"}');exception when insufficient_privilege then blocked:=true;when raise_exception then if sqlerrm<>'Not authorized for selected workspace' then raise;end if;blocked:=true;end;
 if not blocked then raise exception 'Anonymous notes write allowed';end if;
 execute 'reset role';insert into passport_notes_results values('Anonymous refused','PASS');
end $test$;
select * from passport_notes_results;
rollback;
