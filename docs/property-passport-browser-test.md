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

## Pro comparison — targeted rendered acceptance still open
Open Financial Reports as authorized Pro/owner preview, choose one property and month, keep Reconciliation and Tax treatment at All, and load the report. Compare its current saved estimate with the saved Analyzer assumptions and its recorded column with that month's ledger. Check empty months, incomplete loan assumptions, filter changes, read-only viewer access and phone table scrolling. Ordinary Investor/Free/inactive access must be denied. This is not proof of an immutable original underwriting budget or complete actual books.

## Public desktop observation — October 24
The deployed sign-in screen was inspected in Chrome at a 1348px content viewport. Branding, email/password inputs and sign-in/create/recovery actions rendered; document width matched viewport width (no horizontal overflow). This was signed out and does not certify the workspace, phone layout, printing, downloads, or authenticated original-record isolation.

## Normal-session desktop owner review — October 24
A normal secure sign-in verified the live owner-preview workspace. A new clearly fictional property was created; existing properties were not edited. Live checks passed for notes save/clear, type/unit save with verified reload, ledger income/expense totals ($1,750.01 / $300.02 / $1,449.99 net), repair completion/costs without double-counting, task completion/reopening/overdue counts, current estimate versus recorded comparison ($66.66 net difference), partial-filter comparison suppression, exact-transaction bookkeeping updates, and an actual CSV download event. Print documents were inspected for two selected properties; inactive sections were included and edit controls excluded, with no previous-property data in the second document. No physical printer or phone was tested.

The fixture and its ledger/repair/task/bookkeeping rows were deleted by exact generated property identity, with all remaining counts zero; the workspace returned to its original three properties. The lifetime usage counter was not reset. Light/dark desktop layout was inspected at 1348px without document overflow; a low-contrast active navigation label was found and its background/text rule corrected. This owner-preview review is not an ordinary Investor/Pro provisioning test or the two-account original-table security gate.

## Controlled browser adapter for the existing real-session runner
`previews/passport-security-gate.html` uses the same `passport-live-isolation-core.mjs` as the CLI. Sign in two distinct verified staging accounts through the secure credential form, select two exclusive controlled test companies with editing roles and active Pro eligibility, confirm the fictional test/cleanup scope, and run the checks. A shared-company pair is rejected before writes. Account memberships/eligibility are verified by normal Auth/API requests; no administrator bearer tokens or SQL identity impersonation are accepted. The tool never changes plans or enables editors.

A test administrator may provision disposable empty test companies for the two already-verified users without changing their existing memberships/subscriptions; remove only those exact generated fixture companies afterward. The runner removes only properties it creates. Browser credentials/tokens remain in memory and sanitized evidence contains request endpoint/method/status only, not bodies, tokens or user/company identifiers. Local sign-out ends only the two test sessions. Never place passwords, sessions or customer records in evidence.

## Authenticated gate completed — October 24, 2026

The deployed shared runner at commit `771456962d90fa4a3b5a080d7e456439b8c93869` passed **128 checks using 134 real HTTP requests** with two distinct normally signed-in, verified staging accounts. Evidence: `evidence/passport-live-isolation-2026-10-24.json`. Both accounts used exclusive temporary Pro fixture companies; their existing companies and subscriptions were unchanged.

Verified own-company INSERT/UPDATE/readback and foreign-company SELECT/INSERT/UPDATE denial in both directions for equipment, service schedules, maintenance and improvements; company/property transfer denial; service equipment foreign keys; anonymous table and helper denial. Foreign HTTP 200 responses were asserted empty, and relation HTTP 409 responses required SQLSTATE 23503. Generated properties were deleted before PASS. The two exact temporary companies were subsequently removed after confirming all fixture tables empty; remaining company count was zero. No accounts were deleted or lifetime counters reset.

