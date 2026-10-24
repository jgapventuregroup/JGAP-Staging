import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPropertyPassport} from '../property-passport.mjs';
test('keeps property data read-only',()=>{const input={id:'a',company_id:'c',name:' Duplex ',monthly_rent:'1800'};const p=projectPropertyPassport(input,'c');assert.equal(p.name,'Duplex');assert.equal(p.monthlyRent,1800);assert.ok(Object.isFrozen(p));});
test('rejects other workspaces',()=>assert.throws(()=>projectPropertyPassport({id:'a',company_id:'other'},'c')));
test('blank is not zero',()=>assert.equal(projectPropertyPassport({id:'a',company_id:'c',monthly_rent:''},'c').monthlyRent,null));

import fs from 'node:fs';
test('Passport preview requires active paid membership or server-authorized owner preview',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const preview=fs.readFileSync(new URL('../property-passport-preview.mjs',import.meta.url),'utf8');
 assert.match(html,/const paidActive=\(plan==='investor'\|\|plan==='pro'\)&&billingStatus==='active'/);
 assert.match(html,/has_owner_preview_access/);
 assert.match(html,/setEligibility\(\{companyId:activeCompany,enabled:passportRecordsAllowed\}\)/);
 assert.match(preview,/if\(!eligibility.enabled\|\|eligibility.companyId!==companyId\|\|!deal\?\.id\)return/);
 assert.match(preview,/getCurrentCompany\(\)!==companyId\|\|getCurrentClient\(\)!==client/);
 assert.match(preview,/projectPropertyPassport\(record,companyId\)/);
});

test('Passport equity needs both market value and mortgage balance',()=>{
 const base={id:'a',company_id:'c',arv:300000,purchase_price:180000};
 assert.equal(projectPropertyPassport(base,'c').equity,null,'ARV cannot be treated as market value');
 assert.equal(projectPropertyPassport({...base,passport_current_value:240000},'c').equity,null,'Unknown mortgage is not zero');
 const record=projectPropertyPassport({...base,passport_current_value:'240000',passport_mortgage_balance:'175000',passport_purchase_date:'2025-05-01'},'c');
 assert.equal(record.equity,65000);assert.equal(record.purchaseDate,'2025-05-01');
 assert.equal(projectPropertyPassport({...base,passport_current_value:0,passport_mortgage_balance:0},'c').equity,0);
});
