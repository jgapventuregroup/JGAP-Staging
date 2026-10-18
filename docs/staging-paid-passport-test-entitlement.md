# Paid Property Passport — staging-only test entitlement

Status: **planning only; no paid test workspace provisioned and no membership changed.**

## Verified facts (read-only staging inspection, 2026-10-18)
- Staging project: `qfszapteuxuogoselprp`.
- Three subscription rows currently have `plan='free'` and `billing_status='not_connected'`.
- `public.company_subscriptions` has an authenticated-member SELECT policy; no authenticated INSERT/UPDATE/DELETE policy was reported.
- The Passport UI requires `plan IN ('investor','pro')` and `billing_status='active'`.
- This browser UI check is not a substitute for server-side paid authorization.

## Safe browser-test preparation
1. Use a separately identified **fictional staging test user and test company**. Do not upgrade an existing customer or alter the three Free workspaces.
2. Confirm company membership, the subscription audit trigger, and existing plan/limit enforcement in the staging database.
3. After explicit approval, provision a controlled test entitlement only for the fictional company using an authorized server-side administrative procedure. Never expose a browser-accessible plan-upgrade RPC or service key.
4. Keep billing disconnected from live Stripe checkout; mark test entitlement clearly in internal test documentation. Never imply a real payment occurred.
5. Verify the test account sees the read-only Passport action, and an existing Free account does not.
6. Verify direct cross-company `get_company_deal` reads fail, and changing company during a pending read does not display stale details.
7. Record the company identifier privately, expected expiry, cleanup steps, and actual test results. Remove the temporary entitlement or test company after testing.

## Stop conditions
- Do not activate paid checkout, modify production, or merge the feature branch.
- Do not manually change any existing Free subscription for testing.
- Do not use UI-only plan flags as evidence of paid authorization.
- Do not claim browser testing is complete without an actual deployed staging URL and user sign-in.

## Database security review (read-only, 2026-10-18)
- RLS is enabled on `public.companies`, `public.company_members`, `public.company_subscriptions`, and `public.deals`.
- `get_company_deal(p_company_id,p_deal_id)` is a security-invoker SQL function that checks `auth.uid()` and `public.is_company_member(p_company_id)` before returning the matching deal; underlying deals RLS remains applicable.
- `enforce_company_deal_limit()` is a security-definer trigger that locks the company/usage record, rejects workspace transfers, and blocks creation once five lifetime Free slots are consumed unless a paid plan has `billing_status='active'`.
- These findings do not establish a safe paid entitlement issuance procedure; that remains to be reviewed before any database mutation.
