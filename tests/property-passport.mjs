import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPropertyPassport} from '../property-passport.mjs';
test('keeps property data read-only',()=>{const input={id:'a',company_id:'c',name:' Duplex ',monthly_rent:'1800'};const p=projectPropertyPassport(input,'c');assert.equal(p.name,'Duplex');assert.equal(p.monthlyRent,1800);assert.ok(Object.isFrozen(p));});
test('rejects other workspaces',()=>assert.throws(()=>projectPropertyPassport({id:'a',company_id:'other'},'c')));
test('blank is not zero',()=>assert.equal(projectPropertyPassport({id:'a',company_id:'c',monthly_rent:''},'c').monthlyRent,null));

import fs from 'node:fs';
test('Passport preview is only offered for active paid membership',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const preview=fs.readFileSync(new URL('../property-passport-preview.mjs',import.meta.url),'utf8');
 assert.match(html,/const paidActive=\(plan==='investor'\|\|plan==='pro'\)&&billingStatus==='active'/);
 assert.match(html,/setEligibility\(\{companyId:activeCompany,enabled:paidActive\}\)/);
 assert.match(preview,/if\(!eligibility.enabled\|\|eligibility.companyId!==companyId\|\|!deal\?\.id\)return/);
 assert.match(preview,/getCurrentCompany\(\)!==companyId\|\|getCurrentClient\(\)!==client/);
 assert.match(preview,/projectPropertyPassport\(record,companyId\)/);
});
