import {projectOriginalPassportChild} from './original-passport-recovery.mjs';
const tables={assets:'property_assets',services:'property_asset_services',maintenance:'property_maintenance',improvements:'property_improvements'};
export async function loadOriginalPassportRecords({client,companyId,propertyId,getCurrentCompany,getCurrentClient}){
 if(!client||!companyId||!propertyId)throw Error('Active company and property required');
 const assertActive=()=>{if(getCurrentCompany&&getCurrentCompany()!==companyId)throw Error('Company session changed while loading Passport');if(getCurrentClient&&getCurrentClient()!==client)throw Error('Client session changed while loading Passport');};
 assertActive();
 const result={};
 // Client filters are convenience only; projected records independently enforce company and deal scope.
 for(const [key,table] of Object.entries(tables)){
  assertActive();
  const {data,error}=await client.from(table).select('*').eq('company_id',companyId).eq('deal_id',propertyId);
  assertActive();
  if(error)throw Error('Could not load '+key+': '+error.message);
  if(!Array.isArray(data))throw Error('Invalid '+key+' records');
  const kind={assets:'asset',services:'service',maintenance:'maintenance',improvements:'improvement'}[key];
  result[key]=data.map(row=>projectOriginalPassportChild({...row,property_id:row.deal_id},companyId,propertyId,kind));
  if(new Set(result[key].map(item=>item.id)).size!==result[key].length)throw Error('Duplicate '+key+' records returned for this property');
  const dateField={assets:'installed_date',services:'next_service_date',maintenance:'maintenance_date',improvements:'improvement_date'}[key];
  result[key].sort((a,b)=>key==='assets'?String(a.name||'').localeCompare(String(b.name||'')):key==='services'?String(a[dateField]||'9999-12-31').localeCompare(String(b[dateField]||'9999-12-31')):String(b[dateField]||'').localeCompare(String(a[dateField]||'')));
 }
 const assetIds=new Set(result.assets.map(asset=>asset.id));
 for(const service of result.services){if(!assetIds.has(service.asset_id))throw Error('Service schedule references equipment outside the selected property');}
 assertActive();
 return result;
}

export const originalPassportTableNames=Object.freeze({...tables});
