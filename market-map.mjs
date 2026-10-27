// Use the smallest longitude arc for display; saved coordinates remain unchanged.
export function mapDisplayPositions(rows){
 if(!rows.length)return [];
 const longitudes=rows.map(row=>((Number(row.longitude)%360)+360)%360).sort((a,b)=>a-b);let gap=-1,start=longitudes[0];
 for(let i=0;i<longitudes.length;i++){const next=i+1<longitudes.length?longitudes[i+1]:longitudes[0]+360,distance=next-longitudes[i];if(distance>gap){gap=distance;start=next%360;}}
 const points=rows.map(row=>{let longitude=((Number(row.longitude)%360)+360)%360;if(longitude<start)longitude+=360;return [Number(row.latitude),longitude];});
 const center=(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2,shift=Math.floor((center+180)/360)*360;
 return points.map(([latitude,longitude])=>[latitude,longitude-shift]);
}
export function parseCoordinates(latitude,longitude){
 const values=[latitude,longitude].map(v=>String(v??'').trim());if(values.some(v=>!v))throw Error('Enter both verified coordinates.');
 const [lat,lng]=values.map(Number);if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat< -85||lat>85||lng< -180||lng>180)throw Error('Latitude must be -85 to 85; longitude must be -180 to 180.');return {latitude:lat,longitude:lng};
}
export function validateMarketMap(data,company){
 if(data?.company_id!==company||!Array.isArray(data.rows))throw Error('Map workspace response did not match');const ids=new Set();
 for(const row of data.rows){if(!row.id||ids.has(row.id)||row.company_id!==company)throw Error('Map property response did not match');ids.add(row.id);if(row.latitude!==null||row.longitude!==null)parseCoordinates(row.latitude,row.longitude);}return data.rows;
}
export function mountMarketMap({root,getContext,load,save,openProperty,createMap}){
 let generation=0,map=null;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const clear=()=>{generation++;map?.destroy();map=null;root.replaceChildren();};
 const open=async()=>{
  clear();const scope=getContext(),ticket=generation;if(!scope)return;const current=()=>generation===ticket&&getContext()?.companyId===scope.companyId&&getContext()?.session===scope.session;
  const message=el('p');message.setAttribute('role','status');root.append(message);if(!scope.canRead){message.textContent='Market Map requires active Pro access.';return;}message.textContent='Loading saved property locations…';
  try{
   let rows=validateMarketMap(await load(scope.companyId),scope.companyId);if(!current())return;
   const count=el('p');root.append(count);const filterLabel=el('label','Find a saved property');filterLabel.setAttribute('for','map-search');const search=el('input');search.id='map-search';search.type='search';root.append(filterLabel,search);
   const canvas=el('div');canvas.className='market-map-canvas';canvas.setAttribute('aria-label','Saved property pins; equivalent property list below');root.append(canvas);map=createMap(canvas);const ownMap=map;
   const streets=el('button','Load street map (shares viewed area)');streets.type='button';root.append(el('p','Pins stay local. Loading streets sends map-area requests and your IP address to OpenStreetMap. Property names and records are not sent. Street tiles are optional.'),streets);
   let streetsOn=false;streets.onclick=()=>{if(!current())return;try{streetsOn=!streetsOn;ownMap.setStreets(streetsOn);streets.textContent=streetsOn?'Hide street map':'Load street map (shares viewed area)';message.textContent=streetsOn?'Street map enabled for this view.':'Street map off. Already requested tiles cannot be recalled.';}catch(error){streetsOn=false;message.textContent='Street map unavailable: '+error.message;}};
   const list=el('div');root.append(list);const navigate=async row=>{if(!current())return;try{await openProperty(scope.companyId,row.id);}catch(error){if(current())message.textContent='Could not open property: '+error.message;}};
   const render=()=>{
    if(!current())return;const query=search.value.trim().toLocaleLowerCase();const visible=rows.filter(r=>[r.name,r.address,r.status].some(v=>String(v??'').toLocaleLowerCase().includes(query)));const pinned=visible.filter(r=>r.latitude!==null&&r.longitude!==null);
    ownMap.setPickHandler(null);count.textContent=pinned.length+' mapped · '+(visible.length-pinned.length)+' without verified coordinates · '+visible.length+' matching properties';list.replaceChildren();ownMap.setPins(pinned,navigate);
    for(const row of visible){
     const card=el('article');card.className='metric';card.append(el('h2',row.name||'Saved property'),el('p',row.address||'No separate address recorded'),el('p','Stage: '+row.status));
     const openButton=el('button','Open saved property');openButton.type='button';openButton.onclick=()=>navigate(row);card.append(openButton);
     card.append(el('p',row.latitude===null?'Location not recorded.':row.latitude+', '+row.longitude+' · Manually verified location'));
     if(scope.canWrite){
      const form=el('form');const lat=el('input'),lng=el('input');for(const [input,name,value] of [[lat,'Latitude',row.latitude],[lng,'Longitude',row.longitude]]){input.type='number';input.step='0.000001';input.value=value===null?'':String(value);input.setAttribute('aria-label',name+' for '+row.name);input.min=name==='Latitude'?'-85':'-180';input.max=name==='Latitude'?'85':'180';form.append(input);}
      const verify=el('input');verify.type='checkbox';const label=el('label','I verified these coordinates for this property.');label.prepend(verify);form.append(label);for(const input of [lat,lng])input.addEventListener('input',()=>{verify.checked=false;});
      const pick=el('button','Choose position on map');pick.type='button';pick.onclick=()=>{if(!current())return;ownMap.setPickHandler(position=>{if(!current())return;lat.value=Number(position.lat).toFixed(6);lng.value=Number(position.lng).toFixed(6);verify.checked=false;message.textContent='Position selected for '+row.name+'. Verify the location and save it below.';form.scrollIntoView?.({block:'center',behavior:'smooth'});});message.textContent='Click the map to choose a position for '+row.name+'. Nothing is saved until you confirm.';canvas.scrollIntoView?.({block:'center',behavior:'smooth'});};form.append(pick);
      const button=el('button','Save verified location');button.type='submit';form.append(button);form.onsubmit=async event=>{event.preventDefault();if(button.disabled||!current())return;let coordinates;try{coordinates=parseCoordinates(lat.value,lng.value);if(!verify.checked)throw Error('Confirm that you verified this property location.');}catch(error){message.textContent=error.message;return;}button.disabled=true;let saved=false;try{const result=await save(scope.companyId,row.id,coordinates);saved=true;if(!current())return;if(result?.company_id!==scope.companyId||result?.deal_id!==row.id)throw Error('Saved location response did not match');const reloaded=validateMarketMap(await load(scope.companyId),scope.companyId);if(!current())return;const persisted=reloaded.find(item=>item.id===row.id);if(!persisted||persisted.latitude===null||persisted.longitude===null||Math.abs(Number(persisted.latitude)-coordinates.latitude)>0.00000051||Math.abs(Number(persisted.longitude)-coordinates.longitude)>0.00000051)throw Error('Reloaded coordinates did not match the submitted location. Reopen the map to check the saved position.');rows=reloaded;message.textContent='Verified location saved and reloaded.';render();}catch(error){if(current())message.textContent=(saved?'Location saved, but refresh could not be verified: ':'Could not save location: ')+error.message;}finally{if(current())button.disabled=false;}};card.append(form);
     }list.append(card);
    }if(!visible.length)list.append(el('p','No saved properties match.'));
   };search.addEventListener('input',render);render();message.textContent='Saved property map loaded. Locations are user-verified, not an automated survey or market valuation.';
  }catch(error){if(current()){map?.destroy();map=null;root.replaceChildren(message);message.textContent='Could not load Market Map: '+error.message;}}
 };
 return {open,clear};
}
export function createLeafletMap(canvas,L){
 if(!L?.map)throw Error('Local map library unavailable');const map=L.map(canvas,{worldCopyJump:true,scrollWheelZoom:false}).setView([39,-96],4),pins=L.layerGroup().addTo(map);let streets=null,pickHandler=null;map.on('click',event=>pickHandler?.(event.latlng));
 return {setPickHandler:handler=>{pickHandler=handler;},destroy:()=>map.remove(),setStreets:on=>{if(on&&!streets){streets=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'});streets.on('tileerror',()=>{canvas.setAttribute('aria-description','Street tiles could not load; saved pins and the property list remain available.');});streets.addTo(map);}else if(!on&&streets){map.removeLayer(streets);streets=null;}},setPins:(rows,open)=>{pins.clearLayers();const positions=mapDisplayPositions(rows);for(const [index,row] of rows.entries()){const popup=document.createElement('div');const name=document.createElement('strong');name.textContent=row.name;const button=document.createElement('button');button.type='button';button.textContent='Open saved property';button.onclick=()=>open(row);popup.append(name,button);L.circleMarker(positions[index],{radius:8,color:'#b94d00',fillColor:'#ef8a27',fillOpacity:0.9}).bindPopup(popup).addTo(pins);}if(rows.length)map.fitBounds(positions,{padding:[28,28],maxZoom:15});map.invalidateSize();}};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const root=document.getElementById('market-map-view');if(root)window.JGAPMarketMap=mountMarketMap({root,getContext:()=>window.JGAPMarketMapContext?.scope(),load:company=>window.JGAPMarketMapContext.load(company),save:(...args)=>window.JGAPMarketMapContext.save(...args),openProperty:(...args)=>window.JGAPMarketMapContext.openProperty(...args),createMap:canvas=>createLeafletMap(canvas,window.L)});
}
