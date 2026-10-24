# The Key Ahead Investor App — Handoff Readiness (2026-10-24)

## Delivery decision
The external website/app company will implement subscription payments and final deployment. Preserve this existing app; do not rebuild or create another repository. Do not alter the completed marketing website without separate approval.

## Source and staging
- Source: `jgapventuregroup/JGAP-Staging`, branch `main`.
- Existing staging preview: https://jgapventuregroup.github.io/JGAP-Staging/
- Staging Supabase project ID: `qfszapteuxuogoselprp`.
- **Never** point staging or testing at the separate production Supabase project. Do not export credentials or customer data into the handoff package.
- The app is currently a staging product, not a certified production release.

## Intended plans
| Plan | Price | Property limit | Ads |
| --- | --- | --- | --- |
| Free | $0 | Five lifetime saved properties | Yes |
| Investor | $19/month | Unlimited | Yes |
| Pro | $39/month | Unlimited | No |

The full feature allocation is documented in `docs/membership-feature-matrix.md`. Membership labels and preview access are **not** proof that live payment enforcement is complete. Owner preview is for staging testing only.

## Working features to retain
- Account login/verification and company-scoped workspace.
- Saved properties, Deal Analyzer, offer calculations, pipeline and follow-ups.
- Property Passport read views and verified Financials save/persistence for an owner test property.
- Mobile-responsive navigation and branded dashboard.
- Reserved, labeled sponsored slots for Free/Investor, without actual ad serving.

## Known blockers — do not claim launch-ready
1. **Build verification:** Require all four GitHub Actions workflows green on the final handoff commit. A regression appeared on Oct 24 in `tests/customer-workflow.mjs` during account onboarding after a membership presentation change; the offending script was removed in commit `8c7f422`. All four push workflows subsequently passed on `f305109`; the cancelled `8c7f422` Pages run was superseded by that successful deployment. A new final commit still requires its own four successful runs.
2. **Passport editing:** Original Systems/equipment, services, maintenance and improvements editors remain deliberately disabled. Authenticated two-company SELECT/INSERT/UPDATE isolation tests must pass before enabling. Read-only preflight module is not a substitute for write testing.
3. **Billing:** No live checkout, payment processor, subscription webhook synchronization, renewal, cancellation, or payment-failure lifecycle is connected.
4. **Feature entitlements:** Confirm Free/Investor/Pro access matches the matrix in UI and database; test both upgrades and downgrades.
5. **Advertising:** Placeholder slots only. Direct-sold inventory management, creative review, reporting, ad-network fallback, consent/privacy and ad serving remain unimplemented.
6. **Production release:** Full device/browser smoke tests, privacy/terms review, monitoring, recovery/backup process, production Supabase provisioning/migrations and deployment verification outstanding.
7. **Advanced Pro features:** Inventory and confirm which features are truly functional before making launch claims. Do not present deferred Laundromat Division as available.

## Payment integration contract for handoff company
- Agree on provider and merchant account with owner; no payment credentials committed to Git.
- Implement hosted checkout and secure customer billing portal.
- Associate payment customers/subscriptions with company IDs, not merely email addresses.
- Verify signed webhook signatures server-side, idempotently process events, and reconcile missed events.
- Store authoritative billing status and plan in the backend; never trust client-provided plan labels.
- Enforce paid feature entitlements server-side, including failed payment, cancellation, downgrade and refund states.
- Pro must remain ad-free; Free five-lifetime-save rule must remain enforced in the database.
- Test checkout and webhooks in sandbox before live credentials are configured.
- Provide deployment runbook, rollback procedure, ownership of accounts/domains, and admin access to the owners.

## Acceptance checklist
- [ ] All automated checks pass on the exact handoff commit.
- [ ] Passport record security gate resolved or excluded from advertised V1 scope.
- [ ] Feature matrix reconciled with working UI/backend features.
- [ ] Mobile and desktop end-to-end tests pass.
- [ ] Payment integration responsibilities accepted by handoff company.
- [ ] No staging test properties, fake ad content or owner-preview language exposed as live customer features.
- [ ] Production data migration/backup and rollback plan approved.
- [ ] Owners explicitly approve production release.

## Handoff materials
Share repository access via GitHub permissions, this document, `docs/membership-feature-matrix.md`, `docs/property-passport-browser-test.md`, and test results. Transfer secrets through a secure credentials manager only, never chat, screenshots, or repository files.

## Staging security milestone — October 24, 2026
- Confirmed and closed a direct table-API bypass of paid Passport financial editing. The existing RPC already checked membership; an additive trigger now protects INSERT and changed financial columns on UPDATE as well. Unchanged/basic deal fields retain existing behavior. Server administration remains explicit.
- Applied `guard_passport_financial_writes` only to staging. Source: `supabase/migrations/20261024133246_guard_passport_financial_writes.sql`. This incremental migration does not recreate the existing schema.
- `tests/staging-membership-security.sql` passed nine grouped checks on staging: Free direct/RPC denial, unchanged basic finance editing, five lifetime saves after deletion, subscription self-upgrade denial, active Investor/Pro, past-due/canceled/downgraded access, data retention, invalid numeric rejection, and read-only viewer restrictions. All synthetic fixtures and plan changes rolled back.
- Evidence boundary: these are database-role tests with simulated identity, **not real separately authenticated sessions**, and do not authorize enabling original Passport writers. Original table writers remain disabled.
- Security advisors report intentional authenticated security-definer helpers requiring review, six RLS tables without client policies, and disabled leaked-password protection. Verify intentional deny-by-default grants and assess password protection availability before production. Do not add broad policies merely to silence advisors.

## Developer runbook and explicit scope
See `docs/developer-handoff.md` for architecture, configuration, database inventory/version reconciliation, opt-in real-session security testing, advertising/billing contracts and release/rollback procedures. The full approved Pro offering remains incomplete: live operation ledgers/repair/task tables, document handling and the advanced Pro modules are not delivered. A complete schema-only migration baseline is also outstanding. These are explicit blockers; a green CI result alone does not make the full product handoff-ready.

## Verification evidence from this takeover
- Existing onboarding fix: all four push workflows green on `f305109`.
- Financial guard milestone: all four push workflows green on `4d52203` (run IDs `40098756238`, `40098756237`, `40098756229`, `40098756240`).
- Updated local `npm test` passed, including backend-response precedence in the UI, Pro ad placement behavior, existing preflight tests and actual preview dependency traversal with an intentionally missing module. `npm run check:edge` passed.
- Two-company real-session runner is implemented but not executed; required signed-in sessions are unavailable here. No original record editor was enabled.
- Rendered browser/device QA remains pending because the local browser runtime could not be installed.
- Subsequent commits still require their own four green workflow runs before handoff.
