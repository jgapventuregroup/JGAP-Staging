# JGAP 48-hour execution brief

Owner: Sean / JGAP Venture Group. Start: October 12, 2026, 6:18 a.m. Eastern. Deadline target: October 14, 2026, 6:18 a.m. Eastern.

## Direction recovered from the chat

Deliver a working investment app quickly by reusing the tested backend, redesigned staging interface and useful original JGAP tools. Keep separate sign-in, Dashboard, My properties, Deal Pipeline and Deal Analyzer navigation. Build toward recurring subscription revenue. Continue staging before transferring verified improvements into the original app; preserve original records and useful tools.

Agreed plans: Free with five lifetime properties, Investor $19/month, Pro $39/month. Financial edits do not consume slots. Free identities are locked. Ads are planned for Free/Investor; Pro is ad-free. Free card verification and repeat-Free safeguards remain required work, not delivered features.

## Current evidence

| Area | State | Evidence / remaining limit |
| --- | --- | --- |
| Hosting | Separate staging site deployed | Earlier October 12 company-switch commit passed checks/publication |
| Accounts | Email signup/verification enabled; onboarding exists | Live Auth settings and function inspected; full new-customer browser journey still needed |
| Customer separation | Company-scoped reads/writes | Earlier chat reports 26/26 checks; nine additional October 12 rollback checks passed for A/B reads, own edits, foreign-edit refusal, identity locks and viewers |
| Analyzer | Asking/offer, mortgage, NOI, cash flow, cap rate, cash-on-cash, DSCR, maximum offer | Regression suite passes; input changes invalidate old outputs |
| Properties | Create, edit financials, CSV export | Company-scoped operations; viewer controls read-only |
| Recovery | Reset link request and verified password update | Automated invalid-link, identity, matching-password, cooldown and cleanup tests pass; real email test pending |
| Pipeline | Search, stages, follow-up dates | Writes exist; newest interface's browser persistence checks needed |
| Free limits | Five lifetime creations and identity lock | Triggers inspected; missing-billing sixth-property refusal tested with rollback |
| Additional financing | Optional second-loan interest and combined cash flow | Integrated; invalidated by changes to primary assumptions |
| Payments | Server code and tests added | Stripe unconnected; real checkout/portal/event tests outstanding; no live charging |
| Original tools | Deal Intelligence listing review and Financing & Lenders migrated | Listing import is atomic and deduplicated; lender directory supports contacts, terms, search, follow-ups, edit/archive/restore with company isolation; remaining groups are roadmap work |
| Original app/data | Unchanged by this work | Production transfer remains a reviewed release |

## Definition of a finished first release

A new verified customer opens a company, creates and analyzes a property, saves financial changes, reloads and sees the saved values, tracks a stage/follow-up, exports a summary and signs out without leaking data. Free property six is refused; editing uses no additional slot; company boundaries hold for direct API requests. Explicitly purchased plans activate from verified billing only. Unpaid/canceled plans lose unlimited creation without losing records. Mobile navigation and errors remain usable.

Static screenshots, syntax checks, proposed plan cards and return-from-checkout URLs alone do not satisfy this gate.

## Work order

| Window | Deliverable | Completion gate |
| --- | --- | --- |
| First 12 hours | Workflow fixes and billing backend | Workflow/financial tests pass; live rollback tests pass; handlers compile and remain disabled while disconnected |
| Hours 12–24 | Stripe test connection, Free setup/eligibility, account recovery | Real checkout/portal/events work; no raw cards or browser-controlled paid status; signup abuse controls tested |
| Hours 24–36 | Customer acceptance and useful original-tool carryover | A/B and a new verified account pass hosted workflow; mobile QA; migrate only working company-isolated tools |
| Hours 36–48 | Production package and launch review | Recovery path, approved customer policies/contact, provider connection, completed acceptance record and production approval |

Windows are targets, not fabricated completion dates. Provider connection/merchant setup can block payments. No claim of live payments or public readiness before the gates pass.

## Next actions

1. Workflow fixes and disabled billing handlers deployed; recovery and Deal Intelligence published; Financing & Lenders is being published and verified.
2. Connect the Stripe integration already suggested October 11. Keep keys/signing secrets in server storage; never paste into chat or commit.
3. Deal Intelligence and Financing & Lenders migrated. Review remaining original modules selectively, preserving the approved layout and company isolation.
4. Configure test recurring prices at exactly $19 and $39/month; register subscription created/updated/deleted and invoice.paid/invoice.payment_failed snapshot events against the webhook.
5. Configure/test the portal and provider events, then enable the staging billing UI.
6. Finish Free card/eligibility, verify real recovery-email delivery and complete authenticated browser acceptance.

## Limits

- Mocked workflow tests run actual app handlers but do not replace browser authentication tests.
- Logic/database billing tests pass without Stripe; provider end-to-end validation needs connection.
- Signup currently lacks requested card/eligibility and verified bot protection. Do not market staging as a finished public subscription product.
- Leaked-password protection is disabled; privileged onboarding still needs the explicit review.
- Paid feature differentiation and advertising are unfinished. Agreed prices are not evidence of sales.

## Commands

`npm ci`, `npm test`, `npm run check:edge`. Pin dependencies and commit lockfiles. Pages artifacts include public frontend files only; exclude server sources, tests and node_modules.

Automatic approval review rejected a proposed pause of new workspace creation because it would change availability without sufficiently specific approval. No signup closure was applied. Obtain explicit approval before changing that behavior.
