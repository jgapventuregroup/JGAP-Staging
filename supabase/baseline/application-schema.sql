-- The Key Ahead application schema baseline, captured 2026-10-24.
-- EMPTY application schemas only. Never apply over staging/production or replay old migrations after it.
-- Requires an existing Supabase platform/Auth installation; contains no auth/customer rows or secrets.
-- Staging owner preview deliberately returns false. No staging identity whitelist is transferred.
begin;
set local check_function_bodies=off;
do $empty_only$ begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','jgap_private') and c.relkind in ('r','p','S','v','m','f')
  and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')) then
  raise exception 'Baseline requires empty application schemas. Do not apply to an existing environment.';
 end if;
end $empty_only$;

CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";

CREATE SCHEMA IF NOT EXISTS "jgap_private";

ALTER SCHEMA "jgap_private" OWNER TO "postgres";

CREATE TABLE "public"."billing_webhook_events" (
  "event_id" text NOT NULL,
  "company_id" uuid NOT NULL,
  "event_created" bigint NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."billing_webhook_events" OWNER TO "postgres";

CREATE TABLE "public"."companies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."companies" OWNER TO "postgres";

CREATE TABLE "public"."company_invitations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "email" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."company_invitations" OWNER TO "postgres";

CREATE TABLE "public"."company_lifetime_deal_usage" (
  "company_id" uuid NOT NULL,
  "lifetime_created" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "public"."company_lifetime_deal_usage" OWNER TO "postgres";

CREATE TABLE "public"."company_members" (
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."company_members" OWNER TO "postgres";

CREATE TABLE "public"."company_subscriptions" (
  "company_id" uuid NOT NULL,
  "plan" text DEFAULT 'free'::text NOT NULL,
  "billing_status" text DEFAULT 'not_connected'::text NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_billing_event_created" bigint DEFAULT 0 NOT NULL
);

ALTER TABLE "public"."company_subscriptions" OWNER TO "postgres";

CREATE TABLE "public"."deals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "status" text DEFAULT 'lead'::text NOT NULL,
  "property_type" text DEFAULT 'single_family'::text NOT NULL,
  "purchase_price" numeric DEFAULT 0 NOT NULL,
  "down_payment" numeric DEFAULT 0 NOT NULL,
  "interest_rate" numeric DEFAULT 0 NOT NULL,
  "loan_term_years" integer DEFAULT 30 NOT NULL,
  "closing_costs" numeric DEFAULT 0 NOT NULL,
  "rehab_cost" numeric DEFAULT 0 NOT NULL,
  "monthly_rent" numeric DEFAULT 0 NOT NULL,
  "vacancy_rate" numeric DEFAULT 0 NOT NULL,
  "monthly_operating_expenses" numeric DEFAULT 0 NOT NULL,
  "other_monthly_income" numeric DEFAULT 0 NOT NULL,
  "notes" text,
  "asking_price" numeric,
  "target_offer_price" numeric,
  "offer_notes" text,
  "target_cap_rate" numeric,
  "target_cash_on_cash" numeric,
  "target_monthly_cash_flow" numeric,
  "target_dscr" numeric,
  "offer_earnest_money" numeric,
  "offer_due_diligence_days" integer,
  "offer_closing_days" integer,
  "offer_financing_type" text,
  "offer_contingencies" text,
  "property_address" text,
  "property_county" text,
  "seller_name" text,
  "offer_state" text,
  "offer_template" text,
  "units" integer,
  "arv" numeric,
  "holding_months" integer,
  "monthly_holding_costs" numeric,
  "selling_cost_percent" numeric,
  "financing_costs" numeric,
  "projected_sale_price" numeric,
  "loan_structure" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "follow_up_date" date,
  "passport_purchase_date" date,
  "passport_current_value" numeric,
  "passport_mortgage_balance" numeric
);

ALTER TABLE "public"."deals" OWNER TO "postgres";

CREATE TABLE "public"."free_eligibility_review_audit" (
  "id" bigint GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME "public"."free_eligibility_review_audit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE) NOT NULL,
  "user_id" uuid NOT NULL,
  "company_id" uuid,
  "old_status" text,
  "new_status" text NOT NULL,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_uid" uuid DEFAULT auth.uid()
);

ALTER TABLE "public"."free_eligibility_review_audit" OWNER TO "postgres";

CREATE TABLE "public"."free_membership_eligibility" (
  "user_id" uuid NOT NULL,
  "company_id" uuid,
  "status" text DEFAULT 'pending_review'::text NOT NULL,
  "verified_email_at" timestamp with time zone,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."free_membership_eligibility" OWNER TO "postgres";

CREATE TABLE "public"."lenders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "institution_name" text NOT NULL,
  "contact_name" text,
  "lender_type" text DEFAULT 'Bank'::text NOT NULL,
  "status" text DEFAULT 'Prospect'::text NOT NULL,
  "phone" text,
  "email" text,
  "website" text,
  "address" text,
  "loan_types" text,
  "minimum_loan_amount" numeric,
  "maximum_loan_amount" numeric,
  "typical_ltv" numeric,
  "typical_dscr" numeric,
  "last_contact_date" date,
  "next_follow_up_date" date,
  "rate_notes" text,
  "term_notes" text,
  "notes" text,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."lenders" OWNER TO "postgres";

CREATE TABLE "public"."property_asset_services" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "service_name" text NOT NULL,
  "frequency_value" integer NOT NULL,
  "frequency_unit" text,
  "last_service_date" date,
  "next_service_date" date,
  "notes" text
);

ALTER TABLE "public"."property_asset_services" OWNER TO "postgres";

CREATE TABLE "public"."property_assets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "name" text NOT NULL,
  "asset_type" text,
  "installed_date" date,
  "purchase_cost" numeric,
  "expected_life_years" integer,
  "warranty_expiration" date,
  "condition" text,
  "next_service_date" date
);

ALTER TABLE "public"."property_assets" OWNER TO "postgres";

CREATE TABLE "public"."property_improvements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "title" text NOT NULL,
  "improvement_date" date NOT NULL,
  "description" text,
  "cost" numeric,
  "category" text
);

ALTER TABLE "public"."property_improvements" OWNER TO "postgres";

CREATE TABLE "public"."property_ledger_bookkeeping" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "ledger_entry_id" uuid NOT NULL,
  "vendor_name" text DEFAULT ''::text NOT NULL,
  "payment_method" text DEFAULT ''::text NOT NULL,
  "account_name" text DEFAULT ''::text NOT NULL,
  "tax_treatment" text DEFAULT 'review'::text NOT NULL,
  "receipt_reference" text DEFAULT ''::text NOT NULL,
  "reconciled" boolean DEFAULT false NOT NULL,
  "bookkeeping_notes" text DEFAULT ''::text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."property_ledger_bookkeeping" OWNER TO "postgres";

CREATE TABLE "public"."property_ledger_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "entry_date" date NOT NULL,
  "entry_type" text NOT NULL,
  "category" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."property_ledger_entries" OWNER TO "postgres";

CREATE TABLE "public"."property_maintenance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "title" text NOT NULL,
  "maintenance_date" date NOT NULL,
  "description" text,
  "cost" numeric,
  "status" text,
  "due_date" date,
  "performed_by" text
);

ALTER TABLE "public"."property_maintenance" OWNER TO "postgres";

CREATE TABLE "public"."property_repairs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'open'::text NOT NULL,
  "estimated_cost" numeric(12,2),
  "actual_cost" numeric(12,2),
  "opened_on" date NOT NULL,
  "completed_on" date,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."property_repairs" OWNER TO "postgres";

CREATE TABLE "public"."property_tasks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "deal_id" uuid NOT NULL,
  "title" text NOT NULL,
  "details" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'open'::text NOT NULL,
  "due_on" date,
  "completed_at" timestamp with time zone,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."property_tasks" OWNER TO "postgres";

CREATE TABLE "public"."signup_abuse_reviews" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone
);

ALTER TABLE "public"."signup_abuse_reviews" OWNER TO "postgres";