The original editor UI now opens only when Passport access, server advanced-finance write capability, and owner/admin/editor role all agree. The database independently enforces Pro eligibility and company role. Investor/viewer access stays read-only. These results supersede earlier pending-gate status in this document; they do not replace actual enabled form browser acceptance, mobile testing or document upload security work. Next acceptance: create/edit each original record through its real form, reopen and verify persistence on the enabled deployment.

## Enabled original editors: live owner acceptance — October 25, 2026

Normal secure owner-preview login succeeded. A single fictional fixture, `V1 Original Editor QA 2026-10-25 - a91c`, was created through the actual property form. Existing properties were not edited. The first test exposed an invalid original form dispatcher; `b636a13` fixes the argument contract and adds a four-kind dispatch regression. A subsequent browser attempt still showed the earlier error; release `9ab2f62` versions entry scripts and transitive imports together. The browser then confirmed release marker `b3a3140fe61c92e42b86` and opened Passport successfully. Mixed cached assets were a suspected contributor; no cache trace was collected.

Observed actual UI results on that versioned build:
- Combined equipment + first schedule: heat pump, $0 cost, quarterly filter service (every three months) saved; equipment count 1, schedule count 1.
- Equipment edit: corrected name, inspected condition and cleared type saved with verified-success notice. Linked schedule display used the corrected equipment name.
- Service edit: renamed annual inspection, frequency 1/year, cleared notes; verified-success notice and updated tables.
- Maintenance: created planned inspection at $125.75, then changed to completed/$0 and cleared description; provider retained. Verified-success notice.
- Improvement: created insulation at $250.25, corrected title/$300.02, cleared category and replaced description; verified-success notice.
- Closed and reopened Passport through the normal UI. Corrected equipment/service, completed maintenance/$0 and improvement/$300.02 remained in the reloaded tables.
- Separate Add service form then saved a second schedule at every two quarters for the same equipment; schedule count 2 and equipment count remained 1.
- Print output contained all four record groups, both schedules and corrected values. DOM checks found zero buttons/forms/inputs/selects/textareas and zero record-edit disclosures. No physical printer was tested. A stray add-section heading was found and its editor container is now excluded from print; that final print cleanup is code-verified, not rerun in the live browser yet.

**Cleanup pending owner approval:** automatic approval review rejected the guarded deletion because database deletions need explicit approval. The one fictional property and its five linked original records remain. No cleanup transaction ran, no lifetime counters were reset, and no original customer property was modified. Delete only this exact fixture after approval; do not delete a company or account.

This closes desktop owner add/edit/reopen acceptance for original records. Phone/device acceptance, ordinary Pro/viewer rendered flows and document uploads remain open. The 128-check separate-session tenant gate is unchanged.

## Approved fixture cleanup completed
After the owner explicitly approved deleting only the named fictional QA property and its five child records, the guarded staging transaction succeeded. It required the exact property ID/company/name and the expected corrected equipment, two services, completed maintenance and improvement values; it also refused cleanup if any ledger, repair or task activity existed. The transaction required exactly one property deletion. Its result verified zero remaining fixture properties, assets, services, maintenance and improvements. No company/account was deleted, no lifetime counter was reset, and no other property was targeted. This supersedes the earlier pending-cleanup note.

## Narrow-screen and accessible-name follow-up
Added fieldset minimum-size/legend wrapping rules for the optional service schedule, explicit 44px disclosure/save targets, 16px form input text and narrow-screen button/tab wrapping. Passport toggle labels now retain the property name when opened, closed or reset. Existing browser-logic regression checks cover the accessible label lifecycle. This is a CSS/code inspection improvement, not a claim of physical phone or mobile Safari acceptance.

## Ordinary Pro document form acceptance — October 26, 2026
Passed on deployed `85d1039`: select the disposable Pro workspace, open Passport/Documents, upload fictional PDF, observe verified success, close/reopen Passport, and download through the listed button. The downloaded 1,460 bytes exactly matched the original. See `passport-document-storage.md` for digest and retained-file inventory. Nothing was deleted. Mobile, viewer UI, printed document filename output and hosted recovery remain unverified.
