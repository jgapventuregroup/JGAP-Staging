# JGAP V1 clean-build branch

This is an isolated working branch. **Do not modify the original production repository, production Supabase, or staging main without review.**

## Goal
Assemble a usable property-investing application from already-working code, keeping the staging visual design and company-isolated staging Supabase data. No Stripe until core app is accepted.

## Reuse map
- Visual design and navigation: staging `index.html`
- Signup and company workspace: staging Supabase auth and existing membership/RLS
- Deal Analyzer, offer solver, optional secondary financing: staging (derived from original JGAP)
- Saved properties and Deal Pipeline: staging existing company-scoped RPCs
- CSV property summary: staging existing export
- Property Passport, finance ledger, lender tools: original production modules as reference **only**; not first-release blockers

## V1 acceptance tests (must be demonstrated, not inferred from source code)
- [ ] A new customer signs up, verifies email and signs in without manual administrator setup.
- [ ] Customer creates/selects a company workspace and can sign out and return.
- [ ] Customer adds a property, analyzes, saves, refreshes and reopens unchanged values.
- [ ] Customer edits financial fields without overwriting other stored fields.
- [ ] Pipeline stage and follow-up date persist across refresh.
- [ ] CSV exports only current-company data and safely quotes spreadsheet formulas.
- [ ] Five lifetime Free-property slots are enforced server-side even after deletion.
- [ ] Two unrelated accounts cannot read/write each other's company records.
- [ ] Analyzer mortgage, NOI, offer and optional secondary-loan math pass independent examples.
- [ ] Phone and desktop navigation, forms and errors work.
- [ ] GitHub checks and deployed site pass on the release commit.

## Rules
1. Reuse and integrate before writing replacement logic.
2. Keep optional investor tools optional, including second loans.
3. No placeholder tools counted as complete.
4. Fix blocking issues before adding features.
5. Never assume passing unit checks proves real-user signup or database isolation.
6. No public launch or billing activation without owner approval.
