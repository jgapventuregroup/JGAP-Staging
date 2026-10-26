import test from 'node:test';
import assert from 'node:assert/strict';
import {financePropertyBreakdown,financeCents,formatFinanceMoney,validateFinanceFilters,validateBookkeeping,validateFinanceReport,financeReportCSV,mountFinance,validateFinanceEstimate,financeDifference} from '../finance-cpa.mjs';
const filters={month:'2026-10',dealId:null,reconciled:null,taxTreatment:null};
const entry=(id,type,amount,category,month='2026-10')=>({entry_id:id,company_id:'company-A',deal_id:'deal-A',property_name:'Fictional duplex',entry_date:month+'-01',entry_type:type,amount,category,description:'Recorded transaction',vendor_name:'',payment_method:'',account_name:'',tax_treatment:'review',receipt_reference:'',reconciled:false,bookkeeping_notes:''});
function report(selection=filters){return {company_id:'company-A',month:selection.month,deal_id:selection.dealId,reconciled:selection.reconciled,tax_treatment:selection.taxTreatment,entries:[entry('entry-1','income','1000.01','Rent',selection.month),entry('entry-2','expense','100.02','Repairs',selection.month)],totals:{income:'1000.01',expenses:'100.02',net:'899.99',unreconciled:2,count:2},categories:[{category:'Rent',income:'1000.01',expenses:'0',net:'1000.01'},{category:'Repairs',income:'0',expenses:'100.02',net:'-100.02'}]};}

test('money remains exact at cent precision, including totals beyond safe Number cents',()=>{
 assert.equal(financeCents('899.99'),89999n);assert.equal(formatFinanceMoney('-100.02'),'-$100.02');
 assert.equal(formatFinanceMoney('99999999999999.99'),'$99,999,999,999,999.99');
 for(const amount of ['NaN','Infinity','1.001','1e3',null])assert.throws(()=>financeCents(amount));
});
test('reports validate workspace, filters, transaction scope and exact category/period totals',()=>{
 assert.equal(validateFinanceReport(report(),'company-A',filters).totals.net,'899.99');
 for(const edit of [r=>{r.company_id='foreign'},r=>{r.entries[0].deal_id='foreign'},r=>{r.totals.net='900.00'},r=>{r.categories[0].net='0'},r=>{r.entries.push(r.entries[0])},r=>{r.entries[0].entry_date='2026-10-32'},r=>{r.entries[0].entry_date='2026-09-30'}]){
  const candidate=report();edit(candidate);
  // A company-wide report accepts any own property; scoped report must not.
  if(candidate.entries[0].deal_id==='foreign'){const scoped={...filters,dealId:'deal-A'};candidate.deal_id='deal-A';assert.throws(()=>validateFinanceReport(candidate,'company-A',scoped));}
  else assert.throws(()=>validateFinanceReport(candidate,'company-A',filters));
 }
});
test('filters and bookkeeping patches reject malformed input and preserve explicit false',()=>{
 assert.deepEqual(validateFinanceFilters(filters),filters);
 for(const patch of [{month:'2026-13'},{month:'0000-01'},{reconciled:'true'},{taxTreatment:'unknown'}])assert.throws(()=>validateFinanceFilters({...filters,...patch}));
 const input={vendor_name:' Contractor ',payment_method:'',account_name:'',receipt_reference:'',bookkeeping_notes:'',tax_treatment:'review',reconciled:false};
 assert.equal(validateBookkeeping(input).vendor_name,'Contractor');assert.equal(validateBookkeeping(input).reconciled,false);
 assert.throws(()=>validateBookkeeping({...input,vendor_name:'x'.repeat(201)}));
 assert.throws(()=>validateBookkeeping({...input,reconciled:'false'}));
});
test('CSV preserves quotes/newlines and neutralizes formula-like text including whitespace prefixes',()=>{
 const r=report();r.entries[0].vendor_name='  =HYPERLINK("bad")';r.entries[0].bookkeeping_notes='line 1\nline 2';r.entries[1].category='\t@SUM(1)';
 const csv=financeReportCSV(r);assert.ok(csv.startsWith('\uFEFF"Date"'));
 assert.ok(csv.includes('"\'  =HYPERLINK(""bad"")"'));assert.ok(csv.includes('"\'\t@SUM(1)"'));assert.ok(csv.includes('"line 1\nline 2"'));
 assert.ok(csv.includes('"1000.01"'));assert.ok(csv.includes('"Transaction ID"'));
});

