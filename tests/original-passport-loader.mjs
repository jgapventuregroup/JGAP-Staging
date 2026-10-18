import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOriginalPassportRecords} from '../original-passport-loader.mjs';
test('loader scopes every original Passport table to active company and property',async()=>{
 const queries=[];
 const client={from(table){const q={table,filters:[],select(){return this},eq(k,v){this.filters.push([k,v]);if(this.filters.length===2){queries.push(this);return Promise.resolve({data:[],error:null});}return this}};return q}};
 const data=await loadOriginalPassportRecords({client,companyId:'c1',propertyId:'p1'});
 assert.deepEqual(Object.keys(data),['assets','services','maintenance','improvements']);
 assert.equal(queries.length,4);
 for(const q of queries)assert.deepEqual(q.filters,[['company_id','c1'],['property_id','p1']]);
});
test('loader rejects records from another company',async()=>{
 const client={from(){return {select(){return this},eq(){return this},then(resolve){resolve({data:[{id:'a',company_id:'other',property_id:'p1'}],error:null})}}}};
 await assert.rejects(loadOriginalPassportRecords({client,companyId:'c1',propertyId:'p1'}),/outside selected property/);
});