CREATE TABLE "public"."subscription_change_audit" (
  "id" bigint GENERATED ALWAYS AS IDENTITY (SEQUENCE NAME "public"."subscription_change_audit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE) NOT NULL,
  "company_id" uuid NOT NULL,
  "old_plan" text,
  "new_plan" text,
  "old_billing_status" text,
  "new_billing_status" text,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" uuid DEFAULT auth.uid()
);

ALTER TABLE "public"."subscription_change_audit" OWNER TO "postgres";

ALTER SEQUENCE "public"."free_eligibility_review_audit_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."subscription_change_audit_id_seq" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION jgap_private.guard_passport_financial_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.passport_purchase_date is not distinct from old.passport_purchase_date
      and new.passport_current_value is not distinct from old.passport_current_value
      and new.passport_mortgage_balance is not distinct from old.passport_mortgage_balance
    then return new; end if;
  elsif new.passport_purchase_date is null and new.passport_current_value is null
    and new.passport_mortgage_balance is null then
    return new;
  end if;

  -- Preserve explicit server administration. Never grant these roles to clients.
  if current_user not in ('postgres','supabase_admin','service_role') then
    if (select auth.uid()) is null or not public.can_access_passport(new.company_id)
      or not exists (
        select 1 from public.company_members m
        where m.company_id = new.company_id and m.user_id = (select auth.uid())
          and m.role in ('owner','admin','editor')
      ) then
      raise exception 'Passport financial editing requires active membership and an editing role'
        using errcode = '42501';
    end if;
  end if;

  if new.passport_current_value < 0 or new.passport_mortgage_balance < 0
    or new.passport_current_value::text in ('NaN','Infinity','-Infinity')
    or new.passport_mortgage_balance::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Passport financial amounts must be finite and nonnegative'
      using errcode = '22023';
  end if;
  return new;
end;
$function$;

ALTER FUNCTION "jgap_private"."guard_passport_financial_writes"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION jgap_private.member_role(p_company_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select cm.role from public.company_members cm where cm.company_id=p_company_id and cm.user_id=(select auth.uid()) limit 1 $function$;

ALTER FUNCTION "jgap_private"."member_role"(p_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION jgap_private.prevent_bookkeeping_relink()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.ledger_entry_id is distinct from old.ledger_entry_id then
  raise exception 'Bookkeeping transaction link cannot change' using errcode='42501';
 end if;
 return new;
end $function$;

ALTER FUNCTION "jgap_private"."prevent_bookkeeping_relink"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION jgap_private.prevent_deal_company_reassignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'Deal company cannot be changed';
  end if;
  return new;
end;
$function$;

ALTER FUNCTION "jgap_private"."prevent_deal_company_reassignment"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION jgap_private.prevent_lender_company_reassignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.company_id is distinct from old.company_id then raise exception 'Lender company cannot be changed'; end if;
  return new;
end $function$;

ALTER FUNCTION "jgap_private"."prevent_lender_company_reassignment"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION jgap_private.stamp_property_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_op='INSERT' then
   if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
   new.created_by:=(select auth.uid()); new.created_at:=now();
 else
   if new.id is distinct from old.id or new.company_id is distinct from old.company_id
      or new.deal_id is distinct from old.deal_id or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
     raise exception 'Activity identity fields cannot be changed' using errcode='42501';
   end if;
 end if;
 new.updated_at:=now();
 if tg_table_name='property_tasks' then
   if new.status='done' then
     if tg_op='UPDATE' then
       new.completed_at:=case when old.status='done' then old.completed_at else now() end;
     else new.completed_at:=now(); end if;
   else new.completed_at:=null; end if;
 end if;
 return new;
end $function$;

ALTER FUNCTION "jgap_private"."stamp_property_activity"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.advanced_finance_access(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('read',public.can_access_advanced_finance(p_company_id),
 'write',public.can_access_advanced_finance(p_company_id) and coalesce(jgap_private.member_role(p_company_id) in ('owner','admin','editor'),false));
$function$;

ALTER FUNCTION "public"."advanced_finance_access"(p_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.apply_verified_billing_event(p_event_id text, p_event_created bigint, p_customer_id text, p_subscription_id text, p_plan text, p_billing_status text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare current_billing public.company_subscriptions; inserted_event text;
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'Trusted billing service required'; end if;
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$' or p_event_created is null or p_event_created<0
    or p_customer_id is null or p_customer_id !~ '^cus_[A-Za-z0-9]+$'
    or p_subscription_id is null or p_subscription_id !~ '^sub_[A-Za-z0-9]+$'
    or p_plan is null or p_plan not in ('free','investor','pro')
    or p_billing_status is null or p_billing_status not in ('not_connected','active','past_due','canceled')
    or (p_plan='free' and p_billing_status='active') then raise exception 'Invalid verified billing state'; end if;
  select * into current_billing from public.company_subscriptions where stripe_customer_id=p_customer_id for update;
  if not found then return 'unmapped_customer'; end if;
  insert into public.billing_webhook_events(event_id,company_id,event_created)
    values(p_event_id,current_billing.company_id,p_event_created)
    on conflict(event_id) do nothing returning event_id into inserted_event;
  if inserted_event is null then return 'duplicate'; end if;
  if p_event_created<current_billing.last_billing_event_created then return 'older_event'; end if;
  if current_billing.stripe_subscription_id is not null
    and current_billing.stripe_subscription_id<>p_subscription_id
    and current_billing.billing_status not in ('not_connected','canceled') then return 'different_subscription'; end if;
  update public.company_subscriptions set plan=p_plan,billing_status=p_billing_status,
    stripe_subscription_id=p_subscription_id,last_billing_event_created=p_event_created,updated_at=now()
    where company_id=current_billing.company_id;
  return 'applied';
end $function$;

ALTER FUNCTION "public"."apply_verified_billing_event"(p_event_id text, p_event_created bigint, p_customer_id text, p_subscription_id text, p_plan text, p_billing_status text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.audit_free_eligibility_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if tg_op='INSERT' then
  insert into public.free_eligibility_review_audit(user_id,company_id,old_status,new_status)
  values(new.user_id,new.company_id,null,new.status);
 elsif old.status is distinct from new.status then
  insert into public.free_eligibility_review_audit(user_id,company_id,old_status,new_status)
  values(new.user_id,new.company_id,old.status,new.status);
 end if;
 return new;
end;
$function$;

ALTER FUNCTION "public"."audit_free_eligibility_review"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.audit_subscription_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if old.plan is distinct from new.plan or old.billing_status is distinct from new.billing_status then
  insert into public.subscription_change_audit(company_id,old_plan,new_plan,old_billing_status,new_billing_status)
  values(new.company_id,old.plan,new.plan,old.billing_status,new.billing_status);
 end if;
 return new;
end;
$function$;

ALTER FUNCTION "public"."audit_subscription_changes"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.calculate_secondary_financing(p_company_id uuid, p_amount numeric, p_rate numeric, p_primary jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare monthly numeric; principal numeric; mortgage numeric; flow numeric:=null; offer numeric; rent numeric; other_income numeric; vacancy numeric; expenses numeric; down_payment numeric; rate numeric; years numeric; monthly_rate numeric;
begin
 if not public.can_access_passport(p_company_id) then raise exception 'Active Investor or Pro membership required' using errcode='42501';end if;
 if p_amount is null or p_rate is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_rate::text in ('NaN','Infinity','-Infinity') or p_amount<0 or p_amount>1000000000000 or p_rate<0 or p_rate>100 then raise exception 'Enter a valid additional loan amount and rate' using errcode='22023';end if;
 monthly:=p_amount*p_rate/1200;
 if p_primary is not null then
  if jsonb_typeof(p_primary)<>'object' then raise exception 'Invalid primary financing inputs' using errcode='22023';end if;
  offer:=(p_primary->>'offer')::numeric;rent:=(p_primary->>'rent')::numeric;other_income:=(p_primary->>'other')::numeric;vacancy:=(p_primary->>'vacancy')::numeric;expenses:=(p_primary->>'expenses')::numeric;down_payment:=(p_primary->>'down')::numeric;rate:=(p_primary->>'rate')::numeric;years:=(p_primary->>'years')::numeric;
  if exists(select 1 from unnest(array[offer,rent,other_income,vacancy,expenses,down_payment,rate,years]) v where v is null or v::text in ('NaN','Infinity','-Infinity') or v<0 or v>1000000000000) or vacancy>100 or down_payment>100 or rate>100 or years<=0 or years>50 then raise exception 'Invalid primary financing inputs' using errcode='22023';end if;
  principal:=offer*(1-down_payment/100);monthly_rate:=rate/1200;
  mortgage:=case when principal=0 then 0 when monthly_rate=0 then principal/(years*12) else principal*monthly_rate/(1-power(1+monthly_rate,-years*12)) end;
  flow:=rent*(1-vacancy/100)+other_income-expenses-mortgage-monthly;
 end if;
 return jsonb_build_object('company_id',p_company_id,'monthly_interest',monthly::text,'annual_interest',(monthly*12)::text,'monthly_cash_flow',flow::text);
end $function$;

ALTER FUNCTION "public"."calculate_secondary_financing"(p_company_id uuid, p_amount numeric, p_rate numeric, p_primary jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.can_access_advanced_finance(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select coalesce((select auth.uid()) is not null and public.is_company_member(p_company_id)
 and (public.has_owner_preview_access(p_company_id) or exists(
  select 1 from public.company_subscriptions s where s.company_id=p_company_id and s.plan='pro' and s.billing_status='active')),false);
$function$;

ALTER FUNCTION "public"."can_access_advanced_finance"(p_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.can_access_passport(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select (select auth.uid()) is not null and public.is_company_member(p_company_id) and
( public.has_owner_preview_access(p_company_id) or exists(
select 1 from public.company_subscriptions s where s.company_id=p_company_id
and s.plan in ('investor','pro') and s.billing_status='active'));
$function$;

ALTER FUNCTION "public"."can_access_passport"(p_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.create_company_deal(p_company_id uuid, p_name text, p_property_type text DEFAULT 'single_family'::text, p_status text DEFAULT 'lead'::text, p_purchase_price numeric DEFAULT 0, p_down_payment numeric DEFAULT 0, p_interest_rate numeric DEFAULT 0, p_loan_term_years integer DEFAULT 30, p_closing_costs numeric DEFAULT 0, p_rehab_cost numeric DEFAULT 0, p_monthly_rent numeric DEFAULT 0, p_vacancy_rate numeric DEFAULT 0, p_monthly_operating_expenses numeric DEFAULT 0, p_other_monthly_income numeric DEFAULT 0, p_notes text DEFAULT NULL::text)
 RETURNS deals
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_deal public.deals;
begin
  if (select auth.uid()) is null or p_company_id is null
     or not public.is_company_member(p_company_id) then
    raise exception 'Not authorized for selected workspace';
  end if;
  if not exists (
    select 1 from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'editor')
  ) then
    raise exception 'Workspace role cannot create deals';
  end if;
  if p_name is null or pg_catalog.length(pg_catalog.btrim(p_name)) < 1 then
    raise exception 'Deal name is required';
  end if;
  if p_status is null or pg_catalog.btrim(p_status) = '' then
    raise exception 'Deal status is required';
  end if;
  if p_property_type is null or pg_catalog.btrim(p_property_type) = '' then
    raise exception 'Property type is required';
  end if;
  if p_purchase_price is null or p_down_payment is null or p_interest_rate is null
     or p_loan_term_years is null or p_closing_costs is null or p_rehab_cost is null
     or p_monthly_rent is null or p_vacancy_rate is null
     or p_monthly_operating_expenses is null or p_other_monthly_income is null then
    raise exception 'Required deal financial inputs cannot be null';
  end if;
  if p_purchase_price < 0 or p_down_payment < 0 or p_closing_costs < 0
     or p_rehab_cost < 0 or p_monthly_rent < 0
     or p_monthly_operating_expenses < 0 or p_other_monthly_income < 0 then
    raise exception 'Deal amounts cannot be negative';
  end if;
  if p_interest_rate < 0 or p_interest_rate > 100
     or p_vacancy_rate < 0 or p_vacancy_rate > 100 then
    raise exception 'Interest and vacancy rates must be between 0 and 100';
  end if;
  if p_loan_term_years < 0 or p_loan_term_years > 100 then
    raise exception 'Loan term must be between 0 and 100 years';
  end if;
  insert into public.deals (
    company_id,name,status,property_type,purchase_price,down_payment,interest_rate,
    loan_term_years,closing_costs,rehab_cost,monthly_rent,vacancy_rate,
    monthly_operating_expenses,other_monthly_income,notes
  ) values (
    p_company_id,pg_catalog.btrim(p_name),p_status,p_property_type,p_purchase_price,
    p_down_payment,p_interest_rate,p_loan_term_years,p_closing_costs,p_rehab_cost,
    p_monthly_rent,p_vacancy_rate,p_monthly_operating_expenses,p_other_monthly_income,p_notes
  ) returning * into v_deal;
  return v_deal;
end;
$function$;

ALTER FUNCTION "public"."create_company_deal"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.create_company_deal_from_listing(p_company_id uuid, p_address text, p_asking_price numeric, p_offer_price numeric, p_monthly_rent numeric, p_monthly_expenses numeric, p_property_type text DEFAULT 'unknown'::text, p_units integer DEFAULT NULL::integer, p_source_label text DEFAULT 'Supplied listing'::text, p_listing_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$;

ALTER FUNCTION "public"."create_company_deal_from_listing"(p_company_id uuid, p_address text, p_asking_price numeric, p_offer_price numeric, p_monthly_rent numeric, p_monthly_expenses numeric, p_property_type text, p_units integer, p_source_label text, p_listing_id text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.create_company_deal_with_offer(p_company_id uuid, p_name text, p_property_type text DEFAULT 'single_family'::text, p_status text DEFAULT 'lead'::text, p_purchase_price numeric DEFAULT 0, p_down_payment numeric DEFAULT 0, p_interest_rate numeric DEFAULT 0, p_loan_term_years integer DEFAULT 30, p_closing_costs numeric DEFAULT 0, p_rehab_cost numeric DEFAULT 0, p_monthly_rent numeric DEFAULT 0, p_vacancy_rate numeric DEFAULT 0, p_monthly_operating_expenses numeric DEFAULT 0, p_other_monthly_income numeric DEFAULT 0, p_notes text DEFAULT NULL::text, p_asking_price numeric DEFAULT NULL::numeric, p_target_offer_price numeric DEFAULT NULL::numeric, p_offer_notes text DEFAULT NULL::text, p_target_cap_rate numeric DEFAULT NULL::numeric, p_target_cash_on_cash numeric DEFAULT NULL::numeric, p_target_monthly_cash_flow numeric DEFAULT NULL::numeric, p_target_dscr numeric DEFAULT NULL::numeric, p_offer_earnest_money numeric DEFAULT NULL::numeric, p_offer_due_diligence_days integer DEFAULT NULL::integer, p_offer_closing_days integer DEFAULT NULL::integer, p_offer_financing_type text DEFAULT NULL::text, p_offer_contingencies text DEFAULT NULL::text, p_property_address text DEFAULT NULL::text, p_property_county text DEFAULT NULL::text, p_seller_name text DEFAULT NULL::text, p_offer_state text DEFAULT NULL::text, p_offer_template text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if (select auth.uid()) is null or p_company_id is null
     or not public.is_company_member(p_company_id) then
    raise exception 'Not authorized for selected workspace';
  end if;
  if not exists (
    select 1 from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'editor')
  ) then
    raise exception 'Workspace role cannot create deals';
  end if;
  if p_name is null or pg_catalog.length(pg_catalog.btrim(p_name)) = 0 then
    raise exception 'Deal name is required';
  end if;
  if p_status is null or pg_catalog.btrim(p_status) = '' then
    raise exception 'Deal status is required';
  end if;
  if p_property_type is null or pg_catalog.btrim(p_property_type) = '' then
    raise exception 'Property type is required';
  end if;
  -- NULL bypasses numeric comparisons, so reject missing required values first.
  if p_purchase_price is null or p_down_payment is null
     or p_interest_rate is null or p_loan_term_years is null
     or p_closing_costs is null or p_rehab_cost is null
     or p_monthly_rent is null or p_vacancy_rate is null
     or p_monthly_operating_expenses is null or p_other_monthly_income is null then
    raise exception 'Required deal financial inputs cannot be null';
  end if;
  -- Creation must enforce the same core financial constraints as edits.
  if p_purchase_price < 0 or p_down_payment < 0 or p_closing_costs < 0
     or p_rehab_cost < 0 or p_monthly_rent < 0
     or p_monthly_operating_expenses < 0 or p_other_monthly_income < 0
     or p_asking_price < 0 or p_target_offer_price < 0
     or p_offer_earnest_money < 0 then
    raise exception 'Deal amounts cannot be negative';
  end if;
  if p_interest_rate < 0 or p_interest_rate > 100
     or p_vacancy_rate < 0 or p_vacancy_rate > 100 then
    raise exception 'Interest and vacancy rates must be between 0 and 100';
  end if;
  if p_loan_term_years < 0 or p_loan_term_years > 100
     or p_offer_due_diligence_days < 0 or p_offer_closing_days < 0 then
    raise exception 'Deal timeline values are outside permitted bounds';
  end if;
  insert into public.deals (
    company_id,name,property_type,status,purchase_price,down_payment,interest_rate,
    loan_term_years,closing_costs,rehab_cost,monthly_rent,vacancy_rate,
    monthly_operating_expenses,other_monthly_income,notes,asking_price,target_offer_price,
    offer_notes,target_cap_rate,target_cash_on_cash,target_monthly_cash_flow,target_dscr,
    offer_earnest_money,offer_due_diligence_days,offer_closing_days,offer_financing_type,
    offer_contingencies,property_address,property_county,seller_name,offer_state,offer_template
  ) values (
    p_company_id,pg_catalog.btrim(p_name),p_property_type,p_status,p_purchase_price,
    p_down_payment,p_interest_rate,p_loan_term_years,p_closing_costs,p_rehab_cost,
    p_monthly_rent,p_vacancy_rate,p_monthly_operating_expenses,p_other_monthly_income,
    p_notes,p_asking_price,p_target_offer_price,p_offer_notes,p_target_cap_rate,
    p_target_cash_on_cash,p_target_monthly_cash_flow,p_target_dscr,p_offer_earnest_money,
    p_offer_due_diligence_days,p_offer_closing_days,p_offer_financing_type,
    p_offer_contingencies,p_property_address,p_property_county,p_seller_name,
    p_offer_state,p_offer_template
  ) returning id into v_id;
  return v_id;
end;
$function$;

ALTER FUNCTION "public"."create_company_deal_with_offer"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text, p_asking_price numeric, p_target_offer_price numeric, p_offer_notes text, p_target_cap_rate numeric, p_target_cash_on_cash numeric, p_target_monthly_cash_flow numeric, p_target_dscr numeric, p_offer_earnest_money numeric, p_offer_due_diligence_days integer, p_offer_closing_days integer, p_offer_financing_type text, p_offer_contingencies text, p_property_address text, p_property_county text, p_seller_name text, p_offer_state text, p_offer_template text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.create_my_company(p_company_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_company uuid;
  v_name text := pg_catalog.btrim(coalesce(p_company_name,''));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  -- SECURITY DEFINER functions must not accept a forged session role.
  if (select auth.role()) is distinct from 'authenticated' then
    raise exception 'Authenticated session required';
  end if;
  if pg_catalog.length(v_name) < 2 or pg_catalog.length(v_name) > 100 then
    raise exception 'Company name must be 2 to 100 characters';
  end if;
  -- Serializes simultaneous onboarding attempts for the same authenticated user.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  select cm.company_id into v_company
    from public.company_members cm
    where cm.user_id = v_uid
    order by cm.created_at, cm.company_id
    limit 1;
  if v_company is not null then
    -- Never silently choose a company when the user has multiple memberships.
    if (select pg_catalog.count(distinct cm.company_id)
        from public.company_members cm where cm.user_id = v_uid) > 1 then
      raise exception 'Choose an existing company workspace explicitly';
    end if;
    return pg_catalog.jsonb_build_object('company_id',v_company,'status','already_member');
  end if;
  -- Confirm the account's email before using it for invitation matching.
  -- Do not create an independent company from an unverified account.
  if not exists (
    select 1 from auth.users u
    where u.id = v_uid
      and u.email_confirmed_at is not null
      and u.email is not null
      and pg_catalog.btrim(u.email) <> ''
  ) then
    raise exception 'Verify your email before creating a company workspace';
  end if;
  -- A pending invitation should be accepted via the existing invitation flow,
  -- rather than creating a workspace that may strand the invited user.
  if exists (
    select 1 from public.company_invitations ci
    where pg_catalog.lower(pg_catalog.btrim(ci.email)) = (
      select pg_catalog.lower(pg_catalog.btrim(u.email))
      from auth.users u where u.id = v_uid
    )
      and ci.status = 'pending'
  ) then
    raise exception 'Pending company invitation: accept your invitation first';
  end if;
  insert into public.companies(name) values(v_name) returning id into v_company;
  insert into public.company_members(company_id,user_id,role)
    values(v_company,v_uid,'owner');
  return pg_catalog.jsonb_build_object('company_id',v_company,'status','created');
end;
$function$;

ALTER FUNCTION "public"."create_my_company"(p_company_name text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.delete_company_deal(p_company_id uuid, p_deal_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_deleted boolean := false;
begin
  if (select auth.uid()) is null
    or p_company_id is null
    or p_deal_id is null
    or not public.is_company_member(p_company_id) then
    raise exception 'Not authorized for selected workspace';
  end if;

  -- A second role check prevents viewers from deleting through this RPC,
  -- even before role-aware RLS is deployed. RLS remains authoritative.
  if not exists (
    select 1 from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'editor')
  ) then
    raise exception 'Workspace role cannot delete deals';
  end if;

  delete from public.deals d
  where d.company_id = p_company_id
    and d.id = p_deal_id
  returning true into v_deleted;

  return pg_catalog.coalesce(v_deleted, false);
end;
$function$;

ALTER FUNCTION "public"."delete_company_deal"(p_company_id uuid, p_deal_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.enforce_company_deal_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_plan text; v_status text; v_count integer; v_verified_owner boolean := false;
BEGIN
 IF tg_op = 'UPDATE' THEN
   IF new.company_id = old.company_id THEN RETURN new; END IF;
   RAISE EXCEPTION 'Changing a deal workspace is not supported';
 END IF;
 PERFORM 1 FROM public.companies WHERE id = new.company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Company not found'; END IF;
 INSERT INTO public.company_lifetime_deal_usage(company_id,lifetime_created)
 VALUES(new.company_id,0) ON CONFLICT(company_id) DO NOTHING;
 SELECT lifetime_created INTO v_count FROM public.company_lifetime_deal_usage
 WHERE company_id=new.company_id FOR UPDATE;
 SELECT plan,billing_status INTO v_plan,v_status FROM public.company_subscriptions
 WHERE company_id=new.company_id;
 -- Exception applies only to the currently authenticated, verified staging
 -- owner for the selected company; never to ordinary Free users or service calls.
 IF (SELECT auth.uid()) IS NOT NULL THEN
   v_verified_owner := public.has_owner_preview_access(new.company_id);
 END IF;
 IF NOT v_verified_owner
   AND NOT coalesce(v_plan IN ('investor','pro') AND v_status='active',false)
   AND v_count>=5 THEN
   RAISE EXCEPTION 'FREE_LIFETIME_PROPERTY_LIMIT_REACHED';
 END IF;
 UPDATE public.company_lifetime_deal_usage
 SET lifetime_created=lifetime_created+1 WHERE company_id=new.company_id;
 RETURN new;
END;
$function$;

ALTER FUNCTION "public"."enforce_company_deal_limit"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.get_advanced_finance_report(p_company_id uuid, p_month text, p_deal_id uuid DEFAULT NULL::uuid, p_reconciled boolean DEFAULT NULL::boolean, p_tax_treatment text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare period_start date; rows jsonb; totals jsonb; categories jsonb;
 estimate jsonb; saved_deal public.deals; invalid text[]:=array[]::text[]; item record;
 offer numeric; principal numeric; monthly_rate numeric; mortgage numeric; income numeric; expenses numeric; outflows numeric;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro report access required' using errcode='42501'; end if;
 if p_month is null or p_month !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then raise exception 'Select a valid report month' using errcode='22023'; end if;
 if p_tax_treatment is not null and p_tax_treatment not in ('review','deductible','capital','personal') then raise exception 'Invalid tax filter' using errcode='22023'; end if;
 period_start:=(p_month||'-01')::date;
 if p_deal_id is not null and not exists(select 1 from public.deals where id=p_deal_id and company_id=p_company_id) then raise exception 'Property not found in selected company' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.entry_date desc,r.entry_id),'[]'::jsonb) into rows from (
  select l.id as entry_id,l.company_id,l.deal_id,d.name as property_name,l.entry_date,l.entry_type,l.category,l.description,l.amount::text as amount,
   coalesce(b.vendor_name,'') as vendor_name,coalesce(b.payment_method,'') as payment_method,coalesce(b.account_name,'') as account_name,
   coalesce(b.tax_treatment,'review') as tax_treatment,coalesce(b.receipt_reference,'') as receipt_reference,coalesce(b.reconciled,false) as reconciled,
   coalesce(b.bookkeeping_notes,'') as bookkeeping_notes
  from public.property_ledger_entries l join public.deals d on d.company_id=l.company_id and d.id=l.deal_id
  left join public.property_ledger_bookkeeping b on b.company_id=l.company_id and b.deal_id=l.deal_id and b.ledger_entry_id=l.id
  where l.company_id=p_company_id and l.entry_date>=period_start and l.entry_date<(period_start+interval '1 month')::date
   and (p_deal_id is null or l.deal_id=p_deal_id)
   and (p_reconciled is null or coalesce(b.reconciled,false)=p_reconciled)
   and (p_tax_treatment is null or coalesce(b.tax_treatment,'review')=p_tax_treatment)
  order by l.entry_date desc,l.id limit 10001
 ) r;
 if jsonb_array_length(rows)>10000 then raise exception 'Report exceeds 10000 transactions; select a single property' using errcode='54000'; end if;
 select jsonb_build_object('income',coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='income'),0)::text,
  'expenses',coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='expense'),0)::text,
  'net',coalesce(sum(case when v->>'entry_type'='income' then (v->>'amount')::numeric else -(v->>'amount')::numeric end),0)::text,
  'unreconciled',count(*) filter(where (v->>'reconciled')::boolean=false),'count',count(*)) into totals from jsonb_array_elements(rows) v;
 select coalesce(jsonb_agg(to_jsonb(c) order by c.category),'[]'::jsonb) into categories from (
  select v->>'category' as category,
   coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='income'),0)::text as income,
   coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='expense'),0)::text as expenses,
   sum(case when v->>'entry_type'='income' then (v->>'amount')::numeric else -(v->>'amount')::numeric end)::text as net
  from jsonb_array_elements(rows) v group by v->>'category'
 ) c;

 -- Compare only one complete filter scope; recorded books are not certified complete.
 if p_deal_id is null then
  estimate:=jsonb_build_object('status','property_required');
 elsif p_reconciled is not null or p_tax_treatment is not null then
  estimate:=jsonb_build_object('status','unfiltered_required');
 else
  select * into saved_deal from public.deals where company_id=p_company_id and id=p_deal_id;
  if not found then raise exception 'Property not found in selected company' using errcode='42501';end if;
  offer:=coalesce(saved_deal.target_offer_price,saved_deal.purchase_price);
  for item in select * from (values
   ('offer',offer),('monthly_rent',saved_deal.monthly_rent),('other_monthly_income',saved_deal.other_monthly_income),
   ('vacancy_rate',saved_deal.vacancy_rate),('monthly_operating_expenses',saved_deal.monthly_operating_expenses),
   ('down_payment',saved_deal.down_payment),('interest_rate',saved_deal.interest_rate),('loan_term_years',saved_deal.loan_term_years)
  ) v(name,amount) loop
   if item.amount is null or item.amount::text in ('NaN','Infinity','-Infinity') or item.amount<0 or item.amount>1000000000000
    or (item.name in ('vacancy_rate','down_payment','interest_rate') and item.amount>100)
    or (item.name='loan_term_years' and (item.amount<=0 or item.amount>100)) then
    invalid:=array_append(invalid,item.name);
   end if;
  end loop;
  if cardinality(invalid)>0 then
   estimate:=jsonb_build_object('status','incomplete','invalid_fields',to_jsonb(invalid));
  else
   principal:=offer*(1-saved_deal.down_payment/100);monthly_rate:=saved_deal.interest_rate/1200;
   if principal=0 then mortgage:=0;
   elsif monthly_rate=0 then mortgage:=principal/(saved_deal.loan_term_years*12);
   elsif 1-power(1+monthly_rate,-saved_deal.loan_term_years*12)=0 then
    invalid:=array_append(invalid,'interest_rate');
   else mortgage:=principal*monthly_rate/(1-power(1+monthly_rate,-saved_deal.loan_term_years*12));end if;
   if cardinality(invalid)>0 then
    estimate:=jsonb_build_object('status','incomplete','invalid_fields',to_jsonb(invalid));
   else
    income:=round(saved_deal.monthly_rent*(1-saved_deal.vacancy_rate/100)+saved_deal.other_monthly_income,2);
    expenses:=round(saved_deal.monthly_operating_expenses,2);mortgage:=round(mortgage,2);outflows:=expenses+mortgage;
    estimate:=jsonb_build_object('status','ready','basis','current_saved_assumptions',
     'monthly_income',income::text,'operating_expenses',expenses::text,'mortgage_payment',mortgage::text,
     'total_outflows',outflows::text,'net',(income-outflows)::text);
   end if;
  end if;
 end if;
 return jsonb_build_object('company_id',p_company_id,'month',p_month,'deal_id',p_deal_id,'reconciled',p_reconciled,'tax_treatment',p_tax_treatment,'entries',rows,'totals',totals,'categories',categories,'estimate',estimate);
end $function$;

ALTER FUNCTION "public"."get_advanced_finance_report"(p_company_id uuid, p_month text, p_deal_id uuid, p_reconciled boolean, p_tax_treatment text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.get_company_deal(p_company_id uuid, p_deal_id uuid)
 RETURNS SETOF deals
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select d.*
  from public.deals d
  where d.company_id = p_company_id
    and d.id = p_deal_id
    and (select auth.uid()) is not null
    and public.is_company_member(p_company_id);
$function$;

ALTER FUNCTION "public"."get_company_deal"(p_company_id uuid, p_deal_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.get_my_lifetime_deal_usage(p_company_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select case when exists(select 1 from public.company_members m where m.company_id=p_company_id and m.user_id=(select auth.uid()))
 then coalesce((select u.lifetime_created from public.company_lifetime_deal_usage u where u.company_id=p_company_id),0)
 else null end;
$function$;

ALTER FUNCTION "public"."get_my_lifetime_deal_usage"(p_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.has_owner_preview_access(p_company_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $no_preview$ SELECT false $no_preview$;

ALTER FUNCTION "public"."has_owner_preview_access"(p_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.initialize_company_free_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.company_subscriptions(company_id,plan,billing_status)
 values (new.id,'free','not_connected')
 on conflict (company_id) do nothing;
 return new;
end;
$function$;

ALTER FUNCTION "public"."initialize_company_free_subscription"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.is_company_member(target_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select (select auth.uid()) is not null and jgap_private.member_role(target_company_id) is not null $function$;

ALTER FUNCTION "public"."is_company_member"(target_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.list_company_deals(p_company_id uuid)
 RETURNS SETOF deals
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select d.* from public.deals d
  where d.company_id = p_company_id
    and (select auth.uid()) is not null
    and public.is_company_member(p_company_id)
  order by d.created_at desc;
$function$;

ALTER FUNCTION "public"."list_company_deals"(p_company_id uuid) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.list_my_companies()
 RETURNS TABLE(company_id uuid, company_name text, member_role text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select cm.company_id, c.name, cm.role
  from public.company_members as cm
  join public.companies as c on c.id = cm.company_id
  where cm.user_id = (select auth.uid())
  order by cm.created_at, cm.company_id;
$function$;

ALTER FUNCTION "public"."list_my_companies"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.property_operations_access(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
  'read',coalesce((select auth.uid()) is not null and public.is_company_member(p_company_id),false),
  'write',coalesce(public.can_access_passport(p_company_id) and exists(
    select 1 from public.company_members m where m.company_id=p_company_id
    and m.user_id=(select auth.uid()) and m.role in ('owner','admin','editor')),false));
$function$;

ALTER FUNCTION "public"."property_operations_access"(p_company_id uuid) OWNER TO "postgres";

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
 raise exception 'FREE_PROPERTY_IDENTITY_LOCKED: Saved property name and address cannot be replaced on Free. Financial fields remain editable.';
end;
$function$;

ALTER FUNCTION "public"."protect_free_property_identity"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.save_property_bookkeeping(p_company_id uuid, p_deal_id uuid, p_entry_id uuid, p_patch jsonb)
 RETURNS property_ledger_bookkeeping
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare result public.property_ledger_bookkeeping; field text;
begin
 if not public.can_access_advanced_finance(p_company_id) or not coalesce(jgap_private.member_role(p_company_id) in ('owner','admin','editor'),false) then
  raise exception 'Active Pro membership and editing role required' using errcode='42501';
 end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then raise exception 'Bookkeeping patch must be a nonempty object' using errcode='22023'; end if;
 for field in select jsonb_object_keys(p_patch) loop
  if field not in ('vendor_name','payment_method','account_name','tax_treatment','receipt_reference','reconciled','bookkeeping_notes') then raise exception 'Unsupported bookkeeping field' using errcode='22023'; end if;
  if field='reconciled' then
   if jsonb_typeof(p_patch->field) not in ('boolean','null') then raise exception 'Reconciliation must be a boolean' using errcode='22023'; end if;
  elsif jsonb_typeof(p_patch->field) not in ('string','null') then raise exception 'Bookkeeping text must be a string' using errcode='22023'; end if;
 end loop;
 if not exists(select 1 from public.property_ledger_entries l where l.id=p_entry_id and l.company_id=p_company_id and l.deal_id=p_deal_id) then
  raise exception 'Transaction not found in selected property' using errcode='42501';
 end if;
 insert into public.property_ledger_bookkeeping as b(company_id,deal_id,ledger_entry_id,vendor_name,payment_method,account_name,tax_treatment,receipt_reference,reconciled,bookkeeping_notes)
 values(p_company_id,p_deal_id,p_entry_id,coalesce(p_patch->>'vendor_name',''),coalesce(p_patch->>'payment_method',''),coalesce(p_patch->>'account_name',''),coalesce(p_patch->>'tax_treatment','review'),coalesce(p_patch->>'receipt_reference',''),coalesce((p_patch->>'reconciled')::boolean,false),coalesce(p_patch->>'bookkeeping_notes',''))
 on conflict(ledger_entry_id) do update set
  vendor_name=case when p_patch?'vendor_name' then excluded.vendor_name else b.vendor_name end,
  payment_method=case when p_patch?'payment_method' then excluded.payment_method else b.payment_method end,
  account_name=case when p_patch?'account_name' then excluded.account_name else b.account_name end,
  tax_treatment=case when p_patch?'tax_treatment' then excluded.tax_treatment else b.tax_treatment end,
  receipt_reference=case when p_patch?'receipt_reference' then excluded.receipt_reference else b.receipt_reference end,
  reconciled=case when p_patch?'reconciled' then excluded.reconciled else b.reconciled end,
  bookkeeping_notes=case when p_patch?'bookkeeping_notes' then excluded.bookkeeping_notes else b.bookkeeping_notes end
 returning * into result;
 return result;
end $function$;

ALTER FUNCTION "public"."save_property_bookkeeping"(p_company_id uuid, p_deal_id uuid, p_entry_id uuid, p_patch jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.update_company_deal(p_company_id uuid, p_deal_id uuid, p_patch jsonb)
 RETURNS deals
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_deal public.deals;
  v_columns text[];
  v_column text;
  v_sql text;
  v_exists boolean;
  v_set text := '';
  v_allowed constant text[] := array[
    'name','status','property_type','purchase_price','down_payment','interest_rate',
    'loan_term_years','closing_costs','rehab_cost','monthly_rent','vacancy_rate',
    'monthly_operating_expenses','other_monthly_income','notes','asking_price',
    'target_offer_price','offer_notes','target_cap_rate','target_cash_on_cash',
    'target_monthly_cash_flow','target_dscr','offer_earnest_money',
    'offer_due_diligence_days','offer_closing_days','offer_financing_type',
    'offer_contingencies','property_address','property_county','seller_name',
    'offer_state','offer_template','units','arv','holding_months',
    'monthly_holding_costs','selling_cost_percent','financing_costs',
    'projected_sale_price','loan_structure'
  ];
begin
  if (select auth.uid()) is null or p_company_id is null
    or not public.is_company_member(p_company_id) then
    raise exception 'Not authorized for selected workspace';
  end if;
  -- Membership alone is insufficient for writes: viewers are read-only.
  if not exists (
    select 1 from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin', 'editor')
  ) then
    raise exception 'Workspace role cannot edit deals';
  end if;
  if p_patch is null or pg_catalog.jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Patch must be a JSON object';
  end if;
  select pg_catalog.array_agg(k order by k) into v_columns
  from pg_catalog.jsonb_object_keys(p_patch) as k;
  if v_columns is null or pg_catalog.cardinality(v_columns) = 0 then
    raise exception 'Patch must not be empty';
  end if;
  foreach v_column in array v_columns loop
    if not (v_column = any(v_allowed)) then
      raise exception 'Field not editable: %', v_column;
    end if;
    -- Column identifiers come only from the fixed allowlist.
    v_set := v_set || case when v_set = '' then '' else ', ' end ||
      pg_catalog.format('%I = (pg_catalog.jsonb_populate_record(null::public.deals, $1)).%I',v_column,v_column);
  end loop;
  select exists (select 1 from public.deals d where d.id = p_deal_id and d.company_id = p_company_id) into v_exists;
  if not v_exists then
    raise exception 'Deal not found in selected workspace';
  end if;
  -- Required analyzer fields must not be erased by JSON null patches.
  foreach v_column in array array['purchase_price','down_payment','interest_rate',
    'loan_term_years','closing_costs','rehab_cost','monthly_rent',
    'vacancy_rate','monthly_operating_expenses','other_monthly_income'] loop
    if p_patch ? v_column and p_patch->v_column = 'null'::jsonb then
      raise exception 'Required deal input cannot be null: %', v_column;
    end if;
  end loop;
  -- Reject edits to the deal name that would create an empty display label.
  if p_patch ? 'name' and (p_patch->>'name' is null or pg_catalog.btrim(p_patch->>'name') = '') then
    raise exception 'Deal name is required';
  end if;
  -- Reject invalid negative amounts. Cast errors also reject malformed numeric text.
  -- The numeric list is limited to amounts that cannot be negative; metrics such
  -- as cash flow and financing rates have separate domain requirements.
  foreach v_column in array array['purchase_price','asking_price','target_offer_price',
    'down_payment','closing_costs','rehab_cost','monthly_rent',
    'monthly_operating_expenses','other_monthly_income','arv','financing_costs',
    'monthly_holding_costs','projected_sale_price','offer_earnest_money'] loop
    if p_patch ? v_column and p_patch->>v_column is not null
       and (p_patch->>v_column)::numeric < 0 then
      raise exception '% cannot be negative', v_column;
    end if;
  end loop;
  -- Keep rate and period inputs within reasonable bounds.
  if p_patch ? 'vacancy_rate' and p_patch->>'vacancy_rate' is not null
     and ((p_patch->>'vacancy_rate')::numeric < 0 or (p_patch->>'vacancy_rate')::numeric > 100) then
    raise exception 'Vacancy rate must be between 0 and 100';
  end if;
  if p_patch ? 'loan_term_years' and p_patch->>'loan_term_years' is not null
     and ((p_patch->>'loan_term_years')::integer < 0 or (p_patch->>'loan_term_years')::integer > 100) then
    raise exception 'Loan term must be between 0 and 100 years';
  end if;
  if p_patch ? 'interest_rate' and p_patch->>'interest_rate' is not null
     and ((p_patch->>'interest_rate')::numeric < 0 or (p_patch->>'interest_rate')::numeric > 100) then
    raise exception 'Interest rate must be between 0 and 100';
  end if;
  -- Integer quantities must be nonnegative; a unit count cannot be zero.
  foreach v_column in array array['units','holding_months',
    'offer_due_diligence_days','offer_closing_days'] loop
    if p_patch ? v_column and p_patch->>v_column is not null
       and (p_patch->>v_column)::integer < 0 then
      raise exception '% cannot be negative', v_column;
    end if;
  end loop;
  if p_patch ? 'units' and p_patch->>'units' is not null
     and (p_patch->>'units')::integer = 0 then
    raise exception 'Units must be greater than zero';
  end if;
  if p_patch ? 'selling_cost_percent' and p_patch->>'selling_cost_percent' is not null
     and ((p_patch->>'selling_cost_percent')::numeric < 0 or (p_patch->>'selling_cost_percent')::numeric > 100) then
    raise exception 'Selling cost percent must be between 0 and 100';
  end if;
  -- Never accept SQL JSON null for fields required by the Analyzer.
  -- Explicit JSON null is permitted for optional offer fields only.
  if p_patch ? 'status' and (p_patch->>'status' is null
     or pg_catalog.btrim(p_patch->>'status') = '') then
    raise exception 'Deal status is required';
  end if;
  if p_patch ? 'property_type' and (p_patch->>'property_type' is null
     or pg_catalog.btrim(p_patch->>'property_type') = '') then
    raise exception 'Property type is required';
  end if;
  v_sql := 'update public.deals set ' || v_set ||
    ' where id = $2 and company_id = $3 returning *';
  execute v_sql into v_deal using p_patch,p_deal_id,p_company_id;
  if v_deal.id is null then
    raise exception 'Deal not found in selected workspace';
  end if;
  return v_deal;
end;
$function$;

ALTER FUNCTION "public"."update_company_deal"(p_company_id uuid, p_deal_id uuid, p_patch jsonb) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.update_passport_financials(p_company_id uuid, p_deal_id uuid, p_purchase_date date, p_current_value numeric, p_mortgage_balance numeric)
 RETURNS deals
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_deal public.deals;
begin
 if not public.can_access_passport(p_company_id) then raise exception 'Passport access denied' using errcode='42501'; end if;
 if not exists(select 1 from public.company_members m where m.company_id=p_company_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','editor')) then raise exception 'Passport editing denied' using errcode='42501'; end if;
 if p_current_value<0 or p_mortgage_balance<0 then raise exception 'Financial values must not be negative'; end if;
 update public.deals set passport_purchase_date=p_purchase_date,passport_current_value=p_current_value,passport_mortgage_balance=p_mortgage_balance
 where company_id=p_company_id and id=p_deal_id returning * into v_deal;
 if v_deal.id is null then raise exception 'Property not found in company' using errcode='42501'; end if;
 return v_deal;
end $function$;

ALTER FUNCTION "public"."update_passport_financials"(p_company_id uuid, p_deal_id uuid, p_purchase_date date, p_current_value numeric, p_mortgage_balance numeric) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION public.validate_free_membership_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare verified_at timestamptz;
begin
 if new.status = 'approved' then
  if new.company_id is null then
   raise exception 'FREE_MEMBERSHIP_COMPANY_REQUIRED';
  end if;
  if not exists (
   select 1 from public.company_members m
   where m.user_id = new.user_id and m.company_id = new.company_id
  ) then
   raise exception 'FREE_MEMBERSHIP_COMPANY_MEMBERSHIP_REQUIRED';
  end if;
  select u.email_confirmed_at into verified_at from auth.users u where u.id = new.user_id;
  if verified_at is null then
   raise exception 'FREE_MEMBERSHIP_EMAIL_NOT_VERIFIED';
  end if;
  new.verified_email_at := verified_at;
 else
  new.verified_email_at := null;
 end if;
 new.updated_at := now();
 return new;
end;
$function$;

ALTER FUNCTION "public"."validate_free_membership_approval"() OWNER TO "postgres";

ALTER TABLE "public"."billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY (event_id);

ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_name_check" CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 100)));

ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."company_invitations" ADD CONSTRAINT "company_invitations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."company_invitations" ADD CONSTRAINT "company_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text])));

ALTER TABLE "public"."company_lifetime_deal_usage" ADD CONSTRAINT "company_lifetime_deal_usage_lifetime_created_check" CHECK ((lifetime_created >= 0));

ALTER TABLE "public"."company_lifetime_deal_usage" ADD CONSTRAINT "company_lifetime_deal_usage_pkey" PRIMARY KEY (company_id);

ALTER TABLE "public"."company_members" ADD CONSTRAINT "company_members_pkey" PRIMARY KEY (company_id, user_id);

ALTER TABLE "public"."company_members" ADD CONSTRAINT "company_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'viewer'::text])));

CREATE INDEX company_members_user_idx ON public.company_members USING btree (user_id, company_id);

ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_billing_status_check" CHECK ((billing_status = ANY (ARRAY['not_connected'::text, 'active'::text, 'past_due'::text, 'canceled'::text])));

ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_pkey" PRIMARY KEY (company_id);

ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_plan_check" CHECK ((plan = ANY (ARRAY['free'::text, 'investor'::text, 'pro'::text])));

ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_stripe_customer_id_key" UNIQUE (stripe_customer_id);

ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_stripe_subscription_id_key" UNIQUE (stripe_subscription_id);

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_asking_price_check" CHECK (((asking_price IS NULL) OR (asking_price >= (0)::numeric)));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_check" CHECK (((purchase_price >= (0)::numeric) AND (down_payment >= (0)::numeric) AND (closing_costs >= (0)::numeric) AND (rehab_cost >= (0)::numeric)));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_check1" CHECK (((monthly_rent >= (0)::numeric) AND (monthly_operating_expenses >= (0)::numeric) AND (other_monthly_income >= (0)::numeric)));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_check2" CHECK ((((interest_rate >= (0)::numeric) AND (interest_rate <= (100)::numeric)) AND ((vacancy_rate >= (0)::numeric) AND (vacancy_rate <= (100)::numeric))));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_loan_term_years_check" CHECK (((loan_term_years >= 0) AND (loan_term_years <= 100)));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_name_check" CHECK ((length(btrim(name)) > 0));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_offer_earnest_money_check" CHECK (((offer_earnest_money IS NULL) OR (offer_earnest_money >= (0)::numeric)));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_passport_current_value_check" CHECK ((passport_current_value >= (0)::numeric));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_passport_mortgage_balance_check" CHECK ((passport_mortgage_balance >= (0)::numeric));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_property_type_check" CHECK ((length(btrim(property_type)) > 0));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_selling_cost_percent_check" CHECK (((selling_cost_percent IS NULL) OR ((selling_cost_percent >= (0)::numeric) AND (selling_cost_percent <= (100)::numeric))));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_status_check" CHECK ((length(btrim(status)) > 0));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_target_offer_price_check" CHECK (((target_offer_price IS NULL) OR (target_offer_price >= (0)::numeric)));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_units_check" CHECK (((units IS NULL) OR (units > 0)));

CREATE INDEX deals_company_created_idx ON public.deals USING btree (company_id, created_at DESC);

CREATE UNIQUE INDEX deals_company_id_id_passport_idx ON public.deals USING btree (company_id, id);

ALTER TABLE "public"."free_eligibility_review_audit" ADD CONSTRAINT "free_eligibility_review_audit_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."free_membership_eligibility" ADD CONSTRAINT "approved_requires_verified_email" CHECK (((status <> 'approved'::text) OR (verified_email_at IS NOT NULL)));

ALTER TABLE "public"."free_membership_eligibility" ADD CONSTRAINT "free_membership_eligibility_company_id_key" UNIQUE (company_id);

ALTER TABLE "public"."free_membership_eligibility" ADD CONSTRAINT "free_membership_eligibility_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."free_membership_eligibility" ADD CONSTRAINT "free_membership_eligibility_status_check" CHECK ((status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'restricted'::text])));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_address_check" CHECK ((length(address) <= 300));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_check" CHECK (((minimum_loan_amount IS NULL) OR (maximum_loan_amount IS NULL) OR (minimum_loan_amount <= maximum_loan_amount)));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_contact_name_check" CHECK ((length(contact_name) <= 150));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_email_check" CHECK ((length(email) <= 254));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_institution_name_check" CHECK (((length(btrim(institution_name)) >= 2) AND (length(btrim(institution_name)) <= 150)));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_lender_type_check" CHECK ((lender_type = ANY (ARRAY['Bank'::text, 'Credit Union'::text, 'Commercial Lender'::text, 'Private Lender'::text, 'Hard Money'::text, 'Other'::text])));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_loan_types_check" CHECK ((length(loan_types) <= 300));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_maximum_loan_amount_check" CHECK (((maximum_loan_amount >= (0)::numeric) AND (maximum_loan_amount <= '1000000000000'::numeric)));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_minimum_loan_amount_check" CHECK (((minimum_loan_amount >= (0)::numeric) AND (minimum_loan_amount <= '1000000000000'::numeric)));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_notes_check" CHECK ((length(notes) <= 4000));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_phone_check" CHECK ((length(phone) <= 50));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_rate_notes_check" CHECK ((length(rate_notes) <= 2000));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_status_check" CHECK ((status = ANY (ARRAY['Prospect'::text, 'Contacted'::text, 'Active Relationship'::text, 'Past Relationship'::text])));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_term_notes_check" CHECK ((length(term_notes) <= 2000));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_typical_dscr_check" CHECK (((typical_dscr >= (0)::numeric) AND (typical_dscr <= (100)::numeric)));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_typical_ltv_check" CHECK (((typical_ltv >= (0)::numeric) AND (typical_ltv <= (100)::numeric)));

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_website_check" CHECK ((length(website) <= 500));

CREATE INDEX lenders_company_id_idx ON public.lenders USING btree (company_id);

ALTER TABLE "public"."property_asset_services" ADD CONSTRAINT "property_asset_services_frequency_unit_check" CHECK ((frequency_unit = ANY (ARRAY['year'::text, 'month'::text, 'quarter'::text, 'week'::text])));

ALTER TABLE "public"."property_asset_services" ADD CONSTRAINT "property_asset_services_frequency_value_check" CHECK ((frequency_value > 0));

ALTER TABLE "public"."property_asset_services" ADD CONSTRAINT "property_asset_services_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."property_asset_services" ADD CONSTRAINT "property_asset_services_service_name_check" CHECK ((length(TRIM(BOTH FROM service_name)) > 0));

ALTER TABLE "public"."property_assets" ADD CONSTRAINT "property_assets_company_id_deal_id_id_key" UNIQUE (company_id, deal_id, id);

ALTER TABLE "public"."property_assets" ADD CONSTRAINT "property_assets_expected_life_years_check" CHECK ((expected_life_years > 0));

ALTER TABLE "public"."property_assets" ADD CONSTRAINT "property_assets_name_check" CHECK ((length(TRIM(BOTH FROM name)) > 0));

ALTER TABLE "public"."property_assets" ADD CONSTRAINT "property_assets_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."property_assets" ADD CONSTRAINT "property_assets_purchase_cost_check" CHECK ((purchase_cost >= (0)::numeric));

ALTER TABLE "public"."property_improvements" ADD CONSTRAINT "property_improvements_cost_check" CHECK ((cost >= (0)::numeric));

ALTER TABLE "public"."property_improvements" ADD CONSTRAINT "property_improvements_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."property_improvements" ADD CONSTRAINT "property_improvements_title_check" CHECK ((length(TRIM(BOTH FROM title)) > 0));

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_account_name_check" CHECK ((length(account_name) <= 150));

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_bookkeeping_notes_check" CHECK ((length(bookkeeping_notes) <= 2000));

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_ledger_entry_id_key" UNIQUE (ledger_entry_id);

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_payment_method_check" CHECK ((length(payment_method) <= 100));

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_receipt_reference_check" CHECK ((length(receipt_reference) <= 200));

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_tax_treatment_check" CHECK ((tax_treatment = ANY (ARRAY['review'::text, 'deductible'::text, 'capital'::text, 'personal'::text])));

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_vendor_name_check" CHECK ((length(vendor_name) <= 200));

ALTER TABLE "public"."property_ledger_entries" ADD CONSTRAINT "property_ledger_entries_amount_check" CHECK (((amount > (0)::numeric) AND (amount <= 9999999999.99)));

ALTER TABLE "public"."property_ledger_entries" ADD CONSTRAINT "property_ledger_entries_category_check" CHECK (((length(TRIM(BOTH FROM category)) >= 1) AND (length(TRIM(BOTH FROM category)) <= 80)));

ALTER TABLE "public"."property_ledger_entries" ADD CONSTRAINT "property_ledger_entries_description_check" CHECK ((length(description) <= 2000));

ALTER TABLE "public"."property_ledger_entries" ADD CONSTRAINT "property_ledger_entries_entry_type_check" CHECK ((entry_type = ANY (ARRAY['income'::text, 'expense'::text])));

ALTER TABLE "public"."property_ledger_entries" ADD CONSTRAINT "property_ledger_entries_pkey" PRIMARY KEY (id);

CREATE INDEX property_ledger_entries_scope_idx ON public.property_ledger_entries USING btree (company_id, deal_id, id);

CREATE INDEX property_ledger_entries_date_idx ON public.property_ledger_entries USING btree (company_id, deal_id, entry_date);

CREATE UNIQUE INDEX ledger_bookkeeping_scope_idx ON public.property_ledger_entries USING btree (company_id, deal_id, id);

ALTER TABLE "public"."property_maintenance" ADD CONSTRAINT "property_maintenance_cost_check" CHECK ((cost >= (0)::numeric));

ALTER TABLE "public"."property_maintenance" ADD CONSTRAINT "property_maintenance_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."property_maintenance" ADD CONSTRAINT "property_maintenance_status_check" CHECK ((status = ANY (ARRAY['completed'::text, 'planned'::text, 'open'::text, 'cancelled'::text])));

ALTER TABLE "public"."property_maintenance" ADD CONSTRAINT "property_maintenance_title_check" CHECK ((length(TRIM(BOTH FROM title)) > 0));

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_actual_cost_check" CHECK (((actual_cost >= (0)::numeric) AND (actual_cost <= 9999999999.99)));

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_check" CHECK ((((status <> 'completed'::text) OR (completed_on IS NOT NULL)) AND ((completed_on IS NULL) OR (completed_on >= opened_on))));

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_description_check" CHECK ((length(description) <= 2000));

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_estimated_cost_check" CHECK (((estimated_cost >= (0)::numeric) AND (estimated_cost <= 9999999999.99)));

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text])));

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_title_check" CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 150)));

CREATE INDEX property_repairs_scope_idx ON public.property_repairs USING btree (company_id, deal_id, id);

CREATE INDEX property_repairs_date_idx ON public.property_repairs USING btree (company_id, deal_id, opened_on);

ALTER TABLE "public"."property_tasks" ADD CONSTRAINT "property_tasks_details_check" CHECK ((length(details) <= 2000));

ALTER TABLE "public"."property_tasks" ADD CONSTRAINT "property_tasks_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."property_tasks" ADD CONSTRAINT "property_tasks_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'done'::text])));

ALTER TABLE "public"."property_tasks" ADD CONSTRAINT "property_tasks_title_check" CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 150)));

CREATE INDEX property_tasks_scope_idx ON public.property_tasks USING btree (company_id, deal_id, id);

CREATE INDEX property_tasks_date_idx ON public.property_tasks USING btree (company_id, deal_id, due_on);

ALTER TABLE "public"."signup_abuse_reviews" ADD CONSTRAINT "signup_abuse_reviews_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."signup_abuse_reviews" ADD CONSTRAINT "signup_abuse_reviews_reason_check" CHECK ((reason = ANY (ARRAY['suspected_repeat_signup'::text, 'unusual_signup_velocity'::text, 'payment_method_review'::text, 'manual_review'::text])));

ALTER TABLE "public"."signup_abuse_reviews" ADD CONSTRAINT "signup_abuse_reviews_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'cleared'::text, 'restricted'::text])));

ALTER TABLE "public"."signup_abuse_reviews" ADD CONSTRAINT "signup_review_unique" UNIQUE (user_id, reason);

ALTER TABLE "public"."subscription_change_audit" ADD CONSTRAINT "subscription_change_audit_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE "public"."billing_webhook_events" ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER initialize_company_free_subscription AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION initialize_company_free_subscription();

ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_read" ON "public"."companies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_company_member(id));

ALTER TABLE "public"."company_invitations" ADD CONSTRAINT "company_invitations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE "public"."company_invitations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."company_lifetime_deal_usage" ADD CONSTRAINT "company_lifetime_deal_usage_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE "public"."company_lifetime_deal_usage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read lifetime usage" ON "public"."company_lifetime_deal_usage" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = company_lifetime_deal_usage.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));

ALTER TABLE "public"."company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE "public"."company_members" ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."company_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_self_read" ON "public"."company_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

CREATE TRIGGER audit_subscription_changes AFTER UPDATE OF plan, billing_status ON public.company_subscriptions FOR EACH ROW EXECUTE FUNCTION audit_subscription_changes();

ALTER TABLE "public"."company_subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own subscription" ON "public"."company_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = company_subscriptions.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));

ALTER TABLE "public"."deals" ADD CONSTRAINT "deals_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

CREATE TRIGGER enforce_company_deal_limit BEFORE INSERT OR UPDATE OF company_id ON public.deals FOR EACH ROW EXECUTE FUNCTION enforce_company_deal_limit();

CREATE TRIGGER guard_passport_financial_writes BEFORE INSERT OR UPDATE OF passport_purchase_date, passport_current_value, passport_mortgage_balance ON public.deals FOR EACH ROW EXECUTE FUNCTION jgap_private.guard_passport_financial_writes();

CREATE TRIGGER prevent_deal_company_reassignment BEFORE UPDATE OF company_id ON public.deals FOR EACH ROW EXECUTE FUNCTION jgap_private.prevent_deal_company_reassignment();

CREATE TRIGGER protect_free_property_identity BEFORE UPDATE OF name, property_address, property_county ON public.deals FOR EACH ROW EXECUTE FUNCTION protect_free_property_identity();

ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_delete" ON "public"."deals" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));

CREATE POLICY "deal_insert" ON "public"."deals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));

CREATE POLICY "deal_read" ON "public"."deals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_company_member(company_id));

CREATE POLICY "deal_update" ON "public"."deals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))) WITH CHECK ((jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])));

ALTER TABLE "public"."free_eligibility_review_audit" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."free_membership_eligibility" ADD CONSTRAINT "free_membership_eligibility_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE "public"."free_membership_eligibility" ADD CONSTRAINT "free_membership_eligibility_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TRIGGER audit_free_eligibility_review AFTER INSERT OR UPDATE OF status ON public.free_membership_eligibility FOR EACH ROW EXECUTE FUNCTION audit_free_eligibility_review();

CREATE TRIGGER validate_free_membership_approval BEFORE INSERT OR UPDATE ON public.free_membership_eligibility FOR EACH ROW EXECUTE FUNCTION validate_free_membership_approval();

ALTER TABLE "public"."free_membership_eligibility" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lenders" ADD CONSTRAINT "lenders_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

CREATE TRIGGER prevent_lender_company_reassignment BEFORE UPDATE OF company_id ON public.lenders FOR EACH ROW EXECUTE FUNCTION jgap_private.prevent_lender_company_reassignment();

ALTER TABLE "public"."lenders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lender_insert" ON "public"."lenders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = lenders.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))));

CREATE POLICY "lender_read" ON "public"."lenders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_company_member(company_id));

CREATE POLICY "lender_update" ON "public"."lenders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = lenders.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = lenders.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))));

ALTER TABLE "public"."property_asset_services" ADD CONSTRAINT "property_asset_services_company_id_deal_id_asset_id_fkey" FOREIGN KEY (company_id, deal_id, asset_id) REFERENCES property_assets(company_id, deal_id, id) ON DELETE CASCADE;

ALTER TABLE "public"."property_asset_services" ADD CONSTRAINT "property_asset_services_company_id_deal_id_fkey" FOREIGN KEY (company_id, deal_id) REFERENCES deals(company_id, id) ON DELETE CASCADE;

ALTER TABLE "public"."property_asset_services" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passport_insert" ON "public"."property_asset_services" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_asset_services.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

CREATE POLICY "passport_select" ON "public"."property_asset_services" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_passport(company_id));

CREATE POLICY "passport_update" ON "public"."property_asset_services" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_asset_services.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))))) WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_asset_services.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

