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
 if(kind==='service'&&row.frequency_unit!==undefined&&!['year','month','quarter','week'].includes(row.frequency_unit))throw Error('Invalid service frequency unit');
 if(kind==='maintenance'&&row.status!==undefined&&!['completed','planned','open','cancelled'].includes(row.status))throw Error('Invalid maintenance status');
 const {data,error}=await client.from(table).insert(row).select('id,company_id,deal_id').single();
 if(error)throw Error(error.message||'Passport save failed');
 if(getCurrentCompany()!==companyId||getCurrentClient()!==client)throw Error('Company session changed after save');
 if(!data?.id||data.company_id!==companyId||data.deal_id!==dealId)throw Error('Saved Passport entry did not match selected property');
 return data;
}
