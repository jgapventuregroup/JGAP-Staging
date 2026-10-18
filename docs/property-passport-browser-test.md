# Property Passport — first customer browser test

**Status: NOT READY FOR BROWSER TESTING.** This checklist is for the first staging deployment after the UI, database policies, and membership enforcement are implemented and technical tests pass. Do not represent a branch commit as a deployed feature.

## Test using a verified staging account
1. Sign in and open **My properties**.
2. Open a property already saved in this workspace; check name, address, purchase price, rent, notes and follow-up date against the existing deal.
3. Switch to another property and verify no details carry over from the previous record.
4. Sign out and sign back in. Verify the same saved details appear.
5. Switch workspaces if authorized and verify that the previous company's property is no longer visible.
6. Verify Free users see their existing unchanged workflow, with five lifetime saved properties and no paid-only actions accidentally unlocked.
7. On an authorized Investor test account, enter an income or expense item, save, refresh, and verify it persists. Repeat for a repair/task after those features are deployed.
8. Try blank values, zero, a long note, and an invalid date. Check for clear error messages and no duplicate saves.
9. Check mobile and desktop layout, dark mode, and browser Back navigation.

## Release gates
- Developer confirms tests executed, not merely written.
- New tables/RPCs have verified company-level RLS and paid entitlements on writes.
- No staging account or company data is copied to another company.
- Browser test link points to an actual deployed staging build, not a source file.
- Record pass/fail and screenshots for each issue before approving merge.
