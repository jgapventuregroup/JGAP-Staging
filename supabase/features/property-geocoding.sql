-- Service-only cache and app-wide throttle for selected-property address lookup.
begin;
create table public.property_geocode_cache(
 company_id uuid not null,deal_id uuid not null,address_hash text not null check(length(address_hash)=64),
 status text not null check(status in ('matched','not_found','ambiguous')),
 latitude numeric(9,6),longitude numeric(10,6),matched_address text,updated_at timestamptz not null default clock_timestamp(),
 primary key(company_id,deal_id,address_hash),
 foreign key(company_id,deal_id) references public.deals(company_id,id) on delete cascade,
 check((status='matched' and latitude between -85 and 85 and longitude between -180 and 180 and latitude is not null and longitude is not null) or (status<>'matched' and latitude is null and longitude is null))
);
alter table public.property_geocode_cache enable row level security;
revoke all on public.property_geocode_cache from public,anon,authenticated;
grant select,insert,update on public.property_geocode_cache to service_role;
create table public.property_geocode_throttle(singleton boolean primary key default true check(singleton),available_at timestamptz not null,lease_token uuid);
insert into public.property_geocode_throttle values(true,'-infinity',null);
alter table public.property_geocode_throttle enable row level security;
revoke all on public.property_geocode_throttle from public,anon,authenticated;
grant select,update on public.property_geocode_throttle to service_role;
create function public.claim_property_geocode_slot() returns uuid language plpgsql security invoker set search_path='' as $$
declare token uuid:=pg_catalog.gen_random_uuid();
begin
 update public.property_geocode_throttle set available_at=clock_timestamp()+interval '30 seconds',lease_token=token
 where singleton=true and available_at<=clock_timestamp();
 if found then return token;end if;return null;
end $$;
create function public.release_property_geocode_slot(p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.property_geocode_throttle set available_at=clock_timestamp()+interval '1100 milliseconds',lease_token=null
 where singleton=true and lease_token=p_token;
 return found;
end $$;
revoke all on function public.claim_property_geocode_slot(),public.release_property_geocode_slot(uuid) from public,anon,authenticated;
grant execute on function public.claim_property_geocode_slot(),public.release_property_geocode_slot(uuid) to service_role;
commit;
