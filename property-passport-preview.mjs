import {projectPropertyPassport} from './property-passport.mjs';
import {summarizePropertyOperations} from './property-operations.mjs';
import {fetchPropertyOperations} from './property-operations-loader.mjs';

// Read-only preview. Paid entitlement must be verified by the server before activation.
let eligibility={companyId:null,enabled:false};
let requestId=0;
let panel=null;
function clear(){
  requestId++;
  eligibility={companyId:null,enabled:false};
  panel?.remove();
  panel=null;
}
function setEligibility(next){
  requestId++;
  panel?.remove();
  panel=null;
  eligibility={companyId:next.companyId,enabled:next.enabled===true};
}
function addAction({line,deal,companyId,client,getCurrentCompany,getCurrentClient,fetchDeal,fetchOperations}){
  if(!eligibility.enabled||eligibility.companyId!==companyId)return;
  const button=document.createElement('button');
  button.type='button';
  button.textContent='Passport preview';
  button.setAttribute('aria-label','Preview property passport for '+deal.name);
  button.onclick=async()=>{
    const current=++requestId;
    button.disabled=true;
    try{
      const response=await fetchDeal();
      if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      const record=Array.isArray(response)?response[0]:response;
      const p=projectPropertyPassport(record,companyId);
      // Operations are loaded only when a real, authorized data provider is wired in.
      // Do not display fictional or zero totals as though they were live data.
      let operations=null;
      if(typeof fetchOperations==='function'){
        const activity=await fetchOperations();
        if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
        operations=summarizePropertyOperations({...activity,asOfDate:new Date().toISOString().slice(0,10)});
      }
      panel?.remove();
      panel=document.createElement('section');
      panel.setAttribute('aria-label','Property Passport preview');
      const heading=document.createElement('h2');
      heading.textContent=p.name+' — Passport preview';
      panel.append(heading);
      for(const [label,value] of [['Address',p.address],['Type',p.propertyType],['Stage',p.status],['Units',p.units],['Purchase price',p.purchasePrice],['Target offer',p.targetOfferPrice],['Monthly rent',p.monthlyRent],['Operating expenses / month',p.monthlyOperatingExpenses],['Notes',p.notes],['Follow-up',p.followUpDate]]){
        const row=document.createElement('p');
        const strong=document.createElement('strong');
        strong.textContent=label+': ';
        row.append(strong,document.createTextNode(value===null?'Not recorded':String(value)));
        panel.append(row);
      }
      const operationsHeading=document.createElement('h3');
      operationsHeading.textContent='Property operations';
      panel.append(operationsHeading);
      if(operations){
        const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
        for(const [label,value] of [['Income',money(operations.cashFlow.income)],['Expenses',money(operations.cashFlow.expenses)],['Net cash flow',money(operations.cashFlow.net)],['Open repairs',operations.repairs.open],['Completed repairs',operations.repairs.completed],['Open tasks',operations.tasks.open],['Overdue tasks',operations.tasks.overdue]]){
          const row=document.createElement('p');
          const strong=document.createElement('strong');strong.textContent=label+': ';
          row.append(strong,document.createTextNode(String(value)));panel.append(row);
        }
      }else{
        const unavailable=document.createElement('p');
        unavailable.textContent='Income, expenses, repairs, and tasks will appear here after secure staging integration.';
        panel.append(unavailable);
      }
      const note=document.createElement('small');
      note.textContent='Read-only preview. No changes are saved here.';
      panel.append(note);
      line.after(panel);
      panel.scrollIntoView?.({block:'nearest'});
    }catch(error){
      if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      panel?.remove();
      panel=document.createElement('p');
      panel.setAttribute('role','alert');
      panel.textContent='Could not open Property Passport: '+(error?.message||'Unknown error');
      line.after(panel);
    }finally{if(current===requestId)button.disabled=false;}
  };
  line.append(button);
}
window.JGAPPassportPreview={clear,setEligibility,addAction,fetchPropertyOperations};
window.dispatchEvent?.(new Event('jgap-passport-ready'));
