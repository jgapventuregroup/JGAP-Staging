import test from 'node:test';import assert from 'node:assert/strict';import {saveOriginalPassportEntry} from '../original-passport-writer.mjs';
test('writer pins company and deal and ignores injected identity',async()=>{
 let written;const client={from(table){assert.equal(table,'property_assets');return {insert(row){written=row;return this},select(){return this},async single(){return {data:{id:'new',company_id:'c1',deal_id:'d1'},error:null}}}}};
 await saveOriginalPassportEntry({kind:'asset',values:{name:'Furnace',company_id:'other',deal_id:'other'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client});
 assert.equal(written.company_id,'c1');assert.equal(written.deal_id,'d1');assert.equal(written.name,'Furnace');
});
test('writer blocks a changed company before writing',async()=>{
 let called=false;const client={from(){called=true}};
 await assert.rejects(saveOriginalPassportEntry({kind:'maintenance',values:{title:'Fix',maintenance_date:'2026-10-18'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c2',getCurrentClient:()=>client}),/changed/);assert.equal(called,false);
});

test('writer rejects invalid service schedule before database access',async()=>{
 let called=false;const client={from(){called=true}};
 const context={kind:'service',client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client};
 await assert.rejects(saveOriginalPassportEntry({...context,values:{asset_id:'a1',service_name:'Filter',frequency_value:0}}),/positive whole-number/);
 await assert.rejects(saveOriginalPassportEntry({...context,values:{asset_id:'a1',service_name:'Filter',frequency_value:1.5}}),/positive whole-number/);
 await assert.rejects(saveOriginalPassportEntry({...context,values:{asset_id:'a1',service_name:'Filter',frequency_value:1,frequency_unit:'decade'}}),/frequency unit/);
 assert.equal(called,false);
});
test('writer rejects invalid maintenance status before database access',async()=>{
 let called=false;const client={from(){called=true}};
 await assert.rejects(saveOriginalPassportEntry({kind:'maintenance',values:{title:'Repair',maintenance_date:'2026-10-18',status:'unknown'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client}),/maintenance status/);
 assert.equal(called,false);
});
