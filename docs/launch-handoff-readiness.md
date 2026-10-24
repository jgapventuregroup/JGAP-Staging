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
See `docs/developer-handoff.md` for architecture, configuration, database inventory/version reconciliation, opt-in real-session security testing, advertising/billing contracts and release/rollback procedures. The full approved Pro offering remains incomplete: document handling and the advanced Pro modules are not delivered. Basic operation ledgers, repairs and tasks now have staging storage and frontend integration; see the milestone below. A schema-only baseline and local restore check have since been added; hosted Supabase restore/configuration acceptance remains outstanding. These are explicit blockers; a green CI result alone does not make the full product handoff-ready.

## Verification evidence from this takeover
- Existing onboarding fix: all four push workflows green on `f305109`.
- Financial guard milestone: all four push workflows green on `4d52203` (run IDs `40098756238`, `40098756237`, `40098756229`, `40098756240`).
- Updated local `npm test` passed, including backend-response precedence in the UI, Pro ad placement behavior, existing preflight tests and actual preview dependency traversal with an intentionally missing module. `npm run check:edge` passed.
- Two-company real-session runner is implemented but not executed; required signed-in sessions are unavailable here. No original record editor was enabled.
- Rendered browser/device QA remains pending because the local browser runtime could not be installed.
- Subsequent commits still require their own four green workflow runs before handoff.

## Property operations backend milestone
- Added `property_ledger_entries`, `property_repairs`, and `property_tasks` in staging via the reviewed `property_operations` migration. Composite foreign keys, immutable record ownership, server-derived creator/timestamps, RLS and explicit grants protect the tables. There is no client DELETE grant.
- Six grouped checks in `tests/staging-operations-security.sql` passed against staging with two companies: own create/edit persistence, foreign SELECT/INSERT/UPDATE refusal, property/company reassignment denial, spoofed attribution prevention, downgrade history retention, inactive/Free/viewer write denial, Pro editing and anonymous denial. All fictional fixtures rolled back. These use simulated database identities, not the original Passport real-session release gate.
- Original equipment/services/maintenance/improvements editors remain disabled. Frontend operations activation is tracked separately from this backend milestone.

## Property operations frontend milestone
- Existing Passport Operations tab now loads the connected income/expense ledger, repairs and tasks, shows stored history, and adds/edits records for server-authorized editors. Tasks can be completed/reopened; repairs can be updated with actual costs and completion dates. No original Passport write gate was changed.
- Read/write UI capability comes from `property_operations_access`; RLS remains authoritative. Viewer, inactive and Free write restrictions remain in the backend. Owner preview stays separate.
- Totals include all loaded transaction pages (500 per page; fail closed beyond 10,000 records per collection). History loading or validation errors preserve the separate working Financials view and never become fabricated zero totals. Repair costs are not automatically counted as ledger expenses.
- New DOM unit/integration checks cover edit scoping, real-entry history/totals, failed-load isolation, confirmed-save/refresh-failure duplicate prevention, stale views, safe text display and server read/write capability precedence. Rendered device and real-session checks remain open; these unit tests are not substitutes.

## Pro financial reporting recovery milestone
- Selectively recovered original `finance-cpa.js` workflows into the existing ledger and app: month/property filters, category totals, manual reconciliation, vendor/account/tax-reference notes and bookkeeping CSV. See `docs/finance-recovery.md` for scope and source mapping.
- Active Pro and verified staging owner preview are checked in backend invoker RPCs and separate metadata-table RLS. Investor/Free/inactive clients cannot obtain advanced reports or bookkeeping metadata through altered browser values. Original Passport editor gates remain unchanged.
- Five grouped SQL security checks passed on staging; all fictional data rolled back and cleanup confirmed. Local module/DOM tests cover exact cents, CSV safety, current filters, server-denied exports, viewers, specific transaction IDs and stale workspace responses.
- This milestone does not complete document handling, the remaining advanced Pro modules, the reproducible schema baseline, or normal signed-in/device QA. It does not connect billing, advertisements or production. The exact candidate commit still needs all four workflows green.

## Paid secondary financing correction
- Owner request: CELCO / HELOC financing belongs to paid Investor/Pro only. Moved the existing tool beside the primary loan inputs, expanded it for authorized users, and replaced the vague collapsed label. Free sees a plan notice instead of the inputs.
- Calculations now use `calculate_secondary_financing`, which checks current membership/active paid entitlement or verified staging owner preview. Free, past-due/canceled, foreign-workspace and anonymous calls are denied. Primary Free Analyzer behavior is unchanged.
- Six grouped rollback checks passed, including combined cash flow, zero-rate/all-cash cases, missing primary figures and malformed input. Workflow tests cover backend-authorized UI, down-payment copying, exact RPC arguments and stale result suppression.
- Interest-only secondary scenario is not saved to a property and does not change primary mortgage/maximum-offer results. Combined cash flow is explicitly shown in its own result. No original Passport gate or billing/advertising configuration changed.

## Direct recent-property navigation
- Dashboard recent-property cards now open that exact property's Passport for server-authorized workspaces; other workspaces open that property's saved Analyzer inputs. Cards retain the normal guarded Passport action and exact company/deal fetch validation. No new entitlement or original-editor activation was introduced.
- Retained cards from a previous workspace cannot request records after a company switch. Repeat clicks while loading are ignored. Accessible card labels identify both the destination and property.
- Customer workflow and Passport module tests cover exact property routing, paid/Free destinations, returned guarded actions and stale-company refusal. These tests use controlled DOM/API doubles; signed-in rendered-device acceptance and the original four-table real-session gate remain open.

