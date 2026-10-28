import test from 'node:test';import assert from 'node:assert/strict';
import {DASHBOARD_WIDGETS,defaultDashboardLayout,validateDashboardLayout,validateDashboardResponse,applyDashboardLayout,mountDashboardCustomization,moveDashboardWidget,installDashboardDragging} from '../dashboard-customization.mjs';
const custom={widget_order:['follow_ups','tools','metrics','recent_properties'],hidden_widgets:['metrics']};
const response=(layout=custom,company='company-A',user='user-A')=>({company_id:company,user_id:user,version:1,updated_at:'2026-10-26T12:00:00Z',...layout});
test('dashboard layout validates exact keys, one visible section and response identity',()=>{
 assert.deepEqual(validateDashboardLayout(custom),custom);
 for(const value of [{...custom,widget_order:['tools','tools','metrics','follow_ups']},{...custom,hidden_widgets:DASHBOARD_WIDGETS},{...custom,hidden_widgets:['billing']},{...custom,hidden_widgets:['tools','tools']},{...custom,widget_order:null}])assert.throws(()=>validateDashboardLayout(value));
 assert.throws(()=>validateDashboardResponse(response(custom,'other'),'company-A'));assert.throws(()=>validateDashboardResponse(response(custom,'company-A','other'),'company-A','user-A'));
});
class Node{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.textContent='';this.isConnected=true;this.hidden=false;this.disabled=false;}append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}}prepend(...nodes){for(const node of nodes)node.parent=this;this.children.unshift(...nodes)}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)}getAttribute(k){return this.attributes[k]}replaceChildren(...nodes){this.children=nodes}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,v){this.listeners[k]=v}focus(){this.focused=true}}
const all=n=>[n,...n.children.flatMap(all)];const dom=fn=>async()=>{const old=globalThis.document;globalThis.document={createElement:t=>new Node(t)};try{await fn()}finally{globalThis.document=old}};
test('dashboard applies real DOM order at fixed slots, keeps static content and resets defaults',()=>{
 const children=[],slots=DASHBOARD_WIDGETS.map((key,i)=>({key:'slot-'+key,after(node){const old=children.indexOf(node);if(old>=0)children.splice(old,1);children.splice(children.indexOf(this)+1,0,node);}})),widgets=Object.fromEntries(DASHBOARD_WIDGETS.map(key=>[key,{key,hidden:false}])),staticNodes=[{key:'company-selector'},{key:'membership'},{key:'ad-placement'}];
 children.push(slots[0],widgets.tools,staticNodes[0],slots[1],widgets.metrics,staticNodes[1],staticNodes[2],slots[2],widgets.recent_properties,slots[3],widgets.follow_ups);
 applyDashboardLayout(custom,{slots,widgets});assert.deepEqual(children.filter(n=>DASHBOARD_WIDGETS.includes(n.key)).map(n=>n.key),custom.widget_order);assert.equal(widgets.metrics.hidden,true);assert.ok(staticNodes.every(n=>children.includes(n)&&n.hidden!==true));
 applyDashboardLayout(defaultDashboardLayout(),{slots,widgets});assert.deepEqual(children.filter(n=>DASHBOARD_WIDGETS.includes(n.key)).map(n=>n.key),DASHBOARD_WIDGETS);assert.ok(Object.values(widgets).every(n=>n.hidden===false));
});
function setup({canCustomize=true,readFailure=false,saveFailure=false,verifyFailure=false,deferred=false,initialLayout=custom}={}){
 const root=new Node('div'),widgets=Object.fromEntries(DASHBOARD_WIDGETS.map(k=>[k,new Node('section')])),applied=[],calls=[];let scope={companyId:'company-A',canCustomize,session:{}},stored=response(initialLayout),reads=0,release;
 const view=mountDashboardCustomization({root,widgets,getContext:()=>scope,apply:l=>applied.push(validateDashboardLayout(l)),read:async company=>{reads++;if(readFailure||verifyFailure&&reads>1)throw Error('Network unavailable');if(deferred)return await new Promise(resolve=>release=()=>resolve(stored));return structuredClone(stored);},save:async(company,layout)=>{calls.push({company,layout:structuredClone(layout)});if(saveFailure)throw Error('Write denied');stored=response(structuredClone(layout));return stored;}});
 return {root,widgets,view,applied,calls,release:()=>release(),switchCompany:()=>scope={...scope,companyId:'company-B'},switchAccount:()=>scope={...scope,session:{}},scope};
}
test('non-Pro dashboard retains defaults with no preference read or editor',dom(async()=>{
 const f=setup({canCustomize:false});await f.view.load();assert.equal(f.root.hidden,true);assert.equal(f.root.children.length,0);assert.deepEqual(f.applied.at(-1),defaultDashboardLayout());assert.equal(f.calls.length,0);
}));
test('saved layout reopens, reorders, verifies persistence and restores defaults without deletion',dom(async()=>{
 const f=setup();await f.view.load();assert.deepEqual(f.applied.at(-1),custom);
 const arrangement=all(f.root).find(n=>n.tagName==='DETAILS');arrangement.open=true;arrangement.ontoggle();await f.widgets.tools.children[0].listeners.keydown({key:'ArrowUp',altKey:true,preventDefault(){}});assert.deepEqual(f.calls[0].layout.widget_order,['tools','follow_ups','metrics','recent_properties']);assert.ok(all(f.root).some(n=>n.textContent==='Dashboard layout saved and verified.'));
 await f.view.load();assert.deepEqual(f.applied.at(-1).widget_order,['tools','follow_ups','metrics','recent_properties']);await all(f.root).find(n=>n.textContent==='Restore default dashboard').onclick();assert.deepEqual(f.applied.at(-1),defaultDashboardLayout());
}));
test('save errors preserve drafts; persisted but unverified layouts require reload',dom(async()=>{
 const failed=setup({saveFailure:true});await failed.view.load();const arrangement=all(failed.root).find(n=>n.tagName==='DETAILS');arrangement.open=true;arrangement.ontoggle();await failed.widgets.tools.children[0].listeners.keydown({key:'ArrowUp',altKey:true,preventDefault(){}});assert.match(all(failed.root).find(n=>n.attributes.role==='status').textContent,/draft is retained/);assert.deepEqual(failed.applied.at(-1).widget_order,['tools','follow_ups','metrics','recent_properties']);assert.equal(all(failed.root).filter(n=>n.type==='checkbox')[0].checked,true);
 const partial=setup({verifyFailure:true});await partial.view.load();await all(partial.root).find(n=>n.textContent==='Save dashboard layout').onclick();assert.match(all(partial.root).find(n=>n.attributes.role==='status').textContent,/saved, but could not be verified/);assert.equal(all(partial.root).find(n=>n.textContent==='Save dashboard layout').disabled,true);
}));
test('layout reads cannot apply after company or account changes; load failures show defaults',dom(async()=>{
 for(const method of ['switchCompany','switchAccount']){const f=setup({deferred:true});const pending=f.view.load();f[method]();f.view.clear();f.release();await pending;assert.equal(f.root.hidden,true);assert.deepEqual(f.applied.at(-1),defaultDashboardLayout());}
 const failed=setup({readFailure:true});await failed.view.load();assert.deepEqual(failed.applied.at(-1),defaultDashboardLayout());assert.ok(all(failed.root).some(n=>n.textContent.includes('Default dashboard shown')));
}));