ALTER TABLE "public"."property_assets" ADD CONSTRAINT "property_assets_company_id_deal_id_fkey" FOREIGN KEY (company_id, deal_id) REFERENCES deals(company_id, id) ON DELETE CASCADE;

ALTER TABLE "public"."property_assets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passport_insert" ON "public"."property_assets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_assets.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

CREATE POLICY "passport_select" ON "public"."property_assets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_passport(company_id));

CREATE POLICY "passport_update" ON "public"."property_assets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_assets.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))))) WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_assets.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

ALTER TABLE "public"."property_improvements" ADD CONSTRAINT "property_improvements_company_id_deal_id_fkey" FOREIGN KEY (company_id, deal_id) REFERENCES deals(company_id, id) ON DELETE CASCADE;

ALTER TABLE "public"."property_improvements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passport_insert" ON "public"."property_improvements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_improvements.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

CREATE POLICY "passport_select" ON "public"."property_improvements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_passport(company_id));

CREATE POLICY "passport_update" ON "public"."property_improvements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_improvements.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))))) WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_improvements.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

ALTER TABLE "public"."property_ledger_bookkeeping" ADD CONSTRAINT "property_ledger_bookkeeping_company_id_deal_id_ledger_entr_fkey" FOREIGN KEY (company_id, deal_id, ledger_entry_id) REFERENCES property_ledger_entries(company_id, deal_id, id) ON DELETE CASCADE;

