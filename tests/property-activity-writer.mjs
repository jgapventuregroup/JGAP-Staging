import test from 'node:test';
import assert from 'node:assert/strict';
import {savePropertyActivity} from '../property-activity-writer.mjs';

const companyId='company-A',dealId='deal-1';
function mockClient({error=null,returned=null}={}){
  const calls=[];
  const client={from(table){const call={table};calls.push(call);return {insert(payload){call.payload=payload;return {select(){return {async single(){return {data:returned??payload,error};}};}};}};}};
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