class Node{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.value='';this.textContent='';this.isConnected=true;this.style={};}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(key,value){this.attributes[key]=value}
 addEventListener(name,handler){this.listeners[name]=handler}
}
const all=node=>[node,...node.children.flatMap(all)];
function setup({canRead=true,canWrite=true,delayed=false,denyReload=false,withEstimate=false,empty=false,incomplete=false}={}){
 let scope={companyId:'company-A',canRead,canWrite,properties:[{id:'deal-A',name:'Fictional duplex'}]},release;
 const calls=[],downloads=[],saves=[];const root=new Node('div');
 const view=mountFinance({root,getContext:()=>scope,loadReport:async(company,selection)=>{calls.push({company,selection});if(denyReload&&calls.length>1)throw Error('Active Pro report access required');if(delayed)return await new Promise(resolve=>{release=()=>resolve(report(selection))});const response=report(selection);if(withEstimate)response.estimate=!selection.dealId?{status:'property_required'}:selection.reconciled!==null||selection.taxTreatment!==null?{status:'unfiltered_required'}:incomplete?{status:'incomplete',invalid_fields:['loan_term_years']}:savedEstimate();if(empty){response.entries=[];response.categories=[];response.totals={income:'0',expenses:'0',net:'0',count:0,unreconciled:0};}return response;},saveDetails:async(company,record,patch)=>saves.push({company,entryId:record.entry_id,patch}),download:(csv,name)=>downloads.push({csv,name})});
 return {root,view,calls,downloads,saves,release:()=>release(),switchCompany:()=>{scope={...scope,companyId:'company-B'};}};
}
const previous=globalThis.document;
const dom=fn=>async()=>{globalThis.document={createElement:tag=>new Node(tag)};try{await fn()}finally{globalThis.document=previous}};
test('non-Pro report page never calls the report backend',dom(async()=>{
 const f=setup({canRead:false,canWrite:false});await f.view.open();assert.equal(f.calls.length,0);assert.match(f.root.children[0].textContent,/requires active Pro/);
}));
test('Pro report exports only after a fresh authorized load, with the current month',dom(async()=>{
 const f=setup();await f.view.open();assert.equal(f.calls.length,1);
 assert.ok(all(f.root).some(node=>node.textContent==='$899.99'));
 const month=all(f.root).find(node=>node.type==='month');month.value='2026-09';month.listeners.change();
 const exportButton=all(f.root).find(node=>node.textContent==='Download bookkeeping CSV');assert.equal(exportButton.disabled,true);
 await exportButton.onclick();assert.equal(f.calls.length,2);assert.equal(f.calls[1].selection.month,'2026-09');assert.equal(f.downloads.length,1);assert.ok(f.downloads[0].csv.includes('2026-09-01'));
}));
test('bookkeeping form saves the selected transaction, not the newest transaction',dom(async()=>{
 const f=setup();await f.view.open();const form=all(f.root).find(node=>node.attributes['aria-label']?.startsWith('Bookkeeping for'));
 const vendor=all(form).find(node=>node.name==='vendor_name');vendor.value='Fictional payee';await form.listeners.submit({preventDefault(){}});
 assert.equal(f.saves[0].entryId,'entry-1');assert.equal(f.saves[0].patch.vendor_name,'Fictional payee');assert.equal(f.calls.length,2,'Confirmed save refreshes report');
}));
test('read-only viewers get reports without save forms',dom(async()=>{
 const f=setup({canWrite:false});await f.view.open();assert.ok(all(f.root).some(node=>node.textContent==='Category breakdown'));assert.equal(all(f.root).filter(node=>node.attributes['aria-label']?.startsWith('Bookkeeping for')).length,0);
}));
test('workspace switch discards late report data and disables stale exports',dom(async()=>{
 const f=setup({delayed:true});const pending=f.view.open();f.switchCompany();f.view.clear();f.release();await pending;
 assert.equal(f.root.children.length,0);assert.equal(f.downloads.length,0);
}));

test('export refuses a cached report when renewed backend authorization fails',dom(async()=>{
 const f=setup({denyReload:true});await f.view.open();
 const button=all(f.root).find(node=>node.textContent==='Download bookkeeping CSV');await button.onclick();
 assert.equal(f.downloads.length,0,'An old visible report must not bypass fresh export authorization');
 assert.ok(all(f.root).some(node=>node.textContent.startsWith('Could not load report')));
}));

