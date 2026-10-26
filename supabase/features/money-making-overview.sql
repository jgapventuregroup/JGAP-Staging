-- Later-baseline add-on. Current saved values and recorded-month activity; read only.
begin;
create or replace function public.get_money_making_overview(p_company_id uuid,p_month text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare groups jsonb;recorded jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro access required' using errcode='42501';end if;
 -- Existing report validates month and rechecks authorization under the caller's role.
 recorded:=public.get_advanced_finance_report(p_company_id,p_month,null,null,null);
 select jsonb_object_agg(scope,summary) into groups from (
  select g.scope,jsonb_build_object('count',count(d.id),'value_count',count(d.v),'value_total',sum(d.v)::text,'debt_count',count(d.b),'debt_total',sum(d.b)::text,'equity_count',count(*) filter(where d.v is not null and d.b is not null),'paired_equity',sum(d.v-d.b) filter(where d.v is not null and d.b is not null)::text) as summary
  from (values('all_saved'),('closed_stage')) g(scope)
  left join (
   select id,status,case when passport_current_value>=0 and passport_current_value<=1e12 then round(passport_current_value,2) end v,
    case when passport_mortgage_balance>=0 and passport_mortgage_balance<=1e12 then round(passport_mortgage_balance,2) end b
   from public.deals where company_id=p_company_id
  ) d on g.scope='all_saved' or d.status='closed'
  group by g.scope
 ) s;
 return jsonb_build_object('company_id',p_company_id,'month',p_month,'groups',groups,'recorded',recorded);
end $$;
revoke all on function public.get_money_making_overview(uuid,text) from public,anon;
grant execute on function public.get_money_making_overview(uuid,text) to authenticated;
commit;
