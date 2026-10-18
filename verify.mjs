import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
assert.match(html,/STAGING ONLY/);
assert.match(html,/No advertising network or paid checkout is active today\./, 'Staging must accurately disclose that paid checkout is unavailable');
assert.match(html,/Paid checkout and feature-tier restrictions are not enabled\./, 'Do not present planned tiers as active paid features');
assert.match(html,/paid-plan activation requires verified billing status/, 'Membership must not imply unverified client-side upgrades');assert.match(html,/html\[data-theme="dark"\] input\[aria-invalid="true"\]/,'Dark mode must have distinct invalid-field styling');
assert.match(html,/qfszapteuxuogoselprp\.supabase\.co/);
assert.match(html,/list_my_companies/);
assert.match(html,/!rawPrice\|\|!rawRent/, 'Blank property price and rent must not silently become zero');
assert.match(html,/id="new-deal-price"[^>]*placeholder="Enter purchase price"/, 'Purchase price must begin blank');
assert.match(html,/id="new-deal-rent"[^>]*placeholder="Enter monthly rent"/, 'Monthly rent must begin blank');
assert.doesNotMatch(html,/id="new-deal-(?:price|rent)"[^>]*value="0"/, 'Financial inputs must not prefill zero');
assert.match(html,/currentCompanyDealNames\.has\(name\.toLocaleLowerCase\(\)\)/, 'Duplicate property names must be checked before creating a record');
assert.match(html,/currentCompanyDealNames=new Set\(\);window\.JGAPDealIntelligence/, 'Duplicate-name cache must reset when switching workspaces');

