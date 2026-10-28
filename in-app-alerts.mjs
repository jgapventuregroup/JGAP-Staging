const types={follow_up:'Property follow-up',task:'Task',maintenance:'Maintenance',service:'Service schedule',equipment:'Equipment service'};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
export const inAppAlertKey=row=>row.source_type+':'+row.source_id+':'+row.due_date;
export function validateInAppAlerts(result,companyId,asOf){
 if(result?.company_id!==companyId||result.as_of!==asOf||!date(asOf)||!Array.isArray(result.items)||result.items.length>10000||result.total_count!==result.items.length)throw Error('Alerts did not match this workspace and date');
 const seen=new Set();let count=0;
 for(const row of result.items){
  const key=inAppAlertKey(row);if(row.company_id!==companyId||!Object.hasOwn(types,row.source_type)||!uuid(row.source_id)||!uuid(row.deal_id)||!date(row.due_date)||row.due_date>asOf||seen.has(key)||typeof row.property_name!=='string'||typeof row.title!=='string'||typeof row.is_reviewed!=='boolean')throw Error('Invalid due alert response');seen.add(key);
  if(row.is_reviewed){if(typeof row.reviewed_at!=='string'||!Number.isFinite(Date.parse(row.reviewed_at)))throw Error('Invalid review timestamp');}else{count++;if(row.reviewed_at!==null)throw Error('Unreviewed alert has an unexpected review timestamp');}
 }
 if(result.unreviewed_count!==count)throw Error('Alert count did not match the returned records');return result;
}
export function filterInAppAlerts(items,{type='all',state='unreviewed'}={}){
 if(type!=='all'&&!Object.hasOwn(types,type)||!['all','reviewed','unreviewed'].includes(state))throw Error('Invalid alert filter');
 return items.filter(row=>(type==='all'||row.source_type===type)&&(state==='all'||row.is_reviewed===(state==='reviewed')));
}
export function validateAlertReview(response,entry,reviewed){
 if(response?.company_id!==entry.company_id||response.source_type!==entry.source_type||response.source_id!==entry.source_id||response.deal_id!==entry.deal_id||response.due_date!==entry.due_date||response.is_reviewed!==reviewed||!uuid(response.user_id))throw Error('Alert review did not match this record');
 if(reviewed){if(typeof response.reviewed_at!=='string'||!Number.isFinite(Date.parse(response.reviewed_at)))throw Error('Invalid saved review timestamp');}else if(response.reviewed_at!==null)throw Error('Unexpected saved review timestamp');
 return response;
}
const localToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
export function mountInAppAlerts({root,getContext,load,setReview,openSource,setBadge=()=>{},isOpen=()=>false}){
 let sequence=0,countSequence=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};
 const clear=()=>{sequence++;countSequence++;root.replaceChildren();setBadge(null);};
 const allowed=scope=>scope?.companyId&&scope.canRead===true;
 const refreshCount=async()=>{
  if(isOpen())return open();const scope=getContext(),ticket=++countSequence,generation=sequence;if(!allowed(scope)){setBadge(null);return;}
  const asOf=localToday();try{const result=await load(scope.companyId,asOf);if(ticket!==countSequence||generation!==sequence||getContext()?.companyId!==scope.companyId||getContext()?.session!==scope.session||getContext()?.canRead!==true)return;setBadge(validateInAppAlerts(result,scope.companyId,asOf).unreviewed_count);}catch{if(ticket===countSequence&&generation===sequence)setBadge(null);}
 };
 const open=async()=>{
  const ticket=++sequence;countSequence++;root.replaceChildren();const scope=getContext();if(!allowed(scope)){root.append(el('p','In-app alerts require a selected workspace with active Pro access.'));setBadge(null);return;}
  const companyId=scope.companyId,session=scope.session,asOf=localToday(),current=()=>ticket===sequence&&getContext()?.companyId===companyId&&getContext()?.session===session&&getContext()?.canRead===true;
  const message=el('p','Loading due alerts…');message.setAttribute('role','status');message.setAttribute('aria-live','polite');root.append(message);let snapshot=null,busy=false,page=0,reviewButtons=[];
  try{
   const result=await load(companyId,asOf);if(!current())return;snapshot=validateInAppAlerts(result,companyId,asOf);setBadge(snapshot.unreviewed_count);
   const controls=el('div');controls.className='grid';
   const field=(label,options)=>{const wrapper=el('label',label),select=el('select');for(const [value,name] of options){const option=el('option',name);option.value=value;select.append(option);}select.value=options[0][0];wrapper.append(select);controls.append(wrapper);return select;};
   const type=field('Alert type',[['all','All types'],...Object.entries(types)]),state=field('Review status',[['unreviewed','Unreviewed'],['all','All active alerts'],['reviewed','Reviewed']]);const reload=el('button','Refresh alerts');reload.type='button';reload.onclick=()=>{if(!busy&&current())open();};const list=el('div');root.append(controls,reload,list);
   const render=()=>{
    if(!current())return;list.replaceChildren();reviewButtons=[];const visible=filterInAppAlerts(snapshot.items,{type:type.value,state:state.value}),start=page*50,end=Math.min(start+50,visible.length);
    message.textContent=snapshot.unreviewed_count+' unreviewed of '+snapshot.total_count+' active due alerts · through '+asOf+'.';
    if(!visible.length){list.append(el('p',snapshot.total_count?'No active alerts match these filters. Reviewed alerts remain available in Review status.':'No due alerts recorded through this date. Future and undated records are not counted.'));return;}
    list.append(el('p',`${start+1}–${end} of ${visible.length} matching alerts`));
    for(const entry of visible.slice(start,end)){
     const article=el('details');article.className='property-activity-record record-disclosure';const summary=el('summary'),meta=el('span',entry.property_name+' · '+(entry.due_date<asOf?'Overdue':'Due today')+' · '+entry.due_date+' · '+(entry.is_reviewed?'Reviewed':'Unreviewed'));meta.className='record-meta';summary.append(el('strong',entry.title),meta);article.append(summary,el('p','Alert type: '+types[entry.source_type]));
     const source=el('button','Open source record');source.type='button';source.setAttribute('aria-label','Open '+entry.title+' for '+entry.property_name);source.onclick=async()=>{if(!current()||source.disabled)return;source.disabled=true;try{await openSource(companyId,entry);}catch(error){if(current())message.textContent='Could not open source: '+(error?.message||'Unknown error');}finally{if(current())source.disabled=false;}};
     const review=el('button',entry.is_reviewed?'Mark unreviewed':'Mark reviewed');review.type='button';review.setAttribute('aria-label',(entry.is_reviewed?'Mark unreviewed: ':'Mark reviewed: ')+entry.title+' for '+entry.property_name);review.disabled=busy;reviewButtons.push(review);
     review.onclick=async()=>{
      if(busy||!current())return;busy=true;reload.disabled=true;for(const b of reviewButtons)b.disabled=true;message.textContent='Saving personal review status…';let saved=false;
      try{const requested=!entry.is_reviewed,response=await setReview(companyId,entry,requested);if(!current())return;saved=true;validateAlertReview(response,entry,requested);const refreshed=validateInAppAlerts(await load(companyId,asOf),companyId,asOf);if(!current())return;const found=refreshed.items.find(row=>inAppAlertKey(row)===inAppAlertKey(entry));if(found&&found.is_reviewed!==requested)throw Error('Reloaded review status did not match');snapshot=refreshed;setBadge(snapshot.unreviewed_count);page=0;render();message.textContent=(found?'Review status saved and verified.':'Review saved; that alert changed or is no longer active.')+' Source task or follow-up was not changed.';}
      catch(error){if(current())message.textContent=(saved?'Review saved, but the refreshed state could not be verified. Refresh alerts. ':'Could not save review status. ')+(error?.message||'Unknown error');}
      finally{if(current()){busy=false;reload.disabled=false;for(const b of reviewButtons)b.disabled=false;}}
     };
     article.append(source,review);list.append(article);
    }
    if(page>0){const button=el('button','Previous 50 alerts');button.type='button';button.onclick=()=>{page--;render();};list.append(button);}if(end<visible.length){const button=el('button','Next 50 alerts');button.type='button';button.onclick=()=>{page++;render();};list.append(button);}
   };
   for(const filter of [type,state])filter.addEventListener('change',()=>{page=0;render();});render();
  }catch(error){if(current()){setBadge(null);message.textContent='Could not load due alerts: '+(error?.message||'Unknown error');const retry=el('button','Retry alerts');retry.type='button';retry.onclick=()=>{if(current())open();};root.append(retry);}}
 };
 return {open,clear,refreshCount};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const root=document.getElementById('in-app-alerts-view'),badge=document.getElementById('in-app-alert-count');if(root){window.JGAPInAppAlerts=mountInAppAlerts({root,getContext:()=>window.JGAPInAppAlertsContext?.scope(),load:(company,asOf)=>window.JGAPInAppAlertsContext.load(company,asOf),setReview:(company,entry,state)=>window.JGAPInAppAlertsContext.review(company,entry,state),openSource:(company,entry)=>window.JGAPInAppAlertsContext.openSource(company,entry),setBadge:count=>{if(badge){badge.hidden=count===null;badge.textContent=count===null?'':' ('+count+')';badge.setAttribute('aria-label',count===null?'':count+' unreviewed alerts');}},isOpen:()=>document.getElementById('alerts')?.classList.contains('current')===true});window.JGAPInAppAlerts.refreshCount();}
}
