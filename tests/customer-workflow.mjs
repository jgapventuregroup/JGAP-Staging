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
    if (name === 'update_company_deal') { if (args.p_company_id !== 'a' || args.p_deal_id !== deal.id) return { data:null,error:Error('Wrong company') }; Object.assign(deal,args.p_patch); return {data:deal,error:null}; }
    if (name === 'create_company_deal_from_listing') return { data: {id:'imported-property',saved:true}, error: null };
    return { data: null, error: null };
  },
  from(table) { let fields={},operation=null;const predicates={}; const query = { select() { return query; }, eq(key,value) { predicates[key]=value;return query; },order(){return query;},insert(value){fields=value;operation='insert';return query;},update(value){fields=value;operation='update';return query;},single:async()=>{calls.push({name:'table-write',table,operation,fields,predicates});if(table==='deals'&&operation==='update'){if(predicates.company_id!==deal.company_id||predicates.id!==deal.id)return {data:null,error:Error('Wrong company')};Object.assign(deal,fields);return {data:{id:deal.id,...fields},error:null};}return {data:{id:'lender-fixture',company_id:fields.company_id||predicates.company_id,...fields},error:null};},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}, maybeSingle: async () => ({ data: { plan: 'free', billing_status: 'not_connected' }, error: null }) }; return query; },
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
const viewerDeal=deal.target_offer_price;
assert.equal(viewerDeal,180000,'Viewer attempt must not modify offer');

await assert.rejects(context.window.JGAPIntelligenceContext.save({}, 'a'), /not authorized/, 'Viewer cannot bypass import controls');
await assert.rejects(context.window.JGAPLenderContext.save({institution_name:'Test lender'},null,'a'), /not authorized/);
el('celoc-results').textContent = 'Old cash flow'; el('rent').listeners.input();
assert.match(el('celoc-results').textContent, /Inputs changed/);

// A writable account must persist offer changes through the company-scoped API.
companies[0].member_role='owner';
await el('login').onclick(); // Refresh the app's membership snapshot; fixture mutation alone does not change cached permissions.
el('company').value='a';await el('company').onchange();
const editable=el('deals').children[0].children.find(x=>x.tagName==='button');
await editable.onclick();
el('offer').value='165000';
await el('save-analysis').onclick();
assert.equal(deal.target_offer_price,165000,'Changed offer must persist');
assert.equal(deal.purchase_price,165000,'Underwriting purchase price must match saved offer');
const savedCall=calls.filter(x=>x.name==='update_company_deal').at(-1);
assert.equal(savedCall.args.p_company_id,'a');
assert.equal(savedCall.args.p_deal_id,'deal-a');
assert.equal(el('save-analysis-status').textContent,'Saved to this property.');
await editable.onclick();
assert.equal(Number(el('offer').value),165000,'Reopening must load saved offer');
const pipelineCard=el('pipeline-deals').children[0];
const stageControl=pipelineCard.children.find(x=>x.tagName==='select');
const followLabel=pipelineCard.children.find(x=>x.tagName==='label');
const followControl=followLabel.children.find(x=>x.tagName==='input');
stageControl.value='offer';await stageControl.onchange();
assert.equal(deal.status,'offer','Pipeline stage must persist');
assert.equal(el('pipeline-deals').children[0].children.find(x=>x.tagName==='select').value,'offer','Refreshed pipeline must display saved stage');
const currentFollow=el('pipeline-deals').children[0].children.find(x=>x.tagName==='label').children.find(x=>x.tagName==='input');
currentFollow.value='2026-11-05';await currentFollow.onchange();
assert.equal(deal.follow_up_date,'2026-11-05','Follow-up must persist');
assert.equal(el('pipeline-deals').children[0].children.find(x=>x.tagName==='label').children.find(x=>x.tagName==='input').value,'2026-11-05','Refreshed pipeline must display saved follow-up');
console.log('PASS: pipeline stage and follow-up date persist and reopen in correct workspace');

companies[0].member_role='viewer';
console.log('PASS: owner changes offer, saves company-scoped record, and reopens persisted price');

failCompanyB = true; el('company').value = 'b'; await el('company').onchange();
assert.equal(el('deals').children.length, 0);
assert.equal(el('pipeline-deals').children.length, 0);
assert.equal(el('export-properties').disabled, true);
assert.equal(el('selected').textContent, 'Manual calculation — not saved');
assert.match(el('workspace-status').textContent, /Unable to load company: Network unavailable/);
failCompanyB = false; await el('company').onchange();
assert.equal(el('new-deal-form').hidden, false, 'Owner with available Free slots can add a property');
assert.equal(el('metric-count').textContent, '0');
await assert.rejects(context.window.JGAPIntelligenceContext.save({}, 'a'), /not authorized/, 'Import cannot write to a previous company');
const imported={address:'123 Test Street',asking_price:200000,planned_offer:150000,rent_monthly:1800,expenses_monthly:600,source_name:'Synthetic export',external_id:'test-import'};
await context.window.JGAPIntelligenceContext.save(imported,'b');
const write=calls.find(x=>x.name==='create_company_deal_from_listing');assert.equal(write.args.p_company_id,'b');assert.equal(write.args.p_asking_price,200000);assert.equal(write.args.p_offer_price,150000);
await assert.rejects(context.window.JGAPIntelligenceContext.save({...imported,expenses_monthly:null},'b'), /Verify asking price/);

await assert.rejects(context.window.JGAPLenderContext.load('a'), /not authorized/);
await assert.rejects(context.window.JGAPLenderContext.save({institution_name:'Test lender',company_id:'a'},null,'b'), /fields are invalid/);
await context.window.JGAPLenderContext.save({institution_name:'Test lender'},null,'b');
const lenderWrite=calls.filter(x=>x.name==='table-write').at(-1);assert.equal(lenderWrite.fields.company_id,'b');assert.equal(lenderWrite.operation,'insert');
await context.window.JGAPLenderContext.archive('lender-fixture',true,'b');const archiveWrite=calls.filter(x=>x.name==='table-write').at(-1);assert.equal(archiveWrite.predicates.company_id,'b');assert.equal(archiveWrite.predicates.id,'lender-fixture');assert.equal(archiveWrite.fields.archived,true);
await el('logout').onclick();
assert.equal(el('deals').children.length, 0);
assert.equal(el('workspace').classList.contains('hidden'), true);
assert.equal(el('password').value, '');
console.log('PASS: customer workflow — explicit workspace choice, refreshing sessions, read-only analysis, stale financing, failed switches, owner access, sign-out');
