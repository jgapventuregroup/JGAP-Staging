// Recovered from JGAP-Venture-Group/finance-cpa.js: monthly/property filters,
// category totals, reconciliation/bookkeeping details and CSV. Adapted to the
// existing ledger and Pro-only RPCs; never selects the latest transaction ID.
const taxOptions=['review','deductible','capital','personal'];
const textFields={vendor_name:200,payment_method:100,account_name:150,receipt_reference:200,bookkeeping_notes:2000};
export function financeCents(value){
 const raw=String(value);
 if(!/^-?\d{1,28}(?:\.\d{1,2})?$/.test(raw))throw Error('Invalid financial amount');
 const negative=raw.startsWith('-'),[whole,fraction='']=raw.replace(/^-/,'').split('.');
 return (BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')))*(negative?-1n:1n);
}
export function formatFinanceMoney(value){
 const cents=financeCents(value),absolute=cents<0n?-cents:cents;
 return (cents<0n?'-':'')+'$'+(absolute/100n).toLocaleString('en-US')+'.'+String(absolute%100n).padStart(2,'0');
}
export function validateFinanceFilters(filters){
 if(!filters||!/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month)||filters.month.startsWith('0'))throw Error('Choose a valid report month');
 if(filters.reconciled!==null&&typeof filters.reconciled!=='boolean')throw Error('Invalid reconciliation filter');
 if(filters.taxTreatment!==null&&!taxOptions.includes(filters.taxTreatment))throw Error('Invalid tax filter');
 if(filters.dealId!==null&&(typeof filters.dealId!=='string'||!filters.dealId))throw Error('Invalid property filter');
 return filters;
}
export function validateBookkeeping(input){
 const result={};
 for(const [field,max] of Object.entries(textFields)){
  if(typeof input?.[field]!=='string'||input[field].length>max)throw Error('Check bookkeeping text lengths');result[field]=input[field].trim();
 }
 if(!taxOptions.includes(input.tax_treatment)||typeof input.reconciled!=='boolean')throw Error('Check tax treatment and reconciliation');
 return {...result,tax_treatment:input.tax_treatment,reconciled:input.reconciled};
}
const estimateFields=['offer','monthly_rent','other_monthly_income','vacancy_rate','monthly_operating_expenses','down_payment','interest_rate','loan_term_years'];
export function validateFinanceEstimate(estimate,filters){
 if(!estimate||typeof estimate!=='object'||Array.isArray(estimate))throw Error('Invalid saved estimate');
 if(!filters.dealId){if(estimate.status!=='property_required')throw Error('Comparison requires one property');return estimate;}
 if(filters.reconciled!==null||filters.taxTreatment!==null){if(estimate.status!=='unfiltered_required')throw Error('Comparison requires unfiltered month');return estimate;}
 if(estimate.status==='incomplete'){
  if(!Array.isArray(estimate.invalid_fields)||!estimate.invalid_fields.length||estimate.invalid_fields.length>estimateFields.length||new Set(estimate.invalid_fields).size!==estimate.invalid_fields.length||estimate.invalid_fields.some(field=>!estimateFields.includes(field)))throw Error('Invalid estimate input status');return estimate;
 }
 if(estimate.status!=='ready'||estimate.basis!=='current_saved_assumptions')throw Error('Invalid saved estimate status');
 const amounts=Object.fromEntries(['monthly_income','operating_expenses','mortgage_payment','total_outflows','net'].map(key=>[key,financeCents(estimate[key])]));
 if(['monthly_income','operating_expenses','mortgage_payment','total_outflows'].some(key=>amounts[key]<0n)||amounts.total_outflows!==amounts.operating_expenses+amounts.mortgage_payment||amounts.net!==amounts.monthly_income-amounts.total_outflows)throw Error('Saved estimate totals do not match');
 return estimate;
}
export function financeDifference(recorded,estimated){
 const cents=financeCents(recorded)-financeCents(estimated),absolute=cents<0n?-cents:cents;
 return (cents<0n?'-':'')+String(absolute/100n)+'.'+String(absolute%100n).padStart(2,'0');
}

