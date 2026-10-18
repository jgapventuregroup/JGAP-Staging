import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePropertyOperations} from '../property-operations.mjs';
test('property operations combines real transaction totals and work counts',()=>{
 assert.deepEqual(summarizePropertyOperations({
 ledger:[{entry_type:'income',amount:'1600.00'},{entry_type:'expense',amount:'450.00'}],
 repairs:[{status:'open',estimated_cost:'400.00',actual_cost:null},{status:'completed',estimated_cost:'100.00',actual_cost:'95.50'}],
 tasks:[{status:'open'},{status:'done'}]
 }),{cashFlow:{income:1600,expenses:450,net:1150},repairs:{open:1,completed:1,estimatedCost:500,actualCost:95.5},tasks:{open:1,done:1}});
});
test('property operations accepts empty property history',()=>{
 assert.deepEqual(summarizePropertyOperations(),{cashFlow:{income:0,expenses:0,net:0},repairs:{open:0,completed:0,estimatedCost:0,actualCost:0},tasks:{open:0,done:0}});
});
test('property operations rejects invalid repair and task data',()=>{
 assert.throws(()=>summarizePropertyOperations({repairs:[{status:'invalid'}]}),/Invalid repair status/);
 assert.throws(()=>summarizePropertyOperations({repairs:[{status:'open',actual_cost:'1.001'}]}),/Invalid repair cost/);
 assert.throws(()=>summarizePropertyOperations({tasks:[{status:'invalid'}]}),/Invalid task status/);
});

test('overdue tasks require an explicit as-of date and ignore completed tasks',()=>{
 const tasks=[{status:'open',due_on:'2026-10-10'},{status:'open',due_on:'2026-10-18'},{status:'done',due_on:'2026-10-01'}];
 assert.deepEqual(summarizePropertyOperations({tasks,asOfDate:'2026-10-18'}).tasks,{open:2,done:1,overdue:1});
 assert.deepEqual(summarizePropertyOperations({tasks}).tasks,{open:2,done:1});
});

test('overdue reporting rejects impossible dates',()=>{
 assert.throws(()=>summarizePropertyOperations({asOfDate:'2026-02-30'}),/Invalid reference date/);
 assert.throws(()=>summarizePropertyOperations({asOfDate:'2026-10-18',tasks:[{status:'open',due_on:'2026-02-30'}]}),/Invalid task due date/);
});
