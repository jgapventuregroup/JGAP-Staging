import test from 'node:test';import assert from 'node:assert/strict';import {validateSavedRadar,filterSavedRadar,mountSavedRadar} from '../saved-deal-radar.mjs';
const row=(id='deal-1')=>({id,company_id:'company-A',name:'Fictional saved property',address:'Test address',status:'lead',property_type:'duplex',follow_up_date:null,follow_up_due:false,asking_price:'100000.01',target_offer_price:'90000.02',asking_offer_gap:'9999.99',review_fields:['units']});
const report=(date='2026-10-26',rows=[row()])=>({company_id:'company-A',as_of:date,rows});
test('radar validates company, dates, exact price gaps and known missing-data flags',()=>{
 assert.equal(validateSavedRadar(report(),'company-A','2026-10-26').rows.length,1);
 for(const patch of [{company_id:'foreign'},{asking_offer_gap:'10000.00'},{follow_up_date:'2026-02-30'},{follow_up_due:true},{review_fields:['unknown']},{review_fields:['units','units']},{asking_price:'NaN'},{asking_price:null}])assert.throws(()=>validateSavedRadar(report('2026-10-26',[{...row(),...patch}]),'company-A','2026-10-26'));
 assert.throws(()=>validateSavedRadar(report('2026-10-26',[row(),row()]),'company-A','2026-10-26'));
});
test('radar filters saved data without inventing scores or treating missing gaps as discounts',()=>{
 const rows=[row(),{...row('deal-2'),name:'Other house',status:'offer',follow_up_date:'2026-10-25',follow_up_due:true,asking_price:null,asking_offer_gap:null,review_fields:[]}];
 assert.equal(filterSavedRadar(rows,{filter:'review'}).length,1);assert.equal(filterSavedRadar(rows,{filter:'gap'}).length,1);assert.equal(filterSavedRadar(rows,{filter:'due'})[0].id,'deal-2');assert.equal(filterSavedRadar(rows,{search:'TEST ADDRESS',stage:'offer'})[0].id,'deal-2');assert.throws(()=>filterSavedRadar(rows,{filter:'guaranteed_returns'}));
});
class Node{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.value='';this.textContent='';}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,v){this.listeners[k]=v}}
const all=n=>[n,...n.children.flatMap(all)];
const dom=fn=>async()=>{const previous=globalThis.document;globalThis.document={createElement:tag=>new Node(tag)};try{await fn()}finally{globalThis.document=previous}};
test('radar denies non-Pro before loading and clears late cross-company responses',dom(async()=>{
 let scope={companyId:'company-A',canRead:false},calls=0,release;const root=new Node('div');
 const view=mountSavedRadar({root,getContext:()=>scope,load:async(c,d)=>{calls++;return report(d)}});await view.open();assert.equal(calls,0);assert.match(root.children[0].textContent,/requires/);
 scope.canRead=true;const late=mountSavedRadar({root,getContext:()=>scope,load:(c,d)=>new Promise(resolve=>release=()=>resolve(report(d)))});const pending=late.open();scope={companyId:'company-B',canRead:true};late.clear();release();await pending;assert.equal(root.children.length,0);
}));
test('radar paginates safe text, applies filters and preserves truthful empty states',dom(async()=>{
 const root=new Node('div');let opened=0;const rows=Array.from({length:51},(_,i)=>({...row('deal-'+i),name:i===0?'<img src=x onerror=alert(1)>':'Property '+i}));
 const view=mountSavedRadar({root,getContext:()=>({companyId:'company-A',canRead:true}),load:async(c,d)=>report(d,rows),openProperties:()=>opened++});await view.open();
 assert.equal(all(root).filter(n=>n.tagName==='DETAILS').length,50);for(const card of all(root).filter(n=>n.tagName==='DETAILS')){assert.equal(card.children[0].tagName,'SUMMARY');assert.ok(!card.open);assert.ok(card.children.slice(1).some(n=>n.tagName==='P'));}assert.ok(all(root).some(n=>n.textContent==='<img src=x onerror=alert(1)>'));assert.equal(all(root).filter(n=>n.tagName==='IMG').length,0);
 all(root).find(n=>n.textContent==='Next 50 saved properties').onclick();assert.equal(all(root).filter(n=>n.tagName==='DETAILS').length,1);
 const search=all(root).find(n=>n.tagName==='INPUT');search.value='not in portfolio';search.listeners.input();assert.equal(all(root).filter(n=>n.tagName==='DETAILS').length,0);assert.ok(all(root).some(n=>n.textContent==='No saved properties match these filters.'));
 all(root).find(n=>n.textContent==='Open My properties').onclick();assert.equal(opened,1);
}));
