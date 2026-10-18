# Property Passport — first customer browser test

**Status: BROWSER TEST PENDING; paid Passport writes disabled until RLS and staging tables are approved.** This checklist is for the first staging deployment after the staging preview is deployed and paid test entitlement is verified. Existing deal details are read-only; paid activity and original Passport entry forms are implemented on the branch but deliberately gated pending staging tables, RLS and paid test entitlement. Do not represent a branch commit as a deployed feature.

## Test using a verified staging account
1. Sign in and open **My properties**.
2. Open a property already saved in this workspace; check name, address, purchase price, rent, notes and follow-up date against the existing deal.
3. Switch to another property and verify no details carry over from the previous record.
4. Sign out and sign back in. Verify the same saved details appear.
5. Switch workspaces if authorized and verify that the previous company's property is no longer visible.
6. Verify Free users see their existing unchanged workflow, with five lifetime saved properties and no paid-only actions accidentally unlocked.
7. After authorized migrations and entitlement tests, verify equipment, service schedules, maintenance, improvements, income/expense and repairs/tasks: create, save, refresh, sign out/in, and confirm persistence. Before authorization, confirm every write control stays disabled.
8. Verify Print Passport shows only the selected property's records; then try blank values, zero, a long note, and an invalid date. Check for clear error messages and no duplicate saves.
9. Check mobile and desktop layout, dark mode, and browser Back navigation.

## Release gates
- All current GitHub Actions checks must pass on the deployment commit; older passing commits do not count.
- New tables/RPCs have verified company-level RLS and paid entitlements on writes.
- No staging account or company data is copied to another company.
- Browser test link points to an actual deployed staging build, not a source file.
- Record pass/fail and screenshots for each issue before approving merge.
