import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginalPassportForm} from '../original-passport-forms.mjs';

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
