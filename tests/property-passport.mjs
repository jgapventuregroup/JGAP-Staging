import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPropertyPassport} from '../property-passport.mjs';
test('keeps property data read-only',()=>{const input={id:'a',company_id:'c',name:' Duplex ',monthly_rent:'1800'};const p=projectPropertyPassport(input,'c');assert.equal(p.name,'Duplex');assert.equal(p.monthlyRent,1800);assert.ok(Object.isFrozen(p));});
test('rejects other workspaces',()=>assert.throws(()=>projectPropertyPassport({id:'a',company_id:'other'},'c')));
test('blank is not zero',()=>assert.equal(projectPropertyPassport({id:'a',company_id:'c',monthly_rent:''},'c').monthlyRent,null));
