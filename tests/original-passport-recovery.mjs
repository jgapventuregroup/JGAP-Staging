import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOriginalPassportProperty,projectOriginalPassportChild,originalPassportTables} from '../original-passport-recovery.mjs';
test('original Passport preserves property equity and missing values',()=>{
 const p=projectOriginalPassportProperty({id:'p1',company_id:'c1',name:'Duplex',current_value:300000,mortgage_balance:120000,monthly_rent:2000},'c1');
 assert.equal(p.equity,180000);assert.equal(p.monthlyRent,2000);assert.ok(Object.isFrozen(p));
 assert.equal(projectOriginalPassportProperty({id:'p2',company_id:'c1',current_value:null},'c1').equity,null);
 assert.throws(()=>projectOriginalPassportProperty({id:'p1',company_id:'c2'},'c1'));
});
test('original equipment and maintenance records stay inside selected property',()=>{
 for(const kind of ['asset','service','maintenance','improvement']){
  const row={id:'r1',company_id:'c1',property_id:'p1',name:'HVAC',title:'New roof',cost:2000};
  const value=projectOriginalPassportChild(row,'c1','p1',kind);
  assert.equal(value.id,'r1');assert.ok(Object.isFrozen(value));
  assert.throws(()=>projectOriginalPassportChild(row,'c2','p1',kind));
  assert.throws(()=>projectOriginalPassportChild(row,'c1','p2',kind));
 }
 assert.equal(originalPassportTables.length,5);
});
