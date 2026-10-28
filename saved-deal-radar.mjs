import {financeCents,formatFinanceMoney} from './finance-cpa.mjs';
const labels={asking_price:'asking price',target_offer_price:'target offer',monthly_rent:'monthly rent',operating_expenses:'operating expenses',units:'unit count'};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function validateSavedRadar(report,companyId,asOf){
 if(report?.company_id!==companyId||report.as_of!==asOf||!validDate(asOf)||!Array.isArray(report.rows)||report.rows.length>10000)throw Error('Saved review did not match this workspace and date');
 const seen=new Set();
 for(const row of report.rows){
  if(!row?.id||seen.has(row.id)||row.company_id!==companyId||typeof row.name!=='string'||typeof row.status!=='string'||typeof row.property_type!=='string'||row.address!==null&&typeof row.address!=='string')throw Error('Invalid saved property response');seen.add(row.id);
  if(row.follow_up_date!==null&&!validDate(row.follow_up_date)||row.follow_up_due!==(row.follow_up_date!==null&&row.follow_up_date<=asOf))throw Error('Invalid follow-up date response');
  if(!Array.isArray(row.review_fields)||new Set(row.review_fields).size!==row.review_fields.length||row.review_fields.some(k=>!Object.hasOwn(labels,k)))throw Error('Invalid data-review response');
  for(const key of ['asking_price','target_offer_price'])if(row[key]!==null&&financeCents(row[key])<=0n)throw Error('Invalid saved price');
  if(row.asking_price===null||row.target_offer_price===null){if(row.asking_offer_gap!==null)throw Error('Gap needs both saved prices');}
  else if(financeCents(row.asking_offer_gap)!==financeCents(row.asking_price)-financeCents(row.target_offer_price))throw Error('Asking/target gap did not match saved prices');
 }
 return report;
}
export function filterSavedRadar(rows,{search='',filter='all',stage=''}={}){
 if(!['all','review','due','gap'].includes(filter))throw Error('Invalid review filter');
 const q=search.trim().toLocaleLowerCase();
 return rows.filter(row=>(!q||[row.name,row.address||'',row.property_type].join(' ').toLocaleLowerCase().includes(q))&&(!stage||row.status===stage)&&(filter==='all'||filter==='review'&&row.review_fields.length>0||filter==='due'&&row.follow_up_due||filter==='gap'&&row.asking_offer_gap!==null&&financeCents(row.asking_offer_gap)>0n));
}
export function mountSavedRadar({root,getContext,load,openProperties}){
 let sequence=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};
 const clear=()=>{sequence++;root.replaceChildren();};
 const open=async()=>{
  clear();const scope=getContext();if(!scope?.companyId||scope.canRead!==true){root.append(el('p','Saved Deal Radar requires a selected workspace with active Pro access.'));return;}
  const companyId=scope.companyId,ticket=sequence,current=()=>sequence===ticket&&getContext()?.companyId===companyId&&getContext()?.canRead===true;
  const status=el('p','Loading saved-deal review…');status.setAttribute('role','status');root.append(status);
  const date=new Date(),asOf=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  try{
   const response=await load(companyId,asOf);if(!current())return;const report=validateSavedRadar(response,companyId,asOf);
   const toolbar=el('div');toolbar.className='grid';
   const field=(label,node)=>{const wrapper=el('label',label);wrapper.append(node);toolbar.append(wrapper);return node;};
   const search=field('Search saved properties',el('input'));search.type='search';search.maxLength=150;search.value='';
   const filter=field('Review focus',el('select'));for(const [value,name] of [['all','All saved properties'],['review','Missing or zero data to verify'],['due','Follow-up due through '+asOf],['gap','Asking price above target']]){const option=el('option',name);option.value=value;filter.append(option);}filter.value='all';
   const stage=field('Pipeline stage',el('select'));for(const value of ['',...[...new Set(report.rows.map(r=>r.status))].sort()]){const option=el('option',value?value.replaceAll('_',' '):'All stages');option.value=value;stage.append(option);}stage.value='';
   const reload=el('button','Refresh saved review');reload.type='button';reload.onclick=()=>{if(current())open();};
   const properties=el('button','Open My properties');properties.type='button';properties.onclick=()=>{if(current())openProperties?.();};
   const list=el('div');let page=0;root.append(toolbar,reload,properties,list);
   const render=()=>{
    if(!current())return;list.replaceChildren();const rows=filterSavedRadar(report.rows,{search:search.value,filter:filter.value,stage:stage.value});const start=page*50,end=Math.min(start+50,rows.length);
    status.textContent=rows.length+' of '+report.rows.length+' saved properties match · reviewed as of '+asOf+'.';
    if(!rows.length){list.append(el('p',report.rows.length?'No saved properties match these filters.':'No saved properties in this workspace. This is not a scan for new listings.'));return;}
    list.append(el('p',`${start+1}–${end} of ${rows.length} matching saved properties`));
    for(const row of rows.slice(start,end)){
     const card=el('details');card.className='property-activity-record record-disclosure';const summary=el('summary'),meta=el('span','Stage: '+row.status.replaceAll('_',' ')+(row.follow_up_due?' · Follow-up due':'')+(row.review_fields.length?' · Data to verify':''));meta.className='record-meta';summary.append(el('strong',row.name),meta);card.append(summary,el('p',row.address||'Address not recorded'),el('p','Property type: '+row.property_type));
     const money=v=>v===null?'Not recorded':formatFinanceMoney(v);
     card.append(el('p','Saved asking price: '+money(row.asking_price)+' · Saved target: '+money(row.target_offer_price)+' · Asking minus target: '+money(row.asking_offer_gap)));
     card.append(el('p','Follow-up: '+(row.follow_up_date||'Not scheduled')+(row.follow_up_due?' · Due through '+asOf:'')));
     card.append(el('p',row.review_fields.length?'Verify missing, zero or invalid inputs: '+row.review_fields.map(k=>labels[k]).join(', ')+'.':'The reviewed fields are recorded; their accuracy is not independently verified.'));
     list.append(card);
    }
    if(page>0){const prev=el('button','Previous 50 saved properties');prev.type='button';prev.onclick=()=>{page--;render();};list.append(prev);}
    if(end<rows.length){const next=el('button','Next 50 saved properties');next.type='button';next.onclick=()=>{page++;render();};list.append(next);}
   };
   for(const node of [search,filter,stage]){const change=()=>{page=0;render();};node.addEventListener('input',change);node.addEventListener('change',change);}render();
  }catch(error){if(current())status.textContent='Could not load saved-deal review: '+(error?.message||'Unknown error');}
 };
 return {open,clear};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 const root=document.getElementById('radar-view');if(root){window.JGAPSavedRadar=mountSavedRadar({root,getContext:()=>window.JGAPSavedRadarContext?.scope(),load:(company,date)=>window.JGAPSavedRadarContext.load(company,date),openProperties:()=>window.JGAPSavedRadarContext.openProperties()});if(document.getElementById('radar')?.classList.contains('current'))window.JGAPSavedRadar.open();}
}
