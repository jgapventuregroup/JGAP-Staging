import test from 'node:test';import assert from 'node:assert/strict';import {validateMoneyOverview,mountMoneyOverview} from '../money-making-overview.mjs';
const group={count:3,value_count:2,value_total:'210000.01',debt_count:2,debt_total:'100000.02',equity_count:1,paired_equity:'99999.99'};
const response=(month='2026-10')=>({company_id:'company-A',month,groups:{all_saved:{...group,count:4},closed_stage:{...group}},recorded:{company_id:'company-A',month,deal_id:null,reconciled:null,tax_treatment:null,entries:[],categories:[],totals:{income:'0',expenses:'0',net:'0',count:0,unreconciled:0}}});
test('overview validates coverage, zero versus unknown, matched equity and workspace',()=>{
 assert.equal(validateMoneyOverview(response(),'company-A','2026-10').groups.closed_stage.paired_equity,'99999.99');
 for(const patch of [{value_count:4},{equity_count:3},{debt_total:'NaN'},{value_count:0,value_total:'0.00'},{value_total:null}]){const r=response();r.groups.closed_stage={...group,...patch};assert.throws(()=>validateMoneyOverview(r,'company-A','2026-10'));}
 const unknown=response();unknown.groups.closed_stage={count:0,value_count:0,debt_count:0,equity_count:0,value_total:null,debt_total:null,paired_equity:null};assert.equal(validateMoneyOverview(unknown,'company-A','2026-10').groups.closed_stage.value_total,null);
 const zero=response();zero.groups.closed_stage={...group,debt_total:'0.00',paired_equity:'-1.00'};assert.equal(validateMoneyOverview(zero,'company-A','2026-10').groups.closed_stage.debt_total,'0.00');
 assert.throws(()=>validateMoneyOverview(response(),'foreign','2026-10'));
});
class Node{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.value='';this.textContent='';}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,v){this.listeners[k]=v}}
const all=n=>[n,...n.children.flatMap(all)];const dom=fn=>async()=>{const old=globalThis.document;globalThis.document={createElement:t=>new Node(t)};try{await fn()}finally{globalThis.document=old}};
test('overview denies non-Pro and drops delayed company responses',dom(async()=>{
 let scope={companyId:'company-A',canRead:false},calls=0,release;const root=new Node('div');
 const view=mountMoneyOverview({root,getContext:()=>scope,load:async(c,m)=>{calls++;return response(m)}});await view.open();assert.equal(calls,0);
 scope.canRead=true;const delayed=mountMoneyOverview({root,getContext:()=>scope,load:(c,m)=>new Promise(resolve=>release=()=>resolve(response(m)))});const pending=delayed.open();scope={companyId:'company-B',canRead:true};delayed.clear();release();await pending;assert.equal(root.children.length,0);
}));
test('overview separates coverage from month, invalidates filters and routes to existing tools',dom(async()=>{
 const root=new Node('div'),routes=[];const view=mountMoneyOverview({root,getContext:()=>({companyId:'company-A',canRead:true}),load:async(c,m)=>response(m),navigate:p=>routes.push(p)});await view.open();
 assert.ok(all(root).some(n=>n.textContent==='1 of 3 records covered'));assert.ok(all(root).some(n=>n.textContent.startsWith('No transactions recorded')));
 const select=all(root).find(n=>n.tagName==='SELECT');select.value='all_saved';select.listeners.change();assert.ok(all(root).some(n=>n.textContent==='1 of 4 records covered'));
 all(root).find(n=>n.textContent==='Reports and seller-financing playbook').onclick();assert.deepEqual(routes,['finance']);
 const month=all(root).find(n=>n.type==='month');month.value='2026-09';month.listeners.input();assert.ok(!all(root).some(n=>n.textContent==='$99,999.99'));
}));
