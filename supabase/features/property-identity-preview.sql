-- Existing owner-preview authorization only; no plans, memberships or property rows change.
CREATE OR REPLACE FUNCTION public.protect_free_property_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_plan text; v_billing text;
begin
 if new.name is not distinct from old.name
 and new.property_address is not distinct from old.property_address
 and new.property_county is not distinct from old.property_county then
  return new;
 end if;
 select plan,billing_status into v_plan,v_billing
 from public.company_subscriptions where company_id=old.company_id;
 if v_plan in ('investor','pro') and v_billing='active' then return new; end if;
 -- Align the existing verified-owner preview with the editor; ordinary Free stays locked.
 if public.has_owner_preview_access(old.company_id) and exists (
  select 1 from public.company_members m where m.company_id=old.company_id
   and m.user_id=(select auth.uid()) and m.role='owner'
 ) then return new; end if;
 raise exception 'FREE_PROPERTY_IDENTITY_LOCKED: Saved property name and address cannot be replaced on Free. Financial fields remain editable.';
end;
$function$;

