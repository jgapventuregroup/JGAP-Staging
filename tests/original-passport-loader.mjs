import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOriginalPassportRecords} from '../original-passport-loader.mjs';
test('loader scopes every original Passport table to active company and property',async()=>{
 const queries=[];
 const client={from(table){const q={table,filters:[],select(){return this},eq(k,v){this.filters.push([k,v]);if(this.filters.length===2){queries.push(this);return Promise.resolve({data:[],error:null});}return this}};return q}};
 const data=await loadOriginalPassportRecords({client,companyId:'c1',propertyId:'p1'});
 assert.deepEqual(Object.keys(data),['assets','services','maintenance','improvements']);
 assert.equal(queries.length,4);
 for(const q of queries)assert.deepEqual(q.filters,[['company_id','c1'],['deal_id','p1']]);
});
test('loader rejects records from another company',async()=>{
 const client={from(){return {select(){return this},eq(){return this},then(resolve){resolve({data:[{id:'a',company_id:'other',deal_id:'p1'}],error:null})}}}};
 await assert.rejects(loadOriginalPassportRecords({client,companyId:'c1',propertyId:'p1'}),/outside selected property/);
});

test('loader rejects a service schedule attached to equipment outside the property',async()=>{
 const rows={property_assets:[{id:'a1',company_id:'c1',deal_id:'p1',name:'Boiler'}],property_asset_services:[{id:'s1',company_id:'c1',deal_id:'p1',asset_id:'foreign',service_name:'Inspection'}],property_maintenance:[],property_improvements:[]};
 const client={from(table){return {select(){return this},eq(){return this},then(resolve){resolve({data:rows[table],error:null})}}}};
 await assert.rejects(loadOriginalPassportRecords({client,companyId:'c1',propertyId:'p1'}),/outside the selected property/);
});
test('loader rejects duplicate equipment identifiers',async()=>{
 const asset={id:'a1',company_id:'c1',deal_id:'p1',name:'Boiler'};
 const client={from(table){return {select(){return this},eq(){return this},then(resolve){resolve({data:table==='property_assets'?[asset,asset]:[],error:null})}}}};
 await assert.rejects(loadOriginalPassportRecords({client,companyId:'c1',propertyId:'p1'}),/Duplicate assets/);
});
