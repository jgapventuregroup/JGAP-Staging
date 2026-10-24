import test from 'node:test';
import assert from 'node:assert/strict';
import {savePropertyActivity} from '../property-activity-writer.mjs';

const companyId='company-A',dealId='deal-1';
function mockClient({error=null,returned=null}={}){
  const calls=[];
  const client={from(table){
   const call={table,predicates:{}};calls.push(call);
   const query={insert(payload){call.payload=payload;call.operation='insert';return this},update(payload){call.payload=payload;call.operation='update';return this},eq(key,value){call.predicates[key]=value;return this},select(){return this},async single(){return {data:returned??{id:call.predicates.id||'new-record',company_id:call.predicates.company_id,deal_id:call.predicates.deal_id,...call.payload},error}}};
   return query;
  }};
  return {client,calls};
}

test('writes valid ledger entry scoped to selected company and deal',async()=>{
  const {client,calls}=mockClient();
  const saved=await savePropertyActivity({client,companyId,dealId,kind:'ledger',input:{entryType:'income',entryDate:'2026-10-17',category:'Rent',amount:'1250.00'}});
  assert.equal(saved.company_id,companyId);
  assert.equal(calls[0].table,'property_ledger_entries');
  assert.equal(calls[0].payload.amount,'1250.00');
});
test('rejects invalid repair before database call',async()=>{
  const {client,calls}=mockClient();
  await assert.rejects(savePropertyActivity({client,companyId,dealId,kind:'repair',input:{title:'',openedOn:'2026-02-30'}}));
  assert.equal(calls.length,0);
});
test('rejects unsupported activity type',async()=>{
  const {client,calls}=mockClient();
  await assert.rejects(savePropertyActivity({client,companyId,dealId,kind:'unknown',input:{}}));
  assert.equal(calls.length,0);
});
test('rejects database errors and mismatched saved ownership',async()=>{
  const first=mockClient({error:{message:'permission denied'}});
  await assert.rejects(savePropertyActivity({client:first.client,companyId,dealId,kind:'task',input:{title:'Inspect roof'}}),/permission denied/);
  const second=mockClient({returned:{company_id:'company-B',deal_id:dealId}});
  await assert.rejects(savePropertyActivity({client:second.client,companyId,dealId,kind:'task',input:{title:'Inspect roof'}}),/does not match/);
});

test('requires a selected company, property and client',async()=>{
 const {client,calls}=mockClient();
 for(const missing of [{client:null,companyId,dealId},{client,companyId:'',dealId},{client,companyId,dealId:''}]){
  await assert.rejects(savePropertyActivity({...missing,kind:'task',input:{title:'Inspect roof'}}),/Select a company and property/);
 }
 assert.equal(calls.length,0);
});
test('does not allow form fields to override company or deal ownership',async()=>{
 const {client,calls}=mockClient();
 await savePropertyActivity({client,companyId,dealId,kind:'task',input:{title:'Inspect roof',company_id:'company-B',deal_id:'other-deal'}});
 assert.equal(calls[0].payload.company_id,companyId);
 assert.equal(calls[0].payload.deal_id,dealId);
});
test('does not accept a mismatched deal returned by database',async()=>{
 const {client}=mockClient({returned:{company_id:companyId,deal_id:'other-deal'}});
 await assert.rejects(savePropertyActivity({client,companyId,dealId,kind:'task',input:{title:'Inspect roof'}}),/does not match/);
});

test('editing an existing task scopes UPDATE by ID, company and property',async()=>{
 const {client,calls}=mockClient();
 const saved=await savePropertyActivity({client,companyId,dealId,kind:'task',recordId:'task-1',input:{title:'Inspect roof',status:'done',company_id:'company-B'}});
 assert.equal(saved.id,'task-1');
 assert.equal(calls[0].operation,'update');
 assert.deepEqual(calls[0].predicates,{id:'task-1',company_id:companyId,deal_id:dealId});
 assert.equal(calls[0].payload.status,'done');
 assert.equal(calls[0].payload.company_id,undefined,'Never update scope from a form');
});
test('editing refuses a wrong returned ID or a stale company session',async()=>{
 const {client}=mockClient({returned:{id:'wrong',company_id:companyId,deal_id:dealId}});
 await assert.rejects(savePropertyActivity({client,companyId,dealId,kind:'task',recordId:'task-1',input:{title:'Inspect roof'}}),/does not match/);
 const next=mockClient();
 await assert.rejects(savePropertyActivity({client:next.client,companyId,dealId,kind:'task',input:{title:'Inspect roof'},getCurrentCompany:()=> 'other'}),/session changed/);
 assert.equal(next.calls.length,0);
});
