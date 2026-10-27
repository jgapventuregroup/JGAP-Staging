# The Key Ahead Investor — approved membership feature allocation

Current owner scope (October 26): preserve Free/Investor and completed Pro capabilities; finish only Market Map, in-app alerts, dashboard customization and advanced team controls. See `remaining-v1-scope.md`. Earlier full-suite recovery requirements are superseded for this handoff.

**Public brand:** The Key Ahead Investor. **Legal business:** JGAP Venture Group LLC.

| Capability | Free | Investor ($19/mo) | Pro ($39/mo) |
| --- | --- | --- | --- |
| Existing Free experience, Deal Analyzer, maximum offer, basic dashboard | Existing behavior unchanged | Included | Included |
| CELCO / HELOC additional financing | No | Included while active | Included while active |
| Saved property creation | Existing 5 lifetime slots unchanged | Unlimited while subscribed | Unlimited while subscribed |
| Deal Pipeline / Deal Intelligence | Keep current Free access unchanged pending explicit gating decision | Included | Included |
| Property Passport | No change to Free | Basic property profile and history | Complete passport and documents |
| Original equipment/services/maintenance/improvements editing | No | Read-only history while eligible | Pro-only writes for owner/admin/editor; authenticated isolation gate passed October 24 |
| Income, expenses and cash flow | No change to Free | Basic property financial tracking | Advanced finance, current saved-estimate/month comparison and bookkeeping reporting |
| Repairs, notes, follow-ups | No change to Free | Basic | Advanced including vendors, work history and reporting |
| Money-Making System | No change to Free | — | Existing overview, reports and seller-financing tools retained; no further expansion in current scope |
| Market Map | No change to Free | — | Saved-property geographic view in remaining scope |
| In-app alerts | No change to Free | — | Existing-record follow-up/task/maintenance alerts in remaining scope |
| External Deal Radar / Lead Generation | No change to Free | — | Excluded from further V1 build by owner; existing saved-deal review retained |
| Laundromat Division | Out of scope for current release | Out of scope for current release | Deferred for possible future release |
| Dashboard customization and team permissions | No change to Free | — | Full, with secure company roles |
| Ads | Planned; not yet active | Planned; not yet active | No ads |

## Implementation guardrails

1. This is a **product specification**, not a claim that all features or entitlements are implemented. Do not display unavailable features as active.
2. Do not alter Free's existing five-lifetime-property policy, identity locks, or working calculations.
3. Reuse code selectively from `jgapventuregroup/JGAP-Venture-Group`; never replace the current `JGAP-Staging` frontend or database wholesale.
4. Preserve staging/production isolation and company-level row security. Server/database enforcement is required for paid entitlements; hiding buttons alone is insufficient.
5. On downgrade or cancellation, retain customer data, limit new paid-only actions, and avoid destructive deletion.
6. Paid checkout, Stripe, advertisements, real payment verification, and production release remain **web development company handoff items**.
7. The remaining build is only the four features in `remaining-v1-scope.md`. Preserve completed Passport, finance, repair/task and Pro tools. Do not resume external Radar, lead-generation or other feature expansion without a new owner instruction. The Laundromat Division remains excluded.
8. Recheck original module dependencies, tables, migrations, permissions, and browser workflows before declaring any migration complete.

## October 24 owner clarification
CELCO / HELOC secondary financing is a paid Investor/Pro feature. This explicitly replaces the prior Free availability of the separate secondary-loan estimator. Other existing Free Deal Analyzer, maximum-offer, Pipeline and Intelligence behavior stays unchanged. Verified staging owner preview remains a separate authorized exception. Secondary financing is now calculated through a backend entitlement check, not merely hidden controls.


## Named seats and advertising — approved October 26; implemented October 27, 2026

Each workspace subscription includes one named user. Pro collaboration requires paid additional seats for every additional owner/admin/editor/viewer. Pending invitations reserve capacity. Seat quantities and expiry are trusted-backend controlled; customers cannot grant themselves seats. No additional-seat price, live billing, checkout, live advertising, email delivery, or external tracking is activated. Free and Investor retain reserved ad placements throughout the app; Pro stays ad-free. Invite a friend remains available in all three tiers and grants no workspace access.

Included-seat allocation prioritizes the earliest owner, then stable membership order. Expired/reduced additional-seat capacity denies unlicensed record access without deleting memberships or shared records; renewal restores access. The existing verified staging-founder preview remains unchanged, is not customer team licensing, and is disabled in a fresh baseline. Seat-sharing controls do not yet prevent multiple people using the same credentials; provider session controls remain a handoff/acceptance item.
