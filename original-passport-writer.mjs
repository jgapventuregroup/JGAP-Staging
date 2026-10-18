const tables={asset:'property_assets',service:'property_asset_services',maintenance:'property_maintenance',improvement:'property_improvements'};
export async function saveOriginalPassportEntry({kind,values,client,companyId,dealId,getCurrentCompany,getCurrentClient}){
 const table=tables[kind];if(!table)throw Error('Unknown Passport entry');
 if(!client||!companyId||!dealId||typeof getCurrentCompany!=='function'||typeof getCurrentClient!=='function')throw Error('Missing Passport context');
 if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed');
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Invalid Passport entry');
 const allowed={asset:['name','asset_type','installed_date','purchase_cost','expected_life_years','warranty_expiration','condition','next_service_date'],service:['asset_id','service_name','frequency_value','frequency_unit','last_service_date','next_service_date','notes'],maintenance:['title','maintenance_date','description','cost','status','due_date','performed_by'],improvement:['title','improvement_date','description','cost','category']}[kind];
 const row={company_id:companyId,deal_id:dealId};for(const key of allowed)if(values[key]!==undefined&&values[key]!==null&&values[key]!=='')row[key]=values[key];
 const required={asset:['name'],service:['asset_id','service_name','frequency_value'],maintenance:['title','maintenance_date'],improvement:['title','improvement_date']}[kind];
 for(const key of required){if(key==='frequency_value'){if(!Number.isInteger(row[key])||row[key]<1)throw Error('Required positive whole-number Passport field: '+key);}else if(!row[key]||typeof row[key]!=='string'||!row[key].trim())throw Error('Required Passport field: '+key);}
 for(const key of ['purchase_cost','cost','expected_life_years'])if(row[key]!==undefined){if(typeof row[key]!=='number'||!Number.isFinite(row[key])||row[key]<0||(key==='expected_life_years'&&(!Number.isInteger(row[key])||row[key]<1)))throw Error('Invalid nonnegative Passport amount: '+key);}
 if(kind==='service'&&row.frequency_unit!==undefined&&!['year','month','quarter','week'].includes(row.frequency_unit))throw Error('Invalid service frequency unit');
 if(kind==='maintenance'&&row.status!==undefined&&!['completed','planned','open','cancelled'].includes(row.status))throw Error('Invalid maintenance status');
 if(kind==='service'){
  const {data:asset,error:assetError}=await client.from('property_assets').select('id,company_id,deal_id').eq('id',row.asset_id).eq('company_id',companyId).eq('deal_id',dealId).single();
  if(assetError||!asset||asset.id!==row.asset_id||asset.company_id!==companyId||asset.deal_id!==dealId)throw Error('Selected equipment does not belong to this property');
  if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed');
 }
 const {data,error}=await client.from(table).insert(row).select('id,company_id,deal_id').single();
 if(error)throw Error(error.message||'Passport save failed');
 if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed after save');
 if(!data?.id||data.company_id!==companyId||data.deal_id!==dealId)throw Error('Saved Passport entry did not match selected property');
 return data;
}

export async function savePassportSystemWithService({assetValues,serviceValues,...context}){
 const asset=await saveOriginalPassportEntry({...context,kind:'asset',values:assetValues});
 if(!serviceValues?.service_name)return {asset,service:null};
 // Validate the optional schedule before the equipment insert on the client side
 // in the form; this second guard protects callers outside that form.
 try{
  const service=await saveOriginalPassportEntry({...context,kind:'service',values:{...serviceValues,asset_id:asset.id}});
  return {asset,service};
 }catch(error){
  const failure=new Error('Equipment saved but service schedule failed: '+(error?.message||'Unknown error')+'. Add the schedule to the existing equipment; do not create equipment again.');
  failure.assetId=asset.id;failure.partialSave=true;throw failure;
 }
}
