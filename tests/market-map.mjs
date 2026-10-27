import test from 'node:test';import assert from 'node:assert/strict';import {parseCoordinates,validateMarketMap,mountMarketMap,mapDisplayPositions,createLeafletMap} from '../market-map.mjs';
test('coordinates retain real zero and reject missing, nonfinite and unsupported values',()=>{assert.deepEqual(parseCoordinates('0','0'),{latitude:0,longitude:0});for(const pair of [['','0'],['NaN','0'],['86','0'],['0','181']])assert.throws(()=>parseCoordinates(...pair));assert.throws(()=>validateMarketMap({company_id:'foreign',rows:[]},'c'));});
class Node{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.value='';this.textContent='';this.disabled=false;this.listeners={};}append(...n){this.children.push(...n)}prepend(...n){this.children.unshift(...n)}replaceChildren(...n){this.children=n}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,v){this.listeners[k]=v}}
const all=n=>[n,...n.children.flatMap(all)];const dom=fn=>async()=>{const old=globalThis.document;globalThis.document={createElement:t=>new Node(t)};try{await fn()}finally{globalThis.document=old}};
function setup({canRead=true,canWrite=true,delay=false,afterSave=value=>value}={}){let scope={companyId:'c',session:{},canRead,canWrite},release,reads=0,rows=[{id:'p',company_id:'c',name:'Saved zero',address:'Private property',status:'lead',latitude:0,longitude:0}];const root=new Node('div'),streets=[],pins=[],writes=[],opened=[];let destroyed=0,pickHandler=null;const view=mountMarketMap({root,getContext:()=>scope,load:async()=>{reads++;if(delay)await new Promise(r=>release=r);return {company_id:'c',rows:structuredClone(rows)}},save:async(company,id,value)=>{writes.push({company,id,value});rows=afterSave([{...rows[0],...value}]);return {company_id:company,deal_id:id}},openProperty:async(company,id)=>opened.push({company,id}),createMap:()=>({setPickHandler:handler=>{pickHandler=handler},destroy:()=>destroyed++,setStreets:on=>streets.push(on),setPins:r=>pins.push(r)})});return {root,view,streets,pins,writes,opened,get reads(){return reads},get destroyed(){return destroyed},pick:position=>pickHandler?.(position),release:()=>release(),switch:()=>scope={...scope,companyId:'d'}};}
test('Pro gate prevents data/map calls; viewer reads without editors; street requests require click',dom(async()=>{const denied=setup({canRead:false});await denied.view.open();assert.equal(denied.reads,0);const f=setup({canWrite:false});await f.view.open();assert.equal(f.pins.at(-1).length,1);assert.equal(f.streets.length,0);assert.equal(all(f.root).filter(n=>n.tagName==='FORM').length,0);await all(f.root).find(n=>n.textContent==='Open saved property').onclick();assert.deepEqual(f.opened,[{company:'c',id:'p'}]);await all(f.root).find(n=>n.textContent==='Load street map (shares viewed area)').onclick();assert.deepEqual(f.streets,[true]);f.view.clear();assert.equal(f.destroyed,1);}));
test('verified edits save/reload exact scoped property; filtering updates pins',dom(async()=>{const f=setup();await f.view.open();const form=all(f.root).find(n=>n.tagName==='FORM'),inputs=all(form).filter(n=>n.tagName==='INPUT');inputs[0].value='36.595';inputs[1].value='-82.188';await form.onsubmit({preventDefault(){}});assert.equal(f.writes.length,0);inputs[2].checked=true;await form.onsubmit({preventDefault(){}});assert.deepEqual(f.writes,[{company:'c',id:'p',value:{latitude:36.595,longitude:-82.188}}]);const search=all(f.root).find(n=>n.type==='search');search.value='no match';search.listeners.input();assert.equal(f.pins.at(-1).length,0);}));
test('late responses cannot create maps in another workspace',dom(async()=>{const f=setup({delay:true});const p=f.view.open();f.switch();f.view.clear();f.release();await p;assert.equal(f.root.children.length,0);assert.equal(f.pins.length,0);}));

test('choosing a pin fills coordinates but requires verification before saving',dom(async()=>{const f=setup();await f.view.open();const form=all(f.root).find(n=>n.tagName==='FORM');await all(form).find(n=>n.textContent==='Choose position on map').onclick();f.pick({lat:36.59,lng:-82.18});const inputs=all(form).filter(n=>n.tagName==='INPUT');assert.equal(inputs[0].value,'36.590000');assert.equal(inputs[1].value,'-82.180000');assert.equal(f.writes.length,0);await form.onsubmit({preventDefault(){}});assert.equal(f.writes.length,0);inputs[2].checked=true;await form.onsubmit({preventDefault(){}});assert.equal(f.writes.length,1);}));


