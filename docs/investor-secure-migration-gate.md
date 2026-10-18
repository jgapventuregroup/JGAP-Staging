# Investor secure staging migration gate

**Status:** NOT APPROVED FOR EXECUTION. No staging or production database changes authorized.

Before enabling `JGAP_OPERATIONS_TABLES_READY` or `JGAP_OPERATIONS_WRITES_READY`:

1. Back up staging schema and verify restore procedure. Confirm target project ID is `qfszapteuxuogoselprp`, never the production project.
2. Review both SQL drafts for existing constraints, grants, functions and dependency order. In particular, the unique constraint on `deals(id,company_id)` must not already exist.
3. Verify `jgap_private.member_role` execution privileges and `public.is_company_member` behavior for real authenticated requests. Check whether `company_subscriptions` RLS permits the policy's subscription lookup.
4. Review billing state and test entitlement transitions: Free cannot insert, Investor/Pro active can, expired/canceled/downgraded cannot, and users cannot grant themselves a paid plan.
5. Run authenticated two-company isolation tests: cross-company SELECT, INSERT, UPDATE, DELETE, changing `company_id`/`deal_id`, spoofing `created_by`, and references to another company's deal all fail.
6. Test reader role versus editor/owner, unauthenticated access, duplicate submission, failed network request, partial operation load, and concurrent workspace switch.
7. Confirm operation table names and columns match `property-operations-loader.mjs`, `property-activity-writer.mjs`, and `property-work.mjs`.
8. Only after explicit approval, apply reviewed migration **to staging only**. Keep writes disabled until authenticated acceptance tests pass. Enable reads first, then writes. Do not merge feature PR or deploy to production.

**Known issue to resolve:** The SQL drafts currently refer to paid subscriptions inside RLS policy predicates. Actual user-visible subscription RLS may prevent the policy lookup; this must be validated before executing. UI flags are not authorization: database RLS must enforce every restriction.
