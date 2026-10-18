# Investor property records — additive schema design (proposal only)

**Not deployed.** This is the next implementation design for Investor income/expense records, repairs and tasks. Preserve existing `deals` rows, company isolation and the five-lifetime Free rule.

## Verified staging foundation
- `public.deals.id` is the primary key; `deals.company_id` references `companies.id` with ON DELETE CASCADE.
- Deal RLS permits members to read. Owners/admins/editors may insert/update/delete, with UPDATE `USING` and `WITH CHECK`.
- The existing `get_company_deal` RPC verifies company membership and returns an existing deal.
- There are no `properties`, `repairs`, `tasks` or `transactions` tables to reuse in staging.

## Proposed tables
1. `property_ledger_entries`: `id uuid` PK; `company_id uuid`; `deal_id uuid`; `entry_date date`; `entry_type` (income/expense); `category text`; `description text`; `amount numeric(12,2)` strictly positive; `created_at timestamptz`; `created_by uuid`. Treat refunds/adjustments as explicit typed records, not negative amounts without explanation.
2. `property_repairs`: `id uuid` PK; `company_id uuid`; `deal_id uuid`; `title text`; `description text`; `status` (open/in_progress/completed); `estimated_cost numeric(12,2)` nullable; `actual_cost numeric(12,2)` nullable; `opened_on date`; `completed_on date` nullable; timestamps.
3. `property_tasks`: `id uuid` PK; `company_id uuid`; `deal_id uuid`; `title text`; `details text`; `status` (open/done); `due_on date` nullable; `created_at timestamptz`; `completed_at timestamptz` nullable.

## Nonnegotiable security constraints
- Each child table must have a composite `(deal_id,company_id)` foreign key to a matching unique key on `deals(id,company_id)`; this prevents associating one company's child record with another company's deal.
- Enable RLS on every new public table before granting client access. SELECT requires authenticated company membership; writes require an owner/admin/editor role **and verified active Investor/Pro entitlement on the server**.
- UPDATE needs both `USING` and `WITH CHECK` to prevent moving records to another company or deal; block changes to immutable identity keys with a trigger or constrained RPC.
- Never trust a client-provided `created_by`; set it from `auth.uid()` server-side.
- Keep records on downgrade but prohibit paid-only writes; define downgrade read access explicitly in the membership specification.
- No service-role key in the browser, no public privilege-escalation RPC, and no production migrations.
- Ensure index support for `(company_id,deal_id,entry_date)` / relevant date columns.

## Acceptance tests before any migration
- Paid owner/editor creates a record, refreshes, and retrieves it.
- Read-only company member cannot write.
- Free company cannot create paid-only records even via direct API call.
- A member of company B cannot read or write company A records.
- A same-company deal ID paired with another company ID is rejected.
- Unauthorized company_id/deal_id reassignment is rejected.
- Blank, negative, extreme, and duplicate-submission inputs are handled safely.
- Downgrade keeps stored data intact and respects the agreed read-only behavior.

## Next steps
Review precise field names and authorized paid entitlement mechanism, implement an additive migration on the development branch, run staging-only security tests, and then build the Investor management UI. No schema change should be executed before this review.
