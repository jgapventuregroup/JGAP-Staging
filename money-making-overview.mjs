import {financeCents,formatFinanceMoney,validateFinanceReport,validateFinanceFilters} from './finance-cpa.mjs';
export function validateMoneyOverview(result,companyId,month){
 if(result?.company_id!==companyId||result.month!==month||!result.groups)throw Error('Money overview did not match this workspace and month');
 for(const key of ['all_saved','closed_stage']){
  const g=result.groups[key];if(!g||!Number.isInteger(g.count)||g.count<0)throw Error('Invalid property coverage');
  for(const field of ['value_count','debt_count','equity_count'])if(!Number.isInteger(g[field])||g[field]<0||g[field]>g.count)throw Error('Invalid recorded-value coverage');
  if(g.equity_count>Math.min(g.value_count,g.debt_count))throw Error('Invalid matched-equity coverage');
  for(const [total,count] of [['value_total','value_count'],['debt_total','debt_count'],['paired_equity','equity_count']]){
   if(g[count]===0){if(g[total]!==null)throw Error('Unknown totals must remain unknown');}
   else if(financeCents(g[total])<0n&&total!=='paired_equity')throw Error('Invalid recorded balance');
  }
 }
 if(result.groups.closed_stage.count>result.groups.all_saved.count)throw Error('Closed-stage coverage exceeds saved properties');
 validateFinanceReport(result.recorded,companyId,{month,dealId:null,reconciled:null,taxTreatment:null});return result;
}
export function mountMoneyOverview({root,getContext,load,navigate}){
 let sequence=0;const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};const clear=()=>{sequence++;root.replaceChildren();};
 const open=async()=>{
  clear();const scope=getContext();if(!scope?.companyId||scope.canRead!==true){root.append(el('p','Money-Making overview requires a selected workspace with active Pro access.'));return;}
  const companyId=scope.companyId,current=ticket=>sequence===ticket&&getContext()?.companyId===companyId&&getContext()?.canRead===true;
  const form=el('form');form.className='grid';form.setAttribute('aria-label','Money overview controls');
  const monthLabel=el('label','Recorded activity month'),month=el('input');month.type='month';month.required=true;month.value=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');monthLabel.append(month);
  const groupLabel=el('label','Current saved-value scope'),group=el('select');for(const [value,label] of [['closed_stage','Closed-stage records'],['all_saved','All saved properties']]){const option=el('option',label);option.value=value;group.append(option);}group.value='closed_stage';groupLabel.append(group);
  const refresh=el('button','Load money overview');refresh.type='submit';form.append(monthLabel,groupLabel,refresh);const message=el('p');message.setAttribute('role','status');const body=el('div');root.append(form,message,body);
  let overview=null;
  const render=()=>{
   body.replaceChildren();if(!overview||!current(sequence))return;const g=overview.groups[group.value];if(!g)throw Error('Choose a valid saved-value scope');
   body.append(el('h2',group.value==='closed_stage'?'Current values · Closed-stage records':'Current values · All saved properties'));
   body.append(el('p',g.count+' saved records in this scope. Current values are user-recorded snapshots, not valuations for the selected activity month. Closed is a pipeline stage, not proof of legal ownership.'));
   const grid=el('div');grid.className='metric-grid';
   for(const [title,key,count] of [['Recorded value','value_total','value_count'],['Recorded mortgage debt','debt_total','debt_count'],['Equity on matched records','paired_equity','equity_count']]){const card=el('div');card.className='metric';card.append(el('span',title),el('strong',g[key]===null?'Not recorded':formatFinanceMoney(g[key])),el('p',g[count]+' of '+g.count+' records covered'));grid.append(card);}body.append(grid);
   body.append(el('p','Equity includes only the same records with both value and mortgage balance recorded. Unknown amounts are excluded, not assumed to be zero. Genuine recorded zero debt is included. Equity is before selling costs and other liens.'));
   const t=overview.recorded.totals;body.append(el('h2','Recorded activity · whole workspace · '+overview.month));
   if(!t.count)body.append(el('p','No transactions recorded for this month. Missing transactions do not establish zero income, zero expenses or verified performance.'));
   else{
    const stats=el('div');stats.className='metric-grid';for(const [name,value] of [['Recorded income',t.income],['Recorded expenses',t.expenses],['Recorded net',t.net]]){const card=el('div');card.className='metric';card.append(el('span',name),el('strong',formatFinanceMoney(value)));stats.append(card);}body.append(stats,el('p',t.count+' recorded transactions across all workspace properties. This activity is not filtered by the saved-value scope above. Estimated rent is not added; missing loan payments, costs and other activity are not inferred.'));
   }
  };
  const fetch=async()=>{
   const ticket=++sequence;overview=null;body.replaceChildren();if(!current(ticket))return;refresh.disabled=true;message.textContent='Loading money overview…';
   try{const selected=month.value;validateFinanceFilters({month:selected,dealId:null,reconciled:null,taxTreatment:null});const response=await load(companyId,selected);if(!current(ticket))return;overview=validateMoneyOverview(response,companyId,selected);render();message.textContent='Loaded current saved values and recorded-month activity.';}
   catch(error){if(current(ticket))message.textContent='Could not load money overview: '+(error?.message||'Unknown error');}
   finally{if(current(ticket))refresh.disabled=false;}
  };
  form.addEventListener('submit',event=>{event.preventDefault();fetch();});const invalidate=()=>{sequence++;overview=null;body.replaceChildren();refresh.disabled=false;message.textContent='Month changed. Load the overview again.';};month.addEventListener('input',invalidate);month.addEventListener('change',invalidate);group.addEventListener('change',()=>{if(current(sequence))render();});
  const links=el('div');links.className='actions';for(const [page,label] of [['properties','Update property records'],['finance','Reports and seller-financing playbook'],['radar','Review saved deals']]){const button=el('button',label);button.type='button';button.onclick=()=>{if(getContext()?.companyId===companyId&&getContext()?.canRead===true)navigate(page);};links.append(button);}root.append(links);await fetch();
 };
 return {open,clear};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const root=document.getElementById('money-view');if(root){window.JGAPMoneyOverview=mountMoneyOverview({root,getContext:()=>window.JGAPMoneyOverviewContext?.scope(),load:(company,month)=>window.JGAPMoneyOverviewContext.load(company,month),navigate:page=>window.JGAPMoneyOverviewContext.navigate(page)});if(document.getElementById('money')?.classList.contains('current'))window.JGAPMoneyOverview.open();}
}
