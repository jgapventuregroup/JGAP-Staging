// Original Passport forms require independently enforced Pro/company write access.
export const passportEntryFields=Object.freeze({
 asset:[['name','Equipment name','text'],['asset_type','Type','text'],['installed_date','Installed','date'],['purchase_cost','Cost','number'],['expected_life_years','Expected life (years)','number'],['warranty_expiration','Warranty expires','date'],['condition','Condition','text'],['next_service_date','Next service due','date']],
 service:[['asset_id','Equipment','select'],['service_name','Service name','text'],['frequency_value','Frequency','number'],['frequency_unit','Frequency unit','select'],['last_service_date','Last service','date'],['next_service_date','Next service','date'],['notes','Instructions','text']],
 maintenance:[['title','Work performed','text'],['maintenance_date','Date','date'],['description','Description','text'],['cost','Cost','number'],['status','Status','select'],['due_date','Next due','date'],['performed_by','Performed by','text']],
 improvement:[['title','Improvement','text'],['improvement_date','Date','date'],['description','Description','text'],['cost','Cost','number'],['category','Category','text']]
});
export function createOriginalPassportForm(kind,onSubmit,{assets=[],record=null}={}){
 const fields=passportEntryFields[kind];if(!fields||typeof onSubmit!=='function')throw Error('Invalid Passport form');
 const form=document.createElement('form');const title=document.createElement('h4');title.textContent=(record?'Edit ':'Add ')+kind;form.append(title);
 for(const [key,label,type] of fields){const wrap=document.createElement('label');wrap.textContent=label+' ';const input=document.createElement(type==='select'?'select':'input');input.name=key;if(type!=='select')input.type=type;if(record&&type==='select'&&key!=='asset_id'){const empty=document.createElement('option');empty.value='';empty.textContent='Not recorded';input.append(empty)}if(type==='select'&&key==='status'){for(const status of ['completed','planned','open','cancelled']){const option=document.createElement('option');option.value=status;option.textContent=status;input.append(option)}}if(type==='select'&&key==='frequency_unit'){for(const unit of ['year','month','quarter','week']){const option=document.createElement('option');option.value=unit;option.textContent=unit;input.append(option)}}if(type==='select'&&key==='asset_id'){const empty=document.createElement('option');empty.value='';empty.textContent='Select equipment';input.append(empty);for(const asset of assets){if(!asset?.id||!asset?.name)continue;const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;input.append(option)}}if(key==='maintenance_date'||key==='improvement_date'||key==='title'||key==='name'||key==='service_name'||key==='asset_id'||key==='frequency_value')input.required=true;if(type==='number'){input.min=key==='frequency_value'||key==='expected_life_years'?'1':'0';input.step=key==='frequency_value'||key==='expected_life_years'?'1':'0.01'}wrap.append(input);form.append(wrap)}
 if(record)for(const [key] of fields){const input=form.elements.namedItem(key);if(input&&record[key]!==null&&record[key]!==undefined)input.value=String(record[key]);}
 const button=document.createElement('button');button.type='submit';button.textContent=record?'Save changes':'Save '+kind;form.append(button);
 if(kind==='service'&&!assets.some(asset=>asset?.id&&asset?.name)){
   button.disabled=true;
   const guidance=document.createElement('p');guidance.setAttribute('data-service-guidance','');guidance.textContent='Add equipment first to create its service schedule.';form.append(guidance);
 }
 const message=document.createElement('p');message.setAttribute('role','status');form.append(message);let partialSave=false;
 form.addEventListener('submit',async event=>{event.preventDefault();if(button.disabled)return;button.disabled=true;message.textContent='Saving…';try{const values={};for(const [key,,type] of fields){const raw=form.elements.namedItem(key)?.value?.trim();if(raw)values[key]=type==='number'?Number(raw):raw;else if(record)values[key]=null}await onSubmit(values);message.textContent=record?'Changes saved and verified':'Saved';if(!record)form.reset()}catch(error){message.textContent=(error?.partialSave?'Partially saved: ':'Could not save: ')+(error?.message||'Unknown error');if(error?.partialSave){partialSave=true;form.reset();button.disabled=true;message.setAttribute('role','alert')}}finally{button.disabled=partialSave||(kind==='service'&&!Array.from(form.elements.namedItem('asset_id')?.options||[]).some(option=>option.value))}});
 return form;
}

export function createPassportSystemForm(onSubmit){
 if(typeof onSubmit!=='function')throw Error('Invalid system save handler');
 let form;
 form=createOriginalPassportForm('asset',async assetValues=>{
  const serviceValues={};
  for(const [key,,type] of passportEntryFields.service){
   if(key==='asset_id')continue;
   const raw=form.elements.namedItem(key==='next_service_date'?'service_next_service_date':key)?.value?.trim();
   if(raw)serviceValues[key]=type==='number'?Number(raw):raw;
  }
  if(!serviceValues.service_name&&Object.keys(serviceValues).some(key=>key!=='frequency_unit'))throw Error('Enter a service name when adding service schedule details');
  if(serviceValues.service_name&&(!Number.isInteger(serviceValues.frequency_value)||serviceValues.frequency_value<1))throw Error('Service frequency must be a positive whole number');
  await onSubmit({assetValues,serviceValues:serviceValues.service_name?serviceValues:null});
 });
 const title=form.querySelector('h4');if(title)title.textContent='Add system / equipment';
 const button=form.querySelector('button[type="submit"]');if(button)button.textContent='Save system and optional schedule';
 const group=document.createElement('fieldset');
 const legend=document.createElement('legend');legend.textContent='Optional first service schedule';group.append(legend);
 for(const [key,label,type] of passportEntryFields.service){
  if(key==='asset_id')continue;
  const wrap=document.createElement('label');wrap.textContent=label+' ';
  const input=document.createElement(type==='select'?'select':'input');input.name=key==='next_service_date'?'service_next_service_date':key;
  if(type==='select'){for(const unit of ['year','month','quarter','week']){const option=document.createElement('option');option.value=unit;option.textContent=unit;input.append(option)}}
  else input.type=type;
  if(type==='number'){input.min='1';input.step='1'}
  wrap.append(input);group.append(wrap);
 }
 form.insertBefore(group,button);
 return form;
}

export function createPassportAddForm(kind,onSubmit,options={}){
 return kind==='asset'?createPassportSystemForm(onSubmit):createOriginalPassportForm(kind,onSubmit,options);
}
