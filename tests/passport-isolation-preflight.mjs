import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightPassportIsolation} from '../passport-isolation-preflight.mjs';
function setup({foreignRows=[],ownRows=[],user={id:'u1'},changeSession=false}={}){
 let company='c1',queries=[];
 const client={auth:{async getUser(){return {data:{user},error:null}}},from(table){
  const query={table,filters:[],select(){return this},eq(k,v){this.filters.push([k,v]);return this},then(resolve){
   queries.push({table,filters:this.filters});
   if(changeSession)company='c2';
   const foreign=this.filters.some(([k,v])=>k==='deal_id'&&v==='p2');
   resolve({data:foreign?foreignRows:ownRows,error:null});
  }};return query;
 }};
 const args={client,ownCompanyId:'c1',ownDealId:'p1',otherCompanyId:'c2',otherDealId:'p2',getCurrentCompany:()=>company,getCurrentClient:()=>client};
 return {args,queries};
}
test('authenticated preflight probes all four tables without filtering foreign company',async()=>{
 const {args,queries}=setup();
 const result=await preflightPassportIsolation(args);
 assert.equal(result.results.length,4);
 assert.equal(result.writeIsolationVerified,false);
 assert.equal(queries.length,8);
 for(let i=0;i<8;i+=2){
  assert.deepEqual(queries[i].filters,[['company_id','c1'],['deal_id','p1']]);
  assert.deepEqual(queries[i+1].filters,[['deal_id','p2']]);
 }
});
test('preflight fails closed on any foreign-property row',async()=>{
 const {args}=setup({foreignRows:[{id:'leak',company_id:'c2',deal_id:'p2'}]});
 await assert.rejects(preflightPassportIsolation(args),/foreign property returned rows/);
});
test('preflight refuses absent signed-in user and identical companies',async()=>{
 const {args}=setup({user:null});
 await assert.rejects(preflightPassportIsolation(args),/real signed-in user/);
 const {args:identical}=setup();identical.otherCompanyId='c1';
 await assert.rejects(preflightPassportIsolation(identical),/Two distinct companies/);
});
test('preflight rejects company switch during a query',async()=>{
 const {args,queries}=setup({changeSession:true});
 await assert.rejects(preflightPassportIsolation(args),/session changed/);
 assert.equal(queries.length,1);
});
