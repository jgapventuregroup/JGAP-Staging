# Pro financial reporting recovery

Source: `jgapventuregroup/JGAP-Venture-Group/finance-cpa.js`, reviewed October 24, 2026. This feature is selectively adapted to the existing `JGAP-Staging` application, not a replacement app or copied database.

## Restored behavior

| Original feature | Current staging implementation |
| --- | --- |
| Monthly property transaction view | Financial Reports → month and property filters over the existing `property_ledger_entries` |
| Income, expenses, net and unreconciled totals | Server-selected transaction set and exact PostgreSQL sums, independently checked with integer cents before display |
| Category breakdown | Income, expense and signed net per category for the same filters |
| Vendor/payee, payment method, account, tax label, reference, reconciliation, notes | Pro-only `property_ledger_bookkeeping` record attached to an exact existing ledger entry |
| Transaction history and details | 50 records per displayed page; read-only viewers may inspect reports/details |
| Bookkeeping CSV | The same month, property, reconciliation and tax filters as the screen; fresh backend authorization before download; quoted cells and formula-text neutralization |

The original save flow selected the latest transaction after creation, then wrote supplementary details in a second request. That could attach details to a different concurrently created record. The current `save_property_bookkeeping` RPC receives the explicit company/deal/ledger-entry IDs and atomically inserts or patches only that transaction's metadata. Basic transaction creation/editing stays in Passport Operations. There is no parallel `financial_transactions` or `properties` model.

## Backend boundary

`can_access_advanced_finance` requires current company membership and active Pro status or the separate verified staging owner preview. An ordinary Investor subscription cannot access the report RPC or bookkeeping table. Browser labels cannot confer access. `advanced_finance_access` returns read/write presentation capability; table RLS and invoker RPCs enforce the actual access.

Owners/admins/editors with entitlement may save bookkeeping details. Pro viewers may read/export but cannot edit. Foreign company reports, metadata, updates and property filters are denied. Immutable company/deal/ledger links and a composite foreign key prevent reassignment. Server attribution is preserved even when another authorized editor patches the same metadata record. There is no client DELETE grant.

Downgrade, cancellation and past-due states deny advanced read/write APIs while preserving the stored metadata. Basic ledger data retains its existing access rules. Pro reactivation restores access to retained bookkeeping records. No customer subscription was changed during development.

The report RPC uses one filtered snapshot of up to 10,000 rows, then derives period and category totals from that exact set. Larger reports fail with an instruction to select one property; no partial total is presented as complete. Currency values travel as decimal strings and are displayed/exported without unsafe floating-point cent arithmetic.

Migration source: `supabase/migrations/20261024142418_advanced_finance.sql`. Applied only to staging; connector migration history version is `20261024142543`. Reconcile source/remote version mapping before future CLI history operations. This remains an incremental migration, not a complete database bootstrap.

## Verification

`tests/staging-advanced-finance-security.sql` passed five grouped checks with two fictional companies inside a rollback transaction:

- Exact cent totals, month boundaries, property/category/reconciliation/tax filters, empty results, partial patch validation and immutable transaction links.
- Foreign-company SELECT/UPDATE/report/save denial and foreign-property filter refusal in both directions.
- Investor/Free/past-due/canceled Pro denial through RPCs and direct table access, while retaining basic ledger history.
- Pro viewer read-only behavior, reactivation persistence and atomic shared-editor patches that preserve original attribution.
- Anonymous metadata/report/save denial.

The fixture cleanup check found zero leftover test companies. These are SQL-role tests with simulated identity; they do not replace normal signed-in browser sessions or the original Passport editor security gate.

`tests/finance-cpa.mjs` covers decimal precision, report integrity, CSV escaping/formula safety, Pro-only UI access, fresh-authorized export, exact-entry saves, read-only viewers, stale workspace responses and rejection of exports when renewed backend access fails. `tests/customer-workflow.mjs` checks the live app context's backend capability and transaction/company boundaries. These DOM tests are not rendered device testing.

## Explicit limits

- These are recorded property transactions, not bank-verified accounting or a tax return. Reconciliation is a manual marker; no bank integration is connected.
- Tax treatment labels organize records for bookkeeper/CPA review; the app does not determine tax eligibility or calculate tax filings.
- Receipt/reference is text only. Receipt/document upload and attachments remain unfinished.
- Company/general transactions from the original module are not migrated: current transactions remain property-linked by design. No synthetic property or fake general ledger is created.
- No bank reconciliation imports, balance sheet, depreciation, immutable accounting audit trail, receipt capture or comprehensive CPA package is claimed.
- Documents, the Money-Making System, Market Map, Deal Radar, alerts, lead generation, dashboard customization and advanced team controls remain unfinished/deferred as documented elsewhere. Laundromat Division remains excluded.
- Real-session, rendered desktop/mobile and end-to-end download verification remain open. Original Passport editors stay disabled until their separate gate passes.