CREATE TRIGGER bookkeeping_link_immutable BEFORE UPDATE ON public.property_ledger_bookkeeping FOR EACH ROW EXECUTE FUNCTION jgap_private.prevent_bookkeeping_relink();

CREATE TRIGGER stamp_activity BEFORE INSERT OR UPDATE ON public.property_ledger_bookkeeping FOR EACH ROW EXECUTE FUNCTION jgap_private.stamp_property_activity();

ALTER TABLE "public"."property_ledger_bookkeeping" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookkeeping_insert" ON "public"."property_ledger_bookkeeping" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_advanced_finance(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

CREATE POLICY "bookkeeping_read" ON "public"."property_ledger_bookkeeping" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_advanced_finance(company_id));

CREATE POLICY "bookkeeping_update" ON "public"."property_ledger_bookkeeping" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_advanced_finance(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))) WITH CHECK ((can_access_advanced_finance(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

ALTER TABLE "public"."property_ledger_entries" ADD CONSTRAINT "property_ledger_entries_company_id_deal_id_fkey" FOREIGN KEY (company_id, deal_id) REFERENCES deals(company_id, id) ON DELETE CASCADE;

CREATE TRIGGER stamp_activity BEFORE INSERT OR UPDATE ON public.property_ledger_entries FOR EACH ROW EXECUTE FUNCTION jgap_private.stamp_property_activity();

ALTER TABLE "public"."property_ledger_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_insert" ON "public"."property_ledger_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

CREATE POLICY "activity_read" ON "public"."property_ledger_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_company_member(company_id));

CREATE POLICY "activity_update" ON "public"."property_ledger_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))) WITH CHECK ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

ALTER TABLE "public"."property_maintenance" ADD CONSTRAINT "property_maintenance_company_id_deal_id_fkey" FOREIGN KEY (company_id, deal_id) REFERENCES deals(company_id, id) ON DELETE CASCADE;

ALTER TABLE "public"."property_maintenance" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passport_insert" ON "public"."property_maintenance" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_maintenance.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

CREATE POLICY "passport_select" ON "public"."property_maintenance" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_passport(company_id));

CREATE POLICY "passport_update" ON "public"."property_maintenance" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_maintenance.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))))) WITH CHECK ((can_access_advanced_finance(company_id) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = property_maintenance.company_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))));

