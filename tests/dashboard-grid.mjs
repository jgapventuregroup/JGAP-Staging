import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {GRID_IDS,defaultGrid,validateGrid,readGridResponse,packGrid,mountDashboardGrid} from '../dashboard-grid.mjs';
const response=(items=defaultGrid(),stamp='2026-10-28T12:00:00Z')=>({company_id:'c',user_id:'u',version:2,layout:items,updated_at:stamp});
test('grid model validates safe geometry and migrates legacy order/visibility without deleting data',()=>{
 assert.deepEqual(validateGrid(defaultGrid()),defaultGrid());const old={...response(null,null),widget_order:['follow_ups','tools','metrics','recent_properties'],hidden_widgets:['metrics']};const converted=readGridResponse(old,'c');assert.equal(converted.items.find(i=>i.id==='metrics').hidden,true);assert.ok(converted.items.find(i=>i.id==='follow_ups').y<converted.items.find(i=>i.id==='analyzer').y);
 for(const mutate of [l=>l[0].x=NaN,l=>l[0].w=13,l=>l[0].y=-1,l=>l[0].content='secret',l=>l[0].id='properties',l=>l.forEach(i=>i.hidden=true)]){const l=defaultGrid();mutate(l);assert.throws(()=>validateGrid(l));}
 assert.throws(()=>readGridResponse(response(),'wrong'));assert.throws(()=>readGridResponse(response(),'c','wrong'));const packed=packGrid(defaultGrid(),'properties',0);assert.equal(packed.find(i=>i.id==='properties').x,0);assert.equal(packed.find(i=>i.id==='analyzer').x,6);
});
class Node{constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.textContent='';this.hidden=false;this.disabled=false;}append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}replaceChildren(...nodes){this.children=[];this.append(...nodes);}setAttribute(k,v){this.attributes[k]=v;}remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}querySelector(s){return this.children.flatMap(all).find(n=>s==='.'+n.className)||null;}focus(){this.focused=true;}}
const all=n=>[n,...n.children.flatMap(all)];
const dom=fn=>async()=>{const previous=globalThis.document;globalThis.document={createElement:t=>new Node(t)};try{await fn();}finally{globalThis.document=previous;}};
function setup({allowed=true,failSave=false,failVerify=false,defer=false}={}){
 const root=new Node('div'),elements=Object.fromEntries(GRID_IDS.map(id=>{const e=new Node('section'),c=new Node('div'),h=new Node('button');c.className='dashboard-card-controls';h.className='dashboard-grid-handle';c.append(h);e.append(c);return[id,e];}));let state=defaultGrid(),stored=response(),counter=0,scope={companyId:'c',session:{},canCustomize:allowed},onDrop,release;const calls=[];
 const adapter={elements,apply:items=>state=structuredClone(items),capture:()=>structuredClone(state),setEditing:value=>adapter.editing=value,resize(){}};
 const view=mountDashboardGrid({root,getContext:()=>scope,makeGrid:cb=>{onDrop=cb;return adapter;},read:async()=>{counter++;if(defer)return new Promise(r=>release=()=>r(stored));if(failVerify&&counter>1)throw Error('Read unavailable');return structuredClone(stored);},save:async(company,data)=>{calls.push(structuredClone(data));if(failSave)throw Error('Write denied');stored=response(data.items,'2026-10-28T12:00:0'+calls.length+'Z');return structuredClone(stored);}});
 const button=name=>all(root).find(n=>n.textContent===name);return {root,view,adapter,calls,elements,button,release:()=>release(),drop:async items=>{state=items;onDrop();await new Promise(r=>setTimeout(r,0));},switch:()=>scope={...scope,companyId:'other'}};
}
test('prominent arrangement saves individual box geometry, reloads, undo and defaults',dom(async()=>{
 const f=setup();await f.view.load();assert.equal(f.adapter.editing,false);f.button('Arrange dashboard · Pro').onclick();assert.equal(f.adapter.editing,true);let moved=defaultGrid();moved[0].x=6;moved[1].x=0;await f.drop(moved);assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].items,moved);assert.ok(all(f.root).some(n=>n.textContent==='Dashboard saved and verified.'));
 await f.button('Undo last change').onclick();await new Promise(r=>setTimeout(r,0));assert.deepEqual(f.adapter.capture(),defaultGrid());await f.drop(moved);await f.view.load();assert.deepEqual(f.adapter.capture(),moved);await f.button('Restore defaults').onclick();await new Promise(r=>setTimeout(r,0));assert.deepEqual(f.adapter.capture(),defaultGrid());
}));
test('failed saves restore verified positions, while uncertain writes lock until reload',dom(async()=>{
 for(const [key,blocked] of [['failSave',false],['failVerify',true]]){const f=setup({[key]:true});await f.view.load();f.button('Arrange dashboard · Pro').onclick();const moved=defaultGrid();moved[0].y=10;await f.drop(moved);assert.equal(f.adapter.editing,false===blocked);assert.equal(f.button('Arrange dashboard · Pro').disabled,blocked);if(!blocked){assert.deepEqual(f.adapter.capture(),defaultGrid());assert.equal(f.button('Retry last change').hidden,false);}else assert.match(all(f.root).find(n=>n.attributes.role==='status').textContent,/verification failed/);}
}));
test('non-Pro and late workspace reads cannot expose or write preferences',dom(async()=>{
 const denied=setup({allowed:false});await denied.view.load();assert.equal(denied.root.hidden,true);assert.equal(denied.calls.length,0);
 const late=setup({defer:true});const pending=late.view.load();late.switch();late.view.clear();late.release();await pending;assert.equal(late.root.hidden,true);assert.deepEqual(late.adapter.capture(),defaultGrid());
 const f=setup();await f.view.load();const stale=f.button('Restore defaults');f.switch();stale.onclick();assert.equal(f.calls.length,0);
}));
test('grid vendor assets are pinned, locally bundled and never persist rendered content',()=>{
 for(const [bundled,source] of [['gridstack.js','dist/gridstack-all.js'],['gridstack.css','dist/gridstack.min.css'],['gridstack-LICENSE.txt','LICENSE']])assert.equal(fs.readFileSync(new URL('../'+bundled,import.meta.url),'utf8'),fs.readFileSync(new URL('../node_modules/gridstack/'+source,import.meta.url),'utf8'));
 const source=fs.readFileSync(new URL('../dashboard-grid.mjs',import.meta.url),'utf8');assert.ok(source.includes('grid.save(false)'));assert.ok(source.includes('acceptWidgets:false'));assert.ok(source.includes("cancel:'input,textarea,select,option,a,.dashboard-card-action'"));
});
