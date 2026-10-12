import { createBillingSessionHandler } from '../_shared/billing-core.mjs';
import { dependencies, config } from '../_shared/billing-runtime.ts';
// Gateway JWT checks are disabled only because this handler validates every
// bearer token using Supabase Auth getUser and then checks company ownership.
Deno.serve(createBillingSessionHandler(dependencies, config));