assert.match(html,/list_company_deals/);
assert.match(html,/const request=\+\+analyzerOpenRequest/, 'Each property-open request needs a unique order');
assert.match(html,/request!==analyzerOpenRequest\|\|client!==activeClient/, 'Stale property-open responses must be discarded');
assert.match(html,/clearCompanyView=\(\)=>\{newDealRefreshBlocked=false;analyzerOpenRequest\+\+/, 'Workspace changes must invalidate pending property-open requests');
assert.match(html,/request===analyzerOpenRequest&&client===activeClient&&companyId===activeCompany\)status\('Analyze error/, 'Stale property-open errors must not appear in another workspace');
assert.match(html,/Property saved successfully, but the pipeline could not refresh/, 'Confirmed property saves must survive refresh errors');
assert.match(html,/if\(savingNewDeal\|\|newDealRefreshBlocked\|\|/, 'A failed refresh after confirmed creation must block duplicate submission');
assert.match(html,/newDealRefreshBlocked=true;\$\('new-deal-status'\)/, 'Confirmed save refresh failures must engage the lock');
assert.match(html,/\$\('new-deal-form'\)\.hidden\|\|newDealRefreshBlocked/, 'Save button must stay disabled while refresh lock is active');
assert.match(html,/Financials saved, but the pipeline could not refresh/, 'Confirmed analyzer saves must survive refresh errors');
assert.match(html,/Stage saved, but the pipeline could not refresh/, 'Confirmed pipeline stage saves must survive refresh errors');
assert.match(html,/Follow-up date saved, but the pipeline could not refresh/, 'Confirmed follow-up saves must survive refresh errors');
assert.match(html,/get_company_deal/);
assert.doesNotMatch(html,/service_role|sb_secret_/i);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1,'Expected one inline application script');
new vm.Script(scripts[0],{filename:'staging/index.html'});
const mortgage=(loan,rate,years)=>{const r=rate/1200,m=years*12;return !loan?0:!r?loan/m:loan*r/(1-Math.pow(1+r,-m));};
const payment=mortgage(144000,7,30);
const noi=((1800)*(1-.05)-600)*12;
assert.ok(Math.abs(payment-958.04)<.01);
assert.equal(noi,13320);
assert.ok(Math.abs(noi/12-payment-151.96)<.01);
assert.equal(mortgage(0,7,30),0);
assert.equal(mortgage(120000,0,30),120000/360);
console.log('PASS: staging HTML, syntax, RPC references, credential scan, calculation fixtures');

const fields={ask:200000,offer:180000,rent:1800,other:0,vacancy:5,expenses:600,down:20,rate:7,years:30,costs:5000};
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{value:String(fields[id]??''),textContent:'',onclick:null,onchange:null,listeners:{},addEventListener(event,fn){this.listeners[event]=fn},setAttribute(k,v){this[k]=v},classList:{add(){},remove(){},toggle(){}},children:[],replaceChildren(...items){this.children=items},append(...items){this.children.push(...items)},removeAttribute(k){delete this[k]},focus(){},scrollIntoView(){}});return elements.get(id);}
const documentElement={dataset:{}};const saved=new Map();const context={document:{documentElement,getElementById:element,querySelectorAll:()=>[],createElement:()=>({textContent:'',className:'',children:[],append(...items){this.children.push(...items)}})},window:{},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},matchMedia:()=>({matches:false}),console};
vm.runInNewContext(scripts[0],context,{filename:'staging/index.html'});
assert.equal(documentElement.dataset.theme,'light','Default theme should be light');assert.equal(typeof element('theme-toggle').onclick,'function','Theme toggle must be clickable');element('theme-toggle').onclick();assert.equal(documentElement.dataset.theme,'dark','Theme button must switch to dark');assert.equal(saved.get('jgap-theme'),'dark','Theme choice must persist');element('theme-toggle').onclick();assert.equal(documentElement.dataset.theme,'light','Theme button must switch back to light');assert.equal(element('ask').value,'','Analyzer should begin blank for privacy');
for(const [id,value] of Object.entries(fields))element(id).value=String(value);
element('target-flow').value='300';element('target-coc').value='8';element('reserve-cash').value='5000';element('calculate').onclick();
assert.equal(element('analyze-feedback').textContent,'Analysis complete','Analyze button must confirm click');
assert.match(element('results').textContent,/Monthly payment: \$958\.04/);
assert.match(element('results').textContent,/Annual NOI: \$13,320\.00/);
assert.match(element('results').textContent,/Monthly cash flow: \$151\.96/);
assert.match(element('deal-assessment').textContent,/BELOW INVESTMENT TARGET/,'Offer below $300 monthly target must be flagged');assert.equal(element('deal-explanation').children.length,5,'Assessment must render five cards');assert.match(element('deal-explanation').children[0].children[0].textContent,/Deal verdict/);
element('rate').value='101';
element('calculate').onclick();
assert.match(element('results').textContent,/Error: Check these fields: Annual interest/);assert.equal(element('rate')['aria-invalid'],'true','Invalid rate should be highlighted');
element('rate').value='7';element('rent').value='0';element('other').value='0';element('calculate').onclick();assert.match(element('warning').textContent,/No rental or other income entered/,'Zero-income deals must be flagged');element('rent').value='1800';element('expenses').value='2000';element('calculate').onclick();assert.match(element('warning').textContent,/Operating expenses exceed gross monthly income/,'Expenses above income must be flagged');element('expenses').value='600';element('rent').value='1000000000001';element('calculate').onclick();assert.match(element('results').textContent,/Check these fields: Monthly rent/,'Extreme values must be rejected');element('rent').value='1800';
element('down').value='100';
element('calculate').onclick();
assert.match(element('results').textContent,/Monthly payment: \$0\.00/);
element('offer').value='';element('calculate').onclick();assert.match(element('results').textContent,/Check these fields: Your offer/,'Missing offer should be named');assert.equal(element('analyze-feedback').textContent,'Please correct the highlighted fields');element('offer').value='180000';element('other').value='';element('solve-offer').onclick();assert.match(element('offer-guidance').textContent,/Check these fields: Other monthly income/,'Maximum offer should identify missing income field');assert.equal(element('other')['aria-invalid'],'true','Missing income should be highlighted');assert.equal(element('maximum-feedback').textContent,'Please review the inputs');assert.equal(element('price-comparison').children.length,0,'Failed offer calculation must clear old comparison');element('other').value='0';
console.log('PASS: real application calculation handlers, invalid input, all-cash scenario');
function offerTest(values,targets){for(const [id,value] of Object.entries({...fields,...values}))element(id).value=String(value);for(const [id,value] of Object.entries({'target-flow':300,'target-coc':8,'reserve-cash':5000,...targets}))element(id).value=String(value);element('solve-offer').onclick();return element('offer-guidance').textContent;}
const standard=offerTest({down:20,rate:7,years:30,rent:1800,expenses:600,vacancy:5,costs:5000},{'target-flow':300,'target-coc':8,'reserve-cash':5000});
assert.match(standard,/Maximum offer meeting both targets:/);assert.ok(standard.includes('\nLimiting requirement:'),'Maximum offer must render real line breaks');assert.ok(!standard.includes('\\\\n'),'Maximum offer must not display literal backslash-n');assert.equal(element('maximum-feedback').textContent,'Maximum offer calculated','Maximum offer button must confirm click');assert.equal(element('price-comparison').children.length,4,'Comparison must show three prices and offer guidance');assert.match(element('price-comparison').children[0].children[1].textContent,/\$200,000/,'Asking price must match current input');assert.match(element('price-comparison').children[1].children[1].textContent,/\$180,000/,'Proposed offer must match current input');
const standardPrice=Number(standard.match(/Maximum offer meeting both targets: \$([\d,]+\.\d{2})/)[1].replaceAll(',',''));
const monthlyNoi=1800*.95-600,interest=7/1200,factor=interest/(1-Math.pow(1+interest,-360));
const debtFactor=.8*factor;
const cashLimit=(monthlyNoi-300)/debtFactor;
const returnLimit=(12*monthlyNoi-.08*10000)/(12*debtFactor+.08*.2);
assert.ok(Math.abs(standardPrice-Math.min(cashLimit,returnLimit))<.02,'Offer must satisfy stricter constraint');
assert.match(standard,/Estimated cash needed including reserves:/);
const revised=offerTest({ask:225000,offer:150000,down:20,rate:7},{'target-flow':300,'target-coc':8});assert.match(revised,/Maximum offer meeting both targets/);assert.equal(element('price-comparison').children.length,4,'New deal comparison must replace old cards');assert.match(element('price-comparison').children[0].children[1].textContent,/\$225,000/,'Comparison must use new seller asking price');assert.match(element('price-comparison').children[1].children[1].textContent,/\$150,000/,'Comparison must use new offer');const cash=offerTest({down:100,rate:0},{'target-flow':300,'target-coc':8,'reserve-cash':5000});
assert.match(cash,/Maximum offer meeting both targets:/,'All-cash deal with positive return target must be supported');
const impossible=offerTest({rent:100,expenses:600},{'target-flow':300,'target-coc':8});
assert.match(impossible,/Error: Targets cannot be met/);assert.equal(element('price-comparison').children.length,0,'Impossible deal must not retain old price cards');
const noFinite=offerTest({down:100,rate:0},{'target-flow':300,'target-coc':0});
assert.match(noFinite,/Error: No finite maximum offer: an all-cash purchase/);
console.log('PASS: real maximum-offer button, stricter constraint, cash reserves, all-cash, impossible and unbounded cases');

