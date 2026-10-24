# Version 1 acceptance status — October 24, 2026

The existing staging app is functional but is **not approved for production or public paid sales**. The approved membership matrix remains the product specification; an automated test pass does not make unfinished Pro features available.

| Area | Verified evidence | Remaining acceptance |
| --- | --- | --- |
| Analyzer, property saves, pipeline, account recovery | Existing regression suite; earlier owner save/reopen and navigation checks | Final rendered smoke after relevant changes |
| Membership and lifetime limits | Backend staging rollback tests; repeatable SQL tests on restored schema; browser-response tests | Normal paid/inactive accounts and final rendered flows |
| Passport financials, notes, type/units | Existing owner financial-save check; new exact-scope/verified-save tests and backend denial tests | New notes/details editors on desktop/phone, print output |
| Ledger, repairs, tasks | Staging role tests, CRUD/loader/form regressions, date/count/total checks | Normal-session rendered add/edit/completion workflow |
| Pro reports, comparison, CSV | Backend entitlement/precision/isolation tests and UI/API regression tests | Rendered comparison, selected filters and actual download on supported devices |
| Original equipment/services/maintenance/improvement editors | Existing code, readers and schema permissions retained | Real separately authenticated two-company SELECT/INSERT/UPDATE gate still unexecuted; editors remain disabled |
| Database handoff | Schema-only baseline; clean isolated restore; 41 SQL check groups; grant/policy/key/trigger comparisons; existing-schema refusal | Hosted Supabase platform restore rehearsal and environment setup; local Auth contract is not real authentication |
| Branding and layout | Shared website colors; responsive CSS and navigation regressions; signed-out desktop sign-in observation without horizontal overflow | Signed-in desktop/phone, keyboard, dark mode and print acceptance |
| Advertisements | Labeled placeholders; Pro suppression tests | Outside company: live serving, creative review, privacy/consent and reporting |
| Commerce and packaging | Existing disabled billing adapters and documented interfaces | Outside company: processor/webhooks, app install/download packaging, book delivery, production configuration/monitoring |

## Open product work — do not advertise as delivered

Document uploads/attachments and legal-title ownership records are unfinished. Current comparison uses current saved assumptions, not an immutable purchase-time underwriting budget. Money-Making System, Market Map, Deal Radar, alerts, lead generation, dashboard customization and advanced team controls remain incomplete. The Laundromat Division is excluded by the existing owner decision.

The unsafe-to-enable original editors have an explicit Version 1 exclusion until their security gate passes. Broader changes to the approved paid offering require owner approval; missing features must remain labeled unavailable and must not be sold as complete.

## Final candidate acceptance

1. Require successful runs of all four main workflows on the exact handoff commit: JGAP staging checks, Staging app tests, JGAP V1 Verification, Publish JGAP staging website. A queued, missing or older run is not a pass.
2. Complete the targeted normal-session checks in `property-passport-browser-test.md`; preserve previous general account/deal evidence and avoid requesting repeat tests without a relevant change.
3. Complete the original-record security gate with two distinct normal test sessions/companies before enabling its frontend writers. No administrator impersonation, credential sharing in chat, or changed RLS is an acceptable shortcut.
4. Review the matrix, remaining development and the outside company's responsibilities together. Owner production approval is separate from accepting a staging handoff.

See `developer-handoff.md` and `../supabase/baseline/README.md` for setup and recovery. No production deployment, paid billing or live advertisements are authorized by this checklist.
