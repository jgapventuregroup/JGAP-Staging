# Application database baseline

This is the existing app's schema, captured from staging on October 24, 2026: 20 tables, two identity sequences, 33 functions, constraints, indexes, triggers, row-level policies, schema/function/table grants and column-specific grants. No customer rows, Auth users, sequence values, keys or staging owner email whitelist are included. The staging database was only read; it was not reset or migrated during this baseline work.

## What has been verified

`npm run check:database-baseline` rebuild-checks the SQL against the reviewed catalog, restores it into an isolated in-memory PostgreSQL engine, checks the restored schema and permissions, and runs 44 grouped SQL security checks across eight existing suites. The test verifies the baseline refuses a second application over existing app tables. The test database is discarded afterward.

The test platform is pinned PGlite, not a deployed Supabase instance. `tests/database-platform-fixture.sql` models only `auth.users`, `auth.uid()` and `auth.role()` for SQL/RLS testing. **Never apply this test fixture to Supabase.** It does not implement real login, email verification, JWT verification, PostgREST, Storage or platform configuration. Real-session isolation and hosted-platform acceptance remain required. Local SQL-role tests do not enable the original Passport editors.

## Files and reproducibility

- `catalog.json`: reviewed metadata only. Owner preview is sanitized to return false in the catalog query before data leaves staging.
- `application-schema.sql`: generated, transaction-wrapped, empty-app-schema bootstrap.
- `manifest.json`: source commit/project and remote migration-history inventory at capture time; not migration commands or history repair instructions.
- `scripts/schema-catalog-query.sql`: read-only metadata capture query, including column ACLs and standalone indexes referenced by foreign keys. It excludes extension-owned objects and customer rows.
- `node scripts/build-database-baseline.mjs`: deterministic SQL generation from the catalog. `--check` refuses stale generated SQL.

PostgreSQL 17/18 can deparse equivalent CHECK parentheses differently. The restore test reparses captured constraints in a separate local probe schema before comparing canonical definitions; it does not drop constraint assertions or normalize away logical operators.

## Future empty Supabase environment — handoff company procedure

1. Obtain owner approval for the target environment. Do not run this against the existing staging or production database.
2. Provision a normal Supabase platform with PostgreSQL 17+ and its Auth schema/roles. Confirm `auth.users`, `auth.uid()`, `auth.role()`, `postgres`, `anon`, `authenticated`, `service_role` and `pg_database_owner` exist. Use the database owner for schema installation; transfer credentials privately.
3. Confirm the `public`/`jgap_private` application schemas have no non-extension tables, sequences or views. The baseline deliberately fails instead of replacing existing app objects.
4. Run `psql "$TKA_EMPTY_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/baseline/application-schema.sql` through the company's normal secure deployment process. Do not put the connection string into Git, tickets or screenshots.
5. **Do not replay the historical incremental migrations after this baseline.** Their final definitions are already captured, including the final comparison scope fix. Reconcile the history inventory with the deployment tool before authoring subsequent migrations; do not blindly use history repair or `db push` on an existing project.
6. Confirm row-level security/grants and complete normal-session two-company checks. Configure Auth redirect URLs, email delivery, frontend publishable key/origins and any approved Edge functions separately. No passwords, billing keys, Storage buckets or platform settings are provisioned here.
7. Verify sign-up, email confirmation, company onboarding/free eligibility, lifetime property limits, paid/inactive/viewer access and recovery. Configure paid subscription integration in test mode only when authorized. Original Passport frontend editors stay gated until the documented real-session test passes.

Staging owner-preview access is intentionally disabled in a new baseline. Ordinary company owners receive their company role, not automatic paid access. No staging identity should be copied into another environment to activate paid features.

This closes the missing application-schema artifact and local restore verification. A full hosted Supabase restore/deployment rehearsal is still a release gate; this package does not authorize production deployment or export customer data.

## Private Passport document Storage integration
The application-schema baseline intentionally excludes Supabase-managed Storage tables and policies. For a new hosted Supabase environment only, after the application baseline, review and run `../storage/passport-documents.sql` once to create the private bucket and its scoped read/insert policies. Do not rerun it on staging: two corresponding migrations are already recorded in the manifest. Do not replay those historical migrations after separately applying the canonical Storage setup. No actual files or objects are included. The normal authenticated Storage API gate passed on October 25; staging controls are enabled, with actual form/device acceptance separate. The isolated local Storage SQL contract in `tests/passport-document-security.mjs` is not hosted Storage and does not prove upload limits, file serving, signed URL behavior, or physical file persistence.

## Seller-financing calculator add-on
After installing the application baseline in an approved empty environment, apply `supabase/features/seller-financing.sql` once using the database owner. This read-only Pro RPC is a later add-on, not part of the captured application baseline. Do not replay all historical migrations. It creates no tables or customer rows and does not grant subscription changes. `tests/seller-financing.mjs` restores baseline + add-on locally and verifies formulas, roles, company membership and plan/status denial. Hosted Auth/API acceptance remains separate.

## Saved-deal Radar add-on
After the application baseline in an approved empty environment, apply `supabase/features/saved-deal-radar.sql` once as database owner. This later read-only Pro RPC does not create customer rows/tables or enable external discovery. `tests/saved-deal-radar-security.mjs` restores baseline + add-on locally; staging SQL-role rollback checks passed separately. See `docs/advanced-pro-recovery.md` for remote migration history, setup, evidence and limits. Do not replay all old migrations or rerun setup against staging.

## Money-Making overview add-on
Apply `supabase/features/money-making-overview.sql` once after the application baseline in an approved empty environment. It reuses the baseline Pro report helper; neither other calculator nor Radar add-ons are prerequisites. This read-only function creates no rows/tables. Local baseline + add-on restoration and four staging SQL-role rollback groups passed; normal-session/device acceptance remains separate. Staging remote migration `pro_money_making_overview` is version `20261026112123`. Do not rerun on staging or replay all old migrations.

## Dashboard customization add-on
Apply `supabase/features/dashboard-customization.sql` once after the baseline in an approved empty environment. It adds one RLS table (personal preferences keyed by company and user), pure validation, timestamp/identity protection and two invoker RPCs. The captured baseline itself stays unchanged. Staging migration `pro_dashboard_customization` is version `20261026182334`. Local baseline+add-on and five staging rollback groups passed; the staging test left zero preference rows/fixture companies. Do not replay historical migrations or rerun on staging. The table's membership foreign key removes orphan preferences if a membership is subsequently removed by an authorized team workflow; this implementation did not remove memberships.