## Property notes editing
- Passport Overview now includes a notes editor for server-listed company owners/admins/editors with Passport access. It reuses `update_company_deal` with a notes-only patch, and reads the exact company/property back before reporting verified success. Empty text explicitly clears notes. Viewer roles receive no notes editor; the backend independently rejects their edits. Existing Free access and original-record gates are unchanged.
- Draft text survives a save failure. Confirmed saves followed by failed verification are labeled accordingly, rather than reported as unsaved. Repeated submits and stale workspace responses are suppressed. Notes display safely as text, preserve line breaks and appear in the existing printed Passport; draft editors are excluded from printing.
- `tests/staging-passport-notes-security.sql` passed four grouped checks: own save/persist/clear, foreign company/property rejection, viewer rejection and anonymous rejection. All fictional fixtures and role changes rolled back. These database-role tests do not satisfy the original four-table real-session editor gate. DOM/API tests cover saved text verification, wrong-company responses, errors, cleared notes and mid-save workspace changes. Signed-in rendered-device testing remains outstanding.

## Property details editing
- Passport Overview now shows the company workspace and lets authorized editors update existing property type and unit-count fields through `update_company_deal`. It verifies the exact company/property and reloaded values before reporting success. Unit counts must be positive whole numbers; unknown counts remain null. Viewer roles receive no profile editor.
- Name/address identity rules, financial editing, original-record gates and membership allocations are unchanged. Company context identifies where records are held; it is not legal title/deed ownership. No new schema, legal ownership storage or document handling is included.
- `tests/staging-passport-details-security.sql` passed five rollback check groups: own save/persistence/unknown and invalid units, foreign company/property refusal, viewer denial, unchanged Free identity lock, and anonymous denial. These are database-role checks, not real separately authenticated sessions. DOM/API checks cover field validation, correct form visibility, company context, exact scope, reload mismatch/failure and stale saves. Rendered signed-in/device acceptance remains outstanding.

## Recorded financial coverage and navigation
- Passport Operations totals are explicitly labeled recorded income, expenses and ledger net across all recorded dates. The entry count and earliest/latest transaction dates are shown; an empty ledger is labeled unrecorded performance, and invalid dates prevent activity totals from being shown. Dates/count refresh after activity saves.
- Ledger net is not a monthly projection, verified profit, or underwriting-versus-actual comparison. Missing transactions, loan payments and other costs are not inferred. Financial snapshot rent and operating costs are labeled estimates. Repair costs still require a ledger expense when paid; they are not counted twice.
- Financials now shows the existing saved snapshot alongside its editor and links directly to Operations. This is a navigation/clarity correction; monthly Pro reporting, backend entitlements and original-record write gates are unchanged. Automated checks cover coverage bounds, impossible dates, empty history, Financials snapshot visibility and Operations navigation; rendered-device acceptance remains open.

## Pro saved-estimate comparison
- Added single-property current monthly estimate versus recorded-month income/outflows/net in the existing Pro Financial Reports page. Backend authorization remains active Pro or separate verified owner preview; browser plan changes cannot grant access. Ordinary Investor/Free/inactive clients are denied.
- The comparison uses current saved assumptions, not an immutable purchase-time budget. Filtered subsets and portfolio-wide estimates are not compared with a full-month baseline; empty months and invalid assumptions have explicit notices. CSV remains recorded transactions only.
- Six grouped staging SQL tests passed with synthetic data rolled back; thirteen finance module/DOM tests passed, including exact differences, filter invalidation, incomplete/empty data and existing access/export protections. The staging query alias issue was corrected before the UI release. Rendered signed-in/mobile acceptance and a frozen underwriting baseline remain open. Original Passport editor gates, marketing website, payments, advertising and production were not changed.

## Database handoff baseline
- Added a metadata-only application baseline containing 20 tables, two sequences and 33 functions with constraints/indexes/triggers/RLS and table/function/schema/column permissions. Customer rows, Auth users, secrets and staging owner-preview email rules are excluded. New-baseline owner preview is disabled; live staging was not changed.
- The baseline restores in an isolated PostgreSQL engine and matches captured schema/permissions. Seven SQL suites pass 41 grouped checks against the restored schema. A second baseline application over existing app tables is rejected. `npm test` now includes this restore regression, with pinned development-only engine dependency.
- `supabase/baseline/README.md` and `manifest.json` document empty-environment setup and migration history; do not replay old migrations or apply the baseline over staging. The local Auth test contract is not Supabase login/JWT/email verification. Hosted platform rehearsal and real separately authenticated Passport tests remain unverified.

## Rendered owner desktop checks and original-editor preparation
- Normal owner-preview sign-in and fictional-fixture desktop testing passed for notes/details, real activity saves/refreshes, repairs/tasks, Pro comparison/bookkeeping/CSV and two-property printable documents. Exact fixture cleanup was verified; the original three properties remained. See `property-passport-browser-test.md` for the boundaries and values. Phone/native packaging and ordinary paid-account rendered acceptance remain open.
- Corrected an active navigation text/background contrast issue found in dark mode.
- Original-record writes are now Pro/verified-preview plus editing-role only in RLS; Investor history reads remain. Three grouped staging SQL checks passed, with rollback; the baseline now includes this policy and 44 local SQL check groups.
- The existing real-session runner now has a controlled browser adapter to avoid manual token copying. No original customer editor was enabled by this preparation. Actual two-account evidence is still required before changing its gate.
