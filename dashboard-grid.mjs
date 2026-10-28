export const GRID_IDS=['analyzer','properties','metrics','recent_properties','follow_ups'];
export const GRID_NAMES={analyzer:'Deal Analyzer',properties:'Saved Properties',metrics:'Property count',recent_properties:'Recent properties',follow_ups:'Upcoming follow-ups'};
export const defaultGrid=()=>[
 {id:'analyzer',x:0,y:0,w:6,h:2,hidden:false},{id:'properties',x:6,y:0,w:6,h:2,hidden:false},
 {id:'metrics',x:0,y:2,w:12,h:1,hidden:false},{id:'recent_properties',x:0,y:3,w:8,h:4,hidden:false},{id:'follow_ups',x:8,y:3,w:4,h:4,hidden:false}
];
export function validateGrid(items){
 if(!Array.isArray(items)||items.length!==GRID_IDS.length||new Set(items.map(i=>i?.id)).size!==GRID_IDS.length)throw Error('Dashboard boxes unavailable');
 for(const item of items){
  if(!item||!GRID_IDS.includes(item.id)||Object.keys(item).sort().join(',')!=='h,hidden,id,w,x,y'||typeof item.hidden!=='boolean'||!['x','y','w','h'].every(k=>Number.isInteger(item[k]))||item.x<0||item.y<0||item.y>120||item.w<3||item.w>12||item.x+item.w>12||item.h<1||item.h>48)throw Error('Invalid dashboard position');
 }
 if(items.every(i=>i.hidden))throw Error('Keep at least one box visible');
 return GRID_IDS.map(id=>({...items.find(i=>i.id===id)}));
}
export function readGridResponse(data,company,user=null){
 if(data?.company_id!==company||!data.user_id||user!==null&&data.user_id!==user||data.version!==2||data.updated_at!==null&&(!data.updated_at||!Number.isFinite(Date.parse(data.updated_at))))throw Error('Dashboard response did not match this user and workspace');
 let items=data.layout;
 if(items===null&&JSON.stringify(data.widget_order)===JSON.stringify(['tools','metrics','recent_properties','follow_ups'])&&Array.isArray(data.hidden_widgets)&&data.hidden_widgets.length===0)items=defaultGrid();
 if(items===null){
  const legacy=data.widget_order,hidden=data.hidden_widgets;
  if(!Array.isArray(legacy)||legacy.length!==4||new Set(legacy).size!==4||legacy.some(id=>!['tools','metrics','recent_properties','follow_ups'].includes(id))||!Array.isArray(hidden)||hidden.some(id=>!legacy.includes(id)))throw Error('Previous dashboard layout unavailable');
  let y=0;items=[];for(const id of legacy){const keys=id==='tools'?['analyzer','properties']:[id];for(const [index,key] of keys.entries()){const item=defaultGrid().find(i=>i.id===key);items.push({...item,x:keys.length===2?index*6:0,y,w:keys.length===2?6:12,hidden:hidden.includes(id)});}if(!hidden.includes(id))y+=Math.max(...keys.map(key=>defaultGrid().find(i=>i.id===key).h));}
 }
 return {items:validateGrid(items),updated_at:data.updated_at,user_id:data.user_id};
}
export const sameGrid=(a,b)=>JSON.stringify(validateGrid(a))===JSON.stringify(validateGrid(b));
export function packGrid(items,id,position){
 const next=validateGrid(items),visible=next.filter(i=>!i.hidden).sort((a,b)=>a.y-b.y||a.x-b.x),moving=visible.find(i=>i.id===id);
 if(!moving)return next;const others=visible.filter(i=>i.id!==id);others.splice(Math.max(0,Math.min(others.length,position)),0,moving);
 let x=0,y=0,rowHeight=0;for(const item of others){if(x+item.w>12){x=0;y+=rowHeight;rowHeight=0;}item.x=x;item.y=y;x+=item.w;rowHeight=Math.max(rowHeight,item.h);}return validateGrid(next);
}

