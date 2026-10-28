-- Add individual Pro dashboard box geometry; retain legacy preferences and APIs.
begin;
create function public.valid_dashboard_grid(p_layout jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb; seen text[]:=array[]::text[]; visible_count integer:=0; k text;
begin
 if p_layout is null or jsonb_typeof(p_layout)<>'array' or jsonb_array_length(p_layout)<>5 then return false;end if;
 for item in select value from jsonb_array_elements(p_layout) loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>6 or not item ?& array['id','x','y','w','h','hidden'] then return false;end if;
  if jsonb_typeof(item->'id')<>'string' or not (item->>'id'=any(array['analyzer','properties','metrics','recent_properties','follow_ups'])) or item->>'id'=any(seen) or jsonb_typeof(item->'hidden')<>'boolean' then return false;end if;
  seen:=array_append(seen,item->>'id');
  foreach k in array array['x','y','w','h'] loop
   if jsonb_typeof(item->k)<>'number' or (item->>k)::numeric<>trunc((item->>k)::numeric) then return false;end if;
  end loop;
  if (item->>'x')::numeric<0 or (item->>'y')::numeric<0 or (item->>'y')::numeric>120 or (item->>'w')::numeric<3 or (item->>'w')::numeric>12 or (item->>'x')::numeric+(item->>'w')::numeric>12 or (item->>'h')::numeric<1 or (item->>'h')::numeric>48 then return false;end if;
  if not (item->>'hidden')::boolean then visible_count:=visible_count+1;end if;
 end loop;
 return visible_count>0;
exception when others then return false;
end $$;
revoke all on function public.valid_dashboard_grid(jsonb) from public,anon;
grant execute on function public.valid_dashboard_grid(jsonb) to authenticated,service_role;
alter table public.dashboard_preferences add column grid_layout jsonb;
alter table public.dashboard_preferences add constraint dashboard_grid_valid check(grid_layout is null or public.valid_dashboard_grid(grid_layout));
grant update(grid_layout) on public.dashboard_preferences to authenticated;
create function public.get_dashboard_grid(p_company_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro dashboard access required' using errcode='42501';end if;
 select jsonb_build_object('company_id',company_id,'user_id',user_id,'version',2,'layout',grid_layout,'widget_order',widget_order,'hidden_widgets',hidden_widgets,'updated_at',updated_at) into result from public.dashboard_preferences where company_id=p_company_id and user_id=(select auth.uid());
 return coalesce(result,jsonb_build_object('company_id',p_company_id,'user_id',(select auth.uid()),'version',2,'layout',null,'widget_order',array['tools','metrics','recent_properties','follow_ups'],'hidden_widgets',array[]::text[],'updated_at',null));
end $$;
create function public.save_dashboard_grid(p_company_id uuid,p_layout jsonb,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro dashboard access required' using errcode='42501';end if;
 if not public.valid_dashboard_grid(p_layout) then raise exception 'Invalid dashboard boxes. Keep at least one visible.' using errcode='22023';end if;
 insert into public.dashboard_preferences(company_id,user_id,grid_layout) select p_company_id,(select auth.uid()),p_layout
 where p_expected_updated_at is null or exists(select 1 from public.dashboard_preferences where company_id=p_company_id and user_id=(select auth.uid()))
 on conflict(company_id,user_id) do update set grid_layout=excluded.grid_layout
 where dashboard_preferences.updated_at is not distinct from p_expected_updated_at;
 if not found then raise exception 'Dashboard changed in another session. Reload saved layout.' using errcode='40001';end if;
 return public.get_dashboard_grid(p_company_id);
end $$;
revoke all on function public.get_dashboard_grid(uuid),public.save_dashboard_grid(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.get_dashboard_grid(uuid),public.save_dashboard_grid(uuid,jsonb,timestamptz) to authenticated;
commit;
