-- JGAP staging: repeatable, read-only tenant-isolation verification.
-- Run with a privileged Supabase SQL editor session on STAGING ONLY.
-- This script simulates each existing member's JWT identity under the
-- authenticated database role, then verifies they cannot see other
-- companies' deals or lenders. No data is inserted or modified.
-- It fails with an exception if any cross-company row is exposed.
BEGIN;
DO $test$
DECLARE
  member_record record;
  foreign_deals bigint;
  foreign_lenders bigint;
  checked_members integer := 0;
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
    EXECUTE 'RESET ROLE';
    IF foreign_deals <> 0 OR foreign_lenders <> 0 THEN
      RAISE EXCEPTION 'Tenant isolation failure for a company member: % foreign deals, % foreign lenders', foreign_deals, foreign_lenders;
    END IF;
    checked_members := checked_members + 1;
  END LOOP;
  IF checked_members < 2 THEN
    RAISE EXCEPTION 'Insufficient members to verify cross-company isolation';
  END IF;
  RAISE NOTICE 'PASS: read isolation verified for % company memberships', checked_members;
END
$test$;
ROLLBACK;