// GridStack stores geometry only. Never serialize widget HTML or customer content.
export function createDashboardGrid({host,GridStack,onDrop}){
 if(!host||!GridStack?.init)throw Error('Dashboard grid could not load. Reload this page.');
 const elements=Object.fromEntries(GRID_IDS.map(id=>[id,host.querySelector('[data-dashboard-card="'+id+'"]')]));
 const grid=GridStack.init({column:12,columnOpts:{breakpoints:[{w:680,c:1}],layout:'list'},cellHeight:80,margin:8,animate:!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,disableDrag:true,disableResize:true,handle:'.dashboard-grid-handle',draggable:{handle:'.dashboard-grid-handle',cancel:'input,textarea,select,option,a,.dashboard-card-action',scroll:true},sizeToContent:true,maxRow:168,acceptWidgets:false,removable:false},host);
 let current=defaultGrid(),editing=false;
 const orderDOM=()=>{const order=grid.save(false).sort((a,b)=>a.y-b.y||a.x-b.x);for(const item of order)host.append(elements[item.id]);};
 const apply=items=>{
  current=validateGrid(items);grid.batchUpdate();
  for(const item of current){const el=elements[item.id];if(item.hidden){if(el.gridstackNode)grid.removeWidget(el,false,false);el.hidden=true;}else{el.hidden=false;if(!el.gridstackNode)grid.makeWidget(el,{...item,sizeToContent:true});}}
  grid.load(current.filter(i=>!i.hidden).map(({id,x,y,w,h})=>({id,x,y,w,h,sizeToContent:true})),false);grid.batchUpdate(false);grid.enableMove(editing);orderDOM();
 };
 const capture=()=>{const saved=grid.save(false);return validateGrid(current.map(item=>{const actual=saved.find(i=>i.id===item.id);return item.hidden?item:{...item,x:actual?.x??item.x,y:actual?.y??item.y,w:actual?.w??item.w,h:actual?.h??item.h};}));};
 grid.on('dragstop',()=>{orderDOM();onDrop();});
 return {apply,capture,setEditing:value=>{editing=value;host.classList.toggle('dashboard-arranging',value);grid.enableMove(value);for(const el of Object.values(elements))el.querySelector('.dashboard-card-controls').hidden=!value;grid.resizeToContentCheck(true);},resize:()=>grid.onResize(),elements};
}

