export const GRID_IDS=['analyzer','properties','metrics','recent_properties','follow_ups'];
export const GRID_NAMES={analyzer:'Deal Analyzer',properties:'Saved Properties',metrics:'Property count',recent_properties:'Recent properties',follow_ups:'Upcoming follow-ups'};
export const defaultGrid=()=>[
 {id:'analyzer',x:0,y:0,w:6,h:4,hidden:false},{id:'properties',x:6,y:0,w:6,h:4,hidden:false},
 {id:'metrics',x:0,y:4,w:12,h:2,hidden:false},{id:'recent_properties',x:0,y:6,w:8,h:8,hidden:false},{id:'follow_ups',x:8,y:6,w:4,h:8,hidden:false}
];
export function validateGrid(items){
 if(!Array.isArray(items)||items.length!==GRID_IDS.length||new Set(items.map(i=>i?.id)).size!==GRID_IDS.length)throw Error('Dashboard boxes unavailable');
 for(const item of items){
  if(!item||!GRID_IDS.includes(item.id)||Object.keys(item).sort().join(',')!=='h,hidden,id,w,x,y'||typeof item.hidden!=='boolean'||!['x','y','w','h'].every(k=>Number.isInteger(item[k]))||item.x<0||item.y<0||item.y>120||item.w<3||item.w>12||item.x+item.w>12||item.h<1||item.h>48)throw Error('Invalid dashboard position');
 }
 if(items.every(i=>i.hidden))throw Error('Keep at least one box visible');
 return GRID_IDS.map(id=>{const item=items.find(i=>i.id===id);return {id:item.id,x:item.x,y:item.y,w:item.w,h:item.h,hidden:item.hidden};});
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
 host.classList.add('dashboard-grid-ready');
 const grid=GridStack.init({column:12,columnOpts:{breakpoints:[{w:680,c:1}],layout:'list'},cellHeight:40,margin:8,animate:!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,disableDrag:true,disableResize:true,handle:'.dashboard-grid-handle',draggable:{handle:'.dashboard-grid-handle',cancel:'input,textarea,select,option,a,.dashboard-card-action',scroll:true},sizeToContent:true,maxRow:168,acceptWidgets:false,removable:false},host);
 let current=defaultGrid(),editing=false;
 const orderDOM=()=>{const order=grid.save(false).sort((a,b)=>a.y-b.y||a.x-b.x);for(const item of order)host.append(elements[item.id]);};
 const apply=items=>{
  current=validateGrid(items);grid.batchUpdate();
  for(const item of current){const el=elements[item.id];if(item.hidden){if(el.gridstackNode)grid.removeWidget(el,false,false);el.hidden=true;}else{el.hidden=false;if(!el.gridstackNode)grid.makeWidget(el,{...item,sizeToContent:true});}}
  const visible=current.filter(i=>!i.hidden).sort((a,b)=>a.y-b.y||a.x-b.x);
  // Restore requested geometry first; reusing an old content height during load can
  // collide with earlier rows and move the primary actions below later widgets.
  for(const item of visible)grid.update(elements[item.id],{sizeToContent:false});
  grid.load(visible.map(({id,x,y,w,h})=>({id,x,y,w,h,sizeToContent:false})),false);grid.batchUpdate(false);
  for(const item of visible)grid.resizeToContent(elements[item.id]);
  for(const item of visible)grid.update(elements[item.id],{sizeToContent:true,maxH:48});
  grid.enableMove(editing);orderDOM();
 };
 const capture=()=>{const saved=grid.save(false);return validateGrid(current.map(item=>{const actual=saved.find(i=>i.id===item.id);return item.hidden?item:{...item,x:actual?.x??item.x,y:actual?.y??item.y,w:actual?.w??item.w,h:actual?.h??item.h};}));};
 grid.on('dragstop',(_event,element)=>{orderDOM();onDrop(element?.getAttribute('data-dashboard-card'));});
 if(typeof MutationObserver!=='undefined'){let scheduled=false;const observer=new MutationObserver(records=>{if(scheduled||!records.some(r=>r.target.closest?.('.dashboard-card-body')))return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;grid.resizeToContentCheck(false);});});observer.observe(host,{childList:true,subtree:true,characterData:true});}
 return {apply,capture,setEditing:(value,enabled=value)=>{editing=enabled;host.classList.toggle('dashboard-arranging',value);grid.enableMove(enabled);for(const el of Object.values(elements))el.querySelector('.dashboard-card-controls').hidden=!value;grid.resizeToContentCheck(true);},resize:()=>grid.onResize(),elements};
}

