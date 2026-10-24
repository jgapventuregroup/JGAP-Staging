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
1. **Build verification:** Require all four GitHub Actions workflows green on the final handoff commit. A regression appeared on Oct 24 in `tests/customer-workflow.mjs` during account onboarding after a membership presentation change; the offending script was removed in commit `8c7f422`, pending verification.
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
