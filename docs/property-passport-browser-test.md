# Property Passport — remaining release checks

**Current status (October 21, 2026):** The owner and JGAP A/B accounts have already completed general sign-in, workspace isolation, saved-property and account-access testing. Do **not** ask the owner to repeat those four-account tests. The Property Passport Overview and Financials save/persistence were also checked by the owner and are working. The original equipment, service schedule, maintenance and improvement record writers remain disabled until their *separate* authenticated cross-company write-isolation checks pass. This distinction is important: previous deal/company tests do not prove the newer Passport tables' INSERT/UPDATE isolation.

## Previously completed — do not repeat without a regression
- Owner accounts and two JGAP test accounts: sign-in, access and general company/deal isolation were checked.
- Existing saved-property persistence after sign-out/in was checked.
- Deal Analyzer Analyze/Maximum Offer navigation was fixed and checked.
- Property Passport Overview and Financials save/persistence were checked on Owner Access Test 003.
- Automated app, staging, V1 and deployment checks passed on commit d7b9d32 (October 21).

## Still outstanding — only run these when practical
1. Authenticated cross-company SELECT, INSERT and UPDATE denial for **each of the four new original Passport record tables**, including own-company positive writes and persistence. Existing accounts may be reused; no new accounts are needed.
2. Once verified, enable the original record editor only after reviewing the actual test evidence; until then retain the write gate and keep working Financials untouched.
3. Check Print Passport against multiple selected properties and verify mobile layout, dark mode and browser navigation for the final release candidate. Do not redo earlier sign-in or property-save testing unless a relevant regression appears.

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

## Remaining release gates
- All current GitHub Actions checks must pass on the deployment commit; older passing commits do not count.
- Original Passport tables have verified company-level RLS, and actual authenticated cross-company read/insert/update denial has been observed for each table.
- No staging account or company data is copied to another company.
- Browser test link points to an actual deployed staging build, not a source file.
- Record pass/fail and screenshots for each issue before approving merge.

## October 24 automation update
The opt-in runner `scripts/passport-live-isolation.mjs` now implements the separate real-session requests above. See `developer-handoff.md` for private environment setup, fictional fixture creation/cleanup and evidence limits. Its configuration/denial-classification unit tests run offline; live authenticated verification has **not** run in this takeover session. Original writers remain disabled.

## Added Overview editors — targeted acceptance still open
On the final release candidate, check the new notes and type/unit editors on desktop and phone. Save and reopen notes (including multiline text and clearing), change type/unit count, confirm blank units show “Not recorded,” and confirm saved values appear on Print Passport. Viewers should see records without these editors. Failed saves must preserve drafts; switching company during a save must not display the previous property. This is targeted acceptance of the added editors, not a request to repeat previously completed general account tests.
