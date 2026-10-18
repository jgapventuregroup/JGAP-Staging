import {projectPropertyPassport} from './property-passport.mjs';
import {loadOriginalPassportRecords} from './original-passport-loader.mjs';
import {describePassportEntry} from './original-passport-display.mjs';
import {createOriginalPassportForm} from './original-passport-forms.mjs';
import {saveOriginalPassportEntry} from './original-passport-writer.mjs';
import {summarizePropertyOperations} from './property-operations.mjs';
import {fetchPropertyOperations} from './property-operations-loader.mjs';
import {createPropertyActivityForm} from './property-activity-forms.mjs';

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
  eligibility={companyId:next?.companyId??null,enabled:next?.enabled===true};
}
function addAction({line,deal,companyId,client,getCurrentCompany,getCurrentClient,fetchDeal,fetchOperations}){
  if(!eligibility.enabled||eligibility.companyId!==companyId||!deal?.id)return;
  const button=document.createElement('button');
  button.type='button';
  button.textContent='Open Property Passport';
  button.setAttribute('aria-label','Open property passport for '+deal.name);
  button.onclick=async()=>{
    const current=++requestId;
    button.disabled=true;
    try{
      const response=await fetchDeal();
      if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      const record=Array.isArray(response)?response[0]:response;
      if(!record||record.id!==deal.id)throw Error('Property record did not match the selected property.');
      const p=projectPropertyPassport(record,companyId);
      // Operations are loaded only when a real, authorized data provider is wired in.
      // Do not display fictional or zero totals as though they were live data.
      let operations=null;
      if(typeof fetchOperations==='function'){
        const activity=await fetchOperations();
        if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
        operations=summarizePropertyOperations({...activity,asOfDate:[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-')});
      }
      panel?.remove();
      panel=document.createElement('section');
      const activePanel=panel;
      panel.setAttribute('aria-label','Property Passport');
      const heading=document.createElement('h2');
      heading.textContent=p.name+' — Property Passport';
      panel.append(heading);
      const close=document.createElement('button');
      close.type='button';close.textContent='Close Passport';close.setAttribute('aria-label','Close property passport preview');
      close.onclick=()=>{if(panel===close.parentNode){requestId++;panel.remove();panel=null;button.disabled=false;}};
      panel.append(close);
      // Recovered from the original Passport: browser print of the open record.
      // Print only this Passport, not the rest of the app workspace.
      const print=document.createElement('button');
      print.type='button';print.textContent='Print Passport';
      print.onclick=()=>{
        if(panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client)return;
        const printable=activePanel.cloneNode(true);
        printable.querySelectorAll('button,form,input,select,textarea').forEach(node=>node.remove());
        const printWindow=window.open('','_blank');
        if(!printWindow){window.alert('Allow pop-ups to print the Passport');return;}
        try{printWindow.opener=null;}catch{}
        const doc=printWindow.document;
        doc.title=p.name+' — Property Passport';
        const style=doc.createElement('style');style.textContent='body{font:15px system-ui,sans-serif;color:#172b42;max-width:760px;margin:35px auto;padding:0 18px}section{break-inside:avoid;margin:18px 0}h2,h3{color:#173b5c}p{margin:7px 0}';
        doc.head.append(style);doc.body.append(printable);
        printWindow.focus();printWindow.print();
      };
      panel.append(print);
      const passportMoney=new Set(['Purchase price','Current market value','Mortgage balance','Estimated equity','Target offer','Monthly rent','Operating expenses / month']);
      const formatPassportValue=(label,value)=>value===null?'Not recorded':passportMoney.has(label)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value):String(value);
      for(const [label,value] of [['Address',p.address],['Type',p.propertyType],['Stage',p.status],['Units',p.units],['Purchase price',p.purchasePrice],['Purchase date',p.purchaseDate],['Current market value',p.currentValue],['Mortgage balance',p.mortgageBalance],['Estimated equity',p.equity],['Target offer',p.targetOfferPrice],['Monthly rent',p.monthlyRent],['Operating expenses / month',p.monthlyOperatingExpenses],['Notes',p.notes],['Follow-up',p.followUpDate]]){
        const row=document.createElement('p');
        const strong=document.createElement('strong');
        strong.textContent=label+': ';
        row.append(strong,document.createTextNode(formatPassportValue(label,value)));
        panel.append(row);
      }
      if(window.JGAP_ORIGINAL_PASSPORT_TABLES_READY===true){
        const legacy=await loadOriginalPassportRecords({client,companyId,propertyId:record.id});
        if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
        const passportSections={};
        for(const [kind,title,key] of [['asset','Systems & equipment','assets'],['service','Service schedules','services'],['maintenance','Maintenance history','maintenance'],['improvement','Improvements','improvements']]){
          const section=document.createElement('section');const h=document.createElement('h3');h.textContent=title;section.append(h);
          const records=Array.isArray(legacy?.[key])?legacy[key]:[];
          for(const record of records){
            const row=document.createElement('p');row.textContent=describePassportEntry(kind,record);section.append(row);
          }
          if(!records.length){const empty=document.createElement('p');empty.textContent='No records yet';section.append(empty);}
          passportSections[key]=section;
          panel.append(section);
        }
        if(window.JGAP_ORIGINAL_PASSPORT_WRITES_READY===true){
          const editor=document.createElement('section');const heading=document.createElement('h3');heading.textContent='Add Passport records';editor.append(heading);
          for(const kind of ['asset','service','maintenance','improvement'])editor.append(createOriginalPassportForm(kind,async values=>{
            if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed');
            await saveOriginalPassportEntry({kind,values,client,companyId,dealId:record.id,getCurrentCompany,getCurrentClient});
            let updated;
            try{updated=await loadOriginalPassportRecords({client,companyId,propertyId:record.id});}
            catch(error){
              if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Passport context changed after save');
              const warning=document.createElement('p');warning.setAttribute('role','alert');warning.textContent='Record saved, but the Passport could not refresh. Close and reopen it to see the latest data.';editor.prepend(warning);
              return;
            }
            if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Passport context changed after refresh');
            const equipmentSelector=editor.querySelector('select[name="asset_id"]');
            if(equipmentSelector){const selected=equipmentSelector.value;equipmentSelector.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Select equipment';equipmentSelector.append(empty);for(const asset of updated.assets){const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name||'Unnamed equipment';equipmentSelector.append(option)}equipmentSelector.value=selected;}
            for(const [entryKind,key] of [['asset','assets'],['service','services'],['maintenance','maintenance'],['improvement','improvements']]){
              const section=passportSections[key];if(!section)continue;
              while(section.children.length>1)section.lastChild.remove();
              for(const item of updated[key]){const row=document.createElement('p');row.textContent=describePassportEntry(entryKind,item);section.append(row)}
              if(!updated[key].length){const empty=document.createElement('p');empty.textContent='No records yet';section.append(empty)}
            }
          },{assets:legacy.assets}));
          panel.append(editor);
        }
      }
      const operationsHeading=document.createElement('h3');
      operationsHeading.textContent='Property operations';
      panel.append(operationsHeading);
      if(operations){
        const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
        for(const [label,value] of [['Income',money(operations.cashFlow.income)],['Expenses',money(operations.cashFlow.expenses)],['Net cash flow',money(operations.cashFlow.net)],['Open repairs',operations.repairs.open],['Completed repairs',operations.repairs.completed],['Open tasks',operations.tasks.open],['Overdue tasks',operations.tasks.overdue]]){
          const row=document.createElement('p');
          const strong=document.createElement('strong');strong.textContent=label+': ';
          const span=document.createElement('span');span.dataset.activityTotal=({'Income':'income','Expenses':'expenses','Net cash flow':'net','Open repairs':'repairsOpen','Completed repairs':'repairsCompleted','Open tasks':'tasksOpen','Overdue tasks':'tasksOverdue'})[label];span.textContent=String(value);row.append(strong,span);panel.append(row);
        }
      }else{
        const unavailable=document.createElement('p');
        unavailable.textContent='Income, expenses, repairs, and tasks will appear here after secure staging integration.';
        panel.append(unavailable);
      }
      if(operations&&typeof fetchOperations==='function'&&window.JGAP_OPERATIONS_WRITES_READY===true){
        const forms=document.createElement('section');
        const formsTitle=document.createElement('h3');formsTitle.textContent='Add property activity';forms.append(formsTitle);
        for(const kind of ['ledger','repair','task'])forms.append(createPropertyActivityForm({kind,client,companyId,dealId:record.id,getCurrentCompany,getCurrentClient,onSaved:async()=>{
          if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
          const fresh=await fetchPropertyOperations({client,companyId,dealId:record.id});
          if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
          const summary=summarizePropertyOperations({...fresh,asOfDate:[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-')});
          for(const [key,value] of Object.entries({income:summary.cashFlow.income,expenses:summary.cashFlow.expenses,net:summary.cashFlow.net,repairsOpen:summary.repairs.open,repairsCompleted:summary.repairs.completed,tasksOpen:summary.tasks.open,tasksOverdue:summary.tasks.overdue})){
            const target=panel?.querySelector('[data-activity-total="'+key+'"]');
            if(target)target.textContent=['income','expenses','net'].includes(key)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value):String(value);
          }
        }}));
        panel.append(forms);
      }
      const note=document.createElement('small');
      note.textContent=operations?(window.JGAP_OPERATIONS_WRITES_READY===true?'Property activity entries save to the connected staging database.':'Operations data is read-only until secure write access is enabled.'):'Read-only preview. No changes are saved here.';
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