## Current saved estimate versus recorded month
The Pro report now includes a current saved-estimate comparison for a single property and unfiltered month. See the developer runbook for the `estimate` response, calculation/rounding rules, migration mapping, rollback and six grouped SQL tests. This is an incremental addition to the existing recovered report. It does not provide frozen underwriting versions or certify recorded data completeness; the CSV continues to contain recorded transactions only.

## Money-Making System cash-source recovery — October 26, 2026
Reviewed original `JGAP-Venture-Group/money-making-system.js` blob `65af19423c6b68db58552fa75997c3179a4fa569`. Its snapshot selects the first membership rather than the chosen workspace, relies on legacy `properties`/`financial_transactions` tables, combines estimated rent with recorded transaction income, and embeds personal laundry reserves and targets. Its trailing Analyzer monkey patches must not replace the working current Analyzer.

The current Pro Financial Reports now selectively recovers recorded income, expenses, net and entry counts by exact property ID for the selected month/filters. It reuses the existing server-authorized report and validated transaction rows; no schema, paid entitlement or Free experience changed. Amounts use exact BigInt cents. Two properties with identical names stay separate. Estimates are never added to recorded income, and absent properties are not shown as verified zeros. Existing filtered/subset report labels apply. The table uses the existing scrollable table container and safe text rendering.

This is one recovered building block, not completion of the full Money-Making System. Portfolio value/debt/equity coverage, seller-financing playbook, acquisition strategy and the other advanced modules remain unfinished. No hard-coded personal reserves, laundry division, bank feeds, ads or payments were added. Focused finance regressions cover grouping, exact amounts, empty history and foreign-row rejection; signed-in acceptance of the new table remains open.

## Seller-Financing Playbook recovery — October 26, 2026
The existing Pro Financial Reports page now includes an expandable Seller-Financing Playbook. It compares 10%, 15% and 20% down using entered price, monthly NOI, upfront costs, other monthly costs, annual rate, amortization years and balloon payment number. All results come from the new read-only `calculate_seller_financing(uuid,jsonb)` SECURITY INVOKER RPC, which uses current company Pro/verified-preview access; Pro viewers may calculate. Free, Investor, inactive, foreign-company and anonymous requests are denied. Inputs are finite and bounded; amortization/balloon must be whole numbers within range. Blank fields are not coerced into zero.

The monthly payment uses the existing amortizing-loan formula, including zero interest. The displayed monthly cash flow subtracts the displayed rounded note payment and other costs from entered NOI. Upfront cash is down payment plus entered closing/repair/other cash. Balloon balance is estimated remaining principal after the selected payment using unrounded amortization math; a fully amortized term has zero balloon. Real lender rounding, fees/default charges and refinancing terms are not modeled. Balloon cash is separate from upfront cash. No values are saved to properties, ledgers or the Analyzer. Input/company/access changes invalidate pending results; responses must match the exact company and inputs.

Canonical later-baseline setup is `supabase/features/seller-financing.sql`; the function was applied to staging through the named `pro_seller_financing_playbook` migration (remote version `20261026104340`). Do not rerun setup on staging or replay old migrations. Local PostgreSQL restore and UI tests pass, and `tests/staging-seller-financing.sql` passed five rollback security/calculation groups with zero retained fixture companies. These SQL-role tests are not normal-session browser acceptance. Security advisors introduced no new findings. The existing administrative deny-default tables, intentional helper warnings and leaked-password setting remain in the prior release checklist.

Rollback: remove the frontend playbook invocation first. After confirming no deployed caller depends on it, an administrator can revoke access to the new calculator function; no customer data was created by calculations. Do not reset schemas or remove unrelated RPCs. The rest of the full Money-Making System remains incomplete; ordinary signed-in playbook/device checks are pending.

