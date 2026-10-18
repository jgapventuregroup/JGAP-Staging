// Original Passport entry forms remain disabled until server-side paid-write RLS is verified.
export const passportEntryFields=Object.freeze({
 asset:[['name','Equipment name','text'],['asset_type','Type','text'],['installed_date','Installed','date'],['warranty_expiration','Warranty expires','date'],['condition','Condition','text']],
 service:[['asset_id','Equipment','select'],['service_name','Service name','text'],['last_service_date','Last service','date'],['next_service_date','Next service','date']],
 maintenance:[['title','Work performed','text'],['maintenance_date','Date','date'],['description','Description','text'],['cost','Cost','number']],
 improvement:[['title','Improvement','text'],['improvement_date','Date','date'],['description','Description','text'],['cost','Cost','number']]
});
export function createOriginalPassportForm(kind,onSubmit,{assets=[]}={}){
 const fields=passportEntryFields[kind];if(!fields||typeof onSubmit!=='function')throw Error('Invalid Passport form');
 const form=document.createElement('form');const title=document.createElement('h4');title.textContent='Add '+kind;form.append(title);
 for(const [key,label,type] of fields){const wrap=document.createElement('label');wrap.textContent=label+' ';const input=document.createElement(type==='select'?'select':'input');input.name=key;if(type!=='select')input.type=type;if(type==='select'){const empty=document.createElement('option');empty.value='';empty.textContent='Select equipment';input.append(empty);for(const asset of assets){if(!asset?.id||!asset?.name)continue;const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;input.append(option)}}if(key==='maintenance_date'||key==='improvement_date'||key==='title'||key==='name'||key==='service_name'||key==='asset_id')input.required=true;if(type==='number'){input.min='0';input.step='0.01'}wrap.append(input);form.append(wrap)}
 const button=document.createElement('button');button.type='submit';button.textContent='Save '+kind;form.append(button);
 const message=document.createElement('p');message.setAttribute('role','status');form.append(message);
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;message.textContent='Saving…';try{const values={};for(const [key,,type] of fields){const raw=form.elements.namedItem(key)?.value?.trim();if(raw)values[key]=type==='number'?Number(raw):raw}await onSubmit(values);message.textContent='Saved';form.reset()}catch(error){message.textContent='Could not save: '+(error?.message||'Unknown error')}finally{button.disabled=false}});
 return form;
}