test('dashboard keeps one visible section and suppresses repeated save clicks',dom(async()=>{
 const f=setup({initialLayout:{widget_order:[...DASHBOARD_WIDGETS],hidden_widgets:['tools','metrics','recent_properties']}});await f.view.load();const visible=all(f.root).filter(n=>n.type==='checkbox').at(-1);visible.checked=false;visible.listeners.change();assert.equal(visible.checked,true);assert.ok(all(f.root).some(n=>n.textContent==='Keep at least one dashboard section visible.'));
 const button=all(f.root).find(n=>n.textContent==='Save dashboard layout');const pending=button.onclick();await button.onclick();await pending;assert.equal(f.calls.length,1);
}));


test('direct dashboard drag supports mouse/touch, cancellation and locked access without list controls',dom(async()=>{
 const widgets=Object.fromEntries(DASHBOARD_WIDGETS.map(key=>[key,new Node('section')]));let order=[...DASHBOARD_WIDGETS],saved=0,canceled=0,allowed=true,target='follow_ups';
 const controls=installDashboardDragging({widgets,canMove:()=>allowed,findTarget:()=>target,onMove:(key,to)=>order=moveDashboardWidget(order,key,to),onDrop:()=>saved++,onCancel:()=>canceled++,onKeyboard(){}});
 const handle=widgets.tools.children[0],event=(x,y)=>({button:0,pointerId:1,isPrimary:true,clientX:x,clientY:y,preventDefault(){}});controls.show(true);assert.equal(handle.hidden,false);
 handle.listeners.pointerdown(event(0,0));handle.listeners.pointermove(event(1,1));handle.listeners.pointerup(event(1,1));assert.equal(saved,0,'Simple clicks must not save a layout');
 handle.listeners.pointerdown(event(0,0));handle.listeners.pointermove(event(0,50));handle.listeners.pointerup(event(0,50));assert.deepEqual(order,['metrics','recent_properties','follow_ups','tools']);assert.equal(saved,1);
 target='metrics';handle.listeners.pointerdown(event(0,0));handle.listeners.pointermove(event(0,50));handle.listeners.pointercancel();assert.equal(canceled,1);assert.equal(saved,1);
 allowed=false;handle.listeners.pointerdown(event(0,0));handle.listeners.pointermove(event(0,50));handle.listeners.pointerup(event(0,50));assert.equal(saved,1);
 controls.destroy();assert.equal(widgets.tools.children.length,0);
}));
test('arrangement is optional, preserves workspace isolation and removes handles on clear',dom(async()=>{
 const f=setup();await f.view.load();const handle=f.widgets.tools.children[0];assert.equal(handle.hidden,true);assert.ok(!all(f.root).some(n=>n.textContent==='Move Your tools up'));
 const disclosure=all(f.root).find(n=>n.tagName==='DETAILS');disclosure.open=true;disclosure.ontoggle();assert.equal(handle.hidden,false);f.switchCompany();await handle.listeners.keydown({key:'ArrowUp',altKey:true,preventDefault(){}});assert.equal(f.calls.length,0);f.view.clear();assert.equal(f.widgets.tools.children.length,0);
}));
