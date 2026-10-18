import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPropertyOperations} from '../property-operations-loader.mjs';
const company='company-A',deal='deal-A';
function fakeClient({error=null,foreign=false}={}){
 const seen=[];
 return {seen,from(table){const query={select(){return this;},eq(key,value){seen.push([table,key,value]);return this;},then(resolve){resolve(error?{data:null,error:{message:error}}:{data:foreign?[{company_id:'company-B',deal_id:deal}]:[],error:null});}};return query;}};
}
test('loader scopes each collection to company and property',async()=>{
 const client=fakeClient();
 assert.deepEqual(await fetchPropertyOperations({client,companyId:company,dealId:deal}),{ledger:[],repairs:[],tasks:[]});
 assert.equal(client.seen.length,6);
 for(const table of ['property_ledger_entries','property_repairs','property_tasks']){
  assert.ok(client.seen.some(row=>row[0]===table&&row[1]==='company_id'&&row[2]===company));
  assert.ok(client.seen.some(row=>row[0]===table&&row[1]==='deal_id'&&row[2]===deal));
 }
});
test('loader fails closed for query errors, cross-company records and missing context',async()=>{
 await assert.rejects(fetchPropertyOperations({client:fakeClient({error:'table unavailable'}),companyId:company,dealId:deal}),/Could not load/);
 await assert.rejects(fetchPropertyOperations({client:fakeClient({foreign:true}),companyId:company,dealId:deal}),/Unexpected property scope/);
 await assert.rejects(fetchPropertyOperations({client:null,companyId:company,dealId:deal}),/context missing/);
});
