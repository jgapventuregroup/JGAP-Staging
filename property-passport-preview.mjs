import {projectPropertyPassport} from './property-passport.mjs';

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
function addAction({line,deal,companyId,client,getCurrentCompany,getCurrentClient,fetchDeal}){
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
    }finally{button.disabled=false;}
  };
  line.append(button);
}
window.JGAPPassportPreview={clear,setEligibility,addAction};
