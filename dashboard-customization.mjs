export const DASHBOARD_WIDGETS=['tools','metrics','recent_properties','follow_ups'];
const names={tools:'Your tools',metrics:'Workspace metrics',recent_properties:'Recent properties',follow_ups:'Upcoming follow-ups'};
export const defaultDashboardLayout=()=>({widget_order:[...DASHBOARD_WIDGETS],hidden_widgets:[]});
export function validateDashboardLayout(value){
 if(!value||!Array.isArray(value.widget_order)||value.widget_order.length!==4||new Set(value.widget_order).size!==4||value.widget_order.some(k=>!DASHBOARD_WIDGETS.includes(k))||!Array.isArray(value.hidden_widgets)||value.hidden_widgets.length>3||new Set(value.hidden_widgets).size!==value.hidden_widgets.length||value.hidden_widgets.some(k=>!DASHBOARD_WIDGETS.includes(k)))throw Error('Choose each section once and keep at least one visible');
 return {widget_order:[...value.widget_order],hidden_widgets:[...value.hidden_widgets]};
}
export function validateDashboardResponse(response,companyId,userId=null){
 if(response?.company_id!==companyId||typeof response.user_id!=='string'||!response.user_id||userId!==null&&response.user_id!==userId||response.version!==1)throw Error('Saved layout did not match this workspace and user');
 validateDashboardLayout(response);return response;
}
export function applyDashboardLayout(layout,{slots,widgets}){
 const value=validateDashboardLayout(layout);
 if(slots.length!==4||DASHBOARD_WIDGETS.some(key=>!widgets[key]))throw Error('Dashboard sections unavailable');
 value.widget_order.forEach((key,index)=>{slots[index].after(widgets[key]);widgets[key].hidden=value.hidden_widgets.includes(key);});
}
const same=(a,b)=>JSON.stringify(a.widget_order)===JSON.stringify(b.widget_order)&&JSON.stringify([...a.hidden_widgets].sort())===JSON.stringify([...b.hidden_widgets].sort());
export function moveDashboardWidget(order,key,target){
 if(!DASHBOARD_WIDGETS.includes(key)||!order.includes(target)||key===target)return [...order];
 const next=order.filter(item=>item!==key);next.splice(order.indexOf(target),0,key);return next;
}
export function installDashboardDragging({widgets,canMove,onMove,onDrop,onCancel,onKeyboard,findTarget=(x,y)=>document.elementFromPoint?.(x,y)?.closest?.('[data-dashboard-widget]')?.getAttribute('data-dashboard-widget')}){
 const handles=[];let gesture=null;
 const finish=(cancel=false)=>{if(!gesture)return;const previous=gesture;gesture=null;widgets[previous.key]?.classList?.remove('dashboard-dragging');try{previous.handle.releasePointerCapture?.(previous.pointerId);}catch{}if(previous.moved)return cancel?onCancel():onDrop(previous.key);};
 for(const key of DASHBOARD_WIDGETS){const widget=widgets[key];if(!widget)continue;const handle=document.createElement('button');handle.type='button';handle.className='dashboard-drag-handle';handle.textContent='⋮⋮ Move '+names[key];handle.setAttribute('aria-label','Move '+names[key]+': drag, or use Alt and the up or down arrow');handle.hidden=true;widget.prepend(handle);handles.push(handle);
  handle.addEventListener('pointerdown',event=>{if(!canMove()||event.button!==0||event.isPrimary===false)return;event.preventDefault();handle.focus?.();gesture={key,handle,pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false};handle.setPointerCapture?.(event.pointerId);});
  handle.addEventListener('pointermove',event=>{if(!gesture||gesture.handle!==handle||event.pointerId!==gesture.pointerId||!canMove())return;if(!gesture.moved&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<6)return;event.preventDefault();gesture.moved=true;widget.classList?.add('dashboard-dragging');const target=findTarget(event.clientX,event.clientY);if(target&&target!==key){onMove(key,target);try{handle.setPointerCapture?.(event.pointerId);}catch{}}});
  handle.addEventListener('pointerup',event=>{if(gesture?.handle===handle&&gesture.pointerId===event.pointerId)return finish();});
  handle.addEventListener('pointercancel',()=>finish(true));
  handle.addEventListener('keydown',event=>{if(event.key==='Escape'&&gesture){event.preventDefault();return finish(true);}if(canMove()&&event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();return onKeyboard(key,event.key==='ArrowUp'?-1:1);}});
 }
 return {handles,show:visible=>{for(const handle of handles)handle.hidden=!visible;},destroy:()=>{gesture=null;for(const key of DASHBOARD_WIDGETS)widgets[key]?.classList?.remove('dashboard-dragging');for(const handle of handles)handle.remove?.();}};
}
export function mountDashboardCustomization({root,getContext,read,save,apply,widgets={}}){
 let sequence=0,cleanup=()=>{};
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};
 const clear=()=>{sequence++;cleanup();cleanup=()=>{};root.replaceChildren();root.hidden=true;apply(defaultDashboardLayout());};
 const load=async()=>{
  clear();const scope=getContext();if(scope?.canCustomize!==true||!scope.companyId)return;
  const companyId=scope.companyId,session=scope.session,ticket=sequence,current=()=>sequence===ticket&&getContext()?.companyId===companyId&&getContext()?.session===session&&getContext()?.canCustomize===true;
  root.hidden=false;const details=el('details');details.className='dashboard-customizer';details.append(el('summary','Arrange dashboard · Pro'));
  details.append(el('p','Open this panel to show move handles on your dashboard. Hold a handle with the left mouse button, or touch and drag it, then release over another section. Moves save automatically. Keyboard: focus a handle and use Alt + ↑ or ↓. These settings affect only your dashboard in this workspace.'));
  const status=el('p','Loading saved layout…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const editor=el('div');const reload=el('button','Reload saved layout');reload.type='button';root.append(details);details.append(status,editor,reload);let busy=false,dragControls=null,verificationBlocked=false;
  reload.onclick=()=>{if(!busy&&current())load();};
  try{
   const original=validateDashboardResponse(await read(companyId),companyId);if(!current())return;apply(original);
   let draft=validateDashboardLayout(original);const rows=el('div');const saveButton=el('button','Save dashboard layout');saveButton.type='button';const reset=el('button','Restore default dashboard');reset.type='button';editor.append(rows,saveButton,reset);const fields=[];
   const lock=value=>{busy=value;for(const handle of dragControls?.handles||[])handle.disabled=value;for(const item of fields)item.disabled=value;saveButton.disabled=value;reset.disabled=value;reload.disabled=value;};
   const render=focusKey=>{
    rows.replaceChildren();fields.length=0;const checkboxes=new Map();
    draft.widget_order.forEach((key,index)=>{
     const row=el('div');row.className='dashboard-layout-row';const label=el('label');const shown=el('input');shown.type='checkbox';shown.checked=!draft.hidden_widgets.includes(key);label.append(shown,el('span',names[key]));row.append(label);checkboxes.set(key,shown);
     shown.addEventListener('change',()=>{
      if(busy||!current())return;
      if(!shown.checked&&draft.hidden_widgets.length===3){shown.checked=true;status.textContent='Keep at least one dashboard section visible.';return;}
      draft.hidden_widgets=shown.checked?draft.hidden_widgets.filter(k=>k!==key):[...draft.hidden_widgets,key];status.textContent='Unsaved changes. Save to apply.';
     });
     fields.push(shown);rows.append(row);
    });
    if(focusKey)checkboxes.get(focusKey)?.focus?.();
   };
   const persist=async requested=>{
    if(busy||verificationBlocked||!current())return;const desired=validateDashboardLayout(requested);lock(true);status.textContent='Saving dashboard layout…';let saved=false;
    try{
     const response=await save(companyId,desired);if(!current())return;saved=true;validateDashboardResponse(response,companyId,original.user_id);if(!same(response,desired))throw Error('Saved layout did not match the requested sections');
     const verified=validateDashboardResponse(await read(companyId),companyId,original.user_id);if(!current())return;if(!same(verified,desired))throw Error('The reloaded layout changed before verification');
     draft=validateDashboardLayout(verified);apply(verified);render();status.textContent='Dashboard layout saved and verified.';
    }catch(error){if(current())status.textContent=(saved?'Layout was saved, but could not be verified. Reload saved layout before retrying. ':'Could not save layout. Your draft is retained. ')+(error?.message||'Unknown error');}
    finally{if(current()){lock(false);render();if(saved&&!status.textContent.startsWith('Dashboard layout saved')){verificationBlocked=true;saveButton.disabled=true;reset.disabled=true;for(const handle of dragControls?.handles||[])handle.disabled=true;}}}
   };
   let beforeDrag=null;
   dragControls=installDashboardDragging({widgets,canMove:()=>!busy&&!verificationBlocked&&current()&&details.open,
    onMove:(key,target)=>{if(!beforeDrag)beforeDrag=validateDashboardLayout(draft);draft.widget_order=moveDashboardWidget(draft.widget_order,key,target);apply(draft);status.textContent='Release to save the new section order.';},
    onDrop:async key=>{beforeDrag=null;if(!current())return;await persist(draft);dragControls.handles.find(handle=>handle.getAttribute?.('aria-label')?.startsWith('Move '+names[key]+':'))?.focus?.();},
    onCancel:()=>{if(beforeDrag&&current()){draft=beforeDrag;apply(draft);status.textContent='Move canceled.';}beforeDrag=null;},
    onKeyboard:async(key,delta)=>{if(!current()||busy)return;const index=draft.widget_order.indexOf(key),target=draft.widget_order[index+delta];if(!target)return;draft.widget_order=moveDashboardWidget(draft.widget_order,key,target);apply(draft);await persist(draft);}
   });cleanup=()=>dragControls.destroy();details.ontoggle=()=>{if(current())dragControls.show(details.open===true);};
   saveButton.onclick=()=>persist(draft);reset.onclick=()=>persist(defaultDashboardLayout());render();status.textContent='Saved layout loaded. Drag sections to rearrange them; use the checkboxes here to show or hide sections, then save visibility changes.';
  }catch(error){if(current()){apply(defaultDashboardLayout());status.textContent='Could not load your saved layout. Default dashboard shown. '+(error?.message||'Unknown error');}}
 };
 return {load,clear};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 const root=document.getElementById('dashboard-customization');if(root){const widgets=Object.fromEntries(DASHBOARD_WIDGETS.map(key=>[key,document.querySelector('[data-dashboard-widget="'+key+'"]')]));const slots=DASHBOARD_WIDGETS.map(key=>document.querySelector('[data-dashboard-slot="'+key+'"]'));
  window.JGAPDashboard=mountDashboardCustomization({root,getContext:()=>window.JGAPDashboardContext?.scope(),read:company=>window.JGAPDashboardContext.read(company),save:(company,layout)=>window.JGAPDashboardContext.save(company,layout),widgets,apply:layout=>applyDashboardLayout(layout,{slots,widgets})});window.JGAPDashboard.load();
 }
}