ALTER TABLE "public"."property_repairs" ADD CONSTRAINT "property_repairs_company_id_deal_id_fkey" FOREIGN KEY (company_id, deal_id) REFERENCES deals(company_id, id) ON DELETE CASCADE;

CREATE TRIGGER stamp_activity BEFORE INSERT OR UPDATE ON public.property_repairs FOR EACH ROW EXECUTE FUNCTION jgap_private.stamp_property_activity();

ALTER TABLE "public"."property_repairs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_insert" ON "public"."property_repairs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

CREATE POLICY "activity_read" ON "public"."property_repairs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_company_member(company_id));

CREATE POLICY "activity_update" ON "public"."property_repairs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))) WITH CHECK ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

ALTER TABLE "public"."property_tasks" ADD CONSTRAINT "property_tasks_company_id_deal_id_fkey" FOREIGN KEY (company_id, deal_id) REFERENCES deals(company_id, id) ON DELETE CASCADE;

CREATE TRIGGER stamp_activity BEFORE INSERT OR UPDATE ON public.property_tasks FOR EACH ROW EXECUTE FUNCTION jgap_private.stamp_property_activity();

ALTER TABLE "public"."property_tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_insert" ON "public"."property_tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

CREATE POLICY "activity_read" ON "public"."property_tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_company_member(company_id));

