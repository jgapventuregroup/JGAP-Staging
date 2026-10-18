import test from 'node:test';import assert from 'node:assert/strict';import {describePassportEntry} from '../original-passport-display.mjs';
test('equipment shows condition and warranty',()=>{assert.match(describePassportEntry('asset',{name:'Furnace',condition:'good',warranty_expiration:'2028-04-01'}),/Warranty until 2028-04-01/)});
test('service shows next service date',()=>{assert.match(describePassportEntry('service',{service_name:'Filter',next_service_date:'2026-12-01'}),/Next 2026-12-01/)});
test('maintenance formats zero cost',()=>{assert.match(describePassportEntry('maintenance',{title:'Inspection',cost:0}),/\$0\.00/)});
test('unknown kind is rejected',()=>assert.throws(()=>describePassportEntry('other',{}),/Unknown/));
