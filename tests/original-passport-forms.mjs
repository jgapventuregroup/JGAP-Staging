import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginalPassportForm,createPassportSystemForm} from '../original-passport-forms.mjs';

function fakeElement(tag){
 const node={tag,children:[],attributes:{},disabled:false,value:'',name:'',options:[],
 append(child){this.children.push(child);if(this.tag==='select'&&child.tag==='option')this.options.push(child);child.parentNode=this},
 setAttribute(name,value){this.attributes[name]=value},
 addEventListener(name,fn){this.listeners??={};this.listeners[name]=fn},
 get elements(){return {namedItem:name=>{const inputs=[];const visit=n=>{if(n.name===name)inputs.push(n);for(const c of n.children)visit(c)};visit(this);return inputs[0]??null}}},
 reset(){},
 };
 return node;
}
test('service schedule cannot be saved before equipment exists',()=>{
 const old=globalThis.document;globalThis.document={createElement:fakeElement};
 try{
  const form=createOriginalPassportForm('service',async()=>{});
  const submit=form.children.find(n=>n.tag==='button');
  assert.equal(submit.disabled,true);
  assert.match(form.children.find(n=>n.attributes['data-service-guidance']!==undefined).textContent,/Add equipment first/);
  const select=form.elements.namedItem('asset_id');assert.equal(select.options.length,1);
 }finally{globalThis.document=old}
});
test('service schedule accepts equipment options and enables save',()=>{
 const old=globalThis.document;globalThis.document={createElement:fakeElement};
 try{
  const form=createOriginalPassportForm('service',async()=>{},{assets:[{id:'asset-1',name:'Furnace'}]});
  assert.equal(form.children.find(n=>n.tag==='button').disabled,false);
  assert.equal(form.elements.namedItem('asset_id').options[1].value,'asset-1');
 }finally{globalThis.document=old}
});

test('Passport form rejects repeated submits while first save is pending',async()=>{
 const old=globalThis.document;globalThis.document={createElement:fakeElement};
 try{
  let release;let saves=0;
  const form=createOriginalPassportForm('asset',async()=>{saves++;await new Promise(resolve=>{release=resolve})});
  form.elements.namedItem('name').value='Boiler';
  const event={preventDefault(){}};
  const first=form.listeners.submit(event);
  await form.listeners.submit(event);
  assert.equal(saves,1);
  release();await first;
  assert.equal(form.children.find(n=>n.tag==='button').disabled,false);
 }finally{globalThis.document=old}
});

test('combined Passport form collects equipment and optional first service schedule',async()=>{
 const old=globalThis.document;globalThis.document={createElement:fakeElement};
 try{
  let submitted;
  const form=createPassportSystemForm(async values=>{submitted=values});
  form.elements.namedItem('name').value='Water heater';
  form.elements.namedItem('service_name').value='Flush tank';
  form.elements.namedItem('frequency_value').value='1';
  await form.listeners.submit({preventDefault(){}});
  assert.equal(submitted.assetValues.name,'Water heater');
  assert.equal(submitted.serviceValues.service_name,'Flush tank');
  assert.equal(submitted.serviceValues.frequency_value,1);
 }finally{globalThis.document=old}
});
test('combined Passport form blocks resubmission after partial equipment save',async()=>{
 const old=globalThis.document;globalThis.document={createElement:fakeElement};
 try{
  let saves=0;
  const form=createPassportSystemForm(async()=>{saves++;const error=new Error('Schedule rejected');error.partialSave=true;throw error});
  form.elements.namedItem('name').value='Water heater';
  await form.listeners.submit({preventDefault(){}});
  const submit=form.children.find(n=>n.tag==='button');
  assert.equal(submit.disabled,true);
  await form.listeners.submit({preventDefault(){}});
  assert.equal(saves,1);
 }finally{globalThis.document=old}
});
