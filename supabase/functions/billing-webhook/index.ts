import { createBillingWebhookHandler } from '../_shared/billing-core.mjs';
import { dependencies, config } from '../_shared/billing-runtime.ts';
// Stripe cannot send a Supabase JWT. The handler requires Stripe SDK validation
// of the raw body and signing secret before accepting any event.
Deno.serve(createBillingWebhookHandler(dependencies, config));
