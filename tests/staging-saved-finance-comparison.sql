-- STAGING ONLY. SQL-role evidence; not the original real-session Passport editor gate.
-- Every fictional company, transaction and subscription change rolls back.
begin;
create temporary table comparison_results(check_name text,outcome text);
do $test$
declare users uuid[];companies uuid[];deal_ids uuid[];fixture uuid;r jsonb;e jsonb;side integer;other integer;blocked boolean;state record;
begin
 select array_agg(user_id) into users from (select distinct user_id from public.company_members limit 2) u;
 if cardinality(users)<>2 then raise exception 'Two staging users required';end if;
 for side in 1..2 loop
  insert into public.companies(name) values('V1 rollback saved comparison fixture '||side) returning id into fixture;companies[side]:=fixture;
  insert into public.company_members(company_id,user_id,role) values(companies[side],users[side],'owner');
  insert into public.deals(company_id,name,purchase_price,target_offer_price,monthly_rent,other_monthly_income,vacancy_rate,monthly_operating_expenses,down_payment,interest_rate,loan_term_years)
   values(companies[side],'Fictional comparison property',200000,180000,1800,100,5,600,20,7,30) returning id into fixture;deal_ids[side]:=fixture;
  update public.company_subscriptions set plan='pro',billing_status='active' where company_id=companies[side];
 end loop;
 for side in 1..2 loop
  other:=3-side;
  perform set_config('request.jwt.claim.sub',users[side]::text,true);perform set_config('request.jwt.claims',json_build_object('sub',users[side],'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.property_ledger_entries(company_id,deal_id,entry_date,entry_type,category,amount) values(companies[side],deal_ids[side],'2026-10-01','income','Rent',1700.01);
  insert into public.property_ledger_entries(company_id,deal_id,entry_date,entry_type,category,amount) values(companies[side],deal_ids[side],'2026-10-31','expense','Recorded costs',1500.02);
  insert into public.property_ledger_entries(company_id,deal_id,entry_date,entry_type,category,amount) values(companies[side],deal_ids[side],'2026-09-30','income','Other month',99);
  r:=public.get_advanced_finance_report(companies[side],'2026-10',deal_ids[side]);e:=r->'estimate';
  if (e->>'status') is distinct from 'ready' or (e->>'basis') is distinct from 'current_saved_assumptions' or (e->>'monthly_income')::numeric is distinct from 1810 or (e->>'operating_expenses')::numeric is distinct from 600 or (e->>'mortgage_payment')::numeric is distinct from 958.04 or (e->>'total_outflows')::numeric is distinct from 1558.04 or (e->>'net')::numeric is distinct from 251.96 then raise exception 'Saved mortgage/vacancy/offer comparison incorrect: %',e;end if;
  if (r#>>'{totals,income}')::numeric is distinct from 1700.01 or (r#>>'{totals,expenses}')::numeric is distinct from 1500.02 or (r#>>'{totals,net}')::numeric is distinct from 199.99 or (r#>>'{totals,count}')::int is distinct from 2 then raise exception 'Recorded month totals changed';end if;
  r:=public.get_advanced_finance_report(companies[side],'2026-10');if r#>>'{estimate,status}'<>'property_required' then raise exception 'Portfolio estimate must not be fabricated';end if;
  r:=public.get_advanced_finance_report(companies[side],'2026-10',deal_ids[side],false,null);if r#>>'{estimate,status}'<>'unfiltered_required' then raise exception 'Partial reconciliation scope compared';end if;
  r:=public.get_advanced_finance_report(companies[side],'2026-10',deal_ids[side],null,'review');if r#>>'{estimate,status}'<>'unfiltered_required' then raise exception 'Partial tax scope compared';end if;
  r:=public.get_advanced_finance_report(companies[side],'2026-11',deal_ids[side]);if (r#>>'{totals,count}')::int is distinct from 0 then raise exception 'Empty month fabricated entries';end if;
  blocked:=false;begin perform public.get_advanced_finance_report(companies[other],'2026-10',deal_ids[other]);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign company report allowed';end if;
  blocked:=false;begin perform public.get_advanced_finance_report(companies[side],'2026-10',deal_ids[other]);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Foreign property allowed';end if;
  execute 'reset role';insert into comparison_results values('Company '||side||': exact estimate/month/filter bounds and foreign isolation','PASS');
 end loop;
 perform set_config('request.jwt.claim.sub',users[1]::text,true);perform set_config('request.jwt.claims',json_build_object('sub',users[1],'role','authenticated')::text,true);
 update public.deals set interest_rate=0 where id=deal_ids[1];execute 'set local role authenticated';
 r:=public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);if (r#>>'{estimate,mortgage_payment}')::numeric is distinct from 400 then raise exception 'Zero-rate calculation incorrect';end if;
 execute 'reset role';update public.deals set down_payment=100 where id=deal_ids[1];execute 'set local role authenticated';
 r:=public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);if (r#>>'{estimate,mortgage_payment}')::numeric is distinct from 0 or (r#>>'{estimate,net}')::numeric is distinct from 1210 then raise exception 'All-cash calculation incorrect';end if;
 execute 'reset role';update public.deals set target_offer_price=null,down_payment=20 where id=deal_ids[1];execute 'set local role authenticated';
 r:=public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);if (r#>>'{estimate,mortgage_payment}')::numeric is distinct from 444.44 then raise exception 'Purchase-price fallback incorrect';end if;
 execute 'reset role';update public.deals set loan_term_years=0 where id=deal_ids[1];execute 'set local role authenticated';
 r:=public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);if r#>>'{estimate,status}'<>'incomplete' or not (r#>'{estimate,invalid_fields}')?'loan_term_years' then raise exception 'Invalid assumptions fabricated an estimate';end if;
 execute 'reset role';update public.deals set loan_term_years=30,monthly_rent='NaN' where id=deal_ids[1];execute 'set local role authenticated';
 r:=public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);if r#>>'{estimate,status}'<>'incomplete' or not (r#>'{estimate,invalid_fields}')?'monthly_rent' then raise exception 'Nonfinite estimate accepted';end if;
 execute 'reset role';update public.deals set monthly_rent=1800 where id=deal_ids[1];insert into comparison_results values('Zero-rate, all-cash, price fallback and invalid/nonfinite assumptions','PASS');
 update public.company_members set role='viewer' where company_id=companies[1] and user_id=users[1];execute 'set local role authenticated';
 r:=public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);if r#>>'{estimate,status}'<>'ready' then raise exception 'Pro viewer read failed';end if;
 execute 'reset role';insert into comparison_results values('Pro viewer may read comparison','PASS');
 for state in select * from (values('free','not_connected'),('investor','active'),('pro','past_due'),('pro','canceled')) s(plan,status) loop
  update public.company_subscriptions set plan=state.plan,billing_status=state.status where company_id=companies[1];execute 'set local role authenticated';
  blocked:=false;begin perform public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Plan/status bypass: %/%',state.plan,state.status;end if;
  execute 'reset role';
 end loop;
 update public.company_subscriptions set plan='pro',billing_status='active' where company_id=companies[1];execute 'set local role authenticated';
 r:=public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);if (r#>>'{totals,count}')::int is distinct from 2 then raise exception 'Reactivation lost records';end if;
 execute 'reset role';insert into comparison_results values('Free/Investor/inactive denied; Pro reactivation retains data','PASS');
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
 blocked:=false;begin perform public.get_advanced_finance_report(companies[1],'2026-10',deal_ids[1]);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous report allowed';end if;
 execute 'reset role';insert into comparison_results values('Anonymous comparison/report denied','PASS');
end $test$;
select * from comparison_results;
rollback;
