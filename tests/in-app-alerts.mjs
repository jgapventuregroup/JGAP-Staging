import test from 'node:test';import assert from 'node:assert/strict';import {inAppAlertKey,validateInAppAlerts,filterInAppAlerts,mountInAppAlerts} from '../in-app-alerts.mjs';
const c='20000000-0000-4000-8000-000000000001',u='10000000-0000-4000-8000-000000000001',deal='30000000-0000-4000-8000-000000000001';
const row=(type='task',id='40000000-0000-4000-8000-000000000001',due='2026-10-26')=>({company_id:c,source_type:type,source_id:id,deal_id:deal,property_name:'Fictional property',title:type==='task'?'Review boiler':'Annual inspection',due_date:due,is_reviewed:false,reviewed_at:null});
const result=(items=[row()],asOf='2026-10-26')=>({company_id:c,as_of:asOf,items,total_count:items.length,unreviewed_count:items.filter(r=>!r.is_reviewed).length});
test('alerts validate exact company/date/type, unique source revisions and reviewed counts',()=>{
 assert.equal(validateInAppAlerts(result(),c,'2026-10-26').unreviewed_count,1);
 for(const patch of [{company_id:'other'},{source_type:'feed'},{due_date:'2026-10-27'},{due_date:'2026-02-30'},{is_reviewed:'true'},{source_id:'bad'},{is_reviewed:true,reviewed_at:null}])assert.throws(()=>validateInAppAlerts(result([{...row(),...patch}]),c,'2026-10-26'));
 assert.throws(()=>validateInAppAlerts(result([row(),row()]),c,'2026-10-26'));assert.throws(()=>validateInAppAlerts({...result(),unreviewed_count:0},c,'2026-10-26'));
 assert.notEqual(inAppAlertKey(row()),inAppAlertKey({...row(),due_date:'2026-10-25'}));assert.equal(filterInAppAlerts([row(),{...row('maintenance'),is_reviewed:true,reviewed_at:'2026-10-26T12:00:00Z'}],{state:'reviewed'})[0].source_type,'maintenance');
});
class Node{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.value='';this.textContent='';this.disabled=false;}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,v){this.listeners[k]=v}}
const all=n=>[n,...n.children.flatMap(all)];const dom=fn=>async()=>{const previous=globalThis.document;globalThis.document={createElement:t=>new Node(t)};try{await fn()}finally{globalThis.document=previous}};
function setup({canRead=true,delayed=false,denyLoad=false,verifyFailure=false,sourceChanges=false}={}){
 let scope={companyId:c,canRead,session:{}},rows=[],release,reads=0;const root=new Node('div'),badges=[],writes=[],opened=[];
 const view=mountInAppAlerts({root,getContext:()=>scope,setBadge:n=>badges.push(n),load:async(company,asOf)=>{reads++;if(denyLoad||verifyFailure&&reads>1)throw Error('Access unavailable');if(!rows.length&&reads===1)rows=[row('task',undefined,asOf),row('maintenance','40000000-0000-4000-8000-000000000002',asOf)];const data=result(structuredClone(rows),asOf);if(delayed)return await new Promise(resolve=>release=()=>resolve(data));return data;},setReview:async(company,entry,state)=>{writes.push({company,key:inAppAlertKey(entry),state});const existing=rows.find(r=>inAppAlertKey(r)===inAppAlertKey(entry));existing.is_reviewed=state;existing.reviewed_at=state?'2026-10-26T12:00:00Z':null;const saved={...existing,user_id:u};if(sourceChanges)rows=rows.filter(r=>inAppAlertKey(r)!==inAppAlertKey(entry));return saved;},openSource:async(company,entry)=>opened.push({company,entry})});
 return {root,view,badges,writes,opened,get reads(){return reads},release:()=>release(),switchCompany:()=>scope={...scope,companyId:'20000000-0000-4000-8000-000000000002'},switchAccount:()=>scope={...scope,session:{}}};
}
test('non-Pro alerts never call source APIs or leave a badge',dom(async()=>{const f=setup({canRead:false});await f.view.open();await f.view.refreshCount();assert.equal(f.reads,0);assert.equal(f.badges.at(-1),null);assert.ok(all(f.root).some(n=>n.textContent.includes('active Pro')));}));
test('personal review persists, updates badge and toggles reviewed filter without completing source',dom(async()=>{
 const f=setup();await f.view.open();assert.equal(f.badges.at(-1),2);const button=all(f.root).find(n=>n.textContent==='Mark reviewed');const pending=button.onclick();await button.onclick();await pending;assert.equal(f.writes.length,1);assert.equal(f.badges.at(-1),1);assert.ok(all(f.root).some(n=>n.textContent.includes('Source task or follow-up was not changed.')));
 const filters=all(f.root).filter(n=>n.tagName==='SELECT');filters[1].value='reviewed';filters[1].listeners.change();assert.equal(all(f.root).filter(n=>n.tagName==='ARTICLE').length,1);await all(f.root).find(n=>n.textContent==='Mark unreviewed').onclick();assert.equal(f.badges.at(-1),2);assert.ok(all(f.root).some(n=>n.textContent.includes('No active alerts match')));
}));
test('alerts route exact scoped source records and distinguish persisted verification failures',dom(async()=>{
 const f=setup();await f.view.open();await all(f.root).find(n=>n.textContent==='Open source record').onclick();assert.equal(f.opened[0].company,c);assert.equal(f.opened[0].entry.source_type,'task');
 const partial=setup({verifyFailure:true});await partial.view.open();await all(partial.root).find(n=>n.textContent==='Mark reviewed').onclick();assert.ok(all(partial.root).some(n=>n.textContent.includes('Review saved, but the refreshed state could not be verified')));
 const changed=setup({sourceChanges:true});await changed.view.open();await all(changed.root).find(n=>n.textContent==='Mark reviewed').onclick();assert.ok(all(changed.root).some(n=>n.textContent.includes('changed or is no longer active')));
}));
test('late page and badge responses cannot cross workspace/account boundaries; errors never claim zero',dom(async()=>{
 for(const change of ['switchCompany','switchAccount']){const f=setup({delayed:true});const pending=f.view.open();f[change]();f.view.clear();f.release();await pending;assert.equal(f.root.children.length,0);assert.equal(f.badges.at(-1),null);}
 const count=setup({delayed:true});const pending=count.view.refreshCount();count.switchCompany();count.view.clear();count.release();await pending;assert.equal(count.badges.at(-1),null);
 const failed=setup({denyLoad:true});await failed.view.open();assert.equal(failed.badges.at(-1),null);assert.ok(all(failed.root).some(n=>n.textContent.startsWith('Could not load')));
}));
