import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(Boolean);
// Regression checks for shared app navigation and responsive visibility.
assert.match(html, /const showPage=page=>[\s\S]*?target\.focus\?\.\(\{preventScroll:true\}\)/, 'Navigation should focus the destination page');
assert.match(html, /el\.setAttribute\?\.\('aria-current','page'\)/, 'Active sidebar destination should be announced');
assert.match(html, /\[hidden\]\{display:none!important\}/, 'Hidden content must remain hidden throughout the app');
assert.match(html, /@media\(prefers-reduced-motion:reduce\)/, 'Navigation must respect reduced-motion preferences');

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
let secondaryDeferred=null;
let membership={plan:'free',billing_status:'not_connected'}, passportAllowed=false, ownerPreviewAllowed=false, passportEligibility,operationsCapability={read:false,write:false},financeCapability={read:false,write:false};
const adSlots=[new Element('aside'),new Element('aside')];
const calls = []; let options; let failCompanyB = false; let loginError = null; let onboardingMode = false; let onboardingCreated = false; let companyBDeals = []; let lifetimeB = 0;
const fakeClient = {
  auth: { signInWithPassword: async ({ email }) => ({ data: { user: { email, email_confirmed_at: '2026-01-01' } }, error: loginError }), signOut: async () => ({ error: null }) },
  rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === 'calculate_secondary_financing') {if(secondaryDeferred)return await new Promise(resolve=>{secondaryDeferred.resolve=resolve});return {data:{company_id:args.p_company_id,monthly_interest:'300',annual_interest:'3600',monthly_cash_flow:'-148.04'},error:null};}
    if (name === 'advanced_finance_access') return {data:financeCapability,error:null};
    if (name === 'get_advanced_finance_report') return {data:{company_id:args.p_company_id},error:null};
    if (name === 'save_property_bookkeeping') return {data:{company_id:args.p_company_id,deal_id:args.p_deal_id,ledger_entry_id:args.p_entry_id},error:null};
    if (name === 'property_operations_access') return {data:operationsCapability,error:null};
    if (name === 'can_access_passport') return {data:passportAllowed,error:null};
    if (name === 'has_owner_preview_access') return {data:ownerPreviewAllowed,error:null};
    if (name === 'list_my_companies') return { data: onboardingMode ? (onboardingCreated ? [{company_id:'new-company',company_name:'My Investment Company',member_role:'owner'}] : []) : companies, error: null };
    if (name === 'create_my_company') { onboardingCreated = true; return { data: null, error: {message:'Duplicate creation response'} }; }
    if (name === 'list_company_deals') return failCompanyB && args.p_company_id === 'b' ? { data: null, error: Error('Network unavailable') } : { data: args.p_company_id === 'a' ? [deal] : companyBDeals, error: null };
    if (name === 'create_company_deal') { if(args.p_company_id==='b'&&lifetimeB>=5)return {data:null,error:{message:'FREE_LIFETIME_PROPERTY_LIMIT_REACHED'}}; if(args.p_company_id==='b')lifetimeB++; const created={id:'created-'+(companyBDeals.length+1),company_id:args.p_company_id,name:args.p_name,purchase_price:args.p_purchase_price,monthly_rent:args.p_monthly_rent,status:'lead'};companyBDeals.push(created);return {data:created,error:null}; }
    if (name === 'get_my_lifetime_deal_usage') return { data: args.p_company_id==='b'?lifetimeB:1, error: null };
    if (name === 'get_company_deal') return { data: [deal], error: null };
    if (name === 'update_company_deal') { if (args.p_company_id !== 'a' || args.p_deal_id !== deal.id) return { data:null,error:Error('Wrong company') }; Object.assign(deal,args.p_patch); return {data:deal,error:null}; }
    if (name === 'create_company_deal_from_listing') return { data: {id:'imported-property',saved:true}, error: null };
    return { data: null, error: null };
  },
  from(table) { let fields={},operation=null;const predicates={}; const query = { select() { return query; }, eq(key,value) { predicates[key]=value;return query; },order(){return query;},insert(value){fields=value;operation='insert';return query;},update(value){fields=value;operation='update';return query;},single:async()=>{calls.push({name:'table-write',table,operation,fields,predicates});if(table==='deals'&&operation==='update'){if(predicates.company_id!==deal.company_id||predicates.id!==deal.id)return {data:null,error:Error('Wrong company')};Object.assign(deal,fields);return {data:{id:deal.id,...fields},error:null};}return {data:{id:'lender-fixture',company_id:fields.company_id||predicates.company_id,...fields},error:null};},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}, maybeSingle: async () => ({ data: membership, error: null }) }; return query; },
};
const context = { document: { documentElement: { dataset: {} }, getElementById: el, querySelectorAll: selector => selector==='[data-tka-ad-slot]'?adSlots:[], createElement: tag => new Element(tag), createTextNode: text => ({ textContent: text }) }, window: { JGAP_STAGING_PUBLISHABLE_KEY: 'sb_publishable_test', supabase: { createClient: (url, key, opts) => { options = opts; return fakeClient; } } }, localStorage: { getItem: () => null, setItem() {} }, console, matchMedia: () => ({ matches: false }) };
context.window.JGAPPassportPreview={clear(){passportEligibility=null},setEligibility(value){passportEligibility=value},addAction(options){if(!passportEligibility?.enabled)return;const button=new Element('button');button.onclick=async()=>{await options.fetchDeal();calls.push({name:'open-passport',companyId:options.companyId,dealId:options.deal.id});};options.line.append(button);return button;}};
vm.runInNewContext(script, context);
onboardingMode = true;
el('email').value = 'new-user@example.com';
el('password').value = 'synthetic-password';
await el('login').onclick();
assert.equal(calls.filter(x => x.name === 'create_my_company').length, 1, 'New user attempts workspace creation once');
assert.equal(el('workspace').classList.contains('hidden'), false, 'Workspace opens after creation succeeded despite an error response');
assert.equal(el('company').options[0].value, 'new-company', 'New company is available in the workspace selector');
await el('logout').onclick();
onboardingMode = false;
calls.length = 0;
el('email').value = 'fictional@example.com';
el('password').value = 'synthetic-password';
loginError = { code: 'email_not_confirmed', message: 'Email not confirmed' };
await el('login').onclick();
assert.match(el('status').textContent, /Email not verified yet/);
assert.equal(el('workspace').classList.contains('hidden'), true);
loginError = { code: 'invalid_credentials', message: 'Invalid login credentials' };
await el('login').onclick();
assert.match(el('status').textContent, /Email or password not recognized/);
loginError = null;
el('email').value = 'fictional@example.com'; el('password').value = 'temporary test input';
await el('login').onclick();
assert.equal(options.auth.autoRefreshToken, true, 'Sessions must refresh during use');
assert.equal(options.auth.persistSession, false, 'Staging must not retain credentials after reload');
assert.equal(el('company').value, '', 'Multiple memberships must require an explicit choice');
assert.equal(calls.filter(x => x.name === 'list_company_deals').length, 0, 'No company may be loaded before selection');
assert.match(el('workspace-status').textContent, /Choose the company/);

