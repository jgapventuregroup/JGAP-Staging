-- In-app, computed due alerts with personal review state. No delivery/email jobs.
begin;
create function public.current_in_app_alert(p_company_id uuid,p_type text,p_source_id uuid,p_deal_id uuid,p_due_date date)
returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(public.can_access_advanced_finance(p_company_id) and p_due_date is not null and p_due_date<=current_date+1 and
 case p_type
 when 'follow_up' then exists(select 1 from public.deals d where d.company_id=p_company_id and d.id=p_source_id and d.id=p_deal_id and d.follow_up_date=p_due_date)
 when 'task' then exists(select 1 from public.property_tasks t where t.company_id=p_company_id and t.id=p_source_id and t.deal_id=p_deal_id and t.status='open' and t.due_on=p_due_date)
 when 'maintenance' then exists(select 1 from public.property_maintenance m where m.company_id=p_company_id and m.id=p_source_id and m.deal_id=p_deal_id and m.status in('planned','open') and m.due_date=p_due_date)
 when 'equipment' then exists(select 1 from public.property_assets a where a.company_id=p_company_id and a.id=p_source_id and a.deal_id=p_deal_id and a.next_service_date=p_due_date and not exists(select 1 from public.property_asset_services s where s.company_id=a.company_id and s.deal_id=a.deal_id and s.asset_id=a.id and s.next_service_date=a.next_service_date))
 when 'service' then exists(select 1 from public.property_asset_services s where s.company_id=p_company_id and s.id=p_source_id and s.deal_id=p_deal_id and s.next_service_date=p_due_date)
 else false end,false);
$$;
revoke all on function public.current_in_app_alert(uuid,text,uuid,uuid,date) from public,anon;
grant execute on function public.current_in_app_alert(uuid,text,uuid,uuid,date) to authenticated,service_role;
create table public.in_app_alert_reviews(
 company_id uuid not null,
 user_id uuid not null default auth.uid(),
 source_type text not null check(source_type in('follow_up','task','maintenance','service','equipment')),
 source_id uuid not null,
 deal_id uuid not null,
 due_date date not null,
 is_reviewed boolean not null default true,
 reviewed_at timestamptz,
 primary key(company_id,user_id,source_type,source_id,due_date),
 foreign key(company_id,user_id) references public.company_members(company_id,user_id) on delete cascade,
 foreign key(company_id,deal_id) references public.deals(company_id,id) on delete cascade
);
alter table public.in_app_alert_reviews enable row level security;
revoke all on public.in_app_alert_reviews from public,anon,authenticated;
grant select,insert on public.in_app_alert_reviews to authenticated;
grant update(is_reviewed) on public.in_app_alert_reviews to authenticated;
grant select,insert,update on public.in_app_alert_reviews to service_role;
create policy in_app_alert_reviews_read on public.in_app_alert_reviews for select to authenticated
 using(user_id=(select auth.uid()) and public.can_access_advanced_finance(company_id));
create policy in_app_alert_reviews_insert on public.in_app_alert_reviews for insert to authenticated
 with check(user_id=(select auth.uid()) and public.current_in_app_alert(company_id,source_type,source_id,deal_id,due_date));
create policy in_app_alert_reviews_update on public.in_app_alert_reviews for update to authenticated
 using(user_id=(select auth.uid()) and public.can_access_advanced_finance(company_id))
 with check(user_id=(select auth.uid()) and public.current_in_app_alert(company_id,source_type,source_id,deal_id,due_date));
create function jgap_private.stamp_in_app_alert_review()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.company_id,new.user_id,new.source_type,new.source_id,new.deal_id,new.due_date) is distinct from (old.company_id,old.user_id,old.source_type,old.source_id,old.deal_id,old.due_date) then raise exception 'Alert review identity cannot change' using errcode='42501';end if;
 new.reviewed_at:=case when new.is_reviewed then clock_timestamp() else null end;return new;
end $$;
revoke all on function jgap_private.stamp_in_app_alert_review() from public,anon,authenticated;
create trigger stamp_in_app_alert_review before insert or update on public.in_app_alert_reviews
 for each row execute function jgap_private.stamp_in_app_alert_review();
