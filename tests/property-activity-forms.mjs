import test from 'node:test';
import assert from 'node:assert/strict';
import {createPropertyActivityForm,createPropertyActivityRecords} from '../property-activity-forms.mjs';

class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.value='';this.isConnected=true;this.listeners={};this.textContent='';}
 append(...items){this.children.push(...items)}
 setAttribute(key,value){this.attributes[key]=value}
 addEventListener(name,handler){this.listeners[name]=handler}
 querySelector(){return null}
 remove(){this.isConnected=false}
 reset(){for(const element of descendants(this))if(element.name)element.value=''}
}
function descendants(element){return [element,...element.children.flatMap(descendants)]}
function controls(form){return Object.fromEntries(descendants(form).filter(el=>el.name).map(el=>[el.name,el]))}
function setup({entry=null,kind='task',onSaved=async()=>{},responseError=null}={}){
 const calls=[];let company='company-A';
 const client={from(table){const call={table,filters:{}};calls.push(call);const q={insert(value){call.operation='insert';call.value=value;return this},update(value){call.operation='update';call.value=value;return this},eq(key,value){call.filters[key]=value;return this},select(){return this},async single(){return {data:{id:entry?.id||'new-record',company_id:'company-A',deal_id:'deal-A',...call.value},error:responseError}}};return q;}};
 const context={kind,client,companyId:'company-A',dealId:'deal-A',getCurrentCompany:()=>company,getCurrentClient:()=>client,onSaved,entry};
 return {context,calls,switchCompany(){company='other'},form:()=>createPropertyActivityForm(context)};
}
const entry={id:'task-1',company_id:'company-A',deal_id:'deal-A',title:'Inspect roof',status:'open',due_on:'2026-11-01',details:'Check flashing'};
const submit=form=>form.listeners.submit({preventDefault(){}});
const previous=globalThis.document;
// These are DOM unit tests, not rendered browser/device verification.
function dom(fn){return async()=>{globalThis.document={createElement:tag=>new Element(tag)};try{await fn()}finally{globalThis.document=previous}}}

test('edit form preloads an existing task and updates its status by exact ID',dom(async()=>{
 let refreshed=0;const fixture=setup({entry,onSaved:async()=>refreshed++});const form=fixture.form();const fields=controls(form);
 assert.equal(fields.title.value,'Inspect roof');assert.equal(fields.dueOn.value,'2026-11-01');
 fields.status.value='done';await submit(form);
 assert.equal(fixture.calls[0].operation,'update');assert.deepEqual(fixture.calls[0].filters,{id:'task-1',company_id:'company-A',deal_id:'deal-A'});
 assert.equal(fixture.calls[0].value.status,'done');assert.equal(refreshed,1);
}));
test('new entry save failure retains input; confirmed save with failed refresh blocks duplicates',dom(async()=>{
 const fixture=setup({onSaved:async()=>{throw Error('offline')}});const form=fixture.form();controls(form).title.value='Inspect roof';await submit(form);
 assert.equal(fixture.calls.length,1);assert.ok(descendants(form).some(el=>el.textContent.startsWith('Saved, but activity could not refresh')));
 await submit(form);assert.equal(fixture.calls.length,1,'Confirmed insert must not be repeated after refresh failure');
 const failed=setup({responseError:{message:'permission denied'}});const retry=failed.form();controls(retry).title.value='Inspect roof';await submit(retry);
 assert.equal(controls(retry).title.value,'Inspect roof','Failure must preserve unsaved input');
}));
test('detached or switched-company form never sends a write',dom(async()=>{
 const switched=setup();const form=switched.form();switched.switchCompany();await submit(form);assert.equal(switched.calls.length,0);
 const detached=setup();const hidden=detached.form();hidden.remove();await submit(hidden);assert.equal(detached.calls.length,0);
}));
test('record history displays text safely and hides editing for read-only access',dom(async()=>{
 const fixture=setup();const hostile={...entry,title:'<script>bad()</script>'};
 const readOnly=createPropertyActivityRecords({...fixture.context,entries:[hostile],canWrite:false});
 assert.ok(descendants(readOnly).some(el=>el.textContent===hostile.title));
 assert.equal(descendants(readOnly).filter(el=>el.tagName==='BUTTON').length,0);
 const editable=createPropertyActivityRecords({...fixture.context,entries:[entry],canWrite:true});
 const button=descendants(editable).find(el=>el.tagName==='BUTTON');button.onclick();
 assert.equal(descendants(editable).filter(el=>el.tagName==='FORM').length,1);
 assert.throws(()=>createPropertyActivityRecords({...fixture.context,entries:[{...entry,company_id:'foreign'}]}),/does not belong/);
}));