el('company').value = ''; await el('company').onchange();
assert.match(el('workspace-status').textContent, /Choose a company workspace/);
assert.equal(calls.filter(x => x.name === 'list_company_deals').length, 0, 'Blank workspace selection must not load company data');
el('company').value = 'a'; await el('company').onchange();
assert.equal(el('metric-count').textContent, '1');
assert.equal(el('new-deal-form').hidden, true, 'Viewers cannot add properties');
assert.equal(passportEligibility.canWrite,false,'Viewer cannot receive a Passport notes editor');
assert.match(el('new-deal-limit-notice').textContent, /read-only/);
assert.equal(el('deals').children.length, 1);
const recentFree=el('dashboard-recent-properties').children[0];
assert.match(recentFree['aria-label'],/Analyze saved property Fictional Duplex A/);
await recentFree.onclick();
assert.equal(calls.filter(x=>x.name==='get_company_deal').at(-1).args.p_deal_id,deal.id,'Recent Free card opens its exact saved deal');
const retainedCard=recentFree;
el('company').value='b';await el('company').onchange();
const beforeStale=calls.length;await retainedCard.onclick();assert.equal(calls.length,beforeStale,'Retained card cannot request a previous company property');
passportAllowed=true;membership={plan:'investor',billing_status:'active'};
el('company').value='a';await el('company').onchange();
const recentPaid=el('dashboard-recent-properties').children[0];
assert.match(recentPaid['aria-label'],/Open Property Passport for Fictional Duplex A/);
await recentPaid.onclick();
assert.deepEqual(calls.filter(x=>x.name==='open-passport').at(-1),{name:'open-passport',companyId:'a',dealId:deal.id});
passportAllowed=false;membership={plan:'free',billing_status:'not_connected'};
el('company').value='a';await el('company').onchange();
console.log('PASS: recent property cards open exact Analyzer/Passport and reject stale workspace actions');
const analyze = el('deals').children[0].children.flatMap(x => x.children || []).find(x => x.tagName === 'button');
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
assert.equal(passportEligibility.canWrite,true,'Editing role is supplied to Passport separately from paid read eligibility');
const editable=el('deals').children[0].children.flatMap(x=>x.children||[]).find(x=>x.tagName==='button');
await editable.onclick();
// Incomplete saved deals must open for editing without displaying a calculation failure.
const previousRent=deal.monthly_rent;
deal.monthly_rent=null;
await editable.onclick();
assert.equal(el('rent').value,'','Missing rent must remain blank');
assert.match(el('results').textContent,/Complete missing fields/,'Incomplete deal must prompt for values instead of calculating');
assert.match(el('warning').textContent,/Missing saved values/,'Incomplete deal must identify missing fields');
deal.monthly_rent=previousRent;
await editable.onclick();
el('offer').value='165000';
el('offer').listeners.input();
assert.match(el('save-analysis-status').textContent, /Unsaved changes/, 'Editing a saved property must warn that changes are not persisted');
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
const renderedText=node=>[node?.textContent||'',...(node?.children||[]).map(renderedText)].join(' ');
assert.match(renderedText(el('dashboard-followups')),/2026-11-05/,'Dashboard must display the exact persisted pipeline follow-up date');
assert.match(renderedText(el('dashboard-followups')),/Fictional Duplex A/,'Dashboard follow-up must identify the saved property');
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
assert.equal(el('deals').children.length, 0, 'Company B properties exclude Company A');
assert.equal(el('pipeline-deals').children.length, 0, 'Company B pipeline excludes Company A');
assert.equal(el('export-properties').disabled, true, 'Company B cannot export Company A properties');
assert.equal(calls.filter(x => x.name === 'list_company_deals').at(-1).args.p_company_id, 'b', 'Company B query must be scoped');
console.log('PASS: successful company switch excludes previous company data');
// New property creation requires deliberate financial input and prevents duplicate names.
const form=el('new-deal-form');
el('new-deal-name').value='Synthetic Triplex';el('new-deal-price').value='';el('new-deal-rent').value='1500';
await form.onsubmit({preventDefault(){}});
assert.equal(companyBDeals.length,0,'Blank purchase price must not create a property');
el('new-deal-price').value='150000.001';
await form.onsubmit({preventDefault(){}});
assert.equal(companyBDeals.length,0,'Fractional cents must not create a property');
el('new-deal-price').value='150000.29';
await form.onsubmit({preventDefault(){}});
assert.equal(companyBDeals.length,1,'Valid financial inputs must create exactly one property');
assert.equal(companyBDeals[0].purchase_price,150000.29);
assert.equal(el('metric-count').textContent,'1','New property must appear after refresh');
el('new-deal-name').value='Synthetic Triplex';
await form.onsubmit({preventDefault(){}});
assert.equal(companyBDeals.length,1,'Duplicate name must not create a second property');
assert.match(el('new-deal-status').textContent,/already in your pipeline/);
el('new-deal-name').value='Synthetic Zero-Price Transfer';
el('new-deal-price').value='0';el('new-deal-rent').value='0';
await form.onsubmit({preventDefault(){}});
assert.equal(companyBDeals.length,2,'Explicit zero amounts must be accepted');
assert.equal(companyBDeals[1].purchase_price,0);
assert.equal(companyBDeals[1].monthly_rent,0);
assert.equal(el('metric-count').textContent,'2','Both saved properties must appear in pipeline');
for(let n=3;n<=5;n++){
  el('new-deal-name').value='Synthetic Property '+n;
  el('new-deal-price').value='100000';el('new-deal-rent').value='1000';
  await form.onsubmit({preventDefault(){}});
}
assert.equal(lifetimeB,5,'Five lifetime slots are consumed');
companyBDeals.splice(0,1); // Simulate deletion; lifetime count must not reset.
el('new-deal-name').value='Synthetic Sixth Property';
el('new-deal-price').value='90000';el('new-deal-rent').value='900';
await form.onsubmit({preventDefault(){}});
assert.equal(lifetimeB,5,'A deleted property must not release a lifetime slot');
assert.equal(companyBDeals.some(x=>x.name==='Synthetic Sixth Property'),false,'Sixth property must be refused');
assert.equal(el('new-deal-form').hidden,true,'At five lifetime slots the Free property form must be hidden');
assert.match(el('new-deal-limit-notice').textContent,/five lifetime|5 lifetime|Free property/i,'The UI must explain the Free property limit');
const attemptedBefore=calls.filter(x=>x.name==='create_company_deal').length;
await form.onsubmit({preventDefault(){}});
assert.equal(calls.filter(x=>x.name==='create_company_deal').length,attemptedBefore,'Hidden Free property form must not call the create API');
console.log('PASS: five lifetime Free slots enforced in simulated server response, including after deletion');
console.log('PASS: new property rejects blank price and fractional cents, saves valid cents, blocks duplicate name');
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
// Server denial must win even when the browser has an active paid label.
for(const [plan,billing_status,allowed,expectPassport,expectAds] of [
 ['free','not_connected',false,false,true],
 ['investor','active',false,false,true],
 ['investor','active',true,true,true],
 ['pro','active',true,true,false],
 ['pro','past_due',false,false,false],
 ['investor','canceled',false,false,false],
 ['free','not_connected',false,false,true],
]){
 membership={plan,billing_status};passportAllowed=allowed;
 el('company').value='b';await el('company').onchange();
 assert.equal(passportEligibility.enabled,expectPassport,plan+'/'+billing_status+' must honor backend Passport authorization');
 assert.equal(el('secondary-financing').hidden,!expectPassport,'Secondary financing follows server paid authorization');
 assert.equal(el('secondary-financing').open,expectPassport,'Paid financing controls should be expanded and easy to find');
 assert.ok(adSlots.every(slot=>slot.hidden===!expectAds),plan+'/'+billing_status+' ad placement eligibility');
 assert.equal(context.window.JGAP_ORIGINAL_PASSPORT_WRITES_READY,false,'Plan labels alone cannot open original record writers');
}
membership={plan:'investor',billing_status:'active'};passportAllowed=true;
for(const capability of [{read:false,write:true},{read:true,write:false},{read:true,write:true}]){
 operationsCapability=capability;el('company').value='b';await el('company').onchange();
 assert.equal(context.window.JGAP_OPERATIONS_TABLES_READY,capability.read,'Reads must come from server capability');
 assert.equal(context.window.JGAP_OPERATIONS_WRITES_READY,capability.read&&capability.write,'Editing requires both server read and write capability');
}
ownerPreviewAllowed=true;passportAllowed=true;
el('company').value='b';await el('company').onchange();
assert.equal(passportEligibility.enabled,true,'Verified owner preview works separately from Free subscription');
assert.match(el('membership-title').textContent,/Verified owner preview/);
console.log('PASS: backend Passport denial wins over client plan labels; Pro ad-free; inactive/downgraded access closes; owner preview separate');
membership={plan:'pro',billing_status:'active'};passportAllowed=true;financeCapability={read:true,write:false};
el('company').value='b';await el('company').onchange();
assert.equal(context.window.JGAPFinanceContext.scope().canRead,true);
assert.equal(context.window.JGAPFinanceContext.scope().canWrite,false);
assert.equal(context.window.JGAP_ORIGINAL_PASSPORT_WRITES_READY,false,'Read-only Pro cannot open original editors');
const financeFilters={month:'2026-10',dealId:null,reconciled:null,taxTreatment:null};
await context.window.JGAPFinanceContext.load('b',financeFilters);
const bookkeepingEntry={entry_id:'selected-entry',company_id:'b',deal_id:'selected-property'};
await assert.rejects(context.window.JGAPFinanceContext.save('b',bookkeepingEntry,{vendor_name:'Fictional payee'}),/not authorized/,'Read-only capability must never invoke a save');
financeCapability={read:true,write:true};el('company').value='b';await el('company').onchange();
assert.equal(context.window.JGAP_ORIGINAL_PASSPORT_WRITES_READY,true,'Server-authorized Pro owner can edit original records');
await el('login').onclick(); // Refresh cached memberships so Company A has its viewer fixture role.
el('company').value='a';await el('company').onchange();
assert.equal(context.window.JGAP_ORIGINAL_PASSPORT_WRITES_READY,false,'Viewer role remains read-only even with a stale or inconsistent server write capability');
el('company').value='b';await el('company').onchange();
await context.window.JGAPFinanceContext.save('b',bookkeepingEntry,{vendor_name:'Fictional payee'});
const financeWrite=calls.filter(call=>call.name==='save_property_bookkeeping').at(-1);
assert.equal(financeWrite.args.p_entry_id,'selected-entry');assert.equal(financeWrite.args.p_deal_id,'selected-property');
await assert.rejects(context.window.JGAPFinanceContext.save('b',{...bookkeepingEntry,company_id:'foreign'},{}),/workspace did not match/);
await assert.rejects(context.window.JGAPFinanceContext.load('a',financeFilters),/not authorized/);
financeCapability={read:false,write:true};el('company').value='b';await el('company').onchange();
assert.equal(context.window.JGAP_ORIGINAL_PASSPORT_WRITES_READY,false,'Write-only malformed capability must not open original editors');
assert.equal(context.window.JGAPFinanceContext.scope().canRead,false,'Server report denial wins over Pro label');
assert.equal(context.window.JGAPFinanceContext.scope().canWrite,false,'Write capability requires read capability');
await assert.rejects(context.window.JGAPFinanceContext.load('b',financeFilters),/not authorized/);
console.log('PASS: advanced finance context honors server capability, editing role and exact transaction/company scope');
membership={plan:'investor',billing_status:'active'};passportAllowed=true;el('company').value='b';await el('company').onchange();
for(const [key,value] of Object.entries({offer:180000,rent:1800,other:0,vacancy:5,expenses:600,down:20,rate:7,years:30}))el(key).value=String(value);
el('celoc-rate').value='9';el('celoc-use-down').onclick();assert.equal(el('celoc-amount').value,'36000.00');
el('celoc-amount').value='40000';await el('celoc-calculate').onclick();
const secondaryCall=calls.filter(call=>call.name==='calculate_secondary_financing').at(-1);assert.equal(secondaryCall.args.p_amount,40000);assert.equal(secondaryCall.args.p_rate,9);assert.equal(secondaryCall.args.p_company_id,'b');assert.equal(secondaryCall.args.p_primary.down,20);
assert.match(el('celoc-results').textContent,/\$300\.00/);assert.match(el('celoc-results').textContent,/-\$148\.04/);
secondaryDeferred={};const pendingSecondary=el('celoc-calculate').onclick();el('company').value='a';await el('company').onchange();secondaryDeferred.resolve({data:{company_id:'b',monthly_interest:'300',annual_interest:'3600',monthly_cash_flow:'-148.04'},error:null});await pendingSecondary;secondaryDeferred=null;
assert.equal(el('celoc-results').textContent,'','Late secondary-loan results must not enter another workspace');
membership={plan:'free',billing_status:'not_connected'};passportAllowed=false;el('company').value='b';await el('company').onchange();
const secondaryCount=calls.filter(call=>call.name==='calculate_secondary_financing').length;await el('celoc-calculate').onclick();assert.equal(calls.filter(call=>call.name==='calculate_secondary_financing').length,secondaryCount,'Free UI must never invoke paid calculator');assert.equal(el('secondary-financing').hidden,true);
console.log('PASS: paid CELCO/HELOC controls, backend calculation, Free denial and stale-response protection');
await el('logout').onclick();
assert.equal(el('deals').children.length, 0);
assert.equal(context.window.JGAP_OPERATIONS_WRITES_READY,false,'Sign-out revokes activity editors');
assert.equal(context.window.JGAP_ORIGINAL_PASSPORT_WRITES_READY,false,'Sign-out revokes original editors');
assert.equal(context.window.JGAP_ORIGINAL_PASSPORT_TABLES_READY,false,'Sign-out revokes original record reads');
assert.equal(el('workspace').classList.contains('hidden'), true);
assert.equal(el('password').value, '');
console.log('PASS: customer workflow — explicit workspace choice, refreshing sessions, read-only analysis, stale financing, failed switches, owner access, sign-out');
