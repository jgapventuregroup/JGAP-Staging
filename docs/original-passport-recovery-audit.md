# Original Property Passport recovery audit

Source reviewed: `jgapventuregroup/JGAP-Venture-Group/property-passport.js` on `main`. This is a functional existing Passport, not merely a concept. Do not replace it with an unrelated reduced preview.

## Original capabilities confirmed in source
- Property Passport listing, create property, open details, print/save PDF using browser print.
- Property name, type, address, purchase price/date, value, mortgage balance, rent, equity.
- Systems/equipment with installation date, purchase cost, life expectancy, warranty and condition.
- Equipment service schedules with frequency, last/next service date and notes.
- Maintenance history with date, cost, status, due date, performed by and description.
- Capital improvements with date, category, cost and description.
- Original tables: `properties`, `property_assets`, `property_asset_services`, `property_maintenance`, `property_improvements`.
- Original global entry points: `renderPropertyPassportPage`, `openPropertyPassport`, `openPropertyPassportNew`, `savePropertyPassport`, `addPropertyAsset`, `addPropertyMaintenance`, `addPropertyImprovement`, `printPropertyPassport`.

## Recovery decision
**Reuse the original feature and UX**, adapt its database access to the staging company's scoped membership/RLS architecture, and integrate the newer income/expense and tasks modules. The current paid Passport preview is not a complete substitute.

## Migration cautions
1. Original company resolver takes the first `company_members` row; replace with active-company context. Every read/write must be scoped by company and property, and verified server-side.
2. Original `ppOpen` child-table queries filter only `property_id`; new version must also filter `company_id`, with enforced RLS and composite FKs.
3. Do not point original code at staging database before verifying actual schema and RLS. The original table names differ from the new review-only ledger/repair/task drafts.
4. Original `ppNew` and `ppSave` create new property records. Preserve existing Free plan's five-lifetime-saves enforcement; do not expose new Passport property creation as a limit bypass.
5. Modal form inserts require active-company validation and stale-navigation guards. Escape all displayed user-entered text.
6. Printing uses `window.print()`; restore printable layout when the integrated Passport page is available.

## Integration sequence
1. Recover original Passport data shapes and reusable UI modules on the isolated branch.
2. Adapt list/open and equipment/maintenance/improvement flows to scoped staging APIs.
3. Integrate new ledger and tasks, retaining the original equipment and service schedules.
4. Verify membership tier permissions, RLS, browser flows, and print behavior.
5. Review schema migration with user before executing any SQL or deploying to staging.

No database migrations or staging deployments are authorized by this document.
