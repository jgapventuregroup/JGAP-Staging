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
| Latest normal-account flows | Existing authorized QA workspace: dashboard arrangement saves and survives reload/reopen; financial charts match saved transactions/filter/month; expandable rows/actions and Help work after navigation/workspace changes | October 29 normal QA B session passed dashboard changed-layout workspace reload/original-geometry restore, chart filter/empty-month, Help and disclosure checks. See `evidence/frozen-v1-desktop-2026-10-29.json`. Normal QA A populated positive/negative/empty financial charts also passed; see `evidence/financial-charts-live-2026-10-29.json`. Remaining account/role combinations stay open |
| Physical phone and accessibility | Actual device/browser recorded; touch arrangement, navigation, forms, upload/list/download, Help and long lists usable; keyboard-only and screen-reader labels/focus reviewed | No physical-device/screen-reader acceptance recorded. Desktop responsive source checks cannot close it |
| Alert source/role coverage | Follow-up, task and maintenance source links resolve to the right property; allowed viewer behavior; workspace change clears prior content | Preserve the completed owner follow-up checks; run only missing cases with approved fictional data |
| Removed member / simultaneous operations | Existing revoked session cannot read/write removed workspace; competing seat invitations cannot exceed capacity; retained last-owner protection | Named-seat SQL tests pass. New combined-schema regression proves revoked simulated identity loses property/task/document/grid/map/alert/report access; owner records remain. Remaining real existing-token/concurrent acceptance is unperformed. No fresh fixture access/role changes are authorized by this checklist |
| Same-account sessions | Provider-supported configuration plus two-browser behavior, with documented expected session lifecycle | Native single-session enforcement requires supported paid infrastructure/operator configuration. No spending approved; owner must resolve this blocker before an enforcement claim |
| Hosted recovery | Approved isolated hosted target; real Auth/configuration, database and private file bytes reconciled; measured recovery and reviewer sign-off | Free-project capacity blocked the rehearsal. Do not pause/delete existing projects or upgrade silently. `hosted-recovery-runbook.md` is prepared; local restore is supplemental only |
| Handoff operations | Exact SHA/check links, retained-fixture inventory, configuration and rollback owners, backup/RPO/RTO decisions, accepted vendor responsibilities | Retain existing QA workspaces/files; no cleanup deletion authorized. Confirm operator/reviewer assignments and accepted recovery path before final handoff |

## Handoff boundary

The outside company handles payment/seat billing integration, distribution/install packaging, live ads and production hosting/launch. Its sandbox verification, plan-claim reconciliation and explicit owner production approval are separate from app acceptance. Keep billing and live ads disconnected. Coordinate the deferred website app-access/payment link near launch; do not edit the marketing website under this checklist.

A green test suite or this document is not final acceptance. No completion percentage or release date is asserted. Do not label the app handoff-ready until the open gates have passed or the owner has explicitly resolved each blocker with its consequences documented.

## October 29 acceptance follow-up

A normal secure QA sign-in completed the bounded desktop checks in `evidence/frozen-v1-desktop-2026-10-29.json`; this supersedes the earlier unavailable-session checkpoint only for those cases. Dashboard geometry was changed, saved, reloaded by switching away/back, and restored exactly. The initial document refresh returned to sign-in as explicitly required by current staging `persistSession:false`; auto-refresh during use is separate from retaining sign-in after page reload. Do not request repeated authentication to diagnose this expected behavior or silently change credential persistence. Full `npm test` passed with the new removed-identity regression. No application behavior or hosted schema change was needed.

## PostgreSQL transaction concurrency — October 29

Four deterministic two-connection checks passed on isolated PostgreSQL 17.6 in the existing Staging app tests workflow: one remaining seat/two invitations, duplicate acceptance, competing owner self-demotions, and a seat entitlement reduction racing an invitation. The harness observes `pg_blocking_pids` before releasing the first transaction, then asserts the losing operation is denied and final counts remain valid. See `evidence/team-concurrency-local-2026-10-29.json` and `scripts/test-team-concurrency.py`. This closes the isolated database contention cases; hosted normal-session and provider single-session behavior remain separate. The temporary CI service uses fictional records and is destroyed after each job. No Supabase project, membership, plan or customer data changed.

## Normal-account populated financial charts — October 29

Existing fictional QA A ledger entries produced exact 1000.01 income, 100.02 expense and 899.99 net in the hosted report and production charts. A temporary reconciliation marker isolated the expense and produced -100.02 with the negative bar left of zero. The marker and all observed bookkeeping form values were restored and reloaded; amounts/dates were never changed. Empty property/months showed explicit missing-entry guidance with no fabricated bars. No new ledger transactions were needed. Any supplementary bookkeeping upsert row remains with restored field values; no deletion. This closes the bounded populated chart desktop gate. Phone/screen-reader, retained-token/browser/session and hosted recovery checks remain.

## Desktop accessibility preflight — October 29

Native Enter activation reached and focused all 16 workspace pages in a normal QA A session. No unnamed visible controls were found in the inspected loaded page states and expanded property, pipeline, lender and import forms. `evidence/desktop-accessibility-preflight-2026-10-29.json` records scope, counts and a rapid batched mouse navigation discrepancy that did not recur with isolated mouse or keyboard activation. No confirmed app bug or speculative fix claimed. This supplements desktop keyboard evidence; physical phone/touch, actual screen-reader, conditional states and live-session/hosted recovery acceptance remain open. No stored data or application code changed.

## iPhone menu scrolling correction — October 29

Owner's iPhone Safari review reported that the right-side scroll indicator in the expanded menu seemed to jump among top/middle/bottom positions instead of sliding continuously. The owner otherwise reported the requested navigation/property/Help phone review looked good; this is bounded feedback, not full device or screen-reader sign-off.

Source inspection found the dropdown inherited sticky positioning and had unlimited height/visible overflow, while older horizontal navigation rules still supplied flex sizing. Mobile-only correction makes the dropdown non-sticky, bounds it with a stable small-viewport height (vh fallback), enables native vertical overflow/momentum, contains edge scroll chaining, and prevents button shrinking/snapping. Desktop layout and menu open/close behavior are unchanged. Production and fictional full-app fixture CSS match. The existing verification guard now checks the bounded scroller instead of incorrectly requiring sticky mobile navigation. Full local suite passed. This addresses the reported configuration; exact iPhone behavior has not been reproduced here and needs owner retry before the issue is marked resolved.