## Ordinary Pro desktop acceptance — October 26, 2026
Normal test-account UI acceptance passed on deployed `310bf52` / marker `889b04fb09f5db3de6f9`. The default 6% / 30-year / 60-payment comparison matched all three payment and balloon results; changing rate cleared prior results. Zero interest showed $750.00/month and $225,000.00 after payment 60 for 10% down. Payment 361 was rejected for a 360-month term; payment 360 showed zero balance in all three rows. Switching to the existing Free workspace removed the calculator/report controls and displayed the Pro restriction; switching back to disposable Pro restored access without plan changes. The empty report month was explicitly labeled; nonempty property-breakdown browser acceptance remains open. Desktop width 1363px had no document horizontal overflow. No saved records, plans or files were changed or deleted. Evidence: `evidence/pro-playbook-desktop-2026-10-26.json`. Phone and ordinary viewer UI checks remain open.

## Consolidated Money-Making overview — October 26, 2026
The separate Pro overview page adapts the original snapshot into a company-scoped view of current saved value, mortgage debt, matched equity and whole-workspace recorded-month activity. Users can select all saved properties or records whose pipeline stage is exactly `closed`. Closed is not proof of ownership. Coverage is explicit per amount; unknown/invalid amounts remain excluded, while a genuine recorded zero balance counts. Equity sums only records that have both values, not two independently incomplete aggregates. It excludes other liens and selling costs. Current value snapshots are not historical valuations for the report month.

The monthly activity comes from the existing authenticated Pro report with all properties and no bookkeeping filters. It is explicitly independent of the saved-value scope. Estimated rent is never added to recorded income. An empty ledger is labeled unrecorded performance, not verified zero profit. Existing report, seller-financing, saved-deal review and property-record tools are linked without changing records.

`get_money_making_overview(uuid,text)` is STABLE SECURITY INVOKER and checks current Pro/verified-preview access. Free/Investor/inactive/foreign/anonymous are denied; Pro viewers may read. UI validates scope/month/coverage and recorded report consistency, clears changed-month results, drops changed-company responses and clears on sign-out. Canonical add-on and remote migration history are in the baseline README/manifest.

Local restored-schema and UI tests passed. `tests/staging-money-making-overview.sql` passed four rollback groups covering exact matched equity/coverage, zero/unknown distinction, recorded-only income, role/plan/company/month and anonymous access. The initial fixture attempt hit the normal activity authentication trigger and rolled back; the corrected fixture supplies its test identity before inserting ledger entries. No policy was weakened. Zero retained fixture companies were confirmed. Advisors retained the existing notices with no new finding. Normal-session desktop/device acceptance remains open.

This closes the missing consolidated snapshot implementation; it does not complete geographic Market Map, external discovery, alerts, lead-generation/CRM or advanced team/customization. Rollback removes the frontend caller first, then can revoke access to this new RPC; no customer data requires deletion or schema reset.

## Overview normal-session desktop review — October 26, 2026
`evidence/money-radar-desktop-2026-10-26.json` records review on `f8d848c` / build `551ddbc6791378479e86`. A normal Pro test account loaded the existing disposable workspace: Closed-stage scope correctly showed zero records/unknown balances; All saved scope showed one record with 0 of 1 covered, preserving unknown values. Changing month cleared prior output and reloaded the chosen month. The empty ledger was explicitly unrecorded performance. The Radar shortcut worked. Switching to the existing Free workspace denied both pages and cleared earlier Pro output; returning to Pro restored access. No records, files, plans or roles were changed. Desktop width 1363px showed no horizontal document overflow. Populated-value and ordinary viewer/phone browser cases remain open; this closes the bounded normal-session empty/unknown-state and navigation/access review only.

## Populated ordinary Pro acceptance — October 26, 2026
`evidence/money-radar-populated-2026-10-26.json` closes the populated overview and property cash-source table browser cases on deployed `d66b6bc` (same public marker `551ddbc6791378479e86`). Two clearly fictional properties and two ledger entries were prepared in the existing disposable Pro workspace under the test user's authenticated role. The actual normally signed-in browser showed $210,000.01 current value, $100,000.02 debt and $109,999.99 paired equity. All-saved coverage was 2 of 3; Closed-stage coverage was 2 of 2 and included genuine zero debt. Monthly recorded income/expenses/net were $1,000.01/$100.02/$899.99, with two entries. The cash-source report showed the same one property's two entries and exact net, without inventing rows for properties with no activity.

The two new fictional properties (`V1 Overview QA 2026-10-26 - matched` and `V1 Overview QA 2026-10-26 - zero debt`) and their two ledger entries remain. No existing customer property, file, plan or role was changed and nothing was deleted. Viewer/browser acceptance remains blocked pending specific approval for an isolated viewer fixture; physical-device checks remain open. The earlier empty-state evidence is historical and its fixture count predates this setup.
