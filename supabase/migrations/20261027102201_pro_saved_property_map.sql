-- Saved-property map add-on; no external geocoder or map requests in SQL.
begin;
create table public.property_map_locations(
 company_id uuid not null,
 deal_id uuid not null,
 latitude numeric(9,6),longitude numeric(10,6),
 verified_by uuid not null default auth.uid(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(company_id,deal_id),
 foreign key(company_id,deal_id) references public.deals(company_id,id) on delete cascade,
 check((latitude is null)=(longitude is null)),
 check(latitude is null or (latitude between -85 and 85 and longitude between -180 and 180))
);
alter table public.property_map_locations enable row level security;
revoke all on public.property_map_locations from public,anon,authenticated;
grant select,insert on public.property_map_locations to authenticated;
grant update(latitude,longitude) on public.property_map_locations to authenticated;
grant select,insert,update on public.property_map_locations to service_role;
create policy map_locations_read on public.property_map_locations for select to authenticated
 using(public.can_access_advanced_finance(company_id));
create policy map_locations_insert on public.property_map_locations for insert to authenticated
 with check(public.can_access_advanced_finance(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));
create policy map_locations_update on public.property_map_locations for update to authenticated
 using(public.can_access_advanced_finance(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'))
 with check(public.can_access_advanced_finance(company_id) and jgap_private.member_role(company_id) in ('owner','admin','editor'));
create function jgap_private.stamp_map_location()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.company_id is distinct from old.company_id or new.deal_id is distinct from old.deal_id) then raise exception 'Map property identity cannot change' using errcode='42501';end if;
 new.verified_by:=(select auth.uid());new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function jgap_private.stamp_map_location() from public,anon,authenticated;
create trigger stamp_map_location before insert or update on public.property_map_locations
 for each row execute function jgap_private.stamp_map_location();
create function public.get_market_map(p_company_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare rows jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro map access required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'company_id',d.company_id,'name',d.name,'address',d.property_address,'status',d.status,'latitude',l.latitude,'longitude',l.longitude,'updated_at',l.updated_at) order by d.name,d.id),'[]') into rows
 from public.deals d left join public.property_map_locations l on l.company_id=d.company_id and l.deal_id=d.id where d.company_id=p_company_id;
 return jsonb_build_object('company_id',p_company_id,'rows',rows);
end $$;
create function public.save_market_map_location(p_company_id uuid,p_deal_id uuid,p_latitude numeric,p_longitude numeric)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) or not coalesce(jgap_private.member_role(p_company_id) in ('owner','admin','editor'),false) then raise exception 'Active Pro editing role required' using errcode='42501';end if;
 if not exists(select 1 from public.deals where company_id=p_company_id and id=p_deal_id) then raise exception 'Saved property unavailable' using errcode='42501';end if;
 if (p_latitude is null)<>(p_longitude is null) or (p_latitude is not null and not(p_latitude between -85 and 85 and p_longitude between -180 and 180)) then raise exception 'Enter both verified coordinates within supported bounds' using errcode='22023';end if;
 insert into public.property_map_locations(company_id,deal_id,latitude,longitude) values(p_company_id,p_deal_id,p_latitude,p_longitude)
 on conflict(company_id,deal_id) do update set latitude=excluded.latitude,longitude=excluded.longitude
 returning jsonb_build_object('company_id',company_id,'deal_id',deal_id,'latitude',latitude,'longitude',longitude,'verified_by',verified_by,'updated_at',updated_at) into result;return result;
end $$;
revoke all on function public.get_market_map(uuid),public.save_market_map_location(uuid,uuid,numeric,numeric) from public,anon;
grant execute on function public.get_market_map(uuid),public.save_market_map_location(uuid,uuid,numeric,numeric) to authenticated;
commit;
