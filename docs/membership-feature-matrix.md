# The Key Ahead Investor — approved membership feature allocation

Approved direction: preserve Free exactly as currently implemented; provide a useful subset of original JGAP tools in Investor; make the complete restored investment/business-management suite available in Pro.

**Public brand:** The Key Ahead Investor. **Legal business:** JGAP Venture Group LLC.

| Capability | Free | Investor ($19/mo) | Pro ($39/mo) |
| --- | --- | --- | --- |
| Existing Free experience, Deal Analyzer, maximum offer, basic dashboard | Existing behavior unchanged | Included | Included |
| CELCO / HELOC additional financing | No | Included while active | Included while active |
| Saved property creation | Existing 5 lifetime slots unchanged | Unlimited while subscribed | Unlimited while subscribed |
| Deal Pipeline / Deal Intelligence | Keep current Free access unchanged pending explicit gating decision | Included | Included |
| Property Passport | No change to Free | Basic property profile and history | Complete passport and documents |
| Income, expenses and cash flow | No change to Free | Basic property financial tracking | Advanced finance and CPA-ready reporting |
| Repairs, notes, follow-ups | No change to Free | Basic | Advanced including vendors, work history and reporting |
| Money-Making System | No change to Free | — | Full |
| Market Map, Deal Radar, Alerts, Lead Generation | No change to Free | — | Full, after validating original modules |
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
7. Prioritize a functional Investor basic Property Passport, finance view, and repair/task records; then restore Pro's Money-Making System, financial dashboard, Market Map and advanced real-estate modules. The Laundromat Division is deferred and must not be included in the current release.
8. Recheck original module dependencies, tables, migrations, permissions, and browser workflows before declaring any migration complete.

## October 24 owner clarification
CELCO / HELOC secondary financing is a paid Investor/Pro feature. This explicitly replaces the prior Free availability of the separate secondary-loan estimator. Other existing Free Deal Analyzer, maximum-offer, Pipeline and Intelligence behavior stays unchanged. Verified staging owner preview remains a separate authorized exception. Secondary financing is now calculated through a backend entitlement check, not merely hidden controls.
