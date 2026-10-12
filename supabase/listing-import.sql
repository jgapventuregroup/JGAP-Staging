-- Company-scoped, atomic listing import using the existing JGAP deal creator.
create or replace function public.create_company_deal_from_listing(
  p_company_id uuid,p_address text,p_asking_price numeric,p_offer_price numeric,
  p_monthly_rent numeric,p_monthly_expenses numeric,p_property_type text default 'unknown',
  p_units integer default null,p_source_label text default 'Supplied listing',p_listing_id text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare deal_id uuid; normalized_address text:=pg_catalog.btrim(p_address);
begin
  if (select auth.uid()) is null or not public.is_company_member(p_company_id) then raise exception 'Company editing is not authorized'; end if;
  if not exists(select 1 from public.company_members m where m.company_id=p_company_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','editor')) then raise exception 'Company editing is not authorized'; end if;
  if normalized_address is null or pg_catalog.length(normalized_address)<2 or pg_catalog.length(normalized_address)>150 then raise exception 'Property address must be 2 to 150 characters'; end if;
  if p_listing_id is null or pg_catalog.length(pg_catalog.btrim(p_listing_id))<1 or pg_catalog.length(p_listing_id)>200 then raise exception 'Listing ID is required'; end if;
  if p_source_label is null or pg_catalog.length(p_source_label)>100 then raise exception 'Source label must be at most 100 characters'; end if;
  if p_units is not null and (p_units<1 or p_units>100000) then raise exception 'Unit count must be a positive whole number'; end if;
  if p_property_type is null or pg_catalog.length(pg_catalog.btrim(p_property_type))<1 or pg_catalog.length(p_property_type)>80 then raise exception 'Property type is invalid'; end if;
  if p_asking_price is null or p_offer_price is null or p_monthly_rent is null or p_monthly_expenses is null
    or p_asking_price<0 or p_offer_price<0 or p_monthly_rent<0 or p_monthly_expenses<0
    or p_asking_price>1e12 or p_offer_price>1e12 or p_monthly_rent>1e12 or p_monthly_expenses>1e12
    or p_asking_price::text in ('NaN','Infinity','-Infinity') or p_offer_price::text in ('NaN','Infinity','-Infinity')
    or p_monthly_rent::text in ('NaN','Infinity','-Infinity') or p_monthly_expenses::text in ('NaN','Infinity','-Infinity') then raise exception 'Verify nonnegative asking price, offer, rent and expenses'; end if;
  -- Serialize duplicate-address checks without granting company-update access.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_company_id::text||':'||pg_catalog.lower(normalized_address),0));
  select d.id into deal_id from public.deals d where d.company_id=p_company_id
    and pg_catalog.lower(pg_catalog.btrim(coalesce(nullif(d.property_address,''),d.name)))=pg_catalog.lower(normalized_address) limit 1;
  if deal_id is not null then return pg_catalog.jsonb_build_object('id',deal_id,'duplicate',true); end if;
  deal_id:=public.create_company_deal_with_offer(p_company_id=>p_company_id,p_name=>normalized_address,
    p_property_type=>pg_catalog.btrim(p_property_type),p_purchase_price=>p_offer_price,
    p_asking_price=>p_asking_price,p_target_offer_price=>p_offer_price,p_property_address=>normalized_address,
    p_monthly_rent=>p_monthly_rent,p_monthly_operating_expenses=>p_monthly_expenses,
    p_notes=>'Imported from '||p_source_label||'; listing ID '||p_listing_id||'. Provider figures require verification.');
  update public.deals set units=p_units where id=deal_id and company_id=p_company_id;
  if not found then raise exception 'Imported property details could not be saved'; end if;
  return pg_catalog.jsonb_build_object('id',deal_id,'saved',true);
end $$;
revoke all on function public.create_company_deal_from_listing(uuid,text,numeric,numeric,numeric,numeric,text,integer,text,text) from public,anon;
grant execute on function public.create_company_deal_from_listing(uuid,text,numeric,numeric,numeric,numeric,text,integer,text,text) to authenticated;
