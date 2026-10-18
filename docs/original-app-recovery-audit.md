# Original app recovery audit — release blocker

The goal is **one existing live app** with Free, Investor, and Pro memberships. Do not ship a second app, separate Passport, or duplicate property store.

## Original app source reviewed

- Repository: `jgapventuregroup/JGAP-Venture-Group`, `main`, `property-passport.js`.
- Original functions: `list`, `ppNew`, `ppSave`, `ppOpen`, `ppAssets`, `ppMaintTable`, `ppImpTable`, `ppAsset`, `ppMaint`, `ppImp`, `ppPrint`.
- Original Passport includes property list, add property, full record, systems/equipment, linked service schedules, maintenance, improvements, and printing.

## What the current app already restores

- Saved Properties links to a paid-only Passport using the **existing `deals` record**, rather than creating a second `properties` record.
- Property details, financial overview (unknown values remain unknown), print, systems, services, maintenance, improvements, and their forms are integrated into the feature branch.
- Staging account/company checks and tests exist; automated tests are not a substitute for staging RLS testing.

## What is still preventing a real live release

1. **Database**: the staging database contains `deals`, `company_subscriptions`, and `company_members`, but not the original Passport record tables. SQL drafts have **not** been executed.
2. **Authorization**: verify active Investor/Pro access through server-enforced RLS for each read/write; Free must not gain Passport access, and one company must never see another company's records.
3. **Feature flags**: keep original Passport read/write and operations flags off until migration and real authenticated staging tests succeed.
4. **Parity review**: compare original property list, editing and record navigation with the integrated Saved Properties workflow. Do not introduce a second property-creation flow.
5. **Regression and release**: test actual sign-in, save, reload, switch account, and plan downgrade; only then merge into existing app's `main` and verify live behavior.

## Release rule

Do not represent a passing unit test as proof that Passport data is connected. Do not merge unconnected record forms into production as working features. Preserve the current live app until integrated database/security tests pass.
