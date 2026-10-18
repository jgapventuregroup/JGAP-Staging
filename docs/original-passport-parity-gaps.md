# Original Passport parity — implementation gate

Source: original `JGAP-Venture-Group/property-passport.js` compared with branch `property-passport.mjs` and `property-passport-preview.mjs` (October 18, 2026).

## Restored on feature branch
- Open Passport from an existing saved deal, with company context checks.
- Systems/equipment, service schedules, maintenance, improvements, entry forms, and print.
- Property operations sections for income, expenses, repairs and tasks, behind database/RLS gates.

## Missing original capabilities — do not claim full parity yet
- Original Passport has **current value**, **mortgage balance**, and calculated **equity**. The deal projection does not currently supply these. Do not invent a value or equate asking price with current value.
- Original has a separate **purchase date**, property **city/state**, and active-property creation flow. New Passport reuses existing saved deals rather than duplicating the property table; these fields need explicit schema mapping and an approved storage strategy.
- Original equipment creation can also add its first service schedule. New implementation uses separate forms; consider an explicit two-step workflow with clear partial-save handling.
- Original property listing displays purchase/value/equity/rent cards; new saved-deal list does not yet duplicate these cards.
- Browser-accessible integrated test remains pending. Branch ZIP artifact is not a substitute.

## Next implementation decisions
1. Inspect existing `public.deals` columns before mapping financial fields. If fields are absent, draft additive columns or a company-scoped property detail table for review; never execute without approval.
2. Reconcile equipment/service creation behavior and add browser tests for successful saves and refresh failures.
3. Require a separate browser preview deployment plus isolated paid test entitlement and RLS acceptance before activating writes. Do not merge to `main` or modify the current staging deployment without explicit approval.