export function mountDashboardGrid({root,getContext,read,save,makeGrid,arrangeButton=null,onArrange=()=>{}}){
 let generation=0,grid=null,scope=null,editing=false,busy=false,blocked=false,verified=defaultGrid(),stamp=null,user=null,undo=[],controls=[],changed=null,selected=null,ignoreClickUntil=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let status,arrange,done,undoButton,reset,reload,retry;
 const current=()=>scope&&getContext()?.companyId===scope.companyId&&getContext()?.session===scope.session&&getContext()?.canCustomize===true;
 const highlight=()=>{for(const id of GRID_IDS){const handle=grid.elements[id].querySelector('.dashboard-grid-handle');handle.setAttribute('aria-pressed',String(selected===id));}};
 const lock=()=>{const unavailable=busy||blocked;root.hidden=Boolean(arrangeButton)&&!editing&&!blocked;undoButton.hidden=!editing||!undo.length;reset.hidden=!editing;reload.hidden=!blocked;for(const node of controls)node.disabled=unavailable;arrange.disabled=unavailable;done.disabled=busy;reset.disabled=unavailable;undoButton.disabled=unavailable||!undo.length;reload.disabled=busy;retry.hidden=!changed||blocked;retry.disabled=unavailable;grid?.setEditing(editing,editing&&!unavailable);};
 const say=text=>{if(status)status.textContent=text;};
 const configure=()=>{const token=generation,allowed=()=>token===generation&&current();controls=[];
  for(const id of GRID_IDS){const handle=grid.elements[id].querySelector('.dashboard-grid-handle');controls.push(handle);handle.setAttribute('aria-label','Move '+GRID_NAMES[id]);
   handle.onclick=()=>{
    if(!allowed()||!editing||busy||blocked||Date.now()<ignoreClickUntil)return;
    if(!selected){selected=id;highlight();say('Selected '+GRID_NAMES[id]+'. Click another Move handle to place it before that box.');return;}
    const from=selected;selected=null;highlight();if(from===id){say('Move canceled.');return;}
    const items=grid.capture(),others=items.filter(i=>!i.hidden&&i.id!==from).sort((a,b)=>a.y-b.y||a.x-b.x),position=others.findIndex(i=>i.id===id);
    persist(packGrid(items,from,position),{focusId:from});
   };
   handle.onkeydown=event=>{if(!allowed()||!editing||busy||blocked)return;if(event.key==='Escape'){event.preventDefault();selected=null;highlight();grid.apply(verified);say('Move canceled.');return;}if(event.altKey&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();selected=null;highlight();const ordered=grid.capture().filter(i=>!i.hidden).sort((a,b)=>a.y-b.y||a.x-b.x),index=ordered.findIndex(i=>i.id===id),delta=['ArrowUp','ArrowLeft'].includes(event.key)?-1:1;persist(packGrid(grid.capture(),id,index+delta),{focusId:id});}};
  }highlight();lock();
 };
 const persist=async(items,{isUndo=false,focusId=null}={})=>{
  if(!current()||busy||blocked)return;let desired;try{desired=validateGrid(items);}catch(error){say(error.message);grid.apply(verified);return;}
  if(sameGrid(desired,verified)){grid.apply(verified);return;}const ticket=generation,before=validateGrid(verified);busy=true;changed=desired;selected=null;grid.apply(desired);lock();say('Saving dashboard…');let wrote=false;
  try{const raw=await save(scope.companyId,{items:desired,updated_at:stamp});wrote=true;const response=readGridResponse(raw,scope.companyId,user);if(ticket!==generation||!current())return;if(!sameGrid(response.items,desired))throw Error('Saved boxes did not match');const check=readGridResponse(await read(scope.companyId),scope.companyId,user);if(ticket!==generation||!current())return;if(!sameGrid(check.items,desired)||check.updated_at!==response.updated_at)throw Error('The saved layout changed during verification');
   if(isUndo)undo.pop();else undo.push(before);undo=undo.slice(-20);verified=check.items;stamp=check.updated_at;changed=null;grid.apply(verified);say('Saved. You can move another box.');
  }catch(error){if(ticket!==generation||!current())return;if(wrote){blocked=true;grid.apply(desired);say('We could not confirm your saved layout. Select Try again to reconnect.');}else{grid.apply(verified);say('Could not save. Your previous layout is restored. '+(error?.message||'Try again.'));}}
  finally{if(ticket===generation&&current()){busy=false;configure();if(focusId&&editing&&!blocked)grid.elements[focusId]?.querySelector('.dashboard-grid-handle')?.focus();}}
 };
 const clear=()=>{generation++;scope=null;editing=false;busy=false;blocked=false;undo=[];changed=null;selected=null;controls=[];verified=defaultGrid();root.replaceChildren();root.hidden=true;if(arrangeButton){arrangeButton.disabled=true;arrangeButton.hidden=false;arrangeButton.setAttribute("aria-expanded","false");}grid?.setEditing(false);grid?.apply(verified);};
 const load=async()=>{
  clear();const ticket=generation;scope=getContext();try{grid??=makeGrid(id=>{if(current()&&editing&&!busy&&!blocked){ignoreClickUntil=Date.now()+300;selected=null;persist(grid.capture(),{focusId:id});}});grid.apply(defaultGrid());}catch(error){root.hidden=false;root.textContent=error.message;return;}
  if(scope?.canCustomize!==true||!scope.companyId)return;root.hidden=false;const toolbar=el('div');toolbar.className='dashboard-grid-toolbar';const actions=el('div');actions.className='dashboard-grid-actions';arrange=arrangeButton||el('button','Arrange dashboard · Pro');done=el('button','Done');undoButton=el('button','Undo');reset=el('button','Reset layout');reload=el('button','Try again');retry=el('button','Retry save');for(const b of [arrange,done,undoButton,reset,reload,retry])b.type='button';done.hidden=true;retry.hidden=true;arrange.setAttribute('aria-expanded','false');if(!arrangeButton)actions.append(arrange);actions.append(done,undoButton,reset,reload,retry);status=el('p','Loading your dashboard…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');toolbar.append(actions,status);root.append(toolbar);arrange.disabled=true;
  const showEditing=()=>{onArrange();editing=true;arrange.hidden=!arrangeButton;done.hidden=false;arrange.setAttribute('aria-expanded','true');lock();say('Hold a Move handle, drag a box and release. Changes save automatically. You can also click one Move handle, then another.');grid.resize();grid.elements[GRID_IDS[0]]?.querySelector('.dashboard-grid-handle')?.focus();};
  arrange.onclick=()=>{if(ticket===generation&&current()&&!busy&&!blocked)showEditing();};
  done.onclick=()=>{if(ticket!==generation||!current()||busy)return;editing=false;selected=null;highlight();done.hidden=true;arrange.hidden=false;arrange.setAttribute('aria-expanded','false');lock();if(!blocked)say('Dashboard ready.');if(arrangeButton)onArrange();else arrange.focus();};
  undoButton.onclick=()=>{if(ticket===generation&&current()&&undo.length)persist(undo.at(-1),{isUndo:true});};reset.onclick=()=>{if(ticket===generation&&current()&&!busy&&!blocked){grid.apply(defaultGrid());persist(grid.capture());}};reload.onclick=async()=>{if(ticket!==generation||!current()||busy)return;const resume=editing;await load();if(resume&&current()&&!blocked)showEditing();};retry.onclick=()=>{if(ticket===generation&&current()&&changed)persist(changed);};
  try{const data=readGridResponse(await read(scope.companyId),scope.companyId);if(ticket!==generation||!current())return;verified=data.items;stamp=data.updated_at;user=data.user_id;grid.apply(verified);configure();say('Select Arrange dashboard to move boxes.');}
  catch(error){if(ticket===generation&&current()){blocked=true;say('Could not load your saved dashboard. Select Try again to reconnect.');lock();}}
 };
 return {load,clear,resize:()=>grid?.resize()};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const root=document.getElementById('dashboard-customization'),host=document.getElementById('dashboard-grid');
 if(root&&host){window.JGAPDashboard=mountDashboardGrid({root,getContext:()=>window.JGAPDashboardContext?.scope(),read:company=>window.JGAPDashboardContext.read(company),save:(company,layout)=>window.JGAPDashboardContext.save(company,layout),arrangeButton:document.getElementById('settings-arrange-dashboard'),onArrange:()=>window.JGAPDashboardContext?.openDashboard(),makeGrid:onDrop=>createDashboardGrid({host,GridStack:window.GridStack,onDrop})});window.JGAPDashboard.load();}
}
