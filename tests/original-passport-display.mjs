import test from 'node:test';import assert from 'node:assert/strict';import {describePassportEntry} from '../original-passport-display.mjs';
test('equipment shows condition and warranty',()=>{assert.match(describePassportEntry('asset',{name:'Furnace',condition:'good',warranty_expiration:'2028-04-01'}),/Warranty until 2028-04-01/)});
test('service shows next service date',()=>{assert.match(describePassportEntry('service',{service_name:'Filter',next_service_date:'2026-12-01'}),/Next 2026-12-01/)});
test('maintenance formats zero cost',()=>{assert.match(describePassportEntry('maintenance',{title:'Inspection',cost:0}),/\$0\.00/)});
test('unknown kind is rejected',()=>assert.throws(()=>describePassportEntry('other',{}),/Unknown/));

test('equipment displays installed date from original Passport',()=>{assert.match(describePassportEntry('asset',{name:'Water heater',installed_date:'2024-03-10'}),/Installed 2024-03-10/)});
test('service displays instructions',()=>{assert.match(describePassportEntry('service',{service_name:'Drain tank',notes:'Flush yearly'}),/Notes Flush yearly/)});
test('maintenance displays description and contractor',()=>{const label=describePassportEntry('maintenance',{title:'Repair',description:'Replace valve',performed_by:'Plumber'});assert.match(label,/Replace valve/);assert.match(label,/By Plumber/)});
test('improvement displays description',()=>{assert.match(describePassportEntry('improvement',{title:'New flooring',description:'Living room vinyl'}),/Living room vinyl/)});
