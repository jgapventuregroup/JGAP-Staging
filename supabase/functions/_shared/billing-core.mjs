// Pure request handlers; the runtime adapter supplies authenticated database and Stripe access.
// Staging is test-mode only. Enabling live billing is a separate release decision.
export class BillingError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const plans = { investor: 1900, pro: 3900 };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const identifier = object => typeof object === 'string' ? object : object?.id;
function configured(config) {
  return config.enabled === true && config.secretKey?.startsWith('sk_test_') && config.webhookSecret?.startsWith('whsec_') && config.investorPrice?.startsWith('price_') && config.proPrice?.startsWith('price_') && config.investorPrice !== config.proPrice;
}
function priceFor(plan, config) { return plan === 'investor' ? config.investorPrice : config.proPrice; }
function validPrice(price, plan, config) {
  return price && price.id === priceFor(plan, config) && price.active === true && price.livemode === false && price.currency === 'usd' && price.unit_amount === plans[plan] && price.recurring?.interval === 'month' && price.recurring?.interval_count === 1 && price.type === 'recurring';
}
function checkoutUrl(url) {
  try { const parsed = new URL(url); if (parsed.protocol === 'https:' && parsed.hostname === 'checkout.stripe.com') return url; } catch {}
  throw new BillingError(502, 'Unable to open secure checkout.');
}
function portalUrl(url) {
  try { const parsed = new URL(url); if (parsed.protocol === 'https:' && parsed.hostname === 'billing.stripe.com') return url; } catch {}
  throw new BillingError(502, 'Unable to open the billing portal.');
}

export function createBillingSessionHandler(deps, config) {
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Access-Control-Allow-Origin': config.origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
    if (origin !== config.origin) return json({ error: 'Origin not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405, headers);
    try {
      const authorization = request.headers.get('authorization') || '';
      if (!/^Bearer \S+$/.test(authorization)) throw new BillingError(401, 'Sign in before managing billing.');
      const user = await deps.getUser(authorization.slice(7));
      if (!user?.id) throw new BillingError(401, 'Sign in before managing billing.');
      if (!user.email_confirmed_at) throw new BillingError(403, 'Verify your email before managing billing.');
      const raw = await request.text();
      if (raw.length > 2048) throw new BillingError(413, 'Request is too large.');
      let body; try { body = JSON.parse(raw); } catch { throw new BillingError(400, 'Invalid request.'); }
      if (!body || Array.isArray(body) || Object.keys(body).some(key => !['company_id', 'action', 'plan'].includes(key)) || !UUID.test(body.company_id || '') || !['checkout', 'portal'].includes(body.action)) throw new BillingError(400, 'Invalid billing request.');
      if (body.action === 'checkout' && !Object.hasOwn(plans, body.plan)) throw new BillingError(400, 'Choose Investor or Pro.');
      const role = await deps.getRole(body.company_id, user.id);
      if (!['owner', 'admin'].includes(role)) throw new BillingError(403, 'Only a company owner or administrator can manage billing.');
      if (!configured(config)) throw new BillingError(503, 'Subscription checkout is not connected yet. No payment has been taken.');
      const billing = await deps.getBilling(body.company_id);
      if (!billing) throw new BillingError(409, 'Company membership must be initialized before billing.');
      if (body.action === 'portal') {
        if (!billing.stripe_customer_id) throw new BillingError(409, 'This company has no billing account yet.');
        const session = await deps.stripe.billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: config.returnUrl });
        return json({ url: portalUrl(session.url), mode: 'test' }, 200, headers);
      }
      const price = await deps.stripe.prices.retrieve(priceFor(body.plan, config));
      if (!validPrice(price, body.plan, config)) throw new BillingError(503, 'Subscription pricing needs configuration. No payment has been taken.');
      let customer = billing.stripe_customer_id;
      if (!customer) {
        const created = await deps.stripe.customers.create({ email: user.email, metadata: { jgap_company_id: body.company_id } }, { idempotencyKey: 'jgap-staging-customer-' + body.company_id });
        customer = await deps.linkCustomer(body.company_id, created.id);
        if (customer !== created.id) throw new BillingError(409, 'Billing setup changed. Please retry.');
      }
      const subscriptions = await deps.stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
      if (subscriptions.has_more || subscriptions.data.some(subscription => !['canceled', 'incomplete_expired'].includes(subscription.status))) throw new BillingError(409, 'This company already has a subscription or pending payment. Use the billing portal.');
      // A single company idempotency bucket is shared across plans, preventing parallel
      // requests for different plans from creating independent checkout sessions.
      const bucket = Math.floor(deps.now() / 1800000);
      const session = await deps.stripe.checkout.sessions.create({ mode: 'subscription', customer, client_reference_id: body.company_id, line_items: [{ price: price.id, quantity: 1 }], success_url: config.returnUrl + '?billing=returned', cancel_url: config.returnUrl + '?billing=canceled', metadata: { jgap_company_id: body.company_id }, subscription_data: { metadata: { jgap_company_id: body.company_id } } }, { idempotencyKey: 'jgap-staging-checkout-' + body.company_id + '-' + bucket });
      return json({ url: checkoutUrl(session.url), mode: 'test' }, 200, headers);
    } catch (error) {
      if (!(error instanceof BillingError)) deps.report('billing-session-failed');
      return json({ error: error instanceof BillingError ? error.message : 'Billing could not be completed. No access change was made.' }, error instanceof BillingError ? error.status : 502, headers);
    }
  };
}