function savedEstimate(){return {status:'ready',basis:'current_saved_assumptions',monthly_income:'1100.00',operating_expenses:'200.00',mortgage_payment:'300.00',total_outflows:'500.00',net:'600.00'};}
test('saved estimate validates complete filter scope and exact component sums',()=>{
 const scoped={...filters,dealId:'deal-A'};
 assert.equal(validateFinanceEstimate(savedEstimate(),scoped).net,'600.00');
 assert.equal(financeDifference('899.99','600.00'),'299.99');assert.equal(financeDifference('100.02','500.00'),'-399.98');
 assert.equal(financeDifference('99999999999999.99','0.01'),'99999999999999.98');
 for(const patch of [{net:'600.01'},{total_outflows:'499.99'},{monthly_income:'NaN'},{mortgage_payment:'-1'},{basis:'purchase_snapshot'},{status:'unknown'}])assert.throws(()=>validateFinanceEstimate({...savedEstimate(),...patch},scoped));
 assert.throws(()=>validateFinanceEstimate(savedEstimate(),filters));assert.throws(()=>validateFinanceEstimate(savedEstimate(),{...scoped,reconciled:false}));
 assert.equal(validateFinanceEstimate({status:'property_required'},filters).status,'property_required');
 assert.equal(validateFinanceEstimate({status:'unfiltered_required'},{...scoped,taxTreatment:'review'}).status,'unfiltered_required');
 assert.equal(validateFinanceEstimate({status:'incomplete',invalid_fields:['monthly_rent']},scoped).status,'incomplete');
 for(const invalid_fields of [[],['unknown'],['monthly_rent','monthly_rent']])assert.throws(()=>validateFinanceEstimate({status:'incomplete',invalid_fields},scoped));
 const bad=report(scoped);bad.estimate={...savedEstimate(),net:'1'};assert.throws(()=>validateFinanceReport(bad,'company-A',scoped));
});
test('Pro comparison uses current single-property month and clears for partial filter scopes',dom(async()=>{
 const f=setup({withEstimate:true,canWrite:false});await f.view.open();
 assert.ok(all(f.root).some(node=>node.textContent.startsWith('Select one property to compare')));
 const selection=all(f.root).filter(node=>node.tagName==='SELECT');const property=selection[0],recon=selection[1],tax=selection[2];
 property.value='deal-A';property.listeners.change();
 const exportButton=all(f.root).find(node=>node.textContent==='Download bookkeeping CSV');await exportButton.onclick();
 assert.ok(all(f.root).some(node=>node.textContent==='$299.99'),'Exact recorded-minus-estimate net difference');
 assert.ok(all(f.root).some(node=>node.textContent.startsWith('Month: ')&&node.textContent.includes('not a frozen purchase-time budget')));
 recon.value='false';recon.listeners.change();assert.ok(!all(f.root).some(node=>node.textContent==='$299.99'),'Changing filters immediately removes comparison');await exportButton.onclick();
 assert.ok(all(f.root).some(node=>node.textContent.startsWith('Set Reconciliation and Tax treatment to All')));
 recon.value='';tax.value='review';tax.listeners.change();await exportButton.onclick();
 assert.ok(all(f.root).some(node=>node.textContent.startsWith('Set Reconciliation and Tax treatment to All')));
}));
test('empty recorded months and invalid assumptions never display fabricated comparison differences',dom(async()=>{
 for(const options of [{empty:true},{incomplete:true}]){
  const f=setup({withEstimate:true,...options});await f.view.open();const property=all(f.root).find(node=>node.tagName==='SELECT');property.value='deal-A';property.listeners.change();await all(f.root).find(node=>node.textContent==='Download bookkeeping CSV').onclick();
  assert.ok(!all(f.root).some(node=>node.textContent==='$299.99'));
  assert.ok(all(f.root).some(node=>node.textContent.startsWith(options.empty?'No transactions are recorded':'Complete or correct the saved Analyzer assumptions')));
 }
}));

test('cash-source recovery groups duplicate names by property ID with exact cents and no estimated rent',()=>{
 const r=report();r.entries[1].deal_id='deal-B';r.entries[1].property_name=r.entries[0].property_name;
 r.estimate={status:'property_required'};
 const rows=financePropertyBreakdown(r);
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(x=>[x.dealId,x.income,x.expenses,x.net,x.count]),[['deal-A','1000.01','0.00','1000.01',1],['deal-B','0.00','100.02','-100.02',1]]);
 const one=financePropertyBreakdown(report());assert.equal(one[0].net,'899.99');assert.equal(one[0].count,2);
 const invalid=report();invalid.entries[0].company_id='foreign';assert.throws(()=>financePropertyBreakdown(invalid),/unexpected transaction/);
 const empty={...report(),entries:[],categories:[],totals:{income:'0',expenses:'0',net:'0',count:0,unreconciled:0}};
 assert.deepEqual(financePropertyBreakdown(empty),[]);
});
