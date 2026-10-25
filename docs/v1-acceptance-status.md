# Version 1 acceptance status — October 25, 2026

The existing staging app is functional but is **not approved for production or public paid sales**. The approved membership matrix remains the product specification; an automated test pass does not make unfinished Pro features available.

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

## Open product work — do not advertise as delivered

Document upload/list/download code and private Pro/company/property Storage policies are prepared, with three grouped staging SQL-role checks and local module/restore tests. The normal authenticated Storage API gate passed 58 fresh-request checks; staging controls are enabled after evidence review, with real form/device acceptance still required. Legal-title ownership records are unfinished. Current comparison uses current saved assumptions, not an immutable purchase-time underwriting budget. Money-Making System, Market Map, Deal Radar, alerts, lead generation, dashboard customization and advanced team controls remain incomplete. The Laundromat Division is excluded by the existing owner decision.

The original editors passed their normal-session isolation gate and desktop owner form acceptance; ordinary paid/viewer and phone acceptance remain required. Broader changes to the approved paid offering require owner approval; missing features must remain labeled unavailable and must not be sold as complete.

## Final candidate acceptance

1. Require successful runs of all four main workflows on the exact handoff commit: JGAP staging checks, Staging app tests, JGAP V1 Verification, Publish JGAP staging website. A queued, missing or older run is not a pass.
2. Complete the targeted normal-session checks in `property-passport-browser-test.md`; preserve previous general account/deal evidence and avoid requesting repeat tests without a relevant change.
3. Preserve the completed original-record normal-session gate evidence and verify enabled add/edit/reopen workflows. No administrator impersonation, credential sharing in chat, or weakened RLS is an acceptable shortcut.
4. Review the matrix, remaining development and the outside company's responsibilities together. Owner production approval is separate from accepting a staging handoff.

See `developer-handoff.md` and `../supabase/baseline/README.md` for setup and recovery. No production deployment, paid billing or live advertisements are authorized by this checklist.
