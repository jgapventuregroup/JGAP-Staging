-- Per-user, per-workspace Pro layout. Apply once after the application baseline.
begin;
create function public.valid_dashboard_layout(p_order text[],p_hidden text[])
returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(array_ndims(p_order)=1 and array_lower(p_order,1)=1 and cardinality(p_order)=4
 and p_order @> array['tools','metrics','recent_properties','follow_ups']::text[]
 and p_order <@ array['tools','metrics','recent_properties','follow_ups']::text[]
 and array_position(p_order,null) is null and cardinality(p_hidden)<=3
 and (cardinality(p_hidden)=0 or (array_ndims(p_hidden)=1 and array_lower(p_hidden,1)=1))
 and p_hidden <@ array['tools','metrics','recent_properties','follow_ups']::text[]
 and cardinality(p_hidden)=(select count(distinct v) from unnest(p_hidden) v)
 and array_position(p_hidden,null) is null,false);
$$;
revoke all on function public.valid_dashboard_layout(text[],text[]) from public,anon;
grant execute on function public.valid_dashboard_layout(text[],text[]) to authenticated,service_role;
create table public.dashboard_preferences(
 company_id uuid not null,
 user_id uuid not null default auth.uid(),
 widget_order text[] not null default array['tools','metrics','recent_properties','follow_ups'],
 hidden_widgets text[] not null default array[]::text[],
 updated_at timestamptz not null default clock_timestamp(),
 primary key(company_id,user_id),
 foreign key(company_id,user_id) references public.company_members(company_id,user_id) on delete cascade,
 constraint dashboard_layout_valid check(public.valid_dashboard_layout(widget_order,hidden_widgets))
);
alter table public.dashboard_preferences enable row level security;
revoke all on public.dashboard_preferences from public,anon,authenticated;
grant select,insert on public.dashboard_preferences to authenticated;
grant update(widget_order,hidden_widgets) on public.dashboard_preferences to authenticated;
grant select,insert,update on public.dashboard_preferences to service_role;
create policy dashboard_preferences_read on public.dashboard_preferences for select to authenticated
 using(user_id=(select auth.uid()) and public.can_access_advanced_finance(company_id));
create policy dashboard_preferences_insert on public.dashboard_preferences for insert to authenticated
 with check(user_id=(select auth.uid()) and public.can_access_advanced_finance(company_id));
create policy dashboard_preferences_update on public.dashboard_preferences for update to authenticated
 using(user_id=(select auth.uid()) and public.can_access_advanced_finance(company_id))
 with check(user_id=(select auth.uid()) and public.can_access_advanced_finance(company_id));
create function jgap_private.stamp_dashboard_preferences()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.company_id is distinct from old.company_id or new.user_id is distinct from old.user_id) then raise exception 'Dashboard preference identity cannot change' using errcode='42501';end if;
 new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function jgap_private.stamp_dashboard_preferences() from public,anon,authenticated;
create trigger stamp_dashboard_preferences before insert or update on public.dashboard_preferences
 for each row execute function jgap_private.stamp_dashboard_preferences();
create function public.get_dashboard_preferences(p_company_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro dashboard access required' using errcode='42501';end if;
 select jsonb_build_object('company_id',company_id,'user_id',user_id,'version',1,'widget_order',widget_order,'hidden_widgets',hidden_widgets,'updated_at',updated_at) into result from public.dashboard_preferences where company_id=p_company_id and user_id=(select auth.uid());
 return coalesce(result,jsonb_build_object('company_id',p_company_id,'user_id',(select auth.uid()),'version',1,'widget_order',array['tools','metrics','recent_properties','follow_ups'],'hidden_widgets',array[]::text[],'updated_at',null));
end $$;
create function public.save_dashboard_preferences(p_company_id uuid,p_order text[],p_hidden text[])
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro dashboard access required' using errcode='42501';end if;
 if not public.valid_dashboard_layout(p_order,p_hidden) then raise exception 'Choose each dashboard section once and keep at least one visible' using errcode='22023';end if;
 insert into public.dashboard_preferences(company_id,user_id,widget_order,hidden_widgets) values(p_company_id,(select auth.uid()),p_order,p_hidden)
 on conflict(company_id,user_id) do update set widget_order=excluded.widget_order,hidden_widgets=excluded.hidden_widgets;
 return public.get_dashboard_preferences(p_company_id);
end $$;
revoke all on function public.get_dashboard_preferences(uuid),public.save_dashboard_preferences(uuid,text[],text[]) from public,anon;
grant execute on function public.get_dashboard_preferences(uuid),public.save_dashboard_preferences(uuid,text[],text[]) to authenticated;
commit;
