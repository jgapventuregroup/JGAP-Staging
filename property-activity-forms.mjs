import {savePropertyActivity} from './property-activity-writer.mjs';

const definitions={
 ledger:{title:'income or expense',fields:[['entryType','Type','select',['income','expense']],['entryDate','Date','date'],['category','Category','text'],['amount','Amount ($)','number'],['description','Description','text']]},
 repair:{title:'repair',fields:[['title','Repair title','text'],['status','Status','select',['open','in_progress','completed']],['openedOn','Opened on','date'],['completedOn','Completed on','date'],['estimatedCost','Estimated cost ($)','number'],['actualCost','Actual cost ($)','number'],['description','Description','text']]},
 task:{title:'task',fields:[['title','Task title','text'],['status','Status','select',['open','done']],['dueOn','Due date','date'],['details','Details','text']]}
};
const storedField={entryType:'entry_type',entryDate:'entry_date',openedOn:'opened_on',completedOn:'completed_on',estimatedCost:'estimated_cost',actualCost:'actual_cost',dueOn:'due_on'};
const today=()=>[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-');
export function createPropertyActivityForm({kind,client,companyId,dealId,onSaved,getCurrentCompany,getCurrentClient,entry=null}){
 const definition=definitions[kind];
 if(!definition)throw Error('Unknown property activity form');
 if(!client||!companyId||!dealId)throw Error('Property activity requires an active company and property');
 if(entry&&(!entry.id||entry.company_id!==companyId||entry.deal_id!==dealId))throw Error('Activity does not belong to this property');
 const form=document.createElement('form');
 form.setAttribute('aria-label',(entry?'Edit ':'Add ')+definition.title);
 const title=document.createElement('h4');title.textContent=(entry?'Edit ':'Add ')+definition.title;form.append(title);
 const controls={};
 for(const [name,label,type,options] of definition.fields){
  const wrapper=document.createElement('label');wrapper.textContent=label+' ';
  const field=document.createElement(type==='select'?'select':'input');
  if(type==='select'){for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=value.replaceAll('_',' ');field.append(option);}field.value=options[0];}
  else{field.type=type;if(type==='number'){field.step='0.01';field.min='0';field.max='9999999999.99';}}
  field.name=name;
  if(entry)field.value=entry[storedField[name]||name]??'';
  else if(name==='entryDate'||name==='openedOn')field.value=today();
  if(['title','category','amount','entryDate','openedOn'].includes(name))field.required=true;
  if(type==='text')field.maxLength=name==='title'?150:name==='category'?80:2000;
  if(name==='amount')field.min='0.01';
  wrapper.append(field);form.append(wrapper);controls[name]=field;
 }
 const message=document.createElement('p');message.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.textContent=entry?'Save changes':'Save '+kind;
 form.append(submit,message);
 let pending=false,refreshBlocked=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(pending||refreshBlocked)return;
  if(getCurrentCompany?.()!==companyId||getCurrentClient?.()!==client||!form.isConnected){message.textContent='Property view changed. Reopen the property.';return;}
  pending=true;submit.disabled=true;message.textContent='Saving…';
  try{
   const input=Object.fromEntries(Object.entries(controls).map(([key,field])=>[key,field.value]));
   await savePropertyActivity({client,companyId,dealId,kind,input,recordId:entry?.id??null,getCurrentCompany,getCurrentClient});
   if(getCurrentCompany?.()!==companyId||getCurrentClient?.()!==client||!form.isConnected)return;
   message.textContent='Saved successfully';
   if(!entry){
    const selectedEntryType=controls.entryType?.value;
    form.reset();
    if(controls.entryType&&selectedEntryType)controls.entryType.value=selectedEntryType;
    for(const key of ['entryDate','openedOn'])if(controls[key])controls[key].value=today();
   }
   try{await onSaved?.();}catch{
    if(form.isConnected&&getCurrentCompany?.()===companyId&&getCurrentClient?.()===client){
     refreshBlocked=true;message.textContent='Saved, but activity could not refresh. Close and reopen the Passport before adding or editing more records.';
    }
   }
  }catch(error){if(form.isConnected&&getCurrentCompany?.()===companyId&&getCurrentClient?.()===client)message.textContent=error?.message||'Could not save activity';}
  finally{pending=false;submit.disabled=refreshBlocked;}
 });
 return form;
}

export function createPropertyActivityRecords({kind,entries=[],canWrite=false,...context}){
 const definition=definitions[kind];if(!definition)throw Error('Unknown property activity');
 const section=document.createElement('section');
 const heading=document.createElement('h4');heading.textContent=({ledger:'Income and expenses',repair:'Repairs',task:'Tasks'})[kind]+' ('+entries.length+')';section.append(heading);
 if(!entries.length){const empty=document.createElement('p');empty.textContent='No records yet.';section.append(empty);return section;}
 const money=value=>value===null||value===undefined?'Not recorded':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
 for(const entry of entries){
  if(entry.company_id!==context.companyId||entry.deal_id!==context.dealId)throw Error('Activity does not belong to this property');
  const article=document.createElement('article');article.className='property-activity-record';
  const title=document.createElement('strong');
  title.textContent=kind==='ledger'?entry.entry_date+' · '+entry.category:entry.title;article.append(title);
  const detail=document.createElement('p');
  detail.textContent=kind==='ledger'?entry.entry_type+' · '+money(entry.amount):kind==='repair'?entry.status.replaceAll('_',' ')+' · Opened '+entry.opened_on+' · Estimated '+money(entry.estimated_cost)+' · Actual '+money(entry.actual_cost):entry.status+' · Due '+(entry.due_on||'Not set');
  article.append(detail);
  const description=document.createElement('p');description.textContent=entry.description||entry.details||'';article.append(description);
  if(canWrite){
   const edit=document.createElement('button');edit.type='button';edit.textContent='Edit '+definition.title;edit.setAttribute('aria-expanded','false');
   let editor=null;
   edit.onclick=()=>{
    if(context.getCurrentCompany?.()!==context.companyId||context.getCurrentClient?.()!==context.client)return;
    if(editor){editor.remove();editor=null;edit.setAttribute('aria-expanded','false');return;}
    editor=createPropertyActivityForm({...context,kind,entry});article.append(editor);edit.setAttribute('aria-expanded','true');editor.querySelector?.('input,select')?.focus?.();
   };
   article.append(edit);
  }
  section.append(article);
 }
 return section;
}
