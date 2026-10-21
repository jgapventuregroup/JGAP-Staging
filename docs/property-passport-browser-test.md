# Property Passport — first customer browser test

**Status: BROWSER TEST PENDING; paid Passport writes disabled until RLS and staging tables are approved.** This checklist is for the first staging deployment after the staging preview is deployed and paid test entitlement is verified. Existing deal details are read-only; paid activity and original Passport entry forms are implemented on the branch but deliberately gated pending staging tables, RLS and paid test entitlement. Do not represent a branch commit as a deployed feature.

## Test using a verified staging account
1. Sign in and open **My properties**.
2. Open a property already saved in this workspace; check name, address, purchase price, rent, notes and follow-up date against the existing deal.
3. Switch to another property and verify no details carry over from the previous record.
4. Sign out and sign back in. Verify the same saved details appear.
5. Switch workspaces if authorized and verify that the previous company's property is no longer visible.
6. Verify Free users see their existing unchanged workflow, with five lifetime saved properties and no paid-only actions accidentally unlocked.
7. After the live isolation gate passes and original record editing is authorized, verify equipment, service schedules, maintenance, improvements, income/expense and repairs/tasks: create, save, refresh, sign out/in, and confirm persistence. Before authorization, confirm every write control stays disabled.
8. Verify Print Passport shows only the selected property's records; then try blank values, zero, a long note, and an invalid date. Check for clear error messages and no duplicate saves.
9. Check mobile and desktop layout, dark mode, and browser Back navigation.

## Live authenticated two-company release gate
Use two legitimate staging accounts belonging to **different companies**. Both accounts must be signed in normally; SQL editor impersonation or an administrator session is not sufficient. The existing read-only SQL audit cannot prove write isolation, particularly while Passport tables are empty.

1. Confirm Account A and Account B are members of distinct companies, each with its own saved test property. Do not use the production project or share passwords.
2. With the approved test editor enabled **only in a controlled staging test environment**, create one equipment record in Company A and one in Company B. Verify each owner can read their own record after refresh and sign-out/in.
3. Using Account A, attempt to read Company B’s equipment by exact record ID and by company-scoped listing. Both must return no foreign data. Repeat B against A.
4. Using each account, attempt to insert equipment with the other company’s ID and deal ID. Both requests must be rejected, with no rows created.
5. Using each account, attempt to update the other company’s equipment record, including attempts to change company_id and deal_id. Both must fail or affect zero rows, and the original data must remain unchanged.
6. Repeat own-company create/read and foreign-company denial tests for service schedules, maintenance, and improvements; verify that a service schedule cannot reference equipment belonging to another company or property.
7. Confirm anonymous requests cannot read or write any original Passport table or invoke the two Passport helper RPCs.
8. Record actual requests, status/error, company context and resulting rows for each case. Only then approve setting JGAP_ORIGINAL_PASSPORT_WRITES_READY=true in staging.

## Release gates
- All current GitHub Actions checks must pass on the deployment commit; older passing commits do not count.
- Original Passport tables have verified company-level RLS, and actual authenticated cross-company read/insert/update denial has been observed for each table.
- No staging account or company data is copied to another company.
- Browser test link points to an actual deployed staging build, not a source file.
- Record pass/fail and screenshots for each issue before approving merge.
