import test from 'node:test';import assert from 'node:assert/strict';import {saveOriginalPassportEntry,savePassportSystemWithService} from '../original-passport-writer.mjs';
// Exercise the writer's validation with mocked clients; staging itself remains read-only.
globalThis.JGAP_ORIGINAL_PASSPORT_WRITES_READY=true;
test('writer fails closed when Passport record editing is disabled',async()=>{
 globalThis.JGAP_ORIGINAL_PASSPORT_WRITES_READY=false;
 try{await assert.rejects(saveOriginalPassportEntry({kind:'asset',values:{name:'Furnace'},client:{},companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>({})}),/not enabled/)}
 finally{globalThis.JGAP_ORIGINAL_PASSPORT_WRITES_READY=true}
});
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
test('service writer rejects fractional frequency without database access',async()=>{
 let called=false;const client={from(){called=true;throw Error('Database should not be accessed')}};
 await assert.rejects(saveOriginalPassportEntry({kind:'service',values:{asset_id:'a1',service_name:'Inspect',frequency_value:1.5},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client}),/positive whole-number|Invalid service frequency value/);
 assert.equal(called,false);
});

test('writer rejects invalid maintenance status before database access',async()=>{
 let called=false;const client={from(){called=true}};
 await assert.rejects(saveOriginalPassportEntry({kind:'maintenance',values:{title:'Repair',maintenance_date:'2026-10-18',status:'unknown'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client}),/maintenance status/);
 assert.equal(called,false);
});

test('service writer rejects equipment owned by another property before insert',async()=>{
 let inserted=false;
 const client={from(table){assert.equal(table,'property_assets');return {select(){return this},eq(){return this},async single(){return {data:{id:'a1',company_id:'c2',deal_id:'d2'},error:null}},insert(){inserted=true;throw Error('Should not insert')}}}};
 await assert.rejects(saveOriginalPassportEntry({kind:'service',values:{asset_id:'a1',service_name:'Filter',frequency_value:1,frequency_unit:'year'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client}),/does not belong/);
 assert.equal(inserted,false);
});

test('writer rejects negative and nonfinite costs before database access',async()=>{
 let called=false;const client={from(){called=true}};
 const context={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client};
 for(const cost of [-1,NaN,Infinity]){
  await assert.rejects(saveOriginalPassportEntry({...context,kind:'asset',values:{name:'Furnace',purchase_cost:cost}}),/Invalid nonnegative Passport amount/);
  await assert.rejects(saveOriginalPassportEntry({...context,kind:'maintenance',values:{title:'Repair',maintenance_date:'2026-10-18',cost}}),/Invalid nonnegative Passport amount/);
 }
 for(const life of [0,-2,1.5,Infinity]){
  await assert.rejects(saveOriginalPassportEntry({...context,kind:'asset',values:{name:'Furnace',expected_life_years:life}}),/Invalid nonnegative Passport amount/);
 }
 assert.equal(called,false);
});

test('combined equipment workflow saves its first schedule using new equipment ID',async()=>{
 const inserted=[];
 const client={from(table){return {insert(row){inserted.push({table,row});return this},select(){return this},eq(){return this},async single(){return {data:table==='property_assets'&&inserted.length===1?{id:'asset-new',company_id:'c1',deal_id:'d1'}:table==='property_assets'?{id:'asset-new',company_id:'c1',deal_id:'d1'}:{id:'service-new',company_id:'c1',deal_id:'d1'},error:null}}}}};
 const result=await savePassportSystemWithService({assetValues:{name:'Boiler'},serviceValues:{service_name:'Inspection',frequency_value:1,frequency_unit:'year'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client});
 assert.equal(result.asset.id,'asset-new');assert.equal(result.service.id,'service-new');
 assert.equal(inserted[1].row.asset_id,'asset-new');
 assert.equal(inserted.filter(x=>x.table==='property_assets').length,1);
});

test('combined Passport save reports partial success and never duplicates equipment',async()=>{
 let equipmentInserts=0;
 const client={from(table){return {insert(){if(table==='property_assets')equipmentInserts++;return this},select(){return this},eq(){return this},async single(){
  if(table==='property_asset_services')return {data:null,error:{message:'Service insert blocked'}};
  return {data:{id:'asset-new',company_id:'c1',deal_id:'d1'},error:null};
 }}}};
 const context={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client};
 await assert.rejects(savePassportSystemWithService({...context,assetValues:{name:'Furnace'},serviceValues:{service_name:'Filter',frequency_value:1,frequency_unit:'year'}}),error=>{
  assert.equal(error.partialSave,true);assert.equal(error.assetId,'asset-new');assert.match(error.message,/Equipment saved but service schedule failed/);return true;
 });
 assert.equal(equipmentInserts,1);
});

test('combined Passport writer rejects incomplete service details before any insert',async()=>{
 let calls=0;
 const client={from(){calls++;throw Error('Unexpected database call')}};
 const context={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client,assetValues:{name:'Furnace'}};
 for(const serviceValues of [{next_service_date:'2026-11-01'},{service_name:'Inspect'},{service_name:'Inspect',frequency_value:0},{service_name:'Inspect',frequency_value:1,frequency_unit:'daily'}]){
  await assert.rejects(savePassportSystemWithService({...context,serviceValues}));
 }
 assert.equal(calls,0);
});

test('combined Passport writer rejects caller-provided equipment ID before database access',async()=>{
 let called=false;
 const client={from(){called=true;throw Error('Database must not be called')}};
 await assert.rejects(savePassportSystemWithService({
  client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client,
  assetValues:{name:'Boiler'},
  serviceValues:{asset_id:'another-asset',service_name:'Inspect',frequency_value:1,frequency_unit:'year'}
 }),/assigned automatically/);
 assert.equal(called,false);
});

test('combined Passport writer rejects malformed schedule details without inserting equipment',async()=>{
 let calls=0;
 const client={from(){calls++;throw Error('Unexpected database access')}};
 const context={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client,assetValues:{name:'Boiler'}};
 for(const serviceValues of [
  {service_name:'Inspection',frequency_value:1,frequency_unit:'year',notes:{unexpected:true}},
  {service_name:'Inspection',frequency_value:1,frequency_unit:'year',next_service_date:12345},
  {service_name:'Inspection',frequency_value:1,frequency_unit:'year',last_service_date:false}
 ]){
  await assert.rejects(savePassportSystemWithService({...context,serviceValues}),/Invalid service schedule field/);
 }
 assert.equal(calls,0);
});

test('combined Passport writer rejects invalid calendar dates before any equipment insert',async()=>{
 let calls=0;
 const client={from(){calls++;throw Error('Unexpected database access')}};
 const context={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client,assetValues:{name:'Boiler'}};
 for(const date of ['2026-02-30','2026-13-01','2026-1-01','not-a-date']){
  await assert.rejects(savePassportSystemWithService({...context,serviceValues:{service_name:'Inspect',frequency_value:1,frequency_unit:'year',next_service_date:date}}),/Invalid service date/);
 }
 assert.equal(calls,0);
});

test('all Passport record date fields reject impossible dates before database writes',async()=>{
 let calls=0;
 const client={from(){calls++;throw Error('Unexpected database access')}};
 const base={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client};
 const scenarios=[
  ['asset',{name:'Boiler',installed_date:'2026-02-30'}],
  ['asset',{name:'Boiler',warranty_expiration:'2026-13-01'}],
  ['asset',{name:'Boiler',next_service_date:'2026-00-01'}],
  ['service',{asset_id:'a1',service_name:'Inspect',frequency_value:1,last_service_date:'2026-02-30'}],
  ['maintenance',{title:'Repair',maintenance_date:'2026-02-30'}],
  ['maintenance',{title:'Repair',maintenance_date:'2026-10-18',due_date:'2026-13-01'}],
  ['improvement',{title:'Upgrade',improvement_date:'2026-02-30'}]
 ];
 for(const [kind,values] of scenarios)await assert.rejects(saveOriginalPassportEntry({...base,kind,values}),/Invalid Passport date/);
 assert.equal(calls,0);
});


test('writer detects company switch while insert is in flight',async()=>{
 let currentCompany='c1';
 const client={from(table){assert.equal(table,'property_assets');return {insert(){return this},select(){return this},async single(){currentCompany='c2';return {data:{id:'asset-new',company_id:'c1',deal_id:'d1'},error:null}}}}};
 await assert.rejects(saveOriginalPassportEntry({kind:'asset',values:{name:'Furnace'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=>currentCompany,getCurrentClient:()=>client}),/Company session changed after save/);
});


test('writer rejects a changed client while insert is in flight',async()=>{
 let currentClient;
 const client={from(table){assert.equal(table,'property_assets');return {insert(){return this},select(){return this},async single(){currentClient={};return {data:{id:'asset-new',company_id:'c1',deal_id:'d1'},error:null}}}}};
 currentClient=client;
 await assert.rejects(saveOriginalPassportEntry({kind:'asset',values:{name:'Furnace'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>currentClient}),/Company session changed after save/);
});


test('writer never touches database when a caller supplies an unsupported Passport field',async()=>{
 let calls=0;const client={from(){calls++;throw Error('Unexpected database access')}};
 const base={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client};
 for(const [kind,values] of [
  ['asset',{name:'Furnace',owner_id:'another-user'}],
  ['service',{asset_id:'a1',service_name:'Inspect',frequency_value:1,company_owner:'other'}],
  ['maintenance',{title:'Repair',maintenance_date:'2026-10-18',user_id:'other'}],
  ['improvement',{title:'Upgrade',improvement_date:'2026-10-18',deal_owner:'other'}]
 ])await assert.rejects(saveOriginalPassportEntry({...base,kind,values}),/Unsupported Passport field/);
 assert.equal(calls,0);
});

test('writer rejects unexpected saved company or deal after insert',async()=>{
 const client={from(){return {insert(){return this},select(){return this},async single(){return {data:{id:'saved',company_id:'foreign',deal_id:'d1'},error:null}}}}};
 await assert.rejects(saveOriginalPassportEntry({kind:'asset',values:{name:'Furnace'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client}),/did not match selected property/);
});

test('writer rejects malformed optional text fields without accessing the database',async()=>{
 let called=false;
 const client={from(){called=true;throw Error('Database must not be accessed')}};
 const context={client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client};
 for(const values of [{name:'Furnace',condition:42},{name:'Furnace',asset_type:{}},{name:'Furnace',condition:'   '}]){
  await assert.rejects(saveOriginalPassportEntry({...context,kind:'asset',values}),/Invalid Passport text/);
 }
 await assert.rejects(saveOriginalPassportEntry({...context,kind:'maintenance',values:{title:'Repair',maintenance_date:'2026-10-18',description:17}}),/Invalid Passport text/);
 await assert.rejects(saveOriginalPassportEntry({...context,kind:'improvement',values:{title:'Roof',improvement_date:'2026-10-18',category:[]}}),/Invalid Passport text/);
 assert.equal(called,false);
});

test('all four Passport writers pin the active property and reject mismatched returned ownership',async()=>{
 const cases=[
  ['asset','property_assets',{name:'Water heater'}],
  ['maintenance','property_maintenance',{title:'Inspection',maintenance_date:'2026-10-21'}],
  ['improvement','property_improvements',{title:'Roof replacement',improvement_date:'2026-10-21'}]
 ];
 for(const [kind,table,values] of cases){
  let inserted;
  const client={from(name){assert.equal(name,table);return {insert(row){inserted=row;return this},select(){return this},async single(){return {data:{id:'record',company_id:'foreign-company',deal_id:'d1'},error:null}}}}};
  await assert.rejects(saveOriginalPassportEntry({kind,values,client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client}),/did not match selected property/);
  assert.equal(inserted.company_id,'c1');assert.equal(inserted.deal_id,'d1');
 }
});
test('Passport writer reports database rejection without claiming a save',async()=>{
 const client={from(name){assert.equal(name,'property_improvements');return {insert(){return this},select(){return this},async single(){return {data:null,error:{message:'row-level security denied'}}}}}};
 await assert.rejects(saveOriginalPassportEntry({kind:'improvement',values:{title:'Roof',improvement_date:'2026-10-21'},client,companyId:'c1',dealId:'d1',getCurrentCompany:()=> 'c1',getCurrentClient:()=>client}),/row-level security denied/);
});
