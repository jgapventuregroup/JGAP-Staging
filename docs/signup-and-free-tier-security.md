# JGAP signup and Free-tier abuse safeguards (staging design)

Status: **design only**. Public signup, card collection, Stripe checkout, fraud signals, and automated restrictions are **not active**. Staging currently supports only two test-account sign-ins.

## Rules agreed for launch
- Free: 15 **active saved deals** per company; existing deals remain viewable/editable. A 16th insert is blocked in the staging database.
- Investor: proposed $19/month, unlimited saved deals, advertising planned.
- Pro: proposed $39/month, unlimited saved deals, no advertising.
- Card collection at signup is planned, with **no Free charge**. A paid upgrade must be explicitly approved before billing; never automatically charge at deal 16.
- One Free membership per person is a policy goal, not an identity guarantee. A legitimate user may belong to several companies; do not equate company count with individual identity.

## Before opening public registration
1. Require email verification, rate limiting, and bot protection on the signup endpoint.
2. Collect cards through a payment processor's hosted/tokenized setup flow, not JGAP's database or frontend fields. Show transparent $0 Free terms and explicit billing consent.
3. Establish a trusted server-side identity/account-history record, and check repeat-Free eligibility **before** creating a Free workspace. Never trust browser-supplied plan or payment status.
4. Where supported and legally appropriate, use processor fraud/risk signals. Do not store raw card numbers or sensitive device fingerprints in JGAP.
5. Flag ambiguous matches for private review; shared IP addresses, devices, or households alone must not automatically ban customers.
6. Provide a support/review path for false positives, privacy disclosures, retention limits, and account deletion.
7. Verify signup and deal-creation authorization with multiple users, concurrent requests, canceled billing, and account switching.
8. Handle mobile-app payment rules separately before App Store or Play Store release.

## Existing staging foundations
- `company_subscriptions`: authenticated company members have read-only membership access; customers cannot grant themselves a paid plan.
- `enforce_company_deal_limit` trigger: caps non-active-paid workspaces at 15 deals, serializing writes by company lock.
- `signup_abuse_reviews`: private review table with no anon/authenticated grants. **Not populated automatically.**
- Current database tests confirmed deal 16 blocked for Free, Pro without active billing, and past-due Investor; active Investor was allowed. Tests rolled back.

## Original-app migration standard
Only migrate an old JGAP module when it has demonstrable investing value, works with company isolation, passes automated checks and mobile usability review, and is maintainable. Toolbox entries are roadmap labels, not functioning tools.
