# JGAP staging account and membership state

Verified October 12, 2026. This replaces the earlier 15-active-deal design notes.

## Agreed product rules

- Free: five **lifetime** property creations per company. Deletion does not restore a slot; financial edits and calculations do not consume slots.
- Free property identity (name, address, county) remains locked after saving. An active paid plan may edit identity.
- Investor: $19/month, unlimited properties while verified billing is active; advertising planned.
- Pro: $39/month, unlimited properties while verified billing is active; ad-free. Advanced features still require implementation.
- A paid upgrade requires explicit customer consent. Never automatically charge when Free property six is attempted.
- Card collection for Free and repeat-Free abuse controls were requested; they are **not implemented**. No card data is collected by this build.

## Verified current behavior

- Hosted staging has signup and sign-in controls. Live Auth settings report `disable_signup=false` and `mailer_autoconfirm=false`: signup is enabled and email confirmation is required. Older notes saying signup remained closed are stale.
- Verified users with no existing membership can provision a workspace through `create_my_company`; pending invitations and multiple existing memberships are checked server-side.
- The newest interface requires an explicit choice when an account has multiple companies.
- Customer records are company-scoped, with read-only viewers and owner/admin/editor property writes.
- Lifetime counters and identity rules are database-enforced. Missing billing records now fail closed at the five-property limit.
- Customers can read their own membership status but cannot change plan or billing status.
- Password recovery now has reset-link requests, server-verified recovery sessions, password confirmation, token/field clearing and sign-out. Automated tests pass; real reset-email delivery still needs testing.
- No advertising network, production Stripe checkout, or paid feature-tier paywall is active.

## Billing implementation added October 12

- `billing-session`: validates every bearer token with Auth, requires verified email and company owner/admin role, permits only fixed Investor/Pro monthly USD prices, and creates hosted checkout/portal sessions.
- `billing-webhook`: validates the raw body with the Stripe SDK, retrieves current subscription state, matches the stored customer, verifies the price and paid invoice, and calls the service-only transactional update.
- Browser redirects and `checkout.session.completed` do not grant paid access. Duplicate delivery, older events, mismatched subscriptions, cancellation and resubscription are tested.
- Handlers are **test-mode only**, require explicit server enablement/configuration, and return unavailable while disconnected. They do not implement Free card setup or one-Free-person verification.
- Private billing event records have RLS and no customer access. Customers cannot execute the billing update RPC.

## Public-launch blockers

1. Connect Stripe, configure test products/prices, webhook signing secret and portal. Run real provider checkout, failure, cancellation and replay tests.
2. Implement/test requested $0 Free card setup, eligibility checks, rate limits and bot protection before marketing registration.
3. Verify the implemented password recovery flow with real email delivery and redirect settings; finish remaining account management.
4. Add approved support contact, terms, privacy disclosures and billing/cancellation information.
5. Complete real browser tests for new signup and both fictional customers, including narrow screens and switching.
6. Prepare production migration and obtain the explicit production approval required by the existing release process.

## Advisor review

Leaked-password protection is disabled. `create_my_company` intentionally uses a checked SECURITY DEFINER onboarding function and remains flagged for review. Private review/audit tables have RLS with no customer policies, intentionally denying direct access. Do not grant public access just to remove these notices.

References: [Auth password security](https://supabase.com/docs/guides/auth/password-security), [SECURITY DEFINER advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Stripe webhooks](https://docs.stripe.com/webhooks), [Subscription events](https://docs.stripe.com/billing/subscriptions/webhooks).