CREATE POLICY "activity_update" ON "public"."property_tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))) WITH CHECK ((can_access_passport(company_id) AND (jgap_private.member_role(company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))));

ALTER TABLE "public"."signup_abuse_reviews" ADD CONSTRAINT "signup_abuse_reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."signup_abuse_reviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."subscription_change_audit" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON SCHEMA "public" FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA "public" TO "pg_database_owner";

GRANT CREATE ON SCHEMA "public" TO "pg_database_owner";

GRANT USAGE ON SCHEMA "public" TO PUBLIC;

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

REVOKE ALL ON SCHEMA "jgap_private" FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA "jgap_private" TO "postgres";

GRANT CREATE ON SCHEMA "jgap_private" TO "postgres";

GRANT USAGE ON SCHEMA "jgap_private" TO "authenticated";

REVOKE ALL ON TABLE "public"."billing_webhook_events" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT SELECT ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT UPDATE ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT DELETE ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT REFERENCES ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT TRIGGER ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."billing_webhook_events" TO "postgres";

GRANT INSERT ON TABLE "public"."billing_webhook_events" TO "service_role";

GRANT SELECT ON TABLE "public"."billing_webhook_events" TO "service_role";

GRANT UPDATE ON TABLE "public"."billing_webhook_events" TO "service_role";

GRANT DELETE ON TABLE "public"."billing_webhook_events" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."billing_webhook_events" TO "service_role";

GRANT REFERENCES ON TABLE "public"."billing_webhook_events" TO "service_role";

GRANT TRIGGER ON TABLE "public"."billing_webhook_events" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."billing_webhook_events" TO "service_role";

REVOKE ALL ON TABLE "public"."companies" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."companies" TO "postgres";

GRANT SELECT ON TABLE "public"."companies" TO "postgres";

GRANT UPDATE ON TABLE "public"."companies" TO "postgres";

GRANT DELETE ON TABLE "public"."companies" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."companies" TO "postgres";

GRANT REFERENCES ON TABLE "public"."companies" TO "postgres";

GRANT TRIGGER ON TABLE "public"."companies" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."companies" TO "postgres";

GRANT INSERT ON TABLE "public"."companies" TO "service_role";

GRANT SELECT ON TABLE "public"."companies" TO "service_role";

GRANT UPDATE ON TABLE "public"."companies" TO "service_role";

GRANT DELETE ON TABLE "public"."companies" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."companies" TO "service_role";

GRANT REFERENCES ON TABLE "public"."companies" TO "service_role";

GRANT TRIGGER ON TABLE "public"."companies" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."companies" TO "service_role";