create function public.get_in_app_alerts(p_company_id uuid,p_as_of date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare rows jsonb;n integer;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro alerts access required' using errcode='42501';end if;
 if p_as_of is null or p_as_of<'1900-01-01'::date or p_as_of>current_date+1 then raise exception 'Choose a valid local review date' using errcode='22023';end if;
 with sources as(
  select 'follow_up'::text as source_type,d.id as source_id,d.id as deal_id,d.name as property_name,'Property follow-up'::text as title,d.follow_up_date as due_date from public.deals d where d.company_id=p_company_id and d.follow_up_date<=p_as_of
  union all select 'task',t.id,t.deal_id,d.name,t.title,t.due_on from public.property_tasks t join public.deals d on d.company_id=t.company_id and d.id=t.deal_id where t.company_id=p_company_id and t.status='open' and t.due_on<=p_as_of
  union all select 'maintenance',m.id,m.deal_id,d.name,m.title,m.due_date from public.property_maintenance m join public.deals d on d.company_id=m.company_id and d.id=m.deal_id where m.company_id=p_company_id and m.status in('planned','open') and m.due_date<=p_as_of
  union all select 'equipment',a.id,a.deal_id,d.name,'Equipment service: '||a.name,a.next_service_date from public.property_assets a join public.deals d on d.company_id=a.company_id and d.id=a.deal_id where a.company_id=p_company_id and a.next_service_date<=p_as_of and not exists(select 1 from public.property_asset_services s where s.company_id=a.company_id and s.deal_id=a.deal_id and s.asset_id=a.id and s.next_service_date=a.next_service_date)
  union all select 'service',s.id,s.deal_id,d.name,s.service_name,s.next_service_date from public.property_asset_services s join public.deals d on d.company_id=s.company_id and d.id=s.deal_id where s.company_id=p_company_id and s.next_service_date<=p_as_of
 ), limited as(select * from sources order by due_date,source_type,source_id limit 10001),
 result as(
  select p_company_id as company_id,s.*,coalesce(r.is_reviewed,false) as is_reviewed,r.reviewed_at from limited s left join public.in_app_alert_reviews r
  on r.company_id=p_company_id and r.user_id=(select auth.uid()) and r.source_type=s.source_type and r.source_id=s.source_id and r.due_date=s.due_date
 )
 select coalesce(jsonb_agg(to_jsonb(result) order by due_date,source_type,source_id),'[]'::jsonb),count(*)::integer into rows,n from result;
 if n>10000 then raise exception 'More than 10000 due alerts; complete or reschedule source records before reviewing' using errcode='54000';end if;
 return jsonb_build_object('company_id',p_company_id,'as_of',p_as_of,'items',rows,'total_count',n,'unreviewed_count',(select count(*) from jsonb_array_elements(rows) v where (v->>'is_reviewed')::boolean=false));
end $$;
create function public.set_in_app_alert_review(p_company_id uuid,p_type text,p_source_id uuid,p_deal_id uuid,p_due_date date,p_reviewed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro alerts access required' using errcode='42501';end if;
 if p_reviewed is null or not public.current_in_app_alert(p_company_id,p_type,p_source_id,p_deal_id,p_due_date) then raise exception 'Alert changed or is no longer active; reload alerts' using errcode='22023';end if;
 insert into public.in_app_alert_reviews(company_id,user_id,source_type,source_id,deal_id,due_date,is_reviewed)
 values(p_company_id,(select auth.uid()),p_type,p_source_id,p_deal_id,p_due_date,p_reviewed)
 on conflict(company_id,user_id,source_type,source_id,due_date) do update set is_reviewed=excluded.is_reviewed
 returning to_jsonb(in_app_alert_reviews) into result;
 return result;
end $$;
revoke all on function public.get_in_app_alerts(uuid,date),public.set_in_app_alert_review(uuid,text,uuid,uuid,date,boolean) from public,anon;
grant execute on function public.get_in_app_alerts(uuid,date),public.set_in_app_alert_review(uuid,text,uuid,uuid,date,boolean) to authenticated;
commit;
