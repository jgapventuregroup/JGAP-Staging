# Version 1 acceptance status — October 27, 2026

The existing staging app is functional but is **not approved for production or public paid sales**. The owner’s latest bounded build decision in `remaining-v1-scope.md` governs completion. Public membership claims must be reconciled with delivered scope before paid launch; automated test passes alone do not establish readiness.

| Area | Verified evidence | Remaining acceptance |
| --- | --- | --- |
| Analyzer, property saves, pipeline, account recovery | Existing regression suite; earlier owner save/reopen and navigation checks | Final rendered smoke after relevant changes |
| Membership and lifetime limits | Backend staging rollback tests; repeatable SQL tests on restored schema; browser-response tests | Normal paid/inactive accounts and final rendered flows |
| Passport financials, notes, type/units | Existing owner financial-save check; new exact-scope/verified-save tests and backend denial tests | Phone and ordinary paid-user acceptance; desktop owner saves and printable documents verified |
| Ledger, repairs, tasks | Staging role tests, CRUD/loader/form regressions, date/count/total checks | Phone and ordinary paid-user acceptance; owner desktop saves/completion/reopening verified |
| Pro reports, comparison, CSV | Backend entitlement/precision/isolation tests and UI/API regression tests | Phone and ordinary Pro-user acceptance; owner desktop comparison/filter/download verified |
| Original equipment/services/maintenance/improvement editors | 128-check normal-session two-company gate; Pro editing roles enabled; add/update forms with scoped readback verification | Desktop owner add/edit/reopen passed on versioned release 9ab2f62; phone and ordinary paid/viewer rendered acceptance pending; approved fictional fixture cleanup completed and zero remaining fixture rows verified |
| Passport documents | Private Storage policies; three SQL-role groups; real successful uploads and 58 fresh Storage owner/inactive/viewer checks | Actual rendered forms, phone acceptance, retained fictional fixture review; removal/replacement and scanning excluded |
| Database handoff | Schema-only baseline; clean isolated restore; 44 SQL check groups; grant/policy/key/trigger comparisons; existing-schema refusal | Hosted Supabase platform restore rehearsal and environment setup; local Auth contract is not real authentication |
| Branding and layout | Shared website colors; responsive CSS and navigation regressions; signed-out desktop sign-in observation without horizontal overflow | Phone acceptance and final contrast-fix review; owner desktop keyboard/theme and printable documents inspected |
| Advertisements | Labeled placeholders; Pro suppression tests | Outside company: live serving, creative review, privacy/consent and reporting |
| Commerce and packaging | Existing disabled billing adapters and documented interfaces | Outside company: processor/webhooks, app install/download packaging, book delivery, production configuration/monitoring |

## Current scoped implementation and acceptance

Market Map for saved properties, in-app alerts, dashboard customization and advanced team controls are implemented in staging. Selected owner desktop checks passed; see `evidence/four-feature-owner-desktop-2026-10-27.json`. All-tier public invitations and tier-aware reserved ads are implemented. Named-seat capacity is enforced, but live additional-seat billing and provider single-session configuration are not connected.

External Radar discovery, lead generation/CRM, further Money-Making System expansion and the Laundromat Division are excluded from further V1 build work. Preserve existing saved-deal review, financial overview and other completed capabilities. The current financial comparison uses saved assumptions, not an immutable purchase-time budget. No new legal-title ownership feature is part of the remaining build.

### Isolated team browser checkpoint — October 27, 2026

The owner explicitly approved `V1 Team Acceptance 2026-10-27`: QA A as owner, Pro test access, one extra seat expiring November 3, one fictional property/pin, QA B invitation/acceptance, viewer → editor → viewer, removal of B only, and a last-owner denial check. The workspace/property are retained; cleanup needs separate approval.

Observed through the app: A created B’s viewer invitation; it reserved the second seat and disabled further invitations at capacity. B accepted, selected the fixture as viewer, viewed its map pin and opened the corresponding Passport. The map had no coordinate editing/save controls; the Passport had read-only guidance and no edit forms. This verifies only those observed screens, not every viewer boundary.

