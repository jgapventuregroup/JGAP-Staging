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
export function mountDashboardCustomization({root,getContext,read,save,apply}){
 let sequence=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};
 const clear=()=>{sequence++;root.replaceChildren();root.hidden=true;apply(defaultDashboardLayout());};
 const load=async()=>{
  clear();const scope=getContext();if(scope?.canCustomize!==true||!scope.companyId)return;
  const companyId=scope.companyId,session=scope.session,ticket=sequence,current=()=>sequence===ticket&&getContext()?.companyId===companyId&&getContext()?.session===session&&getContext()?.canCustomize===true;
  root.hidden=false;const details=el('details');details.className='dashboard-customizer';details.append(el('summary','Customize dashboard · Pro'));
  details.append(el('p','Choose visible sections and their order. Save to apply. These settings are yours in this workspace; they do not change anyone else’s dashboard.'));
  const status=el('p','Loading saved layout…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const editor=el('div');const reload=el('button','Reload saved layout');reload.type='button';root.append(details);details.append(status,editor,reload);let busy=false;
  reload.onclick=()=>{if(!busy&&current())load();};
  try{
   const original=validateDashboardResponse(await read(companyId),companyId);if(!current())return;apply(original);
   let draft=validateDashboardLayout(original);const rows=el('div');const saveButton=el('button','Save dashboard layout');saveButton.type='button';const reset=el('button','Restore default dashboard');reset.type='button';editor.append(rows,saveButton,reset);const fields=[];
   const lock=value=>{busy=value;for(const item of fields)item.disabled=value;saveButton.disabled=value;reset.disabled=value;reload.disabled=value;};
   const render=focusKey=>{
    rows.replaceChildren();fields.length=0;const checkboxes=new Map();
    draft.widget_order.forEach((key,index)=>{
     const row=el('div');row.className='dashboard-layout-row';const label=el('label');const shown=el('input');shown.type='checkbox';shown.checked=!draft.hidden_widgets.includes(key);label.append(shown,el('span',names[key]));row.append(label);checkboxes.set(key,shown);
     shown.addEventListener('change',()=>{
      if(busy||!current())return;
      if(!shown.checked&&draft.hidden_widgets.length===3){shown.checked=true;status.textContent='Keep at least one dashboard section visible.';return;}
      draft.hidden_widgets=shown.checked?draft.hidden_widgets.filter(k=>k!==key):[...draft.hidden_widgets,key];status.textContent='Unsaved changes. Save to apply.';
     });
     for(const [direction,delta] of [['up',-1],['down',1]]){const button=el('button','Move '+names[key]+' '+direction);button.type='button';button.disabled=index+delta<0||index+delta>=4;button.onclick=()=>{if(busy||!current()||button.disabled)return;const next=index+delta;[draft.widget_order[index],draft.widget_order[next]]=[draft.widget_order[next],draft.widget_order[index]];status.textContent='Unsaved changes. Save to apply.';render(key);};row.append(button);fields.push(button);}
     fields.push(shown);rows.append(row);
    });
    if(focusKey)checkboxes.get(focusKey)?.focus?.();
   };
   const persist=async requested=>{
    if(busy||!current())return;const desired=validateDashboardLayout(requested);lock(true);status.textContent='Saving dashboard layout…';let saved=false;
    try{
     const response=await save(companyId,desired);if(!current())return;saved=true;validateDashboardResponse(response,companyId,original.user_id);if(!same(response,desired))throw Error('Saved layout did not match the requested sections');
     const verified=validateDashboardResponse(await read(companyId),companyId,original.user_id);if(!current())return;if(!same(verified,desired))throw Error('The reloaded layout changed before verification');
     draft=validateDashboardLayout(verified);apply(verified);render();status.textContent='Dashboard layout saved and verified.';
    }catch(error){if(current())status.textContent=(saved?'Layout was saved, but could not be verified. Reload saved layout before retrying. ':'Could not save layout. Your draft is retained. ')+(error?.message||'Unknown error');}
    finally{if(current()){lock(false);render();if(saved&&!status.textContent.startsWith('Dashboard layout saved')){saveButton.disabled=true;reset.disabled=true;}}}
   };
   saveButton.onclick=()=>persist(draft);reset.onclick=()=>persist(defaultDashboardLayout());render();status.textContent='Saved layout loaded. Changes apply after saving.';
  }catch(error){if(current()){apply(defaultDashboardLayout());status.textContent='Could not load your saved layout. Default dashboard shown. '+(error?.message||'Unknown error');}}
 };
 return {load,clear};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 const root=document.getElementById('dashboard-customization');if(root){const widgets=Object.fromEntries(DASHBOARD_WIDGETS.map(key=>[key,document.querySelector('[data-dashboard-widget="'+key+'"]')]));const slots=DASHBOARD_WIDGETS.map(key=>document.querySelector('[data-dashboard-slot="'+key+'"]'));
  window.JGAPDashboard=mountDashboardCustomization({root,getContext:()=>window.JGAPDashboardContext?.scope(),read:company=>window.JGAPDashboardContext.read(company),save:(company,layout)=>window.JGAPDashboardContext.save(company,layout),apply:layout=>applyDashboardLayout(layout,{slots,widgets})});window.JGAPDashboard.load();
 }
}
