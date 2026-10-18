import {projectOriginalPassportChild} from './original-passport-recovery.mjs';
const tables={assets:'property_assets',services:'property_asset_services',maintenance:'property_maintenance',improvements:'property_improvements'};
export async function loadOriginalPassportRecords({client,companyId,propertyId}){
 if(!client||!companyId||!propertyId)throw Error('Active company and property required');
 const result={};
 for(const [key,table] of Object.entries(tables)){
  const {data,error}=await client.from(table).select('*').eq('company_id',companyId).eq('deal_id',propertyId);
  if(error)throw Error('Could not load '+key+': '+error.message);
  if(!Array.isArray(data))throw Error('Invalid '+key+' records');
  const kind={assets:'asset',services:'service',maintenance:'maintenance',improvements:'improvement'}[key];
  result[key]=data.map(row=>projectOriginalPassportChild({...row,property_id:row.deal_id},companyId,propertyId,kind));
 }
 return result;
}

export const originalPassportTableNames=Object.freeze({...tables});