GRANT SELECT ON TABLE "public"."companies" TO "authenticated";

REVOKE ALL ON TABLE "public"."company_invitations" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."company_invitations" TO "postgres";

GRANT SELECT ON TABLE "public"."company_invitations" TO "postgres";

GRANT UPDATE ON TABLE "public"."company_invitations" TO "postgres";

GRANT DELETE ON TABLE "public"."company_invitations" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."company_invitations" TO "postgres";

GRANT REFERENCES ON TABLE "public"."company_invitations" TO "postgres";

GRANT TRIGGER ON TABLE "public"."company_invitations" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."company_invitations" TO "postgres";

GRANT INSERT ON TABLE "public"."company_invitations" TO "service_role";

GRANT SELECT ON TABLE "public"."company_invitations" TO "service_role";

GRANT UPDATE ON TABLE "public"."company_invitations" TO "service_role";

GRANT DELETE ON TABLE "public"."company_invitations" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."company_invitations" TO "service_role";

GRANT REFERENCES ON TABLE "public"."company_invitations" TO "service_role";

GRANT TRIGGER ON TABLE "public"."company_invitations" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."company_invitations" TO "service_role";

REVOKE ALL ON TABLE "public"."company_lifetime_deal_usage" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT SELECT ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT UPDATE ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT DELETE ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT REFERENCES ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT TRIGGER ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."company_lifetime_deal_usage" TO "postgres";

GRANT INSERT ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT SELECT ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT UPDATE ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT DELETE ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT REFERENCES ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT TRIGGER ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."company_lifetime_deal_usage" TO "service_role";

GRANT SELECT ON TABLE "public"."company_lifetime_deal_usage" TO "authenticated";

REVOKE ALL ON TABLE "public"."company_members" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."company_members" TO "postgres";

GRANT SELECT ON TABLE "public"."company_members" TO "postgres";

GRANT UPDATE ON TABLE "public"."company_members" TO "postgres";

GRANT DELETE ON TABLE "public"."company_members" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."company_members" TO "postgres";

GRANT REFERENCES ON TABLE "public"."company_members" TO "postgres";

GRANT TRIGGER ON TABLE "public"."company_members" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."company_members" TO "postgres";

GRANT INSERT ON TABLE "public"."company_members" TO "service_role";

GRANT SELECT ON TABLE "public"."company_members" TO "service_role";

GRANT UPDATE ON TABLE "public"."company_members" TO "service_role";

GRANT DELETE ON TABLE "public"."company_members" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."company_members" TO "service_role";

GRANT REFERENCES ON TABLE "public"."company_members" TO "service_role";

GRANT TRIGGER ON TABLE "public"."company_members" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."company_members" TO "service_role";

GRANT SELECT ON TABLE "public"."company_members" TO "authenticated";

REVOKE ALL ON TABLE "public"."company_subscriptions" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT SELECT ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT UPDATE ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT DELETE ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT REFERENCES ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT TRIGGER ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."company_subscriptions" TO "postgres";

GRANT INSERT ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT SELECT ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT UPDATE ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT DELETE ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT REFERENCES ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT TRIGGER ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."company_subscriptions" TO "service_role";

GRANT SELECT ON TABLE "public"."company_subscriptions" TO "authenticated";

REVOKE ALL ON TABLE "public"."deals" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."deals" TO "postgres";

GRANT SELECT ON TABLE "public"."deals" TO "postgres";

GRANT UPDATE ON TABLE "public"."deals" TO "postgres";

GRANT DELETE ON TABLE "public"."deals" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."deals" TO "postgres";

GRANT REFERENCES ON TABLE "public"."deals" TO "postgres";

GRANT TRIGGER ON TABLE "public"."deals" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."deals" TO "postgres";

GRANT INSERT ON TABLE "public"."deals" TO "service_role";

GRANT SELECT ON TABLE "public"."deals" TO "service_role";

GRANT UPDATE ON TABLE "public"."deals" TO "service_role";

GRANT DELETE ON TABLE "public"."deals" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."deals" TO "service_role";

GRANT REFERENCES ON TABLE "public"."deals" TO "service_role";

GRANT TRIGGER ON TABLE "public"."deals" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."deals" TO "service_role";

GRANT INSERT ON TABLE "public"."deals" TO "authenticated";

GRANT SELECT ON TABLE "public"."deals" TO "authenticated";

GRANT UPDATE ON TABLE "public"."deals" TO "authenticated";

GRANT DELETE ON TABLE "public"."deals" TO "authenticated";

REVOKE ALL ON TABLE "public"."free_eligibility_review_audit" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT SELECT ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT UPDATE ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT DELETE ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT REFERENCES ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT TRIGGER ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."free_eligibility_review_audit" TO "postgres";

GRANT INSERT ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

GRANT SELECT ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

GRANT UPDATE ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

GRANT DELETE ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

GRANT REFERENCES ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

GRANT TRIGGER ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."free_eligibility_review_audit" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "postgres";

GRANT UPDATE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "postgres";

GRANT USAGE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "postgres";

GRANT SELECT ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "anon";

GRANT UPDATE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "anon";

GRANT USAGE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "anon";

GRANT SELECT ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "authenticated";

GRANT UPDATE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "service_role";

GRANT UPDATE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."free_eligibility_review_audit_id_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."free_membership_eligibility" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT SELECT ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT UPDATE ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT DELETE ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT REFERENCES ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT TRIGGER ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."free_membership_eligibility" TO "postgres";

GRANT INSERT ON TABLE "public"."free_membership_eligibility" TO "service_role";

GRANT SELECT ON TABLE "public"."free_membership_eligibility" TO "service_role";

GRANT UPDATE ON TABLE "public"."free_membership_eligibility" TO "service_role";

GRANT DELETE ON TABLE "public"."free_membership_eligibility" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."free_membership_eligibility" TO "service_role";

GRANT REFERENCES ON TABLE "public"."free_membership_eligibility" TO "service_role";

GRANT TRIGGER ON TABLE "public"."free_membership_eligibility" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."free_membership_eligibility" TO "service_role";

REVOKE ALL ON TABLE "public"."lenders" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."lenders" TO "postgres";

GRANT SELECT ON TABLE "public"."lenders" TO "postgres";

GRANT UPDATE ON TABLE "public"."lenders" TO "postgres";

GRANT DELETE ON TABLE "public"."lenders" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."lenders" TO "postgres";

GRANT REFERENCES ON TABLE "public"."lenders" TO "postgres";

GRANT TRIGGER ON TABLE "public"."lenders" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."lenders" TO "postgres";

GRANT INSERT ON TABLE "public"."lenders" TO "service_role";

GRANT SELECT ON TABLE "public"."lenders" TO "service_role";

GRANT UPDATE ON TABLE "public"."lenders" TO "service_role";

GRANT DELETE ON TABLE "public"."lenders" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."lenders" TO "service_role";

GRANT REFERENCES ON TABLE "public"."lenders" TO "service_role";

GRANT TRIGGER ON TABLE "public"."lenders" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."lenders" TO "service_role";

GRANT INSERT ON TABLE "public"."lenders" TO "authenticated";

GRANT SELECT ON TABLE "public"."lenders" TO "authenticated";

GRANT UPDATE ON TABLE "public"."lenders" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_asset_services" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_asset_services" TO "postgres";

GRANT SELECT ON TABLE "public"."property_asset_services" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_asset_services" TO "postgres";

GRANT DELETE ON TABLE "public"."property_asset_services" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_asset_services" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_asset_services" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_asset_services" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_asset_services" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_asset_services" TO "anon";

GRANT INSERT ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT INSERT ON TABLE "public"."property_asset_services" TO "service_role";

GRANT SELECT ON TABLE "public"."property_asset_services" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_asset_services" TO "service_role";

GRANT DELETE ON TABLE "public"."property_asset_services" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_asset_services" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_asset_services" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_asset_services" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_asset_services" TO "service_role";

GRANT UPDATE ("service_name") ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT UPDATE ("frequency_value") ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT UPDATE ("frequency_unit") ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT UPDATE ("last_service_date") ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT UPDATE ("next_service_date") ON TABLE "public"."property_asset_services" TO "authenticated";

GRANT UPDATE ("notes") ON TABLE "public"."property_asset_services" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_assets" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_assets" TO "postgres";

GRANT SELECT ON TABLE "public"."property_assets" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_assets" TO "postgres";

GRANT DELETE ON TABLE "public"."property_assets" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_assets" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_assets" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_assets" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_assets" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_assets" TO "anon";

GRANT INSERT ON TABLE "public"."property_assets" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_assets" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."property_assets" TO "authenticated";

GRANT INSERT ON TABLE "public"."property_assets" TO "service_role";

GRANT SELECT ON TABLE "public"."property_assets" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_assets" TO "service_role";

GRANT DELETE ON TABLE "public"."property_assets" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_assets" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_assets" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_assets" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_assets" TO "service_role";

GRANT UPDATE ("name") ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ("asset_type") ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ("installed_date") ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ("purchase_cost") ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ("expected_life_years") ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ("warranty_expiration") ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ("condition") ON TABLE "public"."property_assets" TO "authenticated";

GRANT UPDATE ("next_service_date") ON TABLE "public"."property_assets" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_improvements" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_improvements" TO "postgres";

GRANT SELECT ON TABLE "public"."property_improvements" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_improvements" TO "postgres";

GRANT DELETE ON TABLE "public"."property_improvements" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_improvements" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_improvements" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_improvements" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_improvements" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_improvements" TO "anon";

GRANT INSERT ON TABLE "public"."property_improvements" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_improvements" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_improvements" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."property_improvements" TO "authenticated";

GRANT INSERT ON TABLE "public"."property_improvements" TO "service_role";

GRANT SELECT ON TABLE "public"."property_improvements" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_improvements" TO "service_role";

GRANT DELETE ON TABLE "public"."property_improvements" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_improvements" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_improvements" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_improvements" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_improvements" TO "service_role";

GRANT UPDATE ("title") ON TABLE "public"."property_improvements" TO "authenticated";

GRANT UPDATE ("improvement_date") ON TABLE "public"."property_improvements" TO "authenticated";

GRANT UPDATE ("description") ON TABLE "public"."property_improvements" TO "authenticated";

GRANT UPDATE ("cost") ON TABLE "public"."property_improvements" TO "authenticated";

GRANT UPDATE ("category") ON TABLE "public"."property_improvements" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_ledger_bookkeeping" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT SELECT ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT DELETE ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_ledger_bookkeeping" TO "postgres";

GRANT INSERT ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT SELECT ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT DELETE ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_ledger_bookkeeping" TO "service_role";

GRANT INSERT ON TABLE "public"."property_ledger_bookkeeping" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_ledger_bookkeeping" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_ledger_bookkeeping" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_ledger_entries" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT SELECT ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT DELETE ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_ledger_entries" TO "postgres";

GRANT INSERT ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT SELECT ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT DELETE ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_ledger_entries" TO "service_role";

GRANT INSERT ON TABLE "public"."property_ledger_entries" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_ledger_entries" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_ledger_entries" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_maintenance" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_maintenance" TO "postgres";

GRANT SELECT ON TABLE "public"."property_maintenance" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_maintenance" TO "postgres";

GRANT DELETE ON TABLE "public"."property_maintenance" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_maintenance" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_maintenance" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_maintenance" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_maintenance" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_maintenance" TO "anon";

GRANT INSERT ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT INSERT ON TABLE "public"."property_maintenance" TO "service_role";

GRANT SELECT ON TABLE "public"."property_maintenance" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_maintenance" TO "service_role";

GRANT DELETE ON TABLE "public"."property_maintenance" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_maintenance" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_maintenance" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_maintenance" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_maintenance" TO "service_role";

GRANT UPDATE ("title") ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT UPDATE ("maintenance_date") ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT UPDATE ("description") ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT UPDATE ("cost") ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT UPDATE ("due_date") ON TABLE "public"."property_maintenance" TO "authenticated";

GRANT UPDATE ("performed_by") ON TABLE "public"."property_maintenance" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_repairs" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_repairs" TO "postgres";

GRANT SELECT ON TABLE "public"."property_repairs" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_repairs" TO "postgres";

GRANT DELETE ON TABLE "public"."property_repairs" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_repairs" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_repairs" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_repairs" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_repairs" TO "postgres";

GRANT INSERT ON TABLE "public"."property_repairs" TO "service_role";

GRANT SELECT ON TABLE "public"."property_repairs" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_repairs" TO "service_role";

GRANT DELETE ON TABLE "public"."property_repairs" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_repairs" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_repairs" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_repairs" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_repairs" TO "service_role";

GRANT INSERT ON TABLE "public"."property_repairs" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_repairs" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_repairs" TO "authenticated";

REVOKE ALL ON TABLE "public"."property_tasks" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."property_tasks" TO "postgres";

GRANT SELECT ON TABLE "public"."property_tasks" TO "postgres";

