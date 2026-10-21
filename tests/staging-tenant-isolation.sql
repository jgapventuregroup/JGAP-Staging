-- JGAP staging: repeatable, read-only tenant-isolation verification.
-- Run with a privileged Supabase SQL editor session on STAGING ONLY.
-- This script simulates each existing member's JWT identity under the
-- authenticated database role, then verifies they cannot see other
-- companies' deals, lenders, or original Passport records. No data is inserted or modified.
-- It fails with an exception if any cross-company row is exposed.
-- IMPORTANT: Empty Passport tables make the Passport checks vacuous.
-- This read-only audit is supplemental, NOT approval to enable Passport writes.
-- Final release requires real, separately authenticated company sessions and
-- positive own-company / negative cross-company read, insert, and update tests.
BEGIN;
DO $test$
DECLARE
  member_record record;
  foreign_deals bigint;
  foreign_lenders bigint;
  foreign_assets bigint;
  foreign_services bigint;
  foreign_maintenance bigint;
  foreign_improvements bigint;
  checked_members integer := 0;
  checked_companies integer := 0;
  passport_rows bigint;
BEGIN
  FOR member_record IN
    SELECT user_id, company_id FROM public.company_members
  LOOP
    PERFORM set_config('request.jwt.claim.sub', member_record.user_id::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT count(*) INTO foreign_deals FROM public.deals
      WHERE company_id <> member_record.company_id;
    SELECT count(*) INTO foreign_lenders FROM public.lenders
      WHERE company_id <> member_record.company_id;
    SELECT count(*) INTO foreign_assets FROM public.property_assets WHERE company_id <> member_record.company_id;
    SELECT count(*) INTO foreign_services FROM public.property_asset_services WHERE company_id <> member_record.company_id;
    SELECT count(*) INTO foreign_maintenance FROM public.property_maintenance WHERE company_id <> member_record.company_id;
    SELECT count(*) INTO foreign_improvements FROM public.property_improvements WHERE company_id <> member_record.company_id;
    EXECUTE 'RESET ROLE';
    IF foreign_deals <> 0 OR foreign_lenders <> 0 OR foreign_assets <> 0 OR foreign_services <> 0 OR foreign_maintenance <> 0 OR foreign_improvements <> 0 THEN
      RAISE EXCEPTION 'Tenant isolation failure: foreign deals %, lenders %, assets %, services %, maintenance %, improvements %', foreign_deals, foreign_lenders, foreign_assets, foreign_services, foreign_maintenance, foreign_improvements;
    END IF;
    checked_members := checked_members + 1;
  END LOOP;
  SELECT count(DISTINCT company_id) INTO checked_companies FROM public.company_members;
  IF checked_companies < 2 THEN
    RAISE EXCEPTION 'Insufficient distinct companies for tenant isolation audit';
  END IF;
  IF checked_members < 2 THEN
    RAISE EXCEPTION 'Insufficient members to verify cross-company isolation';
  END IF;
  SELECT (SELECT count(*) FROM public.property_assets)
       + (SELECT count(*) FROM public.property_asset_services)
       + (SELECT count(*) FROM public.property_maintenance)
       + (SELECT count(*) FROM public.property_improvements) INTO passport_rows;
  IF passport_rows = 0 THEN
    RAISE NOTICE 'INCONCLUSIVE: Passport tables contain zero records; no Passport cross-company read exposure can be meaningfully tested';
  END IF;
  RAISE NOTICE 'Supplemental read audit passed for % memberships across % companies; Passport rows: %. Authenticated insert/update tests remain required.', checked_members, checked_companies, passport_rows;
END
$test$;
ROLLBACK;