export function mountDashboardGrid({root,getContext,read,save,makeGrid}){
 let generation=0,grid=null,scope=null,editing=false,busy=false,blocked=false,verified=defaultGrid(),stamp=null,user=null,undo=[],controls=[],changed=null;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let status,arrange,done,undoButton,reset,reload,retry,visibility;
 const current=()=>scope&&getContext()?.companyId===scope.companyId&&getContext()?.session===scope.session&&getContext()?.canCustomize===true;
 const lock=()=>{const unavailable=busy||blocked;undoButton.hidden=!editing;reset.hidden=!editing;reload.hidden=!editing&&!blocked;for(const node of controls)node.disabled=unavailable;arrange.disabled=unavailable;done.disabled=unavailable;reset.disabled=unavailable;undoButton.disabled=unavailable||!undo.length;reload.disabled=busy;retry.hidden=!changed||blocked;retry.disabled=unavailable;grid?.setEditing(editing&&!unavailable);};
 const say=text=>{if(status)status.textContent=text;};
 const configure=()=>{const token=generation,allowed=()=>token===generation&&current();visibility.replaceChildren(el('summary','Show boxes or move them by clicking'));controls=[];const visible=verified.filter(i=>!i.hidden).sort((a,b)=>a.y-b.y||a.x-b.x);
  for(const id of GRID_IDS){const control=grid.elements[id].querySelector('.dashboard-card-controls'),handle=control.querySelector('.dashboard-grid-handle');let previous=control.querySelector('.dashboard-move-options');previous?.remove();
   const options=el('div');options.className='dashboard-move-options';const posLabel=el('label','Position'),position=el('select');position.setAttribute('aria-label','Position for '+GRID_NAMES[id]);visible.forEach((item,index)=>{const o=el('option',String(index+1));o.value=String(index);position.append(o);});position.value=String(visible.findIndex(i=>i.id===id));posLabel.append(position);
   const widthLabel=el('label','Width'),width=el('select');width.setAttribute('aria-label','Width for '+GRID_NAMES[id]);for(const [w,label] of [[4,'One third'],[6,'Half'],[8,'Two thirds'],[12,'Full']]){const o=el('option',label);o.value=String(w);width.append(o);}width.value=String(verified.find(i=>i.id===id).w);widthLabel.append(width);options.append(posLabel,widthLabel);controls.push(handle,position,width);
   position.onchange=()=>{if(allowed()&&!busy&&!blocked)persist(packGrid(grid.capture(),id,Number(position.value)));};
   width.onchange=()=>{if(!allowed()||busy||blocked)return;const next=grid.capture(),item=next.find(i=>i.id===id);item.w=Number(width.value);item.x=Math.min(item.x,12-item.w);grid.apply(next);persist(grid.capture());};
   handle.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();grid.apply(verified);say('Move canceled.');return;}if(event.altKey&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)&&allowed()&&!busy&&!blocked){event.preventDefault();const ordered=grid.capture().filter(i=>!i.hidden).sort((a,b)=>a.y-b.y||a.x-b.x),index=ordered.findIndex(i=>i.id===id),delta=['ArrowUp','ArrowLeft'].includes(event.key)?-1:1;persist(packGrid(grid.capture(),id,index+delta));}};
   const label=el('label'),checkbox=el('input');checkbox.type='checkbox';checkbox.checked=!verified.find(i=>i.id===id).hidden;checkbox.setAttribute('aria-label','Show '+GRID_NAMES[id]);label.append(checkbox,el('span',GRID_NAMES[id]));visibility.append(label,options);controls.push(checkbox);checkbox.onchange=()=>{if(!allowed()||busy||blocked)return;const next=grid.capture();next.find(i=>i.id===id).hidden=!checkbox.checked;try{validateGrid(next);persist(next);}catch(error){checkbox.checked=true;say(error.message);}};
  }lock();
 };
 const persist=async(items,{isUndo=false}={})=>{
  if(!current()||busy||blocked)return;let desired;try{desired=validateGrid(items);}catch(error){say(error.message);grid.apply(verified);return;}
  if(sameGrid(desired,verified)){grid.apply(verified);return;}const ticket=generation,before=verified.map(i=>({...i}));busy=true;changed=desired;grid.apply(desired);lock();say('Saving dashboard…');let wrote=false;
  try{const raw=await save(scope.companyId,{items:desired,updated_at:stamp});wrote=true;const response=readGridResponse(raw,scope.companyId,user);if(ticket!==generation||!current())return;wrote=true;if(!sameGrid(response.items,desired))throw Error('Saved boxes did not match');const check=readGridResponse(await read(scope.companyId),scope.companyId,user);if(ticket!==generation||!current())return;if(!sameGrid(check.items,desired)||check.updated_at!==response.updated_at)throw Error('The saved layout changed during verification');
   if(isUndo)undo.pop();else undo.push(before);undo=undo.slice(-20);verified=check.items;stamp=check.updated_at;changed=null;grid.apply(verified);say('Dashboard saved and verified.');
  }catch(error){if(ticket!==generation||!current())return;if(wrote){blocked=true;grid.apply(desired);say('Your layout was saved, but verification failed. Select Reload saved layout before making another change.');}else{grid.apply(verified);say('Could not save. Your last verified layout is restored. '+(error?.message||'Try again.'));}}
  finally{if(ticket===generation&&current()){busy=false;configure();}}
 };
 const clear=()=>{generation++;scope=null;editing=false;busy=false;blocked=false;undo=[];changed=null;controls=[];verified=defaultGrid();root.replaceChildren();root.hidden=true;grid?.setEditing(false);grid?.apply(verified);};
 const load=async()=>{
  clear();const ticket=generation;scope=getContext();try{grid??=makeGrid(()=>{if(current()&&editing&&!busy&&!blocked)persist(grid.capture());});grid.apply(defaultGrid());}catch(error){root.hidden=false;root.textContent=error.message;return;}
  if(scope?.canCustomize!==true||!scope.companyId)return;root.hidden=false;const toolbar=el('div');toolbar.className='dashboard-grid-toolbar';const actions=el('div');actions.className='dashboard-grid-actions';arrange=el('button','Arrange dashboard · Pro');done=el('button','Done arranging');undoButton=el('button','Undo last change');reset=el('button','Restore defaults');reload=el('button','Reload saved layout');retry=el('button','Retry last change');for(const b of [arrange,done,undoButton,reset,reload,retry])b.type='button';done.hidden=true;retry.hidden=true;arrange.setAttribute('aria-expanded','false');actions.append(arrange,done,undoButton,reset,reload,retry);const instructions=el('p','Move each box independently. Select Arrange dashboard, then hold a Move handle, drag to the highlighted space and release. Changes save automatically.');status=el('p','Loading saved dashboard…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');visibility=el('details');visibility.className='dashboard-visibility';visibility.hidden=true;toolbar.append(actions,instructions,status,visibility);root.append(toolbar);arrange.disabled=true;
  arrange.onclick=()=>{if(ticket!==generation||!current()||busy||blocked)return;editing=true;arrange.hidden=true;done.hidden=false;arrange.setAttribute('aria-expanded','true');visibility.hidden=false;lock();say('Drag a Move handle, or choose a box position and width. Alt + arrow keys also move a focused handle.');};
  done.onclick=()=>{if(ticket!==generation||!current()||busy||blocked)return;editing=false;done.hidden=true;arrange.hidden=false;arrange.setAttribute('aria-expanded','false');visibility.hidden=true;lock();say('Arrangement finished. Your saved layout is ready.');arrange.focus();};
  undoButton.onclick=()=>{if(ticket===generation&&current()&&undo.length)persist(undo.at(-1),{isUndo:true});};reset.onclick=()=>{if(ticket===generation&&current())persist(defaultGrid());};reload.onclick=()=>{if(ticket===generation&&current()&&!busy)load();};retry.onclick=()=>{if(ticket===generation&&current()&&changed)persist(changed);};
  try{const data=readGridResponse(await read(scope.companyId),scope.companyId);if(ticket!==generation||!current())return;verified=data.items;stamp=data.updated_at;user=data.user_id;grid.apply(verified);configure();say('Your dashboard is ready. Select Arrange dashboard to move individual boxes.');}
  catch(error){if(ticket===generation&&current()){blocked=true;say('Could not load your saved dashboard. Defaults are shown. Select Reload saved layout to try again.');lock();}}
 };
 return {load,clear,resize:()=>grid?.resize()};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const root=document.getElementById('dashboard-customization'),host=document.getElementById('dashboard-grid');
 if(root&&host){window.JGAPDashboard=mountDashboardGrid({root,getContext:()=>window.JGAPDashboardContext?.scope(),read:company=>window.JGAPDashboardContext.read(company),save:(company,layout)=>window.JGAPDashboardContext.save(company,layout),makeGrid:onDrop=>createDashboardGrid({host,GridStack:window.GridStack,onDrop})});window.JGAPDashboard.load();}
}
