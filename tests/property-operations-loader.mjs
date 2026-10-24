import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPropertyOperations} from '../property-operations-loader.mjs';
const company='company-A',deal='deal-A';
function fakeClient({error=null,foreign=false}={}){
 const seen=[];
 return {seen,from(table){const query={select(){return this;},order(){return this;},range(){return this;},eq(key,value){seen.push([table,key,value]);return this;},then(resolve){resolve(error?{data:null,error:{message:error}}:{data:foreign?[{company_id:'company-B',deal_id:deal}]:[],error:null});}};return query;}};
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

test('loader fetches subsequent pages before reporting totals',async()=>{
 const ranges=[];
 const client={from(table){let start=0;const q={select(){return this},eq(){return this},order(){return this},range(from,to){start=from;ranges.push([table,from,to]);return this},then(resolve){const count=table==='property_ledger_entries'?(start===0?500:1):0;resolve({data:Array.from({length:count},(_,i)=>({id:String(start+i),company_id:company,deal_id:deal,entry_type:'income',amount:'1.00'})),error:null})}};return q;}};
 const loaded=await fetchPropertyOperations({client,companyId:company,dealId:deal});
 assert.equal(loaded.ledger.length,501);
 assert.ok(ranges.some(([table,start])=>table==='property_ledger_entries'&&start===500));
});
test('loader discards results after a workspace switch',async()=>{
 let current=company;
 const client={from(){const q={select(){return this},eq(){return this},order(){return this},range(){return this},then(resolve){current='other';resolve({data:[],error:null})}};return q;}};
 await assert.rejects(fetchPropertyOperations({client,companyId:company,dealId:deal,getCurrentCompany:()=>current}),/session changed/);
});
