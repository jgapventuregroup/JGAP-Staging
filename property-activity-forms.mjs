import {savePropertyActivity} from './property-activity-writer.mjs';

const definitions={
 ledger:{title:'Add income or expense',fields:[['entryType','Type','select',['income','expense']],['entryDate','Date','date'],['category','Category','text'],['amount','Amount ($)','number'],['description','Description','text']]},
 repair:{title:'Add repair',fields:[['title','Repair title','text'],['status','Status','select',['open','in_progress','completed']],['openedOn','Opened on','date'],['completedOn','Completed on','date'],['estimatedCost','Estimated cost ($)','number'],['actualCost','Actual cost ($)','number'],['description','Description','text']]},
 task:{title:'Add task',fields:[['title','Task title','text'],['status','Status','select',['open','done']],['dueOn','Due date','date'],['details','Details','text']]}
};

export function createPropertyActivityForm({kind,client,companyId,dealId,onSaved,getCurrentCompany,getCurrentClient}){
 const definition=definitions[kind];
 if(!definition)throw Error('Unknown property activity form');
 if(!client||!companyId||!dealId)throw Error('Property activity requires an active company and property');
 const form=document.createElement('form');
 const title=document.createElement('h4');title.textContent=definition.title;form.append(title);
 const controls={};
 for(const [name,label,type,options] of definition.fields){
  const wrapper=document.createElement('label');wrapper.textContent=label+' ';
  const field=document.createElement(type==='select'?'select':'input');
  if(type==='select'){for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=value.replaceAll('_',' ');field.append(option);}}
  else {field.type=type;if(type==='number'){field.step='0.01';field.min='0';}}
  field.name=name;
  if(name==='entryDate'||name==='openedOn')field.value=[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-');
  if(name==='title'||name==='category'||name==='amount'||name==='entryDate'||name==='openedOn')field.required=true;
  if(name==='amount')field.step='0.01';
  wrapper.append(field);form.append(wrapper);controls[name]=field;
 }
 const message=document.createElement('p');message.setAttribute('role','status');
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Save '+kind;
 form.append(submit,message);
 let pending=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(pending)return;
  if(getCurrentCompany?.()!==companyId||getCurrentClient?.()!==client||!form.isConnected){message.textContent='Property view changed. Reopen the property.';return;}
  pending=true;submit.disabled=true;message.textContent='Saving...';
  try{
   const input=Object.fromEntries(Object.entries(controls).map(([key,field])=>[key,field.value]));
   await savePropertyActivity({client,companyId,dealId,kind,input});
   if(getCurrentCompany?.()!==companyId||getCurrentClient?.()!==client||!form.isConnected){message.textContent='Saved to the previous property. Reopen the property to see it.';return;}
   message.textContent='Saved successfully';form.reset();
   for(const key of ['entryDate','openedOn'])if(controls[key])controls[key].value=[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-');
   try{await onSaved?.();}catch(refreshError){message.textContent='Saved, but could not refresh totals: '+(refreshError?.message||'Please reopen this property');}
  }catch(error){message.textContent=error?.message||'Could not save activity';}
  finally{pending=false;submit.disabled=false;}
 });
 return form;
}
