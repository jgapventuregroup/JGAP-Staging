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
