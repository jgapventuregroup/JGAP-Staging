-- STAGING ONLY: qfszapteuxuogoselprp
-- Review in Supabase SQL Editor before running. Production must remain untouched.
-- PostgreSQL COALESCE is an expression, not pg_catalog.coalesce().
DO $repair$
DECLARE
  fn_oid oid := to_regprocedure('public.create_my_company(text)');
  old_definition text;
  fixed_definition text;
BEGIN
  IF fn_oid IS NULL THEN
    RAISE EXCEPTION 'create_my_company(text) is missing; no change made';
  END IF;
  old_definition := pg_get_functiondef(fn_oid);
  IF position('pg_catalog.coalesce(' in old_definition) = 0 THEN
    RAISE NOTICE 'No qualified COALESCE found; nothing to repair';
    RETURN;
  END IF;
  fixed_definition := replace(old_definition, 'pg_catalog.coalesce(', 'coalesce(');
  EXECUTE fixed_definition;
  RAISE NOTICE 'Repaired qualified COALESCE in create_my_company(text)';
END
$repair$;
SELECT to_regprocedure('public.create_my_company(text)') IS NOT NULL AS company_onboarding_function_exists;