export function subscriptionState(subscription, config) {
  const item = subscription.items?.data?.length === 1 ? subscription.items.data[0] : null;
  const plan = item?.price?.id === config.investorPrice ? 'investor' : item?.price?.id === config.proPrice ? 'pro' : null;
  const recognized = plan && item.quantity === 1 && validPrice(item.price, plan, config) && subscription.livemode === false;
  const invoice = subscription.latest_invoice;
  const paid = invoice && typeof invoice === 'object' && invoice.status === 'paid' && invoice.paid === true;
  return { plan: recognized ? plan : 'free', billing_status: !recognized ? 'not_connected' : subscription.status === 'canceled' ? 'canceled' : subscription.status === 'active' && paid ? 'active' : 'past_due' };
}

export function createBillingWebhookHandler(deps, config) {
  return async request => {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (!configured(config)) return json({ error: 'Billing is not connected.' }, 503);
    if (!request.headers.get('stripe-signature')) return json({ error: 'Missing signature.' }, 400);
    const raw = await request.text();
    if (raw.length > 1000000) return json({ error: 'Event is too large.' }, 413);
    let event;
    try { event = await deps.verifyEvent(raw, request.headers.get('stripe-signature'), config.webhookSecret); }
    catch { return json({ error: 'Invalid signature.' }, 400); }
    if (event.livemode !== false) return json({ error: 'Staging accepts test events only.' }, 400);
    const subscriptionEvent = ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type);
    const invoiceEvent = ['invoice.paid', 'invoice.payment_failed'].includes(event.type);
    if (!subscriptionEvent && !invoiceEvent) return json({ received: true, ignored: true });
    const source = event.data?.object;
    if (!/^evt_[A-Za-z0-9]+$/.test(event.id || '') || !Number.isSafeInteger(event.created) || event.created < 0) return json({ error: 'Invalid event.' }, 400);
    let subscriptionId;
    if (subscriptionEvent) {
      if (source?.object !== 'subscription') return json({ error: 'Invalid subscription event.' }, 400);
      subscriptionId = source.id;
    } else {
      if (source?.object !== 'invoice' || !/^in_[A-Za-z0-9]+$/.test(source.id || '')) return json({ error: 'Invalid invoice event.' }, 400);
      // Current Stripe API uses parent.subscription_details. Accept legacy
      // snapshot events during endpoint upgrades without trusting metadata.
      subscriptionId = identifier(source.parent?.subscription_details?.subscription || source.subscription);
      if (!subscriptionId) return json({ received: true, ignored: true });
    }
    if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId || '')) return json({ error: 'Invalid subscription.' }, 400);
    try {
      // Fetch current Stripe state instead of trusting an out-of-order event snapshot
      // or browser/user-controlled metadata. The database maps the customer to a company.
      const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price', 'latest_invoice'] });
      const customer = identifier(subscription.customer);
      if (subscription.id !== subscriptionId || !/^cus_[A-Za-z0-9]+$/.test(customer || '') || identifier(source.customer) !== customer) throw new Error('Subscription mismatch');
      const result = await deps.applyEvent({ event_id: event.id, event_created: event.created, customer_id: customer, subscription_id: subscription.id, ...subscriptionState(subscription, config) });
      return json({ received: true, result });
    } catch { deps.report('billing-webhook-failed'); return json({ error: 'Unable to apply verified billing event. Retry required.' }, 500); }
  };
}
