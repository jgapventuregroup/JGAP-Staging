import {projectPropertyPassport} from './property-passport.mjs';
import {loadOriginalPassportRecords} from './original-passport-loader.mjs';
import {createPassportRecordsTable} from './original-passport-display.mjs';
import {createOriginalPassportForm,createPassportSystemForm} from './original-passport-forms.mjs';
import {saveOriginalPassportEntry,savePassportSystemWithService} from './original-passport-writer.mjs';
import {summarizePropertyOperations} from './property-operations.mjs';
import {fetchPropertyOperations} from './property-operations-loader.mjs';
import {createPropertyActivityForm} from './property-activity-forms.mjs';

export function validPassportPurchaseDate(date){
 return date===''||(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date);
}

// Read-only preview. Paid entitlement must be verified by the server before activation.
let eligibility={companyId:null,enabled:false};
let requestId=0;
let panel=null;
let expandedButton=null;
let pendingButton=null;
function markPassportButton(button,open){
  if(!button)return;
  button.textContent=open?'Close Passport':'Open Property Passport';
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',(open?'Close':'Open')+' property passport');
}
function releasePendingButton(){
  if(pendingButton)pendingButton.disabled=false;
  pendingButton=null;
}
function clear(){
  requestId++;
  releasePendingButton();
  eligibility={companyId:null,enabled:false};
  panel?.remove();
  panel=null;
  markPassportButton(expandedButton,false);
  expandedButton=null;
}
function setEligibility(next){
  requestId++;
  releasePendingButton();
  panel?.remove();
  panel=null;
  markPassportButton(expandedButton,false);
  expandedButton=null;
  eligibility={companyId:next?.companyId??null,enabled:next?.enabled===true};
}
function addAction({line,deal,companyId,client,getCurrentCompany,getCurrentClient,fetchDeal,fetchOperations}){
  if(!eligibility.enabled||eligibility.companyId!==companyId||!deal?.id)return;
  const button=document.createElement('button');
  button.type='button';
  button.textContent='Open Property Passport';
  button.setAttribute('title','View the saved property details and Passport records');
  button.setAttribute('aria-label','Open property passport for '+deal.name);
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls','property-passport-panel');
  button.onclick=async()=>{
    if(expandedButton===button&&panel){
      requestId++;
      panel.remove();
      panel=null;
      markPassportButton(button,false);
      expandedButton=null;
      return;
    }
    releasePendingButton();
    const current=++requestId;
    pendingButton=button;
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
      if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      panel?.remove();
      markPassportButton(expandedButton,false);
      expandedButton=null;
      panel=document.createElement('section');
      const activePanel=panel;
      panel.setAttribute('aria-label','Property Passport');
      panel.setAttribute('id','property-passport-panel');
      const heading=document.createElement('h2');
      heading.textContent=p.name+' — Property Passport';
      panel.append(heading);
      const close=document.createElement('button');
      close.type='button';close.textContent='Close Passport';close.setAttribute('aria-label','Close property passport preview');
      close.onclick=()=>{if(panel===activePanel){requestId++;panel.remove();panel=null;button.disabled=false;markPassportButton(button,false);if(expandedButton===button)expandedButton=null;}};
      panel.append(close);
      // Recovered from the original Passport: browser print of the open record.
      // Print only this Passport, not the rest of the app workspace.
      const print=document.createElement('button');
      print.type='button';print.textContent='Print Passport';
      print.onclick=()=>{
        if(current!==requestId||panel!==activePanel||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
        const printable=activePanel.cloneNode(true);
        // The on-screen tabs hide inactive sections. Printing must include the complete Passport.
        printable.querySelectorAll('[hidden]').forEach(node=>node.removeAttribute('hidden'));
        printable.querySelectorAll('[aria-hidden="true"]').forEach(node=>node.removeAttribute('aria-hidden'));
        printable.querySelectorAll('button,form,input,select,textarea,.passport-tabs').forEach(node=>node.remove());
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
      for(const [groupTitle,fields] of [
        ['Property details',[['Address',p.address],['Type',p.propertyType],['Stage',p.status],['Units',p.units],['Purchase date',p.purchaseDate]]],
        ['Financial snapshot',[['Purchase price',p.purchasePrice],['Current market value',p.currentValue],['Mortgage balance',p.mortgageBalance],['Estimated equity',p.equity],['Target offer',p.targetOfferPrice],['Monthly rent',p.monthlyRent],['Operating expenses / month',p.monthlyOperatingExpenses]]],
        ['Notes & next steps',[['Notes',p.notes],['Follow-up',p.followUpDate]]]
      ]){
        const group=document.createElement('section');
        group.setAttribute('aria-label',groupTitle);
        const groupHeading=document.createElement('h3');groupHeading.textContent=groupTitle;group.append(groupHeading);
        for(const [label,value] of fields){
          const row=document.createElement('p');
          const strong=document.createElement('strong');strong.textContent=label+': ';
          row.append(strong,document.createTextNode(formatPassportValue(label,value)));
          group.append(row);
        }
        panel.append(group);
      }
      // Financial edits are routed through the staging RPC; never update deals directly.
      const financeForm=document.createElement('form');
      financeForm.setAttribute('aria-label','Edit Passport financials');
      const financeTitle=document.createElement('h3');financeTitle.textContent='Update financial snapshot';financeForm.append(financeTitle);
      const financeFields=[
        ['p_purchase_date','Purchase date','date',p.purchaseDate],
        ['p_current_value','Current market value ($)','number',p.currentValue],
        ['p_mortgage_balance','Mortgage balance ($)','number',p.mortgageBalance]
      ];
      for(const [name,label,type,value] of financeFields){
        const field=document.createElement('label');field.textContent=label;
        const input=document.createElement('input');input.name=name;input.type=type;
        if(type==='number'){input.min='0';input.step='0.01';}
        input.value=value===null?'':String(value);field.append(input);financeForm.append(field);
      }
      const financeSave=document.createElement('button');financeSave.type='submit';financeSave.textContent='Save financial details';financeForm.append(financeSave);
      const financeStatus=document.createElement('p');financeStatus.setAttribute('role','status');financeForm.append(financeStatus);
      let financeSaveInFlight=false;
      financeForm.onsubmit=async event=>{
        event.preventDefault();
        if(financeSaveInFlight)return;
        const isCurrent=()=>current===requestId&&panel===activePanel&&getCurrentCompany()===companyId&&getCurrentClient()===client&&eligibility.enabled&&eligibility.companyId===companyId;
        if(!isCurrent())return;
        const date=financeForm.elements.namedItem('p_purchase_date').value;
        const currentValue=financeForm.elements.namedItem('p_current_value').value;
        const balance=financeForm.elements.namedItem('p_mortgage_balance').value;
        const validMoney=value=>value===''||(/^(?:\d+)(?:\.\d{1,2})?$/.test(value)&&Number.isFinite(Number(value)));
        if(!validMoney(currentValue)||!validMoney(balance)){financeStatus.textContent='Enter nonnegative dollar amounts with at most two decimals.';return;}
        if(!validPassportPurchaseDate(date)){financeStatus.textContent='Enter a valid purchase date.';return;}
        financeSaveInFlight=true;financeSave.disabled=true;financeStatus.textContent='Saving…';
        try{
          const {data,error}=await client.rpc('update_passport_financials',{
            p_company_id:companyId,p_deal_id:record.id,p_purchase_date:date||null,
            p_current_value:currentValue===''?null:Number(currentValue),
            p_mortgage_balance:balance===''?null:Number(balance)
          });
          if(error)throw error;
          if(!isCurrent())return;
          if(!data||data.id!==record.id||data.company_id!==companyId)throw Error('Save response did not match the property.');
          const refreshed=await fetchDeal();
          if(!isCurrent())return;
          const saved=Array.isArray(refreshed)?refreshed[0]:refreshed;
          if(!saved||saved.id!==record.id||saved.company_id!==companyId)throw Error('Could not verify saved property.');
          const next=projectPropertyPassport(saved,companyId);
          const expectedDate=date||null;
          const expectedValue=currentValue===''?null:Number(currentValue);
          const expectedBalance=balance===''?null:Number(balance);
          if(next.purchaseDate!==expectedDate||next.currentValue!==expectedValue||next.mortgageBalance!==expectedBalance)throw Error('Saved financial values could not be verified. Reopen the Passport and check the record.');
          for(const [group,label,value] of [['Property details','Purchase date',next.purchaseDate],['Financial snapshot','Current market value',next.currentValue],['Financial snapshot','Mortgage balance',next.mortgageBalance],['Financial snapshot','Estimated equity',next.equity]]){
            const section=Array.from(activePanel.querySelectorAll('section')).find(el=>el.getAttribute('aria-label')===group);
            const row=Array.from(section?.querySelectorAll('p')||[]).find(el=>el.querySelector('strong')?.textContent===label+': ');
            if(row)row.replaceChildren(Object.assign(document.createElement('strong'),{textContent:label+': '}),document.createTextNode(formatPassportValue(label,value)));
          }
          financeStatus.textContent='Financial details saved and verified from staging.';
        }catch(error){if(isCurrent())financeStatus.textContent='Could not save financial details: '+(error?.message||'Unknown error');}
        finally{financeSaveInFlight=false;if(isCurrent())financeSave.disabled=false;}
      };
      panel.append(financeForm);
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
      const accessNote=document.createElement('p');
      accessNote.setAttribute('role','status');
      accessNote.textContent=window.JGAP_ORIGINAL_PASSPORT_TABLES_READY===true ? (window.JGAP_ORIGINAL_PASSPORT_WRITES_READY===true ? 'Property records: viewing and editing enabled.' : 'Property records: read-only until secure editing is activated.') : 'Property records: preview only until secure database access is activated.';
      accessNote.className='passport-access-status';
      panel.append(accessNote);
      if(window.JGAP_ORIGINAL_PASSPORT_TABLES_READY===true){
        const legacy=await loadOriginalPassportRecords({client,companyId,propertyId:record.id});
        if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
        const passportSections={};
        for(const [kind,title,key] of [['asset','Systems & equipment','assets'],['service','Service schedules','services'],['maintenance','Maintenance history','maintenance'],['improvement','Improvements','improvements']]){
          const section=document.createElement('section');
          const records=Array.isArray(legacy?.[key])?legacy[key]:[];
          const h=document.createElement('h3');h.textContent=title+' ('+records.length+')';section.append(h);
          section.append(createPassportRecordsTable(kind,records,legacy.assets,legacy.services));
          passportSections[key]=section;
          panel.append(section);
        }
        if(window.JGAP_ORIGINAL_PASSPORT_WRITES_READY===true){
          const editor=document.createElement('section');editor.dataset.passportEditor='true';const heading=document.createElement('h3');heading.textContent='Add Passport records';editor.append(heading);
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
                    section.children[0].textContent=({assets:'Systems & equipment',services:'Service schedules',maintenance:'Maintenance history',improvements:'Improvements'})[key]+' ('+(saved[key]?.length??0)+')';
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
              section.children[0].textContent=({assets:'Systems & equipment',services:'Service schedules',maintenance:'Maintenance history',improvements:'Improvements'})[key]+' ('+(updated[key]?.length??0)+')';
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
              section.children[0].textContent=({assets:'Systems & equipment',services:'Service schedules',maintenance:'Maintenance history',improvements:'Improvements'})[key]+' ('+(updated[key]?.length??0)+')';
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
      note.setAttribute('role','status');
      note.textContent=operations?(window.JGAP_OPERATIONS_WRITES_READY===true?'Property activity entries save to the connected staging database.':'Operations data is read-only until secure write access is enabled.'):'Read-only preview. No changes are saved here.';
      panel.append(note);
      // Compact property workspace: one focused area at a time, without removing any data.
      const tabs=document.createElement('nav');
      tabs.className='passport-tabs';
      tabs.setAttribute('aria-label','Property Passport sections');
      const sections=Array.from(panel.children);
      const groups={
        Overview:sections.filter(node=>node.tagName==='SECTION'&&['Property details','Financial snapshot','Notes & next steps'].includes(node.getAttribute?.('aria-label'))),
        Financials:sections.filter(node=>node.tagName==='FORM'&&node.getAttribute?.('aria-label')==='Edit Passport financials'),
        Systems:[],
        Maintenance:[],
        Improvements:[],
        Operations:[]
      };
      let activeGroup='Overview';
      let sectionGroup='Overview';
      for(const node of sections){
        if(node.tagName==='H3'){
          if(node.textContent==='Property operations')sectionGroup='Operations';
          continue;
        }
        if(node.tagName==='SECTION'&&!node.getAttribute?.('aria-label')){
          const title=node.querySelector?.('h3')?.textContent||node.children?.[0]?.textContent||'';
          if(title.startsWith('Systems & equipment')||title.startsWith('Service schedules'))groups.Systems.push(node);
          else if(title.startsWith('Maintenance history'))groups.Maintenance.push(node);
          else if(title.startsWith('Improvements'))groups.Improvements.push(node);
          else if(title.startsWith('Add Passport records')){
            // Show the relevant editor only on its matching Passport tab.
            for(const name of ['Systems','Maintenance','Improvements'])groups[name].push(node);
          }
          else if(sectionGroup==='Operations')groups.Operations.push(node);
        }
        if(sectionGroup==='Operations'&&(node.tagName==='P'||node.tagName==='SMALL'))groups.Operations.push(node);
      }
      const operationalHeading=sections.find(node=>node.tagName==='H3'&&node.textContent==='Property operations');
      if(operationalHeading)groups.Operations.unshift(operationalHeading);
      const controlled=new Set(Object.values(groups).flat());
      const showGroup=name=>{
        activeGroup=name;
        for(const item of controlled){
          item.hidden=!groups[name].includes(item);
          if(item.dataset?.passportEditor==='true'){
            const editorHeading=item.querySelector('h3');
            if(editorHeading)editorHeading.textContent=name==='Systems'?'Add systems & service schedules':name==='Maintenance'?'Add maintenance record':'Add improvement';
            for(const form of item.querySelectorAll('form')){
              const heading=form.querySelector('h4')?.textContent||'';
              const kind=heading.startsWith('Add system')||heading==='Add service'?'Systems':heading==='Add maintenance'?'Maintenance':heading==='Add improvement'?'Improvements':null;
              form.hidden=kind!==name;
            }
          }
        }
        for(const tab of Array.from(tabs.children)){
          const selected=tab.textContent===name;
          tab.setAttribute('aria-selected',String(selected));
          tab.tabIndex=selected?0:-1;
        }
      };
      for(const name of Object.keys(groups)){
        if(name==='Financials'&&!groups.Financials.length)continue;
        const tab=document.createElement('button');
        tab.type='button';tab.className='passport-tab';tab.textContent=name;
        tab.setAttribute('role','tab');
        tab.setAttribute('aria-controls','property-passport-panel');
        tab.onclick=()=>showGroup(name);
        tab.onkeydown=event=>{
          if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
          event.preventDefault();
          const available=Array.from(tabs.children);
          const position=available.indexOf(tab);
          const next=event.key==='Home'?0:event.key==='End'?available.length-1:(position+(event.key==='ArrowRight'?1:-1)+available.length)%available.length;
          available[next]?.click();
          available[next]?.focus();
        };
        tabs.append(tab);
      }
      tabs.setAttribute('role','tablist');
      panel.append(tabs);
      showGroup(activeGroup);
      if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      const propertyList=line.parentElement;
      if(propertyList?.parentElement){
        propertyList.parentElement.insertBefore(panel,propertyList);
      }else{
        line.after(panel);
      }
      panel.setAttribute('tabindex','-1');
      panel.scrollIntoView?.({block:'start',behavior:'smooth'});
      panel.focus?.({preventScroll:true});
      markPassportButton(button,true);
      expandedButton=button;
    }catch(error){
      if(current!==requestId||getCurrentCompany()!==companyId||getCurrentClient()!==client||!eligibility.enabled||eligibility.companyId!==companyId)return;
      panel?.remove();
      markPassportButton(expandedButton,false);
      expandedButton=null;
      markPassportButton(button,false);
      panel=document.createElement('p');
      panel.setAttribute('role','alert');
      panel.textContent='Could not open Property Passport: '+(error?.message||'Unknown error');
      const propertyList=line.parentElement;
      if(propertyList?.parentElement)propertyList.parentElement.insertBefore(panel,propertyList);
      else line.after(panel);
      panel.scrollIntoView?.({block:'start'});
    }finally{if(pendingButton===button){button.disabled=false;pendingButton=null;}}
  };
  line.append(button);
}
window.JGAPPassportPreview={clear,setEligibility,addAction,fetchPropertyOperations};
window.dispatchEvent?.(new Event('jgap-passport-ready'));