test('save readback refuses success for missing or different coordinates and preserves the draft',dom(async()=>{
 for(const afterSave of [()=>[],rows=>rows.map(r=>({...r,latitude:0})),rows=>rows.map(r=>({...r,longitude:0})),rows=>rows.map(r=>({...r,longitude:null,latitude:null}))]){
  const f=setup({afterSave});await f.view.open();const form=all(f.root).find(n=>n.tagName==='FORM'),inputs=all(form).filter(n=>n.tagName==='INPUT');inputs[0].value='36.595';inputs[1].value='-82.188';inputs[2].checked=true;await form.onsubmit({preventDefault(){}});
  assert.ok(all(f.root).some(n=>n.textContent.includes('Location saved, but refresh could not be verified: Reloaded coordinates did not match')));
  assert.ok(!all(f.root).some(n=>n.textContent==='Verified location saved and reloaded.'));assert.equal(inputs[0].value,'36.595');assert.equal(all(form).find(n=>n.type==='submit').disabled,false);
 }
}));
test('save readback accepts database six-decimal rounding including zero',dom(async()=>{
 const f=setup({afterSave:rows=>rows.map(r=>({...r,latitude:Number(r.latitude.toFixed(6)),longitude:Number(r.longitude.toFixed(6))}))});await f.view.open();const form=all(f.root).find(n=>n.tagName==='FORM'),inputs=all(form).filter(n=>n.tagName==='INPUT');inputs[0].value='0';inputs[1].value='-82.1881234';inputs[2].checked=true;await form.onsubmit({preventDefault(){}});assert.ok(all(f.root).some(n=>n.textContent==='Verified location saved and reloaded.'));
}));


test('editing either coordinate invalidates confirmation and blocks saving until reconfirmed',dom(async()=>{
 for(const changed of [0,1]){
  const f=setup();await f.view.open();const form=all(f.root).find(n=>n.tagName==='FORM'),inputs=all(form).filter(n=>n.tagName==='INPUT');inputs[2].checked=true;inputs[changed].value=changed===0?'36.59':'-82.18';inputs[changed].listeners.input();assert.equal(inputs[2].checked,false);
  await form.onsubmit({preventDefault(){}});assert.equal(f.writes.length,0);assert.ok(all(f.root).some(n=>n.textContent==='Confirm that you verified this property location.'));
  inputs[2].checked=true;await form.onsubmit({preventDefault(){}});assert.equal(f.writes.length,1);
 }
}));


test('map display fits the shortest longitude arc without changing saved coordinates or property order',()=>{
 const rows=[{latitude:12,longitude:179},{latitude:-8,longitude:-179},{latitude:0,longitude:178}];const original=structuredClone(rows),points=mapDisplayPositions(rows);assert.deepEqual(rows,original);assert.deepEqual(points.map(p=>p[0]),[12,-8,0]);assert.equal(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])),3);
 for(let i=0;i<rows.length;i++)assert.equal(((points[i][1]-rows[i].longitude)%360+360)%360,0);
 assert.deepEqual(mapDisplayPositions([]),[]);assert.deepEqual(mapDisplayPositions([{latitude:36,longitude:-82}]),[[36,-82]]);assert.deepEqual(mapDisplayPositions([{latitude:0,longitude:-180},{latitude:1,longitude:180}]),[[0,-180],[1,-180]]);
 const local=mapDisplayPositions([{latitude:35,longitude:-83},{latitude:36,longitude:-82}]);assert.deepEqual(local,[[35,-83],[36,-82]]);
});


test('Leaflet markers and fitted bounds share the wrapped positions and keep exact property routes',dom(async()=>{
 const markerPoints=[],popups=[],opened=[];let bounds;const instance={setView(){return this},on(){},fitBounds(points){bounds=points},invalidateSize(){},remove(){}};
 const layer={addTo(){return this},clearLayers(){}};const L={map:()=>instance,layerGroup:()=>layer,circleMarker:point=>{markerPoints.push(point);return {bindPopup(popup){popups.push(popup);return this},addTo(){return this}}}};
 const adapter=createLeafletMap(new Node('div'),L),rows=[{id:'east',name:'East',latitude:1,longitude:179},{id:'west',name:'West',latitude:2,longitude:-179}];adapter.setPins(rows,row=>opened.push(row.id));assert.deepEqual(markerPoints,bounds);assert.equal(Math.abs(bounds[1][1]-bounds[0][1]),2);popups[1].children[1].onclick();assert.deepEqual(opened,['west']);
}));
