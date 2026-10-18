-- REVIEW ONLY. Do not execute without explicit staging schema and RLS approval.
-- Reuse public.deals as the property identity; never create duplicate properties.
-- Keep market value separate from ARV and from asking/offer price.
-- Proposed minimal additive financial fields for the original Passport parity.
BEGIN;
ALTER TABLE public.deals
 ADD COLUMN IF NOT EXISTS passport_current_value numeric(14,2) CHECK (passport_current_value >= 0),
 ADD COLUMN IF NOT EXISTS passport_mortgage_balance numeric(14,2) CHECK (passport_mortgage_balance >= 0),
 ADD COLUMN IF NOT EXISTS passport_purchase_date date;
-- Equity is derived only when BOTH current value and mortgage balance are known.
-- Never substitute ARV or an unknown mortgage balance as zero.
-- IMPORTANT: before execution review existing deal UPDATE policies, paid entitlement,
-- and prevent Free-tier updates to Passport-only fields via server-side enforcement.
ROLLBACK;
