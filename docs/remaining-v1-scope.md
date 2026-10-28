# Remaining Version 1 scope — owner decision, October 26, 2026

Build these four features only, preserving the existing app and completed features. Source remains `jgapventuregroup/JGAP-Staging` on `main`; do not create another app/repo/branch or change the completed marketing website.

| Feature | Agreed working scope | Acceptance |
| --- | --- | --- |
| Dashboard customization | Pro user can drag five individual dashboard widgets across a responsive grid, choose width/visibility, undo changes and restore defaults. Personal per user/workspace with verified saves and stale-tab protection; sidebar and property-list sorting remain stable. | October 28: final implementation CI/deployment passed. Real browser fictional-preview mouse/keyboard/Undo/reset/width/hide-show/narrow-container checks and hosted rollback RPC checks passed. Newly signed-in browser persistence, physical touch and screen-reader acceptance remain pending. See dashboard-grid.md and evidence. |
| In-app alerts | Due follow-ups, tasks and maintenance from existing records; readable, actionable in the app. | Owner desktop review/unreview/badge/source-routing passed October 27; viewer, other source types and phone acceptance pending. No email/SMS/push delivery in this scope. |
| Advanced team controls | Secure workspace invitations, roles and permissions, including last-owner safeguards and authorization. | Team screen and backend implemented; local UI/security tests and four staging rollback groups passed. Owner desktop seat display and full-capacity invitation lock passed October 27. Live invitation acceptance, viewer screens, editor note save/readback/restoration, editor team-management exclusion, viewer→editor→viewer changes, B-only removal/seat release and last-owner denial passed October 27; revoked-session, concurrency and phone acceptance remain pending. |
| Market Map | Locate the selected saved property automatically from its address with Census lookup and OpenStreetMap streets; preserve current Pro/company boundaries and honest missing/ambiguous results. | UI, authenticated lookup proxy, service cache and shared throttle implemented; local and hosted backend checks passed. Actual signed-in map/phone acceptance pending. No manual coordinate workflow, external listing feed or fabricated city pin. |

## Explicit exclusions from further build work

No external Deal Radar discovery feeds, lead generation/CRM, additional Money-Making System expansions, Laundromat Division, bank feeds or other new features. Existing saved-deal review, overview/reports/calculators, Passport and other completed capabilities remain. Do not delete or disable them as part of narrowing scope.

The outside company still handles payments, app packaging/distribution, live ads, production hosting and launch. Those responsibilities are separate from implementation of the four features above.

## Near-handoff reminder — owner request, October 26, 2026

When the app is close to done, remind the owner to add an app download/access button or link to the existing website, with a website payment path, as interim distribution until the app-store listing with its own icon is available. A daily milestone reminder is enabled. This is a deferred launch-handoff item; do not implement it during the four-feature app build, edit the website, or activate payments now. Confirm the supported install/access method and payment integration with the handoff company before implementation; do not promise native downloads or store availability prematurely.

Existing company isolation, Free five-lifetime-property behavior, Investor restrictions, Pro ad-free behavior, ownership checks and website branding remain required. Phone, viewer, restore/recovery and final release acceptance still matter. Green CI alone does not declare the complete product ready to sell.

This owner decision supersedes earlier requirements to finish all advertised external Radar, lead-generation and other advanced modules before this handoff. The handoff company must reconcile public plan claims with the agreed delivered scope before paid launch; this is not authorization to edit the marketing website.

The 10–15 focused-workday estimate discussed with the owner is a planning estimate, not a guaranteed calendar delivery date. Do not invent completion percentages or silently expand scope.


## Approved seat and ad addition — October 26–27, 2026

One included named user; Pro additional paid seats required for all additional roles. Implemented server-side capacity/reservations, expiring trusted entitlements and denied unlicensed record access. Four hosted seat groups and all five team groups passed with no retained fixtures. No live seat billing, seat price or shared-password/session enforcement is activated. Reserved ad slots now cover all 14 workspace pages for Free/Investor using existing tier visibility rules; Pro has no ads. Printed output hides all ad slots. The marketing website remains unchanged.


## Session lifecycle checkpoint — October 27, 2026

Signed-out/unexpected-identity events now clear private app state; normal refresh and newer sessions are preserved. Local customer workflow covers these cases. No provider Auth session settings or hosting plan changed. Native single-session enforcement requires a supported paid Supabase infrastructure plan and operator configuration; actual same-account/two-browser acceptance remains open. This is distinct from the implemented named-team-seat limits.


## Normal owner desktop acceptance — October 27, 2026

Sixteen bounded check groups passed on `1b34036`; see `docs/evidence/four-feature-owner-desktop-2026-10-27.json`. Original dashboard configuration and personal alert state were restored. A synthetic map pin remains on an existing QA property; do not delete it or other fixtures without the owner's specific cleanup authorization. No real property/file/member/plan was modified. Viewer, team mutation, physical-phone, broad navigation, session configuration and hosted recovery gates remain; a single unexplained Alerts navigation discrepancy is recorded, not silently treated as a fixed bug.


## Automatic-map scope clarification — October 27, 2026

The owner rejected manual coordinate entry and subsequently approved restoring the original automatic-address workflow. A drafted removal was canceled before publishing. Market Map remains in scope as selected saved-property lookup and automatic map centering, with honest not-found/ambiguous results and no fabricated city pin. Authenticated service/cache/rate controls support the public lookup policy; broad discovery feeds and background bulk scans remain excluded. Google billing/key setup is not part of the selected approach. Actual signed-in and phone acceptance remain required.
