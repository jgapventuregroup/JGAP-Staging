// Read-only property operations loader. Requires the reviewed tables and RLS to
// be deployed before use. Never substitute empty data when a query fails.
export async function fetchPropertyOperations({client,companyId,dealId}){
 if(!client||!companyId||!dealId)throw Error('Property operations context missing');
 const names=['property_ledger_entries','property_repairs','property_tasks'];
 const results=await Promise.all(names.map(async table=>{
  const {data,error}=await client.from(table).select('*').eq('company_id',companyId).eq('deal_id',dealId);
  if(error)throw Error('Could not load '+table+': '+error.message);
  if(!Array.isArray(data))throw Error('Invalid property operations response');
  if(data.some(row=>row.company_id!==companyId||row.deal_id!==dealId))throw Error('Unexpected property scope');
  return data;
 }));
 return {ledger:results[0],repairs:results[1],tasks:results[2]};
}
