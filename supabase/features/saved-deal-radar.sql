-- Later-baseline add-on. Read-only saved-deal review; no external discovery or writes.
begin;
create or replace function public.get_saved_deal_radar(p_company_id uuid,p_as_of date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare rows jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro access required' using errcode='42501';end if;
 if p_as_of is null or p_as_of<'1900-01-01'::date or p_as_of>'2200-12-31'::date then raise exception 'Choose a valid review date' using errcode='22023';end if;
 if (select count(*) from public.deals where company_id=p_company_id)>10000 then raise exception 'Saved-deal review exceeds 10000 properties; narrow the portfolio before reviewing' using errcode='54000';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.follow_up_date nulls last,r.name,r.id),'[]'::jsonb) into rows from (
  select d.id,d.company_id,d.name,d.property_address as address,d.status,d.property_type,d.follow_up_date,
   d.follow_up_date is not null and d.follow_up_date<=p_as_of as follow_up_due,
   case when d.asking_price>0 and d.asking_price<=1e12 then round(d.asking_price,2)::text end as asking_price,
   case when d.target_offer_price>0 and d.target_offer_price<=1e12 then round(d.target_offer_price,2)::text end as target_offer_price,
   case when d.asking_price>0 and d.asking_price<=1e12 and d.target_offer_price>0 and d.target_offer_price<=1e12 then (round(d.asking_price,2)-round(d.target_offer_price,2))::text end as asking_offer_gap,
   array_remove(array[
    case when d.asking_price is null or not(d.asking_price>0 and d.asking_price<=1e12) then 'asking_price' end,
    case when d.target_offer_price is null or not(d.target_offer_price>0 and d.target_offer_price<=1e12) then 'target_offer_price' end,
    case when d.monthly_rent is null or not(d.monthly_rent>0 and d.monthly_rent<=1e12) then 'monthly_rent' end,
    case when d.monthly_operating_expenses is null or not(d.monthly_operating_expenses>0 and d.monthly_operating_expenses<=1e12) then 'operating_expenses' end,
    case when d.units is null or d.units<1 then 'units' end
   ],null) as review_fields
  from public.deals d where d.company_id=p_company_id
 ) r;
 return jsonb_build_object('company_id',p_company_id,'as_of',p_as_of,'rows',rows);
end $$;
revoke all on function public.get_saved_deal_radar(uuid,date) from public,anon;
grant execute on function public.get_saved_deal_radar(uuid,date) to authenticated;
commit;
