# Isolated paid Investor staging acceptance gate

## Before enabling live Investor test screens

- Keep `main`, production, existing Free memberships and the five-lifetime-property rule unchanged.
- Provision a separate **preview origin**. The GitHub Actions ZIP is not a hosted origin and does not solve OAuth/email redirects.
- Configure Supabase Auth allowed redirect URLs for the preview origin **before** changing the sign-up email redirect in the preview build.
- Use only staging Supabase `qfszapteuxuogoselprp`; never use a production key. Keep only the public publishable key in browser code.
- Review and explicitly approve the two SQL drafts for ledger, repairs and tasks. Check RLS with two distinct fictional companies, Free and paid roles, and cross-company read/write/delete denial.
- Only after approval: apply migrations to staging, create an isolated fictional Investor test company and enable the paid entitlement. Never upgrade an existing user's Free account to perform tests.
- Enable `window.JGAP_OPERATIONS_TABLES_READY` **only after** the actual staging tables and RLS pass the isolation tests.
- Test sign-up, verification redirect, sign-in, logout, property selection, Passport read, ledger, repairs, tasks, free-tier limits and expired entitlement before any production release.

## Current status

The standalone fictional demos are packaged and runnable. The real operations tables have not been enabled; the feature branch is not published as an authenticated preview. The app's current email confirmation redirect still points at the existing GitHub Pages staging site. Do not claim end-to-end paid features are available until this gate passes.
