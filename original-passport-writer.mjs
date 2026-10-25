const tables={asset:'property_assets',service:'property_asset_services',maintenance:'property_maintenance',improvement:'property_improvements'};
export async function saveOriginalPassportEntry({kind,values,client,companyId,dealId,getCurrentCompany,getCurrentClient,entryId=null}){
 const table=tables[kind];if(!table)throw Error('Unknown Passport entry');
 if(entryId!==null&&(typeof entryId!=='string'||!entryId.trim()))throw Error('Invalid Passport record ID');
 // Defense in depth: UI flags supplement independently enforced Pro/company RLS.
 if(globalThis.JGAP_ORIGINAL_PASSPORT_WRITES_READY!==true)throw Error('Passport record editing is not enabled for this staging workspace');
 if(!client||!companyId||!dealId||typeof getCurrentCompany!=='function'||typeof getCurrentClient!=='function')throw Error('Missing Passport context');
 if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed');
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Invalid Passport entry');
 const allowed={asset:['name','asset_type','installed_date','purchase_cost','expected_life_years','warranty_expiration','condition','next_service_date'],service:['asset_id','service_name','frequency_value','frequency_unit','last_service_date','next_service_date','notes'],maintenance:['title','maintenance_date','description','cost','status','due_date','performed_by'],improvement:['title','improvement_date','description','cost','category']}[kind];
 for(const key of Object.keys(values))if(!allowed.includes(key)&&key!=='company_id'&&key!=='deal_id')throw Error('Unsupported Passport field: '+key);
 const row={company_id:companyId,deal_id:dealId};for(const key of allowed)if(values[key]!==undefined&&values[key]!==null&&values[key]!=='')row[key]=values[key];
 if(entryId!==null)for(const key of allowed)if(Object.hasOwn(values,key)&&(values[key]===null||values[key]===''))row[key]=null;
 const required={asset:['name'],service:['asset_id','service_name','frequency_value'],maintenance:['title','maintenance_date'],improvement:['title','improvement_date']}[kind];
 for(const key of required){if(key==='frequency_value'){if(!Number.isInteger(row[key])||row[key]<1)throw Error('Required positive whole-number Passport field: '+key);}else if(!row[key]||typeof row[key]!=='string'||!row[key].trim())throw Error('Required Passport field: '+key);}
 for(const key of ['name','asset_type','condition','service_name','notes','title','description','performed_by','category'])if(row[key]!==undefined&&row[key]!==null&&(typeof row[key]!=='string'||!row[key].trim()))throw Error('Invalid Passport text: '+key);
 for(const key of ['purchase_cost','cost','expected_life_years'])if(row[key]!==undefined&&row[key]!==null){if(typeof row[key]!=='number'||!Number.isFinite(row[key])||row[key]<0||(key==='expected_life_years'&&(!Number.isInteger(row[key])||row[key]<1)))throw Error('Invalid nonnegative Passport amount: '+key);}
 for(const key of ['installed_date','warranty_expiration','next_service_date','last_service_date','maintenance_date','due_date','improvement_date']){
  if(row[key]===undefined||row[key]===null)continue;
  const value=row[key];
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Invalid Passport date: '+key);
 }
 if(kind==='service'&&row.frequency_value!==undefined&&(!Number.isInteger(row.frequency_value)||row.frequency_value<1))throw Error('Invalid service frequency value');
 if(kind==='service'&&row.frequency_unit!==undefined&&row.frequency_unit!==null&&!['year','month','quarter','week'].includes(row.frequency_unit))throw Error('Invalid service frequency unit');
 if(kind==='maintenance'&&row.status!==undefined&&row.status!==null&&!['completed','planned','open','cancelled'].includes(row.status))throw Error('Invalid maintenance status');
 if(kind==='service'){
  const {data:asset,error:assetError}=await client.from('property_assets').select('id,company_id,deal_id').eq('id',row.asset_id).eq('company_id',companyId).eq('deal_id',dealId).single();
  if(assetError||!asset||asset.id!==row.asset_id||asset.company_id!==companyId||asset.deal_id!==dealId)throw Error('Selected equipment does not belong to this property');
  if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed');
 }
 const changes={...row};delete changes.company_id;delete changes.deal_id;
 const query=entryId===null?client.from(table).insert(row):client.from(table).update(changes).eq('id',entryId).eq('company_id',companyId).eq('deal_id',dealId);
 const {data,error}=await query.select('id,company_id,deal_id').single();
 if(error)throw Error(error.message||'Passport save failed');
 if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed after save');
 if(!data?.id||(entryId!==null&&data.id!==entryId)||data.company_id!==companyId||data.deal_id!==dealId)throw Error('Saved Passport entry did not match selected property');
 if(entryId!==null){
  const {data:saved,error:readError}=await client.from(table).select('*').eq('id',entryId).eq('company_id',companyId).eq('deal_id',dealId).single();
  if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed after save');
  if(readError||!saved||saved.id!==entryId||saved.company_id!==companyId||saved.deal_id!==dealId)throw Error('Record updated, but verification failed. Reopen the Passport before retrying.');
  for(const [key,value] of Object.entries(changes)){
   const actual=saved[key];
   if(value===null?actual!==null:typeof value==='number'?(actual===null||actual===undefined||actual===''||Number(actual)!==value):actual!==value)throw Error('Record updated, but saved values could not be verified. Reopen the Passport before retrying.');
  }
 }
 return data;
}

export async function savePassportSystemWithService({assetValues,serviceValues,...context}){
 if(serviceValues!==null&&serviceValues!==undefined){
  if(typeof serviceValues!=='object'||Array.isArray(serviceValues))throw Error('Invalid optional service schedule');
  const supplied=Object.entries(serviceValues).some(([key,value])=>key!=='frequency_unit'&&value!==null&&value!==undefined&&String(value).trim()!=='');
  if(supplied){
   if(typeof serviceValues.service_name!=='string'||!serviceValues.service_name.trim())throw Error('Service name is required when schedule details are supplied');
   if(!Number.isInteger(serviceValues.frequency_value)||serviceValues.frequency_value<1)throw Error('Service frequency must be a positive whole number');
   if(serviceValues.frequency_unit!==undefined&&!['year','month','quarter','week'].includes(serviceValues.frequency_unit))throw Error('Invalid service frequency unit');
  }
 }
 if(serviceValues?.asset_id!==undefined)throw Error('First service schedule equipment is assigned automatically');
 if(serviceValues?.service_name!==undefined&&typeof serviceValues.service_name!=='string')throw Error('Invalid service name');
 if(serviceValues){
  for(const key of ['last_service_date','next_service_date','notes']){
   const value=serviceValues[key];
   if(value!==undefined&&value!==null&&typeof value!=='string')throw Error('Invalid service schedule field: '+key);
  }
 }
 if(serviceValues){
  for(const key of ['last_service_date','next_service_date']){
   const value=serviceValues[key];
   if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value))throw Error('Invalid service date: '+key);
  }
 }
 const needsService=!!serviceValues?.service_name?.trim();
 const asset=await saveOriginalPassportEntry({...context,kind:'asset',values:assetValues});
 if(!needsService)return {asset,service:null};
 try{
  const service=await saveOriginalPassportEntry({...context,kind:'service',values:{...serviceValues,asset_id:asset.id}});
  return {asset,service};
 }catch(error){
  const failure=new Error('Equipment saved but service schedule failed: '+(error?.message||'Unknown error')+'. Add the schedule to the existing equipment; do not create equipment again.');
  failure.assetId=asset.id;failure.partialSave=true;throw failure;
 }
}
