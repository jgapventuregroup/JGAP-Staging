# Investor property management recovery — implementation audit

Date: 2026-10-17
Branch: `feature/investor-property-management`
Status: inspection and dependency review; no feature activated.

## Confirmed source inspection
- Staging `index.html` is the existing live workspace UI; preserve its auth, company selector, deal analyzer, pipeline and Free lifetime-save behavior.
- Staging `verify.mjs` asserts critical existing behavior, including duplicate saves, stale async responses, staging isolation and no active checkout. Do not remove these safeguards.
- Original `index.html` includes property, finance, repairs, notes, tasks and reporting views; these are **not** drop-in replacements for staging.
- Original also references separate scripts for Money-Making System, Market Map, alerts, laundromats and vendors. Their dependencies need separate review.
- Approved entitlements are defined in `docs/membership-feature-matrix.md`. Do not grant paid access based solely on client-side controls.

## Implementation sequence
1. Identify the original property/repair/task/finance data shapes and Supabase calls.
2. Map them to staging's company/deal identifiers; confirm the underlying tables and RLS policies before creating any migration.
3. Implement an Investor property detail view using existing company/deal context, then property financial ledger and repair/task records.
4. Enforce paid entitlements server-side and preserve customer records on downgrade.
5. Run targeted new-module tests plus existing regression suite; document deployment prerequisites.
6. Submit a reviewable PR, leaving `main` and production unchanged until reviewed.

## Safety constraints
- No production or staging database writes during this audit.
- Do not copy original `index.html` wholesale.
- Never expose service-role credentials in browser code.
- No paid checkout activation, billing verification claims, or advertising integration.
- Preserve public brand The Key Ahead Investor and legal entity JGAP Venture Group LLC.

## Open dependencies before coding
- Original module function boundaries and exact tables/columns.
- Existing staging migration layout and company ownership policy.
- Current paid entitlement RPCs and expected server-side enforcement.
- Whether the original records contain reusable data or only code paths.

## Acceptance criteria for first functional increment
- A signed-in Investor can open a property detail page for their own company's deal.
- Property notes/history, income/expenses and repair/tasks persist correctly after sign-out/in.
- A user in another company cannot read or modify these records.
- Free remains unchanged; no paid feature is shown as active until entitlement verification works.
- Existing analyzer, pipeline, five lifetime Free slots and workspace switching still pass their existing tests.

## Verified staging database inspection (read-only, 2026-10-17)
- Confirmed Supabase staging project `qfszapteuxuogoselprp`; separate original project `sfsyphmnzxaplundaljy` was **not modified**.
- Staging stores saved investment records in `public.deals`, keyed by `id` and `company_id`. Relevant existing columns include `name`, `property_type`, `property_address`, `notes`, `monthly_rent`, `monthly_operating_expenses`, `follow_up_date`, `created_at`.
- Staging `public.companies` has `id`, `name`, `created_at`.
- None of the queried original-style `properties`, `repairs`, `tasks`, `transactions` tables exists in the inspected staging schema.
- Original repairs and finance pages query `sb.from("properties")`, and original tasks use `create_current_user_task` RPC. These cannot be copied directly to staging.
- Therefore use staging `deals.id` + `company_id` as the foreign-key and authorization basis for new property management records. Confirm company membership authorization functions and paid entitlement enforcement before designing write policies.
- User explicitly deferred the Laundromat Division. Do not port its code or dependencies in this release.

## Immediate next technical work
1. Read staging membership/entitlement functions and existing deal RLS policies.
2. Draft additive staging-only schema for property ledger, repairs and tasks with company isolation and secure entitlement enforcement.
3. Build Investor UI against that schema on this branch; no main branch changes until tested.
