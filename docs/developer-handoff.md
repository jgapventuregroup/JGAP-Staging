# The Key Ahead Investor App — developer handoff

Legal owner: JGAP Venture Group LLC. Public brand: The Key Ahead. Tagline: Your Future Has a Front Door.

Continue `jgapventuregroup/JGAP-Staging` on `main`. This is the existing investor application. Do not replace it, create another repository, or change the separately completed marketing website. This document describes staging; it does not authorize production work or paid services.

## Architecture and local setup

This is a static HTML/JavaScript application, not a Next.js build. `index.html` contains the app shell, dashboard, navigation, company selection, Deal Analyzer and property workflows. Native ES modules implement Passport, original record adapters, ledger/repair/task validation and summaries. `account-recovery.js`, `deal-intelligence*.js` and `lenders.js` supply the recovered account, listing-review and lender tools.

The browser uses pinned Supabase JS `2.117.3` from jsDelivr. Auth and PostgREST/RPC provide the backend. Company membership lives in PostgreSQL; RLS, role checks, composite foreign keys and triggers enforce ownership, editing permissions and lifetime save limits. Browser flags control presentation only and must never become an authorization boundary.

Use Node 22, the locked dependencies, and a static HTTP server:

```sh
npm ci
npm test
npm run check:edge
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. No bundler is needed. Use staging accounts only. Auth email/recovery links additionally require a correctly configured allowed redirect origin. The password recovery script and app contain staging URL assumptions; configure and test these explicitly for any future approved origin.

## Configuration and secrets

| Setting | Location | Handling |
| --- | --- | --- |
| Supabase project | `supabase/config.toml`; staging origins in `index.html` and `account-recovery.js` | Staging ref `qfszapteuxuogoselprp` only; inventory all origins before a separately approved production release |
| `JGAP_STAGING_PUBLISHABLE_KEY` | `config.js`, with one-time input fallback | Browser-safe publishable key only; never insert a secret/service-role key |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge runtime | Server-only; transfer using the owner's secure credential manager |
| `JGAP_BILLING_ENABLED` | Edge runtime | Must remain unset/false for this handoff |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Edge runtime | Do not configure live credentials or enable billing without owner approval |
| `STRIPE_INVESTOR_PRICE_ID`, `STRIPE_PRO_PRICE_ID` | Edge runtime | Future test-mode integration; verify fixed monthly USD pricing |
| Billing origin/return URL | `supabase/functions/_shared/billing-runtime.ts` | Currently staging origin; change only with environment approval |

Do not commit `.env` files, session tokens, passwords or database exports containing rows. Existing `JGAP` variable names identify internal compatibility APIs; renaming these casually breaks recovered modules.

## Database map and migration procedure

| Objects | Role |
| --- | --- |
| `companies`, `company_members` | Workspace identity and owner/admin/editor/viewer roles |
| `deals` | Saved properties, underwriting, offer fields, notes, follow-up and Passport financial snapshot |
| `company_lifetime_deal_usage` | Monotonic save counter; deletion never refunds Free quota |
| `property_ledger_bookkeeping` | Pro-only supplementary bookkeeping attached to exact existing ledger entries; retained but inaccessible after downgrade |
| `company_subscriptions`, `subscription_change_audit`, `billing_webhook_events` | Server-managed plan/status, audit and webhook idempotency |
| `lenders` | Company-scoped lender contacts |
| `property_ledger_entries`, `property_repairs`, `property_tasks` | Live basic operations; company/deal FKs, immutable identity, server attribution/timestamps; own-company reads retained after downgrade and paid/owner-preview editing |
| `property_assets`, `property_asset_services`, `property_maintenance`, `property_improvements` | Original Passport records; company/deal/equipment composite foreign keys; editors gated |
| Eligibility, abuse-review and invitation tables | Restricted administrative/onboarding functions; no broad client policies |

Important RPCs: `list_my_companies`, `create_my_company`, `list_company_deals`, `get_company_deal`, `create_company_deal`, `update_company_deal`, `create_company_deal_from_listing`, `get_my_lifetime_deal_usage`, `can_access_passport`, `has_owner_preview_access`, `update_passport_financials`, `property_operations_access`, `advanced_finance_access`, `get_advanced_finance_report`, `save_property_bookkeeping`, `calculate_secondary_financing`. Review their deployed definitions and grants when changing callers.

**A schema-only application baseline and isolated restore test are now available in `supabase/baseline/`.** See its README for the empty-environment procedure and platform prerequisites. Historical snapshots in `supabase/*.sql`, incremental migrations and proposals in `docs/sql-drafts/` must not be replayed over that baseline. Do not treat drafts as applied migrations or run a blind `db push` against an existing environment.

The captured baseline contains no customer/Auth rows or credentials; staging owner preview returns false in new environments. It restores locally with schema/permission comparisons and 44 grouped SQL security checks. The local Auth fixture is a test contract, not real Supabase Auth. A hosted Supabase restore/configuration rehearsal and normal-session isolation remain production release gates. No baseline was applied to staging or production.

The incremental financial-write guard is in `supabase/migrations/20261024133246_guard_passport_financial_writes.sql`. The connector applied the same named migration in staging with remote version `20261024133340`; reconcile this version mapping explicitly before using CLI history operations. It adds a private SECURITY INVOKER trigger and does not delete customer data. It protects both table INSERT and changed Passport financial fields on UPDATE, including direct API calls. Ordinary basic deal edits are unchanged. PostgreSQL administrators and server service-role calls are explicitly trusted. Numeric NaN/infinity/negative amounts are rejected on changed snapshots.

## Membership and Version 1 scope

`membership-feature-matrix.md` is the authoritative allocation. Preserve Free's existing Analyzer, maximum-offer, Pipeline and Intelligence access. Free has five lifetime property saves. Active Investor/Pro get unlimited saves and basic Passport authorization. Expired/inactive/downgraded states keep saved data but lose paid mutations and extra save eligibility. Customers cannot update their own subscription. Owner preview is a separate verified staging exception, not evidence of payment and not a substitute for ordinary paid-customer testing.

| Passport requirement | Current implementation / limitation |
| --- | --- |
| Details | Saved address/type/stage/units and purchase date; type and units editable by authorized roles with verified reload; ownership is company context, not a title/deed management system |
| Purchase/finance | Purchase price, current value, mortgage balance, equity, rent/expense snapshot; authorized financial snapshot editing |
| Notes/follow-ups | Existing deal notes and pipeline stage/date; not a separate task-history system |
| Systems, equipment, service schedules, maintenance, improvements | Existing readers and writers; active Pro/verified preview owner/admin/editor writes enabled after the 128-check real-session gate; Investor/viewer history read-only |
| Income/expense ledger, repairs and tasks | Basic connected records, history, add/edit, repair completion/costs and task completion/reopening. Cash totals are all recorded ledger entries, separate from repair costs; not CPA-ready advanced accounting |
| Documents | Private Pro upload/list/download verified with 58 real-session API checks and ordinary Pro desktop form acceptance; replacement/removal, scanning, mobile and hosted file recovery remain open |
| History | Existing stored dates/records only; no comprehensive versioned property history |
| Advanced Pro suite | Financial Reports and bookkeeping CSV are restored in a bounded scope (see `finance-recovery.md`). Money-Making System, Market Map, Deal Radar, alerts, lead generation, customization and advanced team controls remain incomplete |
| Laundromat Division | Deferred; excluded from this release |

The full approved Pro offering is **not yet handoff-complete**. Keep missing capabilities clearly labeled. Do not sell a complete Passport or advanced suite based solely on a plan label. Document handling and the remaining advanced Pro modules remain development work, distinct from the outside company's billing/deployment responsibilities.

## Tests and evidence

- Four main push workflows: **JGAP staging checks**, **Staging app tests**, **JGAP V1 Verification**, **Publish JGAP staging website**. Two additional manual/PR workflows cover Investor regressions and preview artifacts; they are not extra automatic main-branch release checks.
- `npm test` runs app/Analyzer/onboarding/account recovery/listing/lender/billing tests and Passport/module regression tests. Most browser behavior tests use mocked DOM/data; they do not prove live Auth email delivery, real subscription provisioning or production RLS.
- `npm run check:edge` runs Deno type checking for the two existing billing functions; it does not deploy/enable them.
- `tests/staging-membership-security.sql` passed nine grouped staging checks using fictional companies and rollback. It exercises database entitlements, invalid amounts, lifetime counts after deletion, subscription tampering, active/inactive/downgrade behavior and viewers. It simulates Auth identity under the database role and is supplemental evidence only. Use SQL stop-on-error behavior; rollback/disconnect after any failure.
- `tests/staging-operations-security.sql` passed six grouped checks using two companies and rollback: own create/update/persistence, foreign access denial, immutable identity, creator spoofing, company/deal FK, inactive/downgrade retention and denial, viewer denial, Pro editing, task timestamps and anonymous denial. These are database-role tests, not normal signed-in sessions.
- `tests/staging-tenant-isolation.sql` is read-only supplemental SQL, not original Passport writer approval.
- `scripts/passport-live-isolation.mjs` is an opt-in real-session gate. Supply private environment values `TKA_STAGING_PUBLISHABLE_KEY`, `TKA_SESSION_A`, `TKA_SESSION_B`, `TKA_COMPANY_A`, `TKA_COMPANY_B`, and `TKA_RUN_LIVE_PASSPORT_TEST=staging-fixtures-only`; run `node scripts/passport-live-isolation.mjs`. Sessions must come from normal verified sign-in for two different users, each allowed to edit its company and not belonging to the opposite company. Both must already have server-authorized Passport access; this runner never changes subscriptions, creates users or fabricates tokens.
- The live runner creates two fictional properties per company, tests each original table's own SELECT/INSERT/UPDATE, cross-company access/transfer refusal, service equipment relationships and anonymous denial. It removes only properties it created, using their exact IDs and run-specific names. Creation still increments lifetime counters. Use designated staging test workspaces; inspect fixture cleanup after failures. Do not use customer or production workspaces. Exported evidence uses A/B labels and HTTP statuses, never session tokens or returned private row bodies. The offline tests validate the runner's guards; **they do not mean the live suite has run**.
- Rendered desktop/mobile/print QA remains pending in this takeover environment: Chromium was unavailable and its download did not produce a valid archive. Responsive source checks and mocked DOM navigation passed; do not describe these as real-device verification.
- Even after live runner success, inspect evidence and recheck session persistence/browser workflows before removing the existing hard write gate. No automatic test toggles `JGAP_ORIGINAL_PASSPORT_WRITES_READY`.

## Basic property operations integration

The additive migration `supabase/migrations/20261024135041_property_operations.sql` is applied only to staging. It uses the existing `(company_id,id)` unique deal index, not a second property model. Earlier review-only drafts are proposals, not an instruction to replay them now. The staging connector recorded remote version `20261024135119`; reconcile that mapping with the CLI-generated source filename before future CLI history operations.

`property_operations_access` returns read/write presentation capability for the selected workspace. The app does not enable operations if the RPC fails. Every actual read/write still uses table grants and RLS. Paid Investor/Pro and verified staging owner preview may edit; company viewers may read; Free/inactive members keep their own history but cannot write. Original systems/equipment/service/maintenance/improvement writers separately require server Pro write capability and an editing role.

`property-activity-writer.mjs` reuses existing validators for both inserts and updates. Updates filter exact ID/company/deal; form input cannot override scope. Record creator, creation date and ownership are immutable; task completion time is derived by the database, including reopening. Client DELETE is intentionally not granted. Deleting a parent property through an authorized existing workflow cascades its activity, so preserve backup/recovery procedures.

Passport Operations shows entries and summaries and provides collapsed add forms and inline edit forms. Confirmed saves with failed refresh lock the form until the Passport is reopened. Late company/session results are discarded. Transaction totals page through the complete history; more than 10,000 entries per collection fails closed instead of showing a misleading total. This is a V1 display limit. Keep real-device QA open; new DOM mocks do not prove rendered layouts.

## Recovered Pro reporting

See `finance-recovery.md` for the original-module mapping, backend contracts, five grouped staging security checks and explicit accounting/document limitations. `finance-cpa.mjs` mounts into the existing app's Financial Reports page, which uses company-scoped invoker RPCs rather than client-selected plan values. The deploy and preview allowlists include this module. Report exports re-authorize and reload identical filters immediately before download; company/filter changes invalidate older responses.

Migration source `supabase/migrations/20261024142418_advanced_finance.sql` maps to remote staging history version `20261024142543`. Pro bookkeeping is stored separately from the basic ledger so Investor access to basic records does not expose Pro-only metadata. The exact transaction ID replaces the original latest-row lookup. Downgrade preserves metadata; reactivation restores its visibility. Normal signed-in, device and final export QA remain open.

## Paid CELCO / HELOC financing

The owner's October 24 instruction makes the existing secondary-loan estimator Investor/Pro only. The app shows it expanded near the primary loan inputs after server authorization and hides it behind a plan notice for Free. The backend `calculate_secondary_financing` RPC independently checks current active Investor/Pro entitlement or verified owner preview, validates inputs and calculates interest-only costs/combined cash flow. Do not restore a client-only paid calculation fallback. Other Free Analyzer calculations remain unchanged.

The scenario is not persisted and is separate from primary mortgage and maximum-offer results. It excludes principal repayments, fees and variable-rate changes. `tests/staging-secondary-financing-security.sql` records six grouped rollback checks; the customer workflow tests exercise UI authorization, copied down payment, exact calculation context and stale-response suppression. Normal signed-in/device testing remains separate from these tests. See the incremental `paid_secondary_financing` migration and reconcile its CLI source timestamp with remote history before using CLI migrations.

## Billing and advertising integration

Retain the existing test-mode billing adapters in `supabase/functions/`; do not replace them without reviewing their unit tests. `billing-session` validates bearer identity and company role. `billing-webhook` validates raw signed events, canonical subscription/payment state, customer association, ordering and idempotency before the service-only RPC updates entitlement. `verify_jwt=false` in function configuration means authentication is handled in the appropriate handler; session and webhook endpoints have different trust models. Keep the server kill switch off.

The outside company must finish sandbox end-to-end checkout, portal, renewal, failed payment, cancellation, refund/reconciliation behavior and webhook delivery before any live activation. A browser redirect never grants membership. No service-role credential belongs in client code. Recheck company authorization and plan/status on every backend paid action added later.

Dashboard and properties pages reserve labeled sponsored placements. Active Pro is ad-free; Free and active Investor may show placeholders. No network tags or invented paid partners are present. Future integration needs approved creatives/inventory, consent/privacy decisions, provider restrictions, reporting, loading/error behavior, layout stability and a server-verified ad-free entitlement. Do not serve ads until the owners approve the provider and integration.

## Release, rollback and ownership

1. Finish the remaining feature/security scope above. Keep the original Passport write gate closed unless its separate evidence is accepted.
2. Record the exact candidate SHA and require all four main push workflows to complete successfully on that SHA. An earlier green commit or a queued check is insufficient. Preserve links/run IDs in handoff evidence.
3. Check desktop/mobile, keyboard navigation, print for multiple selected properties, dark mode and actual Auth email redirects on the candidate. Record where mocks were used.
4. Review security advisors: authenticated definer RPCs must have fixed search paths and explicit identity checks; administrative RLS tables intentionally deny client access. Assess leaked-password protection availability/configuration. Do not silence advisors with permissive grants.
5. The outside company prepares a tested schema-only baseline, backups and restore rehearsal, environment/origin configuration, monitoring, incident contacts and deployment rollback. Agree on RPO/RTO and who responds to alerts.
6. Obtain explicit owner approval before production infrastructure changes, real charges, paid services, live ads or public deployment. Coordinate the existing website and book launch with the owners.
7. On an app regression, revert the affected commit on `main` using a normal revert commit and wait for its four checks; do not force-push history. Staging Pages publishes only the allowlisted frontend assets in `pages.yml`, never the repository wholesale.
8. Database rollback is separate from a Git revert. Preserve the financial guard while investigating; reverting its migration reopens the confirmed bypass. Any proposed DB removal needs a specific reviewed script, backup and appropriate owner approval. Prefer a forward fix. Do not replay historical SQL snapshots to roll back.

Handoff access should be granted through GitHub/Supabase account permissions. Transfer secrets securely and confirm owner/admin recovery access. The app remains staging-only until its production release is separately approved.

## Website and app brand continuity
The owner supplied website screenshots on October 24, 2026 as the visual reference: deep navy headers, orange actions, white cards, pale blue workspace surfaces, bold headings and clear next-step navigation. The staging app now shares these colors across its header, dashboard, forms, Analyzer and Passport while retaining dark mode and existing page IDs. The marketing website was not changed. Rendered mobile/desktop acceptance remains required.

The owner's distribution intent is to sell access to the investor app and the forthcoming book through the marketing website. App download/install packaging is not delivered by this styling change. The handoff company must agree the supported platforms and implement the download/install experience, book delivery and checkout, and server-verified subscription provisioning. Preserve the current plan matrix; do not equate a downloaded app with a paid entitlement. No live commerce or advertisements were enabled.

## Financial presentation boundaries
Passport Operations sums all loaded ledger dates and shows the transaction count/date range. Ledger net represents recorded income minus recorded expenses; it must not be advertised as verified monthly profit or compared with monthly Analyzer assumptions. Empty history is not evidence of zero actual activity. Mortgage payments, missing expenses and repair outlays are included only when explicitly recorded as ledger entries. Pro reports now compare a current saved monthly estimate with a selected property/month’s recorded totals. A frozen purchase-time underwriting baseline and certified actual-performance reporting are still unfinished. Pro monthly reports retain their separate server-authorized filtering and bookkeeping exports.

## Pro current saved-estimate comparison
The existing `get_advanced_finance_report` invoker RPC now includes an `estimate` object. Active Pro or verified owner preview is still checked in the backend; no new privileged helper or table was added. Comparison requires one selected property with Reconciliation and Tax treatment both set to All. Portfolio and filtered reports return a status instead of a misleading full-month comparison.

Estimates use current saved target offer (falling back to purchase price), rent, other income, vacancy, operating expenses, down-payment percentage, primary interest rate and loan term. Income is rent after estimated vacancy plus other income. Outflows are operating expenses plus amortized primary mortgage payments (including zero-rate and all-cash cases). Currency components round to cents before totals and differences; decimal strings and BigInt cents preserve display accuracy. Invalid/missing/nonfinite assumptions return `incomplete`; they are not substituted with zero. Empty recorded months have no comparison table.

This is not a frozen underwriting budget or verified bank reconciliation. Recorded expenses may contain capital/loan costs; missing transactions and secondary financing are not inferred. The existing bookkeeping CSV remains transaction-only. Frontend filter/company invalidation and fresh export authorization remain in place.

Staging migration mapping: source `20261024155953_saved_finance_comparison.sql` → remote `20261024160056`; source `20261024160304_saved_finance_comparison_scope_fix.sql` → remote `20261024160326`. The second migration fixes a record/table-alias collision caught before the UI release; apply both in order, with the second as the final report definition. These incremental files do not complete the missing schema baseline. Manual rollback of this report extension only is `supabase/rollbacks/saved_finance_comparison.sql`; review before using it, never run the entire older advanced-finance migration as a rollback. No customer data is removed.

`tests/staging-saved-finance-comparison.sql` passed six grouped staging checks with rollback fixtures: exact estimates/month boundaries, both-company isolation, zero-rate/all-cash/fallback and invalid assumptions, viewer reads, Free/Investor/inactive denial plus reactivation retention, and anonymous denial. These simulate database roles; real-session/browser/device checks remain separate. Security advisor findings remained the existing administrative deny-by-default tables, three intentional authenticated definer helpers and disabled leaked-password protection; no new finding involved the changed invoker report.

## Schema restore verification
Run `npm run check:database-baseline` for deterministic generation, empty-schema restore, exact schema/ACL/column-grant checks, fail-safe refusal over existing app objects and the eight SQL security regression suites. `npm test` includes this verification, so all four main push workflows exercise it. The PostgreSQL engine dependency is development-only and excluded from frontend packaging. Read `supabase/baseline/README.md` before any future database setup. The original real-session Passport gate and hosted platform acceptance remain separate.

## Original-record Pro enforcement and browser gate adapter
Original equipment/services/maintenance/improvement INSERT/UPDATE policies now use `can_access_advanced_finance` plus an editing role; Investor retains its existing paid read/history access. Free/inactive and Pro viewer writes are denied. The source migration is `20261024215841_original_passport_pro_writes.sql`; see the baseline manifest for its remote version. Three grouped staging rollback tests passed; the refreshed local baseline runs 44 grouped checks across eight SQL suites. Actual separate-session evidence subsequently passed 128 checks; the frontend now enables these editors only with Passport access, server Pro write capability and an editing role.

The existing CLI gate is now a thin wrapper around a browser-safe shared core. The controlled browser adapter is `previews/passport-security-gate.html`, with explicit dual-account sign-in, company selection, test consent, fixed staging origin, exact fixture cleanup and sanitized evidence. It is a staging test utility, not a new customer application or a shortcut around the release gate. The credential form never prints/stores passwords or tokens, and session cleanup uses `scope: local`.

## Original editor activation — October 25, 2026
The real two-account gate passed October 24 using normally authenticated verified accounts, two exclusive disposable Pro companies and 134 HTTP requests. Sanitized evidence is committed at `docs/evidence/passport-live-isolation-2026-10-24.json`; see the browser test document for cleanup and coverage. The four original editors now use server `advanced_finance_access.write`, Passport access and owner/admin/editor role together. Sign-out/company changes reset both read/write flags. Changing browser flags cannot bypass the already-enforced table policies.

`npm test` passed for the activation change, including Pro owner allowance, Pro read-only denial, viewer-role denial despite inconsistent write capability, malformed capability denial, sign-out reset and restored-schema RLS regressions. The deployed original form create/edit/reopen acceptance is still pending; the shared browser session closed and signing in independently does not share its session with automation. Mobile, documents, advanced Pro tool completion and hosted restore rehearsal remain separate release work. Earlier pending-gate descriptions are historical and superseded by this evidence.

## Correcting existing original Passport records — October 25, 2026
Pro editing roles/verified preview now receive collapsed Edit controls for existing equipment, service schedules, maintenance and improvements. These reuse the original form/writer modules rather than another application. Updates target the exact record ID, company and property; the update payload cannot transfer identity. Optional fields support explicit clearing (including nullable schedule unit and maintenance status); zero costs are retained. Service equipment membership is rechecked. Each update reads the saved record back and verifies submitted values before reporting success. Session changes, denied/empty/mismatched responses and readback failures prevent verified-success messages. The form retains drafts on failure; edit controls are excluded from printing. No schema or RLS changes were needed.

The complete local test suite passed with added update scope/readback/clearing/zero/stale-session and edit form regressions. Real rendered add/edit/reopen acceptance remains pending; mock/form checks do not replace it.

## Live original editor acceptance and public asset versions — October 25, 2026
Actual browser testing found and fixed the add-form dispatcher contract, then verified creation, corrections, optional-field clearing, true zero costs and close/reopen persistence across all four original types. Both the combined first-schedule flow and separate schedule form passed; linked equipment names refreshed. See `property-passport-browser-test.md` for exact values, build marker and evidence limits. Five child records and one fictional fixture property remain pending explicit cleanup approval after an automatic review rejection. Do not repeat or bypass that deletion without approval.

Pages and preview packaging now invoke `scripts/version-frontend.mjs dist` after their existing explicit public-file allowlists. The deterministic hash covers the public sources; local script URLs and transitive module import/export URLs use the same release query parameter, while external SDK URLs remain unchanged. A non-visible `tka-build` meta marker identifies the bundle. Source files stay unversioned in Git. Packaging tests verify complete versioned import traversal, deterministic tokens, changed-dependency token changes and failure on missing transitive modules. This reduces mixed cached releases; the browser has confirmed the versioned build. No production hosting or marketing website changed.

## Fixture cleanup and narrow-screen follow-up
The owner approved the exact original-editor QA fixture deletion only. The guarded transaction deleted one matching property and its five expected original child records; all five remaining-count categories returned zero. Earlier pending-cleanup notes are historical. No company, account, lifetime counter or other property was changed. Narrow-screen CSS now bounds equipment fieldsets, wraps legends and record edit summaries, preserves 16px form text and gives controls 44px minimum targets. Passport open/close accessible labels retain the property name, with lifecycle regression assertions. Physical device/mobile browser acceptance remains open.

## Private Passport documents foundation
See `passport-document-storage.md` for the private bucket, Pro/company/property read and insert policies, immutable paths, local browser validation and authenticated attachment downloads. Three staging SQL-role check groups passed with complete fixture rollback; the local restored-schema Storage contract and browser module tests are included in `npm test`. Customer controls stay disabled until the separate normal authenticated Storage API gate and actual form acceptance pass. The app baseline intentionally excludes managed Storage; canonical setup and recorded migration versions are linked from its manifest/README. No physical files were uploaded and no existing customer records were changed.

## Real document API gate passed and staging controls enabled
The two normally signed-in verified test users passed 58 fresh Storage API checks, with original successful upload evidence preserved separately. Inactive cached downloads initially failed the test, including with browser no-store alone; the app and gate now send a unique `cacheNonce` plus no-store, and the fresh inactive test passed. See `passport-document-storage.md` and the three sanitized evidence files, including the incomplete attempts. The two disposable Pro companies/properties and two fictional PDFs remain; status/role changes were confined to those companies and restored. No files or records were deleted. Staging document controls were enabled only after reviewing the passing API evidence; actual form and device acceptance remain required.

## Document desktop acceptance — October 26, 2026
Ordinary Pro (not owner preview) uploaded a fictional PDF through the actual Documents form, reopened Passport and downloaded the identical 1,460 bytes. See `passport-document-storage.md` for the digest, retained-fixture inventory and boundaries. Three fictional PDFs now remain across the two disposable test workspaces; no deletion was performed. This supersedes older statements that actual document form acceptance is pending. Physical phone/viewer UI and hosted recovery remain open.

## Money-Making System recovery boundary — October 26, 2026
See `finance-recovery.md` for the original module audit. The Pro reports now include a recorded cash-source breakdown by exact property ID using existing backend authorization and exact-cent totals. It does not mix estimated rent into recorded income or restore legacy Analyzer patches/personal laundry reserves. This is a bounded recovery step; the full Money-Making System and other advertised advanced tools remain incomplete. New table signed-in/device acceptance is pending.

## Pro seller-financing playbook — October 26, 2026
Recovered a bounded comparison tool inside Pro Financial Reports, with server-side Pro/current-company authorization. It is a read-only scenario calculator, not saved loan terms or a complete Money-Making System. See `finance-recovery.md` for inputs, formulas, balloon assumptions, staging rollback test evidence, setup and rollback. New baseline environments must apply the separate `supabase/features/seller-financing.sql` add-on; the captured baseline itself is unchanged. Signed-in/device acceptance remains open.

## Latest ordinary Pro desktop acceptance
`evidence/pro-playbook-desktop-2026-10-26.json` records nine passed desktop check groups on `310bf52`, including actual calculator RPC results, invalid-term handling, Free-workspace UI denial and document print cleanup. It closes the seller-playbook desktop and transient print-message live-review gaps. Physical phones, viewer UI and a nonempty cash-source breakdown remain open. No records/files/plans changed; full Money-Making System completion is still not claimed.

## Saved Deal Radar and original advanced-tool audit
`docs/advanced-pro-recovery.md` records original module blob IDs, missing legacy tables and external-map/feed dependencies. The new read-only Saved Deal Radar page provides active Pro/verified-preview company-scoped saved-price gaps, data verification flags and due follow-ups. It does not perform external discovery or geocoding. Four staging SQL-role rollback groups and local restored-schema/UI tests passed. Setup requires the separate later-baseline add-on `supabase/features/saved-deal-radar.sql`; migration version `20261026110332`. Normal-session/device acceptance remains open. No records, emails, feeds, contacts or permissions were added to customer workspaces.

## Consolidated Money-Making overview
The Pro overview now brings current recorded value/debt/matched equity and whole-workspace recorded-month activity together, with coverage and clear separation of snapshots from historical activity. See `finance-recovery.md` for scope, formulas, exclusions, test evidence and rollback. Canonical later-baseline add-on: `supabase/features/money-making-overview.sql`, remote migration version `20261026112123`. Existing tools are linked, not replaced. Normal-session/device acceptance remains open. The remaining full advertised Pro tools still require implementation; do not describe this as a complete launch.

## Overview/Radar bounded normal-session acceptance
`docs/evidence/money-radar-desktop-2026-10-26.json` records eleven desktop checks on `f8d848c` for overview unknown/empty coverage, month invalidation/reload, Radar missing-data/search/empty filters/navigation, Free restrictions and restored Pro access. The existing fixtures were read only; zero saved records/files/plans/roles changed or deleted. This closes those specific signed-in gaps. Populated-value/positive-signal, ordinary viewer and physical-device browser cases remain open; full external Pro tool completion is unchanged.