export function validateFinanceReport(report,companyId,filters){
 validateFinanceFilters(filters);
 if(report?.estimate!==undefined)validateFinanceEstimate(report.estimate,filters);
 if(!report||report.company_id!==companyId||report.month!==filters.month||report.deal_id!==filters.dealId||report.reconciled!==filters.reconciled||report.tax_treatment!==filters.taxTreatment)throw Error('Report did not match the selected workspace and filters');
 if(!Array.isArray(report.entries)||!Array.isArray(report.categories)||report.entries.length>10000)throw Error('Invalid report history');
 let income=0n,expenses=0n,unreconciled=0;const categories=new Map(),seen=new Set();
 for(const entry of report.entries){
  if(!entry.entry_id||seen.has(entry.entry_id)||entry.company_id!==companyId||!entry.deal_id||(filters.dealId&&entry.deal_id!==filters.dealId))throw Error('Report contains an unexpected transaction');seen.add(entry.entry_id);
  if(typeof entry.entry_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(entry.entry_date)||entry.entry_date.slice(0,7)!==filters.month)throw Error('Transaction date is outside the report month');
  const date=new Date(entry.entry_date+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==entry.entry_date)throw Error('Invalid transaction date');
  if(!['income','expense'].includes(entry.entry_type)||typeof entry.category!=='string'||!entry.category.trim()||typeof entry.property_name!=='string'||typeof entry.reconciled!=='boolean'||!taxOptions.includes(entry.tax_treatment))throw Error('Invalid transaction details');
  if((filters.reconciled!==null&&entry.reconciled!==filters.reconciled)||(filters.taxTreatment!==null&&entry.tax_treatment!==filters.taxTreatment))throw Error('Transaction did not match report filters');
  for(const [field,max] of Object.entries(textFields))if(typeof entry[field]!=='string'||entry[field].length>max)throw Error('Invalid bookkeeping details');
  if(typeof entry.description!=='string')throw Error('Invalid transaction description');
  const amount=financeCents(entry.amount);if(amount<=0n||amount>999999999999n)throw Error('Invalid transaction amount');
  if(entry.entry_type==='income')income+=amount;else expenses+=amount;
  if(!entry.reconciled)unreconciled++;
  const category=categories.get(entry.category)||{income:0n,expenses:0n};category[entry.entry_type==='income'?'income':'expenses']+=amount;categories.set(entry.category,category);
 }
 const totals=report.totals;
 if(!totals||financeCents(totals.income)!==income||financeCents(totals.expenses)!==expenses||financeCents(totals.net)!==income-expenses||totals.count!==seen.size||totals.unreconciled!==unreconciled)throw Error('Report totals did not match transaction history');
 if(report.categories.length!==categories.size)throw Error('Category totals did not match history');
 const categoryNames=new Set();
 for(const row of report.categories){const sums=categories.get(row.category);if(!sums||categoryNames.has(row.category)||financeCents(row.income)!==sums.income||financeCents(row.expenses)!==sums.expenses||financeCents(row.net)!==sums.income-sums.expenses)throw Error('Invalid category total');categoryNames.add(row.category);}
 return report;
}
// Recover the original cash-source snapshot using recorded transactions only.
// Group by immutable property ID; identical display names must stay separate.
export function financePropertyBreakdown(report){
 validateFinanceReport(report,report?.company_id,{month:report?.month,dealId:report?.deal_id,reconciled:report?.reconciled,taxTreatment:report?.tax_treatment});
 const properties=new Map();
 for(const entry of report.entries){
  const row=properties.get(entry.deal_id)||{dealId:entry.deal_id,name:entry.property_name||'Unnamed property',income:0n,expenses:0n,count:0};
  row[entry.entry_type==='income'?'income':'expenses']+=financeCents(entry.amount);row.count++;properties.set(entry.deal_id,row);
 }
 const amount=cents=>(cents<0n?'-':'')+String((cents<0n?-cents:cents)/100n)+'.'+String((cents<0n?-cents:cents)%100n).padStart(2,'0');
 return [...properties.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.dealId.localeCompare(b.dealId)).map(row=>({dealId:row.dealId,name:row.name,income:amount(row.income),expenses:amount(row.expenses),net:amount(row.income-row.expenses),count:row.count}));
}

