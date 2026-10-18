import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRepair,validateTask} from '../property-work.mjs';
const repair={title:'Replace water heater',status:'completed',openedOn:'2026-10-01',completedOn:'2026-10-05',estimatedCost:'800.00',actualCost:'750.50'};
test('repairs accept completed work with validated costs and dates',()=>{
 const result=validateRepair(repair);assert.equal(result.ok,true);assert.equal(result.value.actual_cost,'750.50');
});
test('repairs reject impossible dates, status, and malformed costs',()=>{
 for(const item of [{completedOn:'2026-09-30'},{completedOn:''},{openedOn:'2026-02-30'},{estimatedCost:'-1'},{actualCost:'2.001'},{status:'cancelled'},{title:' '}])assert.equal(validateRepair({...repair,...item}).ok,false,JSON.stringify(item));
});
test('tasks accept optional due dates and reject invalid fields',()=>{
 assert.deepEqual(validateTask({title:'Call plumber'}),{ok:true,value:{title:'Call plumber',status:'open',details:'',due_on:null}});
 assert.equal(validateTask({title:'Call plumber',dueOn:'2026-02-30'}).ok,false);
 assert.equal(validateTask({title:'Call plumber',status:'deleted'}).ok,false);
 assert.equal(validateTask({title:''}).ok,false);
});