The resumed normal-browser sequence completed October 27: B changed viewer → editor, signed in as editor, saved/read back a fictional note and restored the original note. Editor Team access showed owner-only guidance without member-management controls. A then changed B back to viewer, verified the reloaded role, and removed only B’s fixture membership. Team access reloaded with A as the sole owner/member, zero reserved invitations and two total seats; invitation creation became available again. The fictional property remained. A last-owner demotion was rejected with “Keep at least one workspace owner,” and reopening the team screen confirmed A remained owner. Earlier review/sign-in blocks were resolved for these checks; B no longer has membership in this fixture. See `evidence/team-role-removal-desktop-2026-10-27.json` for observations and limits.

Physical-phone acceptance, remaining map cases, other alert sources, revoked-session behavior after membership removal, competing-seat transactions, provider single-session behavior and hosted database/Storage recovery remain open. Private document upload/list/download has prior owner desktop evidence; replacement/removal and scanning remain excluded. No production launch, live billing or live ads are authorized.

## Latest live usability and map navigation — October 27, 2026

The current-release browser check refreshed the older page, signed in as QA A and used retained fictional workspaces. These bounded checks passed:

- The simple Deal Intelligence property form rendered, with Advanced import collapsed by default.
- Blank monthly expenses remained unknown and blocked saving; an explicit zero remained $0 and enabled offer entry.
- Reviewing moved keyboard focus to the result summary. Attempting Save with no offer blocked submission and focused the offer field.
- Clear entries and review cleared the preview. No test property was created and no property slot was consumed.
- Advanced JSON instructions and the Analyzer financial-term glossary expanded correctly.
- Opening Market Map while a workspace was loading automatically replaced the temporary Pro-access warning after permissions loaded; no second click was needed.
- Selecting the retained “matched” finance fixture in the map opened its exact Passport; the Passport shortcut returned to that same map selection.
- The Passport Street address editor remained blank for an absent address, rather than substituting the property name.

The “matched” fixture name refers to finance data, not a successful address lookup. Retained QA properties used here have no street address. Successful signed-in geocoding/street tiles still require an appropriate public-address fixture; none was added during these checks. No membership, subscription, saved address, note, file or alert state changed. These desktop observations do not close physical-phone acceptance. Later map handler versions preserve street-name substrings and reject partial street matches; local/Edge checks and CI passed, but actual signed-in location rendering is still unverified.

## Remaining execution gates and constraints

1. Verify successful automatic address lookup and visible street tiles with a suitable public-address test record, preserving real data. Keep map navigation evidence above.
2. Complete physical-phone usability and remaining role/source-specific rendered checks.
3. Test revoked-session behavior after membership removal and genuinely competing seat transactions. Completed owner-side role/removal tests above must not be repeated without a relevant change.
4. Verify provider single-session configuration and two-browser behavior. Supabase’s native control requires infrastructure Pro or higher, separate from this app’s customer Pro plan. Current provider configuration/plan entitlement was not verified; no paid upgrade is authorized.
5. Perform hosted database/private-file recovery. A proposed recovery project was quoted at $0/month, then creation was rejected because the owner already has two active free projects. No project was created. Do not pause/delete/overwrite staging or production, buy an upgrade, or bypass this limit. Local restored-schema checks remain valid but do not replace the hosted rehearsal.
6. Run final smoke checks and all four workflows on the actual handoff candidate before acceptance.

The owner authorized the proposed recovery setup only if it costs nothing. Recovery is currently blocked by free-project capacity. At this checkpoint the development/browser environment became unavailable; further local or browser checks cannot be claimed until it returns. Connected GitHub/Notion work can continue. Environment loss does not invalidate the completed observations or authorize new infrastructure.

## Final candidate acceptance

1. Require successful runs of all four main workflows on the exact handoff commit: JGAP staging checks, Staging app tests, JGAP V1 Verification, Publish JGAP staging website. A queued, missing or older run is not a pass.
2. Complete the targeted normal-session checks in `property-passport-browser-test.md`; preserve previous general account/deal evidence and avoid requesting repeat tests without a relevant change.
3. Preserve the completed original-record normal-session gate evidence and verify enabled add/edit/reopen workflows. No administrator impersonation, credential sharing in chat, or weakened RLS is an acceptable shortcut.
4. Review the matrix, remaining development and the outside company's responsibilities together. Owner production approval is separate from accepting a staging handoff.

See `developer-handoff.md` and `../supabase/baseline/README.md` for setup and recovery. No production deployment, paid billing or live advertisements are authorized by this checklist.