GRANT UPDATE ON TABLE "public"."property_tasks" TO "postgres";

GRANT DELETE ON TABLE "public"."property_tasks" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."property_tasks" TO "postgres";

GRANT REFERENCES ON TABLE "public"."property_tasks" TO "postgres";

GRANT TRIGGER ON TABLE "public"."property_tasks" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."property_tasks" TO "postgres";

GRANT INSERT ON TABLE "public"."property_tasks" TO "service_role";

GRANT SELECT ON TABLE "public"."property_tasks" TO "service_role";

GRANT UPDATE ON TABLE "public"."property_tasks" TO "service_role";

GRANT DELETE ON TABLE "public"."property_tasks" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."property_tasks" TO "service_role";

GRANT REFERENCES ON TABLE "public"."property_tasks" TO "service_role";

GRANT TRIGGER ON TABLE "public"."property_tasks" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."property_tasks" TO "service_role";

GRANT INSERT ON TABLE "public"."property_tasks" TO "authenticated";

GRANT SELECT ON TABLE "public"."property_tasks" TO "authenticated";

GRANT UPDATE ON TABLE "public"."property_tasks" TO "authenticated";

REVOKE ALL ON TABLE "public"."signup_abuse_reviews" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT SELECT ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT UPDATE ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT DELETE ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT REFERENCES ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT TRIGGER ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."signup_abuse_reviews" TO "postgres";

GRANT INSERT ON TABLE "public"."signup_abuse_reviews" TO "service_role";

GRANT SELECT ON TABLE "public"."signup_abuse_reviews" TO "service_role";

GRANT UPDATE ON TABLE "public"."signup_abuse_reviews" TO "service_role";

GRANT DELETE ON TABLE "public"."signup_abuse_reviews" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."signup_abuse_reviews" TO "service_role";

GRANT REFERENCES ON TABLE "public"."signup_abuse_reviews" TO "service_role";

GRANT TRIGGER ON TABLE "public"."signup_abuse_reviews" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."signup_abuse_reviews" TO "service_role";

REVOKE ALL ON TABLE "public"."subscription_change_audit" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT SELECT ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT UPDATE ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT DELETE ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT TRUNCATE ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT REFERENCES ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT TRIGGER ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT MAINTAIN ON TABLE "public"."subscription_change_audit" TO "postgres";

GRANT INSERT ON TABLE "public"."subscription_change_audit" TO "service_role";

GRANT SELECT ON TABLE "public"."subscription_change_audit" TO "service_role";

GRANT UPDATE ON TABLE "public"."subscription_change_audit" TO "service_role";

GRANT DELETE ON TABLE "public"."subscription_change_audit" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."subscription_change_audit" TO "service_role";

GRANT REFERENCES ON TABLE "public"."subscription_change_audit" TO "service_role";

GRANT TRIGGER ON TABLE "public"."subscription_change_audit" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."subscription_change_audit" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."subscription_change_audit_id_seq" FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "postgres";

GRANT UPDATE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "postgres";

GRANT USAGE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "postgres";

GRANT SELECT ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "anon";

GRANT UPDATE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "anon";

GRANT USAGE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "anon";

GRANT SELECT ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "authenticated";

GRANT UPDATE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "service_role";

GRANT UPDATE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."subscription_change_audit_id_seq" TO "service_role";

REVOKE ALL ON FUNCTION "jgap_private"."guard_passport_financial_writes"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "jgap_private"."guard_passport_financial_writes"() TO "postgres";

REVOKE ALL ON FUNCTION "jgap_private"."member_role"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "jgap_private"."member_role"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "jgap_private"."member_role"(p_company_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "jgap_private"."prevent_bookkeeping_relink"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "jgap_private"."prevent_bookkeeping_relink"() TO "postgres";

REVOKE ALL ON FUNCTION "jgap_private"."prevent_deal_company_reassignment"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "jgap_private"."prevent_deal_company_reassignment"() TO "postgres";

REVOKE ALL ON FUNCTION "jgap_private"."prevent_lender_company_reassignment"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "jgap_private"."prevent_lender_company_reassignment"() TO "postgres";

REVOKE ALL ON FUNCTION "jgap_private"."stamp_property_activity"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "jgap_private"."stamp_property_activity"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."advanced_finance_access"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."advanced_finance_access"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."advanced_finance_access"(p_company_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."advanced_finance_access"(p_company_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."apply_verified_billing_event"(p_event_id text, p_event_created bigint, p_customer_id text, p_subscription_id text, p_plan text, p_billing_status text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."apply_verified_billing_event"(p_event_id text, p_event_created bigint, p_customer_id text, p_subscription_id text, p_plan text, p_billing_status text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_verified_billing_event"(p_event_id text, p_event_created bigint, p_customer_id text, p_subscription_id text, p_plan text, p_billing_status text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."audit_free_eligibility_review"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."audit_free_eligibility_review"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."audit_free_eligibility_review"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."audit_subscription_changes"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."audit_subscription_changes"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."audit_subscription_changes"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."calculate_secondary_financing"(p_company_id uuid, p_amount numeric, p_rate numeric, p_primary jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."calculate_secondary_financing"(p_company_id uuid, p_amount numeric, p_rate numeric, p_primary jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."calculate_secondary_financing"(p_company_id uuid, p_amount numeric, p_rate numeric, p_primary jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."calculate_secondary_financing"(p_company_id uuid, p_amount numeric, p_rate numeric, p_primary jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."can_access_advanced_finance"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."can_access_advanced_finance"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."can_access_advanced_finance"(p_company_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."can_access_advanced_finance"(p_company_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."can_access_passport"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."can_access_passport"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."can_access_passport"(p_company_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."can_access_passport"(p_company_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_company_deal"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."create_company_deal"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_company_deal"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_company_deal"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_company_deal_from_listing"(p_company_id uuid, p_address text, p_asking_price numeric, p_offer_price numeric, p_monthly_rent numeric, p_monthly_expenses numeric, p_property_type text, p_units integer, p_source_label text, p_listing_id text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."create_company_deal_from_listing"(p_company_id uuid, p_address text, p_asking_price numeric, p_offer_price numeric, p_monthly_rent numeric, p_monthly_expenses numeric, p_property_type text, p_units integer, p_source_label text, p_listing_id text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_company_deal_from_listing"(p_company_id uuid, p_address text, p_asking_price numeric, p_offer_price numeric, p_monthly_rent numeric, p_monthly_expenses numeric, p_property_type text, p_units integer, p_source_label text, p_listing_id text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_company_deal_from_listing"(p_company_id uuid, p_address text, p_asking_price numeric, p_offer_price numeric, p_monthly_rent numeric, p_monthly_expenses numeric, p_property_type text, p_units integer, p_source_label text, p_listing_id text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_company_deal_with_offer"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text, p_asking_price numeric, p_target_offer_price numeric, p_offer_notes text, p_target_cap_rate numeric, p_target_cash_on_cash numeric, p_target_monthly_cash_flow numeric, p_target_dscr numeric, p_offer_earnest_money numeric, p_offer_due_diligence_days integer, p_offer_closing_days integer, p_offer_financing_type text, p_offer_contingencies text, p_property_address text, p_property_county text, p_seller_name text, p_offer_state text, p_offer_template text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."create_company_deal_with_offer"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text, p_asking_price numeric, p_target_offer_price numeric, p_offer_notes text, p_target_cap_rate numeric, p_target_cash_on_cash numeric, p_target_monthly_cash_flow numeric, p_target_dscr numeric, p_offer_earnest_money numeric, p_offer_due_diligence_days integer, p_offer_closing_days integer, p_offer_financing_type text, p_offer_contingencies text, p_property_address text, p_property_county text, p_seller_name text, p_offer_state text, p_offer_template text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_company_deal_with_offer"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text, p_asking_price numeric, p_target_offer_price numeric, p_offer_notes text, p_target_cap_rate numeric, p_target_cash_on_cash numeric, p_target_monthly_cash_flow numeric, p_target_dscr numeric, p_offer_earnest_money numeric, p_offer_due_diligence_days integer, p_offer_closing_days integer, p_offer_financing_type text, p_offer_contingencies text, p_property_address text, p_property_county text, p_seller_name text, p_offer_state text, p_offer_template text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_company_deal_with_offer"(p_company_id uuid, p_name text, p_property_type text, p_status text, p_purchase_price numeric, p_down_payment numeric, p_interest_rate numeric, p_loan_term_years integer, p_closing_costs numeric, p_rehab_cost numeric, p_monthly_rent numeric, p_vacancy_rate numeric, p_monthly_operating_expenses numeric, p_other_monthly_income numeric, p_notes text, p_asking_price numeric, p_target_offer_price numeric, p_offer_notes text, p_target_cap_rate numeric, p_target_cash_on_cash numeric, p_target_monthly_cash_flow numeric, p_target_dscr numeric, p_offer_earnest_money numeric, p_offer_due_diligence_days integer, p_offer_closing_days integer, p_offer_financing_type text, p_offer_contingencies text, p_property_address text, p_property_county text, p_seller_name text, p_offer_state text, p_offer_template text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_my_company"(p_company_name text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."create_my_company"(p_company_name text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_my_company"(p_company_name text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_my_company"(p_company_name text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."delete_company_deal"(p_company_id uuid, p_deal_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."delete_company_deal"(p_company_id uuid, p_deal_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_company_deal"(p_company_id uuid, p_deal_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."delete_company_deal"(p_company_id uuid, p_deal_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."enforce_company_deal_limit"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."enforce_company_deal_limit"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."enforce_company_deal_limit"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_advanced_finance_report"(p_company_id uuid, p_month text, p_deal_id uuid, p_reconciled boolean, p_tax_treatment text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."get_advanced_finance_report"(p_company_id uuid, p_month text, p_deal_id uuid, p_reconciled boolean, p_tax_treatment text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_advanced_finance_report"(p_company_id uuid, p_month text, p_deal_id uuid, p_reconciled boolean, p_tax_treatment text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_advanced_finance_report"(p_company_id uuid, p_month text, p_deal_id uuid, p_reconciled boolean, p_tax_treatment text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_company_deal"(p_company_id uuid, p_deal_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."get_company_deal"(p_company_id uuid, p_deal_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_company_deal"(p_company_id uuid, p_deal_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_company_deal"(p_company_id uuid, p_deal_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_my_lifetime_deal_usage"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."get_my_lifetime_deal_usage"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_my_lifetime_deal_usage"(p_company_id uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_my_lifetime_deal_usage"(p_company_id uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."has_owner_preview_access"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."has_owner_preview_access"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."has_owner_preview_access"(p_company_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."has_owner_preview_access"(p_company_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."initialize_company_free_subscription"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."initialize_company_free_subscription"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."initialize_company_free_subscription"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_company_member"(target_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."is_company_member"(target_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_company_member"(target_company_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."is_company_member"(target_company_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."list_company_deals"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."list_company_deals"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."list_company_deals"(p_company_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."list_company_deals"(p_company_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."list_my_companies"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."list_my_companies"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."list_my_companies"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."list_my_companies"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."property_operations_access"(p_company_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."property_operations_access"(p_company_id uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."property_operations_access"(p_company_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."property_operations_access"(p_company_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."protect_free_property_identity"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."protect_free_property_identity"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."protect_free_property_identity"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."save_property_bookkeeping"(p_company_id uuid, p_deal_id uuid, p_entry_id uuid, p_patch jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."save_property_bookkeeping"(p_company_id uuid, p_deal_id uuid, p_entry_id uuid, p_patch jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_property_bookkeeping"(p_company_id uuid, p_deal_id uuid, p_entry_id uuid, p_patch jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."save_property_bookkeeping"(p_company_id uuid, p_deal_id uuid, p_entry_id uuid, p_patch jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_company_deal"(p_company_id uuid, p_deal_id uuid, p_patch jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."update_company_deal"(p_company_id uuid, p_deal_id uuid, p_patch jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_company_deal"(p_company_id uuid, p_deal_id uuid, p_patch jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_company_deal"(p_company_id uuid, p_deal_id uuid, p_patch jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_passport_financials"(p_company_id uuid, p_deal_id uuid, p_purchase_date date, p_current_value numeric, p_mortgage_balance numeric) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."update_passport_financials"(p_company_id uuid, p_deal_id uuid, p_purchase_date date, p_current_value numeric, p_mortgage_balance numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_passport_financials"(p_company_id uuid, p_deal_id uuid, p_purchase_date date, p_current_value numeric, p_mortgage_balance numeric) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_passport_financials"(p_company_id uuid, p_deal_id uuid, p_purchase_date date, p_current_value numeric, p_mortgage_balance numeric) TO "service_role";

REVOKE ALL ON FUNCTION "public"."validate_free_membership_approval"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."validate_free_membership_approval"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."validate_free_membership_approval"() TO "service_role";

commit;
