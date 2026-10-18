import {projectPropertyPassport} from './property-passport.mjs';
import {loadOriginalPassportRecords} from './original-passport-loader.mjs';
import {createPassportRecordsTable} from './original-passport-display.mjs';
import {createOriginalPassportForm,createPassportSystemForm} from './original-passport-forms.mjs';
import {saveOriginalPassportEntry,savePassportSystemWithService} from './original-passport-writer.mjs';
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
      if(getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      const response=await fetchDeal();
      if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      const record=Array.isArray(response)?response[0]:response;
      if(!record||record.id!==deal.id||record.company_id!==companyId)throw Error('Property record did not match the selected company and property.');
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
      if(window.JGAP_ORIGINAL_PASSPORT_TABLES_READY!==true){
        const unavailable=document.createElement('section');unavailable.setAttribute('aria-label','Passport record sections');
        const heading=document.createElement('h3');heading.textContent='Property records';unavailable.append(heading);
        const message=document.createElement('p');message.textContent='Your saved property is available above. The original Passport record sections below will become editable after their secure database tables and access rules are approved and activated.';unavailable.append(message);
        for(const [label,description] of [
          ['Systems & equipment','Record major appliances, HVAC, roofs, installation dates, warranties, and condition.'],
          ['Service schedules','Link recurring inspections and servicing to existing equipment.'],
          ['Maintenance history','Track repairs, dates, costs, contractors, and upcoming work.'],
          ['Property improvements','Document upgrades, project dates, categories, and costs.']
        ]){
          const section=document.createElement('section');
          const title=document.createElement('h4');title.textContent=label;section.append(title);
          const detail=document.createElement('p');detail.textContent=description;section.append(detail);
          const state=document.createElement('p');state.textContent='Not yet connected — no records loaded or saved.';section.append(state);
          unavailable.append(section);
        }
        panel.append(unavailable);
      }
      if(window.JGAP_ORIGINAL_PASSPORT_TABLES_READY===true){
        const legacy=await loadOriginalPassportRecords({client,companyId,propertyId:record.id});
        if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
        const passportSections={};
        for(const [kind,title,key] of [['asset','Systems & equipment','assets'],['service','Service schedules','services'],['maintenance','Maintenance history','maintenance'],['improvement','Improvements','improvements']]){
          const section=document.createElement('section');const h=document.createElement('h3');h.textContent=title;section.append(h);
          const records=Array.isArray(legacy?.[key])?legacy[key]:[];
          section.append(createPassportRecordsTable(kind,records,legacy.assets,legacy.services));
          passportSections[key]=section;
          panel.append(section);
        }
        if(window.JGAP_ORIGINAL_PASSPORT_WRITES_READY===true){
          const editor=document.createElement('section');const heading=document.createElement('h3');heading.textContent='Add Passport records';editor.append(heading);
          for(const kind of ['asset','service','maintenance','improvement'])editor.append((kind==='asset'?createPassportSystemForm:createOriginalPassportForm)(kind==='asset'?async ({assetValues,serviceValues})=>{
            if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed');
            try{
              await savePassportSystemWithService({assetValues,serviceValues,client,companyId,dealId:record.id,getCurrentCompany,getCurrentClient});
            }catch(error){
              if(error?.partialSave){
                if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed after partial save');
                try{
                  const saved=await loadOriginalPassportRecords({client,companyId,propertyId:record.id});
                  if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed after partial save');
                  const selector=editor.querySelector('select[name="asset_id"]');
                  if(selector){
                    selector.replaceChildren();
                    const empty=document.createElement('option');empty.value='';empty.textContent='Select equipment';selector.append(empty);
                    for(const asset of saved.assets){if(!asset?.id||!asset?.name)continue;const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;selector.append(option)}
                    selector.value=saved.assets.some(asset=>asset.id===error.assetId)?error.assetId:'';
                    const serviceForm=selector.closest?.('form');
                    if(selector.value===error.assetId&&serviceForm&&serviceValues){
                      const recovery=document.createElement('p');recovery.setAttribute('role','status');recovery.textContent='Equipment was saved. Review the restored schedule details, then save the schedule for this existing equipment.';serviceForm.prepend(recovery);
                      for(const [key,value] of Object.entries(serviceValues)){
                        if(key==='asset_id'||value===undefined||value===null)continue;
                        const field=serviceForm.elements?.namedItem(key);
                        if(field)field.value=String(value);
                      }
                    }
                    const submit=serviceForm?.querySelector?.('button[type="submit"]');
                    if(submit)submit.disabled=!saved.assets.some(asset=>asset?.id&&asset?.name);
                    const guidance=serviceForm?.querySelector?.('[data-service-guidance]');
                    if(guidance)guidance.hidden=saved.assets.some(asset=>asset?.id&&asset?.name);
                  }
                  for(const [entryKind,key] of [['asset','assets'],['service','services'],['maintenance','maintenance'],['improvement','improvements']]){
                    const section=passportSections[key];if(!section)continue;
                    while(section.children.length>1)section.lastChild.remove();
                    section.append(createPassportRecordsTable(entryKind,saved[key],saved.assets,saved.services));
                  }
                }catch(refreshError){
                  if(refreshError?.message==='Passport context changed after partial save')throw refreshError;
                  if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed after partial save');
                  const warning=document.createElement('p');warning.setAttribute('role','alert');
                  warning.textContent='Equipment saved, but Passport could not refresh. Reopen it before adding a service schedule.';editor.prepend(warning);
                }
              }
              throw error;
            }
            let updated;
            try{updated=await loadOriginalPassportRecords({client,companyId,propertyId:record.id});}
            catch(error){
              if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed after save');
              const warning=document.createElement('p');warning.setAttribute('role','alert');warning.textContent='Record saved, but the Passport could not refresh. Close and reopen it to see the latest data.';editor.prepend(warning);
              return;
            }
            if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed after refresh');
            const equipmentSelector=editor.querySelector('select[name="asset_id"]');
            if(equipmentSelector){const selected=equipmentSelector.value;equipmentSelector.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Select equipment';equipmentSelector.append(empty);for(const asset of updated.assets){if(!asset?.id||!asset?.name)continue;const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;equipmentSelector.append(option)}equipmentSelector.value=updated.assets.some(asset=>asset?.id===selected)?selected:'';const serviceForm=equipmentSelector.closest?.('form');const saveService=serviceForm?.querySelector?.('button[type="submit"]');if(saveService)saveService.disabled=!updated.assets.some(asset=>asset?.id&&asset?.name);const guidance=serviceForm?.querySelector?.('[data-service-guidance]');if(guidance)guidance.hidden=updated.assets.some(asset=>asset?.id&&asset?.name);}
            for(const [entryKind,key] of [['asset','assets'],['service','services'],['maintenance','maintenance'],['improvement','improvements']]){
              const section=passportSections[key];if(!section)continue;
              while(section.children.length>1)section.lastChild.remove();
              section.append(createPassportRecordsTable(entryKind,updated[key],updated.assets,updated.services));
            }
          }:async values=>{
            if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed');
            await saveOriginalPassportEntry({kind,values,client,companyId,dealId:record.id,getCurrentCompany,getCurrentClient});
            let updated;
            try{updated=await loadOriginalPassportRecords({client,companyId,propertyId:record.id});}
            catch(error){
              if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed after save');
              const warning=document.createElement('p');warning.setAttribute('role','alert');warning.textContent='Record saved, but the Passport could not refresh. Close and reopen it to see the latest data.';editor.prepend(warning);
              return;
            }
            if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)throw Error('Passport context changed after refresh');
            const equipmentSelector=editor.querySelector('select[name="asset_id"]');
            if(equipmentSelector){
              const selected=equipmentSelector.value;
              equipmentSelector.replaceChildren();
              const empty=document.createElement('option');empty.value='';empty.textContent='Select equipment';equipmentSelector.append(empty);
              for(const asset of updated.assets){if(!asset?.id||!asset?.name)continue;const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;equipmentSelector.append(option)}
              equipmentSelector.value=updated.assets.some(asset=>asset?.id===selected)?selected:'';
              const serviceForm=equipmentSelector.closest?.('form');
              const saveService=serviceForm?.querySelector?.('button[type="submit"]');
              if(saveService)saveService.disabled=!updated.assets.some(asset=>asset?.id&&asset?.name);
              const guidance=serviceForm?.querySelector?.('[data-service-guidance]');
              if(guidance)guidance.hidden=updated.assets.some(asset=>asset?.id&&asset?.name);
            }
            for(const [entryKind,key] of [['asset','assets'],['service','services'],['maintenance','maintenance'],['improvement','improvements']]){
              const section=passportSections[key];if(!section)continue;
              while(section.children.length>1)section.lastChild.remove();
              section.append(createPassportRecordsTable(entryKind,updated[key],updated.assets,updated.services));
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
