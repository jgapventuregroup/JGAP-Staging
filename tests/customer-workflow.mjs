import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(Boolean);
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.value = ''; this.textContent = ''; this.dataset = {}; this.listeners = {}; this.disabled = false; this.hidden = false; const classes = new Set(); this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x, on) => { on ??= !classes.has(x); on ? classes.add(x) : classes.delete(x); } }; }
  get options() { return this.children; }
  append(...children) { this.children.push(...children); }
  prepend(...children) { this.children.unshift(...children); }
  replaceChildren(...children) { this.children = children; this.textContent = ''; }
  setAttribute(k, v) { this[k] = v; }
  removeAttribute(k) { delete this[k]; }
  addEventListener(k, fn) { this.listeners[k] = fn; }
  focus() {}
  scrollIntoView() {}
}
const elements = new Map();
const el = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
const companies = [{ company_id: 'a', company_name: 'Company A', member_role: 'viewer' }, { company_id: 'b', company_name: 'Company B', member_role: 'owner' }];
const deal = { id: 'deal-a', company_id: 'a', name: 'Fictional Duplex A', status: 'lead', purchase_price: 180000, asking_price: 200000, target_offer_price: 180000, monthly_rent: 1800, other_monthly_income: 0, vacancy_rate: 5, monthly_operating_expenses: 600, down_payment: 20, interest_rate: 7, loan_term_years: 30, closing_costs: 5000, rehab_cost: 0 };
const calls = []; let options; let failCompanyB = false;
const fakeClient = {
  auth: { signInWithPassword: async ({ email }) => ({ data: { user: { email, email_confirmed_at: '2026-01-01' } }, error: null }), signOut: async () => ({ error: null }) },
  rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === 'list_my_companies') return { data: companies, error: null };
    if (name === 'list_company_deals') return failCompanyB && args.p_company_id === 'b' ? { data: null, error: Error('Network unavailable') } : { data: args.p_company_id === 'a' ? [deal] : [], error: null };
    if (name === 'get_my_lifetime_deal_usage') return { data: 1, error: null };
    if (name === 'get_company_deal') return { data: [deal], error: null };
    return { data: null, error: null };
  },
  from(table) { const query = { select() { return query; }, eq() { return query; }, maybeSingle: async () => ({ data: { plan: 'free', billing_status: 'not_connected' }, error: null }) }; return query; },
};
const context = { document: { documentElement: { dataset: {} }, getElementById: el, querySelectorAll: () => [], createElement: tag => new Element(tag), createTextNode: text => ({ textContent: text }) }, window: { JGAP_STAGING_PUBLISHABLE_KEY: 'sb_publishable_test', supabase: { createClient: (url, key, opts) => { options = opts; return fakeClient; } } }, localStorage: { getItem: () => null, setItem() {} }, console, matchMedia: () => ({ matches: false }) };
vm.runInNewContext(script, context);
el('email').value = 'fictional@example.com'; el('password').value = 'temporary test input';
await el('login').onclick();
assert.equal(options.auth.autoRefreshToken, true, 'Sessions must refresh during use');
assert.equal(options.auth.persistSession, false, 'Staging must not retain credentials after reload');
assert.equal(el('company').value, '', 'Multiple memberships must require an explicit choice');
assert.equal(calls.filter(x => x.name === 'list_company_deals').length, 0, 'No company may be loaded before selection');
assert.match(el('workspace-status').textContent, /Choose the company/);

el('company').value = 'a'; await el('company').onchange();
assert.equal(el('metric-count').textContent, '1');
assert.equal(el('new-deal-form').hidden, true, 'Viewers cannot add properties');
assert.match(el('new-deal-limit-notice').textContent, /read-only/);
assert.equal(el('deals').children.length, 1);
const analyze = el('deals').children[0].children.find(x => x.tagName === 'button');
await analyze.onclick();
assert.match(el('selected').textContent, /Fictional Duplex A/);
assert.equal(el('save-analysis').disabled, true, 'Viewers can analyze but not save');
const writesBefore = calls.filter(x => x.name === 'update_company_deal').length;
await el('save-analysis').onclick();
assert.equal(calls.filter(x => x.name === 'update_company_deal').length, writesBefore);
el('celoc-results').textContent = 'Old cash flow'; el('rent').listeners.input();
assert.match(el('celoc-results').textContent, /Inputs changed/);

failCompanyB = true; el('company').value = 'b'; await el('company').onchange();
assert.equal(el('deals').children.length, 0);
assert.equal(el('pipeline-deals').children.length, 0);
assert.equal(el('export-properties').disabled, true);
assert.equal(el('selected').textContent, 'Manual calculation — not saved');
assert.match(el('workspace-status').textContent, /Unable to load company: Network unavailable/);
failCompanyB = false; await el('company').onchange();
assert.equal(el('new-deal-form').hidden, false, 'Owner with available Free slots can add a property');
assert.equal(el('metric-count').textContent, '0');
await el('logout').onclick();
assert.equal(el('deals').children.length, 0);
assert.equal(el('workspace').classList.contains('hidden'), true);
assert.equal(el('password').value, '');
console.log('PASS: customer workflow — explicit workspace choice, refreshing sessions, read-only analysis, stale financing, failed switches, owner access, sign-out');