assert.match(html,/if\(val==null\)\{missing.push\(key\);\$\(key\)\.value='';continue;\}/,'Missing deal values must clear previous estimates');
console.log('PASS: missing deal fields do not reuse stale analyzer values');

assert.match(html,/\$\('selected'\)\.textContent='Manual calculation — not saved'/,'Sign out must clear selected deal');
assert.match(html,/\$\('results'\)\.textContent=''/,'Sign out must clear prior financial results');
assert.match(html,/\$\('deals'\)\.replaceChildren\(\)/,'Sign out must clear property list');
console.log('PASS: sign out removes previous customer property and financial details');

assert.match(html,/clearAnalysisResults\(\);const mapping=\{ask:d\.asking_price/,'Selecting a new property must clear previous analysis before filling fields');assert.match(html,/const resetAnalyzer=\(\)=>\{[\s\S]*?\$\('price-comparison'\)\.replaceChildren\(\)/,'Signing out must clear price comparison');console.log('PASS: assessment cards, price comparison changes, and property switch clearing');

offerTest({rent:1800,expenses:600,down:20,rate:7,years:30},{'target-flow':300,'target-coc':8,'reserve-cash':5000});element('calculate').onclick();assert.ok(element('price-comparison').children.length>0);element('rent').value='1900';element('rent').listeners.input();assert.match(element('results').textContent,/Inputs changed/,'Edited input must invalidate financial results');assert.equal(element('deal-explanation').children.length,0,'Edited input must remove stale assessment cards');assert.equal(element('price-comparison').children.length,0,'Edited input must clear stale offer comparison');assert.match(element('offer-guidance').textContent,/Inputs changed/,'Edited input must require new maximum offer');console.log('PASS: input edits invalidate stale investment decisions');

assert.match(html,/<button data-page="plans">Plans \(preview\)<\/button>/,'Plans preview must be navigable');assert.match(html,/id="plans" class="page"/,'Plans page must exist');assert.match(html,/No payments are collected/,'Plans must disclose that billing is not enabled');assert.match(html,/Access currently depends on company membership, not a paid plan/,'Plans must not misrepresent access controls');console.log('PASS: membership plan preview accurately discloses nonfunctional billing and entitlements');

assert.match(html,/@media\(max-width:700px\)\{body\{padding:0 12px 28px\}/,'Mobile layout rules must exist');assert.match(html,/\.sidebar\{position:sticky;top:0/,'Mobile navigation must remain accessible when scrolling');assert.match(html,/\.sidebar button\{padding:12px 14px;min-height:44px/,'Mobile navigation buttons must have touch targets');assert.match(html,/\.assessment-grid\{grid-template-columns:1fr\}/,'Assessment cards must stack on phones');console.log('PASS: mobile touch targets, sticky navigation, and single-column assessment');

assert.match(html,/<h2>Proposed feature comparison<\/h2>/,'Tier feature comparison must be visible');for(const name of ['Deal Analyzer','Property tracking','Deal Pipeline','Maximum-offer guidance','Advanced investment tools','Expanded reports and exports'])assert.ok(html.includes('<th scope="row">'+name+'</th>'),'Feature row missing: '+name);assert.match(html,/Proposed feature allocation only/,'Feature table must not misrepresent access enforcement');assert.match(html,/\.plan-table-wrap\{overflow-x:auto/,'Comparison table must scroll on narrow screens');console.log('PASS: proposed membership feature table and transparent access disclosures');

assert.match(html,/<th scope="row">Saved deals<\/th><td>5 lifetime<\/td><td>Unlimited<\/td><td>Unlimited<\/td>/,'Free tier should show five lifetime properties');assert.match(html,/<th scope="row">Advertising<\/th><td>Planned<\/td><td>Planned<\/td><td>Ad-free<\/td>/,'Only Pro should be ad-free');assert.match(html,/No advertising network or paid checkout is active today/,'Plans must disclose checkout not active');console.log('PASS: saved-deal limit and advertising tier proposal');

assert.match(html,/id="free-deal-progress" max="5" value="0"/,'Free usage progress must have five-property limit');assert.match(html,/get_my_lifetime_deal_usage/,'Free usage must come from database lifetime counter');assert.match(html,/lifetimeUsed>=5/,'Free limit must explain upgrade');console.log('PASS: company-scoped free usage preview and explicit upgrade consent');

assert.match(html,/<section id="free-deal-preview" class="membership-card"/,'Membership allowance should be a dedicated card');assert.match(html,/class="membership-action">Compare membership plans/,'Membership card should link to plan comparison');assert.match(html,/\.membership-card\{margin:18px 0/,'Membership card must have independent styling');console.log('PASS: membership preview card and plan navigation');

assert.match(html,/from\('company_subscriptions'\)\.select\('plan,billing_status'\)\.eq\('company_id',companyId\)/,'Membership lookup must be company-scoped');assert.match(html,/plan==='unknown'\?'Membership unavailable'/,'Membership errors must not claim Free plan');assert.match(html,/if\(client!==activeClient\|\|companyId!==activeCompany\)return;[\s\S]*?\$\('membership-title'\)/,'Ignore stale membership response after company change');console.log('PASS: authenticated company-scoped subscription display');

assert.match(html,/<button data-page="toolbox">Investor Toolbox<\/button>/,'Toolbox navigation must exist');assert.match(html,/<section id="toolbox" class="page"/,'Toolbox section must exist');for(const tool of ['Lead Generation &amp; Alerts','Deal Intelligence','Financing &amp; Lenders','Laundromat Investing','Property Passport','Market Map &amp; Vendors','Finance &amp; Reports','JGAP Learning Center'])assert.ok(html.includes(tool),'Missing original-tool roadmap: '+tool);assert.match(html,/They are not yet active in staging/,'Roadmap must not claim migrated tools work');console.log('PASS: Investor Toolbox roadmap navigation');

assert.match(html,/const paidActive=\(plan==='investor'\|\|plan==='pro'\)\&\&billingStatus==='active'/,'Unlimited entitlement requires active billing');assert.match(html,/paidActive\?'Unlimited saved properties':'5 lifetime property slots'/,'Inactive paid plans must not show unlimited entitlement');console.log('PASS: paid entitlement display matches database enforcement');




assert.doesNotMatch(html,/id="retry-eligibility"|id="request-eligibility"|id="signup-eligibility-status"/,'Development-only eligibility controls must not appear on customer dashboard');console.log('PASS: customer dashboard excludes development-only eligibility controls');

assert.match(html,/client\.rpc\('create_my_company',\{p_company_name:'My Investment Company'\}\)/,'New verified users should receive an automatically provisioned workspace');assert.match(html,/if\(!rows\?\.length\)/,'Provisioning must only run when no company exists');assert.match(html,/if\(!data\.user\?\.email_confirmed_at\)/,'Email must be verified before automatic provisioning');console.log('PASS: verified new account automatic workspace onboarding');

assert.match(html,/id="new-deal-form"/,'Property creation form must exist');assert.match(html,/rpc\('create_company_deal',\{p_company_id:activeCompany,p_name:name,p_purchase_price:price,p_monthly_rent:rent\}\)/,'Saving a property must use company-scoped server RPC');assert.match(html,/savingNewDeal=true/,'Save must guard against duplicate submissions');console.log('PASS: self-service company-scoped property saving');

assert.match(html,/id="save-analysis" disabled/,'Analysis save must start disabled');assert.match(html,/rpc\('update_company_deal',\{p_company_id:activeCompany,p_deal_id:activeDeal,p_patch:/,'Analysis must save to selected company and deal');assert.match(html,/closing_costs:n\.costs-selectedRehabCosts>=0\?n\.costs-selectedRehabCosts:n\.costs,rehab_cost:n\.costs-selectedRehabCosts>=0\?selectedRehabCosts:0/,'Combined costs must not be double counted on reload');assert.match(html,/selectedDealCompany!==companyId/,'Analysis save must refuse a different company');console.log('PASS: saved property analysis update is scoped and cost-safe');

assert.match(html,/get_my_lifetime_deal_usage/,'Dashboard must use server lifetime usage');assert.match(html,/5 lifetime property slots/,'Free plan must show five lifetime slots');assert.doesNotMatch(html,/15 saved deals|15-deal Free limit|15 total/,'Old 15-deal UI copy must be removed');console.log('PASS: five lifetime properties shown in staging');

assert.match(html,/Free property names and addresses are locked after saving/,'Free identity lock must be explained when saving a property');console.log('PASS: Free property identity lock explained to users');

assert.match(html,/id="new-deal-limit-notice"/,'Limit notice must be visible before attempted save');assert.match(html,/const canAddProperty=paidActive\|\|\(plan==='free'&&lifetimeUsed!==null&&lifetimeUsed<5\)/,'New property form must follow verified lifetime allowance');assert.match(html,/\$\('new-deal-form'\)\.hidden=!\(canAddProperty&&canEdit\)/,'New property form must be hidden at limit');assert.match(html,/Existing properties remain editable; checkout is not available yet/,'No false paid checkout promise');console.log('PASS: new property limit shown before saving');

assert.match(html,/id="signup"/,'Staging signup action must exist');assert.match(html,/auth\.signUp\(\{email,password,options:\{emailRedirectTo:/,'Signup must use hosted Supabase Auth');assert.match(html,/password\.length<12/,'Signup must require a minimum password length');assert.match(html,/New accounts must verify their email before a workspace is created/,'Signup must explain verification');console.log('PASS: hosted email signup and verification staging flow');

assert.match(html,/const noi=\(n\.rent\*\(1-n\.vacancy\/100\)\+n\.other-n\.expenses\)\*12/,'NOI must apply rental vacancy to rent only');assert.match(html,/const monthlyNOI=n\.rent\*\(1-n\.vacancy\/100\)\+n\.other-n\.expenses/,'Maximum offer must use consistent vacancy treatment');console.log('PASS: other income is not incorrectly reduced by rental vacancy');

assert.match(html,/No finite maximum offer: an all-cash purchase with a 0% cash-on-cash target/,'Unbounded all-cash scenarios must not claim a maximum offer');console.log('PASS: unbounded all-cash maximum offer guidance');

assert.match(html,/selectedRehabCosts=Number\(d\.rehab_cost\|\|0\)/,'Opening property must retain repair allocation');assert.match(html,/rehab_cost:n\.costs-selectedRehabCosts>=0\?selectedRehabCosts:0/,'Saving must preserve repair allocation when combined costs permit');console.log('PASS: saved rehab costs survive property analysis edits');

assert.match(html,/id="celoc-amount"/,'Optional additional financing tool must be integrated');assert.match(html,/id="celoc-calculate"/,'CELOC tool must have working calculation control');assert.match(html,/const monthly=amount\*rate\/1200/,'CELOC must calculate interest-only carrying cost');console.log('PASS: original JGAP CELOC funding integration');

assert.match(html,/Estimated monthly cash flow after mortgage and additional loan interest/,'CELOC analysis must show combined financing cash flow');assert.match(html,/operating-mortgage-monthly/,'Combined cash flow must subtract both loan payments');console.log('PASS: mortgage and CELOC combined cash-flow estimate');

assert.match(html,/id="export-properties"/,'Property export button must exist');assert.match(html,/rows\.some\(d=>d\.company_id!==companyId\)/,'Export data must pass company isolation validation');assert.match(html,/if\(client!==activeClient\|\|companyId!==activeCompany\)return;const columns=/,'Export must refuse stale company sessions');console.log('PASS: company-scoped property summary export');

assert.match(html,/<details class="offer-helper" id="secondary-financing">/,'Secondary financing must be optional and collapsed by default');assert.match(html,/Optional second loan or line of credit/,'Secondary financing must not be CELOC-specific');console.log('PASS: financing optional for investors using their own cash');

// Exercise clearing immediately, including a failed company refresh.
for(const id of ['deals','pipeline-deals','dashboard-followups'])element(id).children=[{textContent:'Previous company'}];
for(const id of ['export-status','new-deal-status','membership-title','celoc-results'])element(id).textContent='Previous company';
element('celoc-amount').value='40000';element('export-properties').onclick=()=>{};element('company').value='unavailable-company';
await element('company').onchange();
for(const id of ['deals','pipeline-deals','dashboard-followups'])assert.equal(element(id).children.length,0,'Company change must clear '+id+' before fetching');
for(const id of ['export-status','new-deal-status','membership-title','celoc-results'])assert.equal(element(id).textContent,'','Company change must clear '+id);
assert.equal(element('celoc-amount').value,'');assert.equal(element('export-properties').disabled,true);assert.equal(element('export-properties').onclick,null);assert.equal(element('new-deal-form').hidden,true);
assert.match(element('status').textContent,/Unable to load company/);
console.log('PASS: failed company switch clears prior properties, export, membership and financing data');

// Regression: the authenticated screenshot showed green approval beside zero-cost warnings.
for(const [id,value] of Object.entries({...fields,ask:180000,offer:180000,expenses:0,vacancy:0,down:0,rate:0,costs:0}))element(id).value=String(value);
element('target-flow').value='300';element('target-coc').value='8';element('reserve-cash').value='5000';element('calculate').onclick();
assert.match(element('deal-assessment').textContent,/PRELIMINARY — VERIFY ASSUMPTIONS/);
assert.match(element('deal-explanation').children[0].children[1].textContent,/Verify assumptions before judging/);
assert.ok(element('deal-explanation').children.every(card=>card.className.includes('assessment-attention')),'Unverified assumptions must not render green approval cards');
for(const [id,value] of Object.entries({...fields,rent:3000}))element(id).value=String(value);
element('calculate').onclick();assert.match(element('deal-assessment').textContent,/MEETS BOTH TARGETS/);assert.ok(element('deal-explanation').children[0].className.includes('assessment-pass'));
console.log('PASS: preliminary assumptions prevent green approval; complete passing inputs still compare targets');

// Investor usability: both calculation actions must navigate to their results after success.
assert.match(html,/\$\('calculate'\)\.onclick=[^\n]*calculate\(\);[^\n]*\$\('results'\)\.scrollIntoView\(/,'Analyze offer must scroll to calculated financial results');
assert.match(html,/\$\('solve-offer'\)\.onclick=[^\n]*solveOffer\(\);[^\n]*\$\('price-comparison'\)\.scrollIntoView\(/,'Maximum offer must scroll to the offer comparison');
console.log('PASS: analyzer and maximum-offer buttons navigate to their results');

// Real customer fixture: $150k asking, $140k offer, $1,500 rent and 8% CoC goal.
// The cash-flow constraint must cap the maximum offer near $126,822.
for(const [id,value] of Object.entries({ask:150000,offer:140000,rent:1500,other:0,vacancy:5,expenses:450,down:20,rate:7,years:30,costs:5000}))element(id).value=String(value);
element('target-flow').value='300';element('target-coc').value='8';element('reserve-cash').value='5000';
element('solve-offer').onclick();
assert.match(element('offer-guidance').textContent,/Maximum offer meeting both targets: \$126,822\.01/,'Maximum offer must match live customer test fixture');
assert.match(element('offer-guidance').textContent,/Limiting requirement: monthly cash flow/,'Monthly cash-flow target should bind');
assert.match(element('offer-guidance').textContent,/Estimated monthly cash flow: \$300\.00/,'Maximum offer must meet cash-flow target');
console.log('PASS: live investor fixture yields $126,822 maximum offer and $300 monthly cash flow');
