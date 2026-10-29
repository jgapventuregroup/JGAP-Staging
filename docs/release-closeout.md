# Version 1 release closeout

Updated October 29, 2026. Owner decision: preserve the current app; no more features. Work is limited to verification, demonstrated bugs and agreed release preparation. This is the current gate list; dated milestone documents retain historical observations only.

## Candidate and repeatable checks

- Implementation candidate: `ccbfd7e06609b77b7debbb3f372d202f5c221b4c`, existing `main` in `jgapventuregroup/JGAP-Staging`.
- All four hosted workflows passed on that implementation candidate. Any later handoff commit must have its own four successful workflows.
- October 29 local rerun: complete `npm test` exited 0, including clean schema install, security regressions, frontend packaging and UI/module checks. `npm run check:edge` exited 0 for both billing handlers and property geocoding. These are automated checks, not normal-session or physical-device acceptance.
- No application code, database, customer records, plan entitlements, payments or live ads changed during this closeout documentation pass.

## Acceptance to preserve

| Area | Accepted evidence | Boundary |
| --- | --- | --- |
| Original Passport isolation | 128 normal-session checks and dated desktop editor/document/print evidence | Preserve current activation and backend permission gates; phone/ordinary-role coverage remains below |
| Team invitations and roles | October 27 invitation/acceptance, observed viewer restrictions, editor note save/readback/exact restore, management exclusion, downgrade, B-only removal/seat release and last-owner denial | Do not repeat these or ask for B sign-in merely to re-prove them; post-removal session/concurrency are separate |
| Address map | Owner accepted automatic desktop address lookup and street rendering October 28 | Census street-range approximation, not parcel/unit proof; no external listing feed |
| Dashboard extra outlines | Owner confirmed resolved October 28; full-app fictional fixture reproduced root cause and verified exact ad parents | Regression guard checks all 15 ad slots and no nested card ads |
| Recent UI | Grid/charts/Help automated and fictional-browser checks, including Help focus and navigation/sign-out cleanup | Fictional in-memory preferences do not prove real persistence; narrow containers do not prove touch or a phone |

See `v1-acceptance-status.md`, `dashboard-grid.md`, `financial-charts.md`, `page-help.md` and dated `docs/evidence/` for details.

## Open gates and concrete completion evidence

| Gate | Required evidence to close | Current constraint / next action |
| --- | --- | --- |
| Latest normal-account flows | Existing authorized QA workspace: dashboard arrangement saves and survives reload/reopen; financial charts match saved transactions/filter/month; expandable rows/actions and Help work after navigation/workspace changes | No signed-in app tab was available in the controlled browser October 29. Use a normal authenticated QA session; do not substitute admin impersonation or fictional preview evidence |
| Physical phone and accessibility | Actual device/browser recorded; touch arrangement, navigation, forms, upload/list/download, Help and long lists usable; keyboard-only and screen-reader labels/focus reviewed | No physical-device/screen-reader acceptance recorded. Desktop responsive source checks cannot close it |
| Alert source/role coverage | Follow-up, task and maintenance source links resolve to the right property; allowed viewer behavior; workspace change clears prior content | Preserve the completed owner follow-up checks; run only missing cases with approved fictional data |
| Removed member / simultaneous operations | Existing revoked session cannot read/write removed workspace; competing seat invitations cannot exceed capacity; retained last-owner protection | Named-seat SQL tests pass; remaining normal-session/concurrent acceptance is unperformed. No fresh fixture access/role changes are authorized by this checklist |
| Same-account sessions | Provider-supported configuration plus two-browser behavior, with documented expected session lifecycle | Native single-session enforcement requires supported paid infrastructure/operator configuration. No spending approved; owner must resolve this blocker before an enforcement claim |
| Hosted recovery | Approved isolated hosted target; real Auth/configuration, database and private file bytes reconciled; measured recovery and reviewer sign-off | Free-project capacity blocked the rehearsal. Do not pause/delete existing projects or upgrade silently. `hosted-recovery-runbook.md` is prepared; local restore is supplemental only |
| Handoff operations | Exact SHA/check links, retained-fixture inventory, configuration and rollback owners, backup/RPO/RTO decisions, accepted vendor responsibilities | Retain existing QA workspaces/files; no cleanup deletion authorized. Confirm operator/reviewer assignments and accepted recovery path before final handoff |

## Handoff boundary

The outside company handles payment/seat billing integration, distribution/install packaging, live ads and production hosting/launch. Its sandbox verification, plan-claim reconciliation and explicit owner production approval are separate from app acceptance. Keep billing and live ads disconnected. Coordinate the deferred website app-access/payment link near launch; do not edit the marketing website under this checklist.

A green test suite or this document is not final acceptance. No completion percentage or release date is asserted. Do not label the app handoff-ready until the open gates have passed or the owner has explicitly resolved each blocker with its consequences documented.
