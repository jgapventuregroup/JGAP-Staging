import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import Stripe from 'npm:stripe@23.0.0';

export const config = {
  enabled: Deno.env.get('JGAP_BILLING_ENABLED') === 'true',
  secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '',
  webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
  investorPrice: Deno.env.get('STRIPE_INVESTOR_PRICE_ID') || '',
  proPrice: Deno.env.get('STRIPE_PRO_PRICE_ID') || '',
  origin: 'https://jgapventuregroup.github.io',
  returnUrl: 'https://jgapventuregroup.github.io/JGAP-Staging/',
};
// Secrets stay in the function runtime. A placeholder lets disabled deployments
// boot without a configured Stripe account; handlers never use it while disabled.
const stripe = new Stripe(config.secretKey || 'sk_test_not_configured', { httpClient: Stripe.createFetchHttpClient() });
const database = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
export const dependencies = {
  stripe,
  now: () => Date.now(),
  report: (code: string) => console.error(code),
  getUser: async (token: string) => { const { data, error } = await database.auth.getUser(token); return error ? null : data.user; },
  getRole: async (company: string, user: string) => { const { data, error } = await database.from('company_members').select('role').eq('company_id', company).eq('user_id', user).maybeSingle(); if (error) throw error; return data?.role; },
  getBilling: async (company: string) => { const { data, error } = await database.from('company_subscriptions').select('stripe_customer_id,stripe_subscription_id,billing_status').eq('company_id', company).maybeSingle(); if (error) throw error; return data; },
  linkCustomer: async (company: string, customer: string) => {
    const { error } = await database.from('company_subscriptions').update({ stripe_customer_id: customer }).eq('company_id', company).is('stripe_customer_id', null);
    if (error) throw error;
    const { data, error: readError } = await database.from('company_subscriptions').select('stripe_customer_id').eq('company_id', company).single();
    if (readError) throw readError;
    return data.stripe_customer_id;
  },
  verifyEvent: (body: string, signature: string, secret: string) => stripe.webhooks.constructEventAsync(body, signature, secret, undefined, Stripe.createSubtleCryptoProvider()),
  applyEvent: async (event: { event_id: string; event_created: number; customer_id: string; subscription_id: string; plan: string; billing_status: string }) => {
    const { data, error } = await database.rpc('apply_verified_billing_event', { p_event_id: event.event_id, p_event_created: event.event_created, p_customer_id: event.customer_id, p_subscription_id: event.subscription_id, p_plan: event.plan, p_billing_status: event.billing_status });
    if (error) throw error;
    return data;
  },
};