export function financeReportCSV(report){
 const cell=value=>{
  let text=String(value??'');
  // Quoting alone does not prevent spreadsheet formula execution.
  if(/^[\s\uFEFF]*[=+@-]/u.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
 };
 const headers=['Date','Type','Property','Category','Description','Vendor/Payee','Payment method','Account','Tax treatment','Receipt/reference','Reconciled','Amount','Bookkeeping notes','Transaction ID'];
 const rows=report.entries.map(e=>[e.entry_date,e.entry_type,e.property_name,e.category,e.description,e.vendor_name,e.payment_method,e.account_name,e.tax_treatment,e.receipt_reference,e.reconciled?'Yes':'No',e.amount,e.bookkeeping_notes,e.entry_id]);
 return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}

export function mountFinance({root,getContext,loadReport,saveDetails,download}){
 let sequence=0,activeCompany=null,report=null;
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);return node;};
 const clear=()=>{sequence++;activeCompany=null;report=null;root.replaceChildren();};
 const open=async()=>{
  clear();const scope=getContext();
  if(!scope?.companyId){root.append(el('p','Select a workspace to view financial reports.'));return;}
  if(!scope.canRead){root.append(el('p','Financial Reports requires active Pro access. Billing is not connected; this page cannot activate a subscription.'));return;}
  activeCompany=scope.companyId;
  const controls=el('form');controls.setAttribute('aria-label','Financial report filters');controls.className='grid';
  const field=(label,type,options)=>{
   const wrapper=el('label',label);const input=el(options?'select':'input');
   if(options){for(const [value,text] of options){const option=el('option',text);option.value=value;input.append(option);}input.value=options[0][0];}else input.type=type;
   wrapper.append(input);controls.append(wrapper);return input;
  };
  const month=field('Month','month');month.required=true;month.value=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
  const property=field('Property',null,[['','All properties'],...(scope.properties||[]).map(p=>[p.id,p.name])]);
  const recon=field('Reconciliation',null,[['','All'],['false','Unreconciled'],['true','Reconciled']]);
  const tax=field('Tax treatment',null,[['','All'],...taxOptions.map(v=>[v,v==='review'?'Bookkeeper/CPA review':v])]);
  const loadButton=el('button','Load report');loadButton.type='submit';controls.append(loadButton);
  const exportButton=el('button','Download bookkeeping CSV');exportButton.type='button';exportButton.disabled=true;
  const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const body=el('div');root.append(controls,exportButton,status,body);
  root.append(el('p','Reports use recorded property transactions. Add or change amounts in Property Passport → Operations. Reconciliation is a manual bookkeeping marker; no bank feed is connected.'));
  const filters=()=>validateFinanceFilters({month:month.value,dealId:property.value||null,reconciled:recon.value===''?null:recon.value==='true',taxTreatment:tax.value||null});
  const current=ticket=>sequence===ticket&&getContext()?.companyId===activeCompany&&getContext()?.canRead===true;
  const invalidate=()=>{sequence++;report=null;exportButton.disabled=true;body.replaceChildren();status.textContent='Filters changed. Load the report to see current results.';loadButton.disabled=false;};
  for(const input of [month,property,recon,tax]){input.addEventListener('change',invalidate);input.addEventListener('input',invalidate);}
  const table=(headings,rows)=>{
   const wrap=el('div');wrap.className='plan-table-wrap';const t=el('table');t.className='plan-table';
   const header=el('thead'),tr=el('tr');for(const heading of headings){const th=el('th',heading);th.setAttribute('scope','col');tr.append(th);}header.append(tr);t.append(header);
   const tbody=el('tbody');for(const cells of rows){const row=el('tr');for(const value of cells)row.append(el('td',value));tbody.append(row);}t.append(tbody);wrap.append(t);return wrap;
  };
  const render=selected=>{
   body.replaceChildren();const stats=el('div');stats.className='metric-grid';
   for(const [label,value] of [['Income',formatFinanceMoney(selected.totals.income)],['Expenses',formatFinanceMoney(selected.totals.expenses)],['Net recorded cash flow',formatFinanceMoney(selected.totals.net)],['Unreconciled',selected.totals.unreconciled]]){const card=el('div');card.className='metric';card.append(el('span',label),el('strong',value));stats.append(card);}body.append(stats);
   body.append(el('h2','Recorded cash flow by property'));
   body.append(el('p','Recorded transactions for '+selected.month+' and the selected filters only. Estimated rent is not added to recorded income. Properties without entries are not shown; missing records do not establish zero income or profit.'));
   const propertyRows=financePropertyBreakdown(selected);
   if(propertyRows.length)body.append(table(['Property','Recorded income','Recorded expenses','Recorded net','Entries'],propertyRows.map(row=>[row.name,formatFinanceMoney(row.income),formatFinanceMoney(row.expenses),formatFinanceMoney(row.net),row.count])));
   else body.append(el('p','No property transactions recorded for these filters.'));
   const estimate=selected.estimate;
   body.append(el('h2','Current saved estimate vs recorded month'));
   if(!selected.deal_id)body.append(el('p','Select one property to compare its saved monthly assumptions with recorded results.'));
   else if(selected.reconciled!==null||selected.tax_treatment!==null)body.append(el('p','Set Reconciliation and Tax treatment to All to compare the full recorded month.'));
   else if(!estimate)body.append(el('p','Saved estimate comparison is unavailable in this report.'));
   else if(estimate.status==='incomplete')body.append(el('p','Complete or correct the saved Analyzer assumptions before comparing: '+estimate.invalid_fields.map(field=>({offer:'offer/purchase price',monthly_rent:'monthly rent',other_monthly_income:'other monthly income',vacancy_rate:'vacancy rate',monthly_operating_expenses:'operating expenses',down_payment:'down payment',interest_rate:'interest rate',loan_term_years:'loan term'})[field]).join(', ')+'.'));
   else if(selected.totals.count===0)body.append(el('p','No transactions are recorded for this property and month. A recorded-results comparison is not available.'));
   else{
    body.append(el('p','Month: '+selected.month+'. The estimate uses current saved Analyzer assumptions, not a frozen purchase-time budget. Recorded books may be incomplete; differences are not performance ratings.'));
    body.append(table(['Measure','Current monthly estimate','Recorded in '+selected.month,'Recorded minus estimate'],[
     ['Income',estimate.monthly_income,selected.totals.income],
     ['Outflows',estimate.total_outflows,selected.totals.expenses],
     ['Net',estimate.net,selected.totals.net]
    ].map(([label,expected,actual])=>[label,formatFinanceMoney(expected),formatFinanceMoney(actual),formatFinanceMoney(financeDifference(actual,expected))])));
    body.append(el('p','Estimated income applies vacancy to rent, then adds other income. Estimated outflows: '+formatFinanceMoney(estimate.operating_expenses)+' operating expenses + '+formatFinanceMoney(estimate.mortgage_payment)+' primary mortgage payment. Recorded expenses include only entries you added, which may include capital costs or loan payments. Secondary loans, fees and missing transactions are not inferred. The bookkeeping CSV contains transactions, not this estimate.'));
   }
   body.append(el('h2','Category breakdown'),table(['Category','Income','Expenses','Net'],selected.categories.map(c=>[c.category,formatFinanceMoney(c.income),formatFinanceMoney(c.expenses),formatFinanceMoney(c.net)])));
   body.append(el('h2','Transaction history'));const list=el('div');body.append(list);let page=0;
   const renderPage=()=>{
    list.replaceChildren();const start=page*50,end=Math.min(start+50,selected.entries.length);list.append(el('p',selected.entries.length?`${start+1}–${end} of ${selected.entries.length} transactions`:'No transactions for these filters.'));
    for(const entry of selected.entries.slice(start,end)){
     const article=el('article');article.className='property-activity-record';article.append(el('strong',entry.property_name+' · '+entry.entry_date+' · '+formatFinanceMoney(entry.amount)),el('p',entry.entry_type+' · '+entry.category+' · '+entry.tax_treatment+' · '+(entry.reconciled?'Reconciled':'Unreconciled')),el('p',entry.description||''));
     const details=el('details');details.append(el('summary',getContext()?.canWrite?'Bookkeeping details / edit':'Bookkeeping details'));article.append(details);
     if(getContext()?.canWrite){
      const form=el('form');form.setAttribute('aria-label','Bookkeeping for '+entry.property_name+' on '+entry.entry_date);
      const fields={};
      for(const [key,label] of [['vendor_name','Vendor/payee'],['payment_method','Payment method'],['account_name','Account'],['receipt_reference','Receipt/reference'],['bookkeeping_notes','Bookkeeping notes']]){
       const wrapper=el('label',label),input=el(key==='bookkeeping_notes'?'textarea':'input');input.name=key;input.value=entry[key]||'';input.maxLength=textFields[key];wrapper.append(input);form.append(wrapper);fields[key]=input;
      }
      const taxLabel=el('label','Tax treatment'),taxInput=el('select');for(const value of taxOptions){const option=el('option',value==='review'?'Bookkeeper/CPA review':value);option.value=value;taxInput.append(option);}taxInput.value=entry.tax_treatment;taxLabel.append(taxInput);form.append(taxLabel);
      const reconLabel=el('label','Marked reconciled'),reconInput=el('input');reconInput.type='checkbox';reconInput.checked=entry.reconciled;reconInput.style.width='auto';reconLabel.append(reconInput);form.append(reconLabel);
      const save=el('button','Save bookkeeping details');save.type='submit';const message=el('p');message.setAttribute('role','status');form.append(save,message);details.append(form);let saving=false;
      form.addEventListener('submit',async event=>{
       event.preventDefault();const ticket=sequence;if(saving||!current(ticket)||!getContext()?.canWrite||!form.isConnected)return;
       saving=true;save.disabled=true;message.textContent='Saving…';
       try{
        const patch=validateBookkeeping({...Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value])),tax_treatment:taxInput.value,reconciled:reconInput.checked});
        await saveDetails(activeCompany,entry,patch);
        if(!current(ticket))return;
        message.textContent='Bookkeeping details saved.';
        const refreshed=await load();if(!refreshed&&getContext()?.companyId===activeCompany)status.textContent='Bookkeeping details saved, but the report could not refresh. Load it again before continuing.';
       }catch(error){if(current(ticket))message.textContent='Could not save bookkeeping: '+(error?.message||'Unknown error');}
       finally{saving=false;save.disabled=false;}
      });
     }else for(const [label,value] of [['Vendor/payee',entry.vendor_name],['Payment method',entry.payment_method],['Account',entry.account_name],['Receipt/reference',entry.receipt_reference],['Notes',entry.bookkeeping_notes]])details.append(el('p',label+': '+(value||'Not recorded')));
     list.append(article);
    }
    if(page>0){const prev=el('button','Previous 50');prev.type='button';prev.onclick=()=>{page--;renderPage();};list.append(prev);}
    if(end<selected.entries.length){const next=el('button','Next 50');next.type='button';next.onclick=()=>{page++;renderPage();};list.append(next);}
   };renderPage();
  };
  const load=async()=>{
   const ticket=++sequence;report=null;exportButton.disabled=true;body.replaceChildren();loadButton.disabled=true;status.textContent='Loading report…';
   try{const selection=filters();const response=await loadReport(activeCompany,selection);if(!current(ticket))return null;report=validateFinanceReport(response,activeCompany,selection);render(report);status.textContent='Loaded '+report.entries.length+' recorded transactions.';exportButton.disabled=false;return report;}
   catch(error){if(current(ticket))status.textContent='Could not load report: '+(error?.message||'Unknown error');return null;}
   finally{if(current(ticket))loadButton.disabled=false;}
  };
  controls.addEventListener('submit',event=>{event.preventDefault();load();});
  exportButton.onclick=async()=>{
   // Re-authorize and reload identical filters before exporting, not a stale cache.
   const latest=await load();if(!latest||getContext()?.companyId!==activeCompany||!getContext()?.canRead)return;
   download(financeReportCSV(latest),'The-Key-Ahead-Bookkeeping-'+latest.month+'.csv');
  };
  await load();
 };
 return {open,clear};
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const root=document.getElementById('finance-view');
 if(root){
  window.JGAPFinance=mountFinance({root,getContext:()=>window.JGAPFinanceContext?.scope(),loadReport:(company,filters)=>window.JGAPFinanceContext.load(company,filters),saveDetails:(company,entry,patch)=>window.JGAPFinanceContext.save(company,entry,patch),download:(csv,filename)=>{
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }});
  if(document.getElementById('finance')?.classList?.contains('current'))window.JGAPFinance.open();
 }
}
