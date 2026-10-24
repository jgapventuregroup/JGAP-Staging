// Load every page before computing totals. A truncated page is never a total.
export async function fetchPropertyOperations({client,companyId,dealId,getCurrentCompany,getCurrentClient}){
 if(!client||!companyId||!dealId)throw Error('Property operations context missing');
 const current=()=>!((getCurrentCompany&&getCurrentCompany()!==companyId)||(getCurrentClient&&getCurrentClient()!==client));
 const names=['property_ledger_entries','property_repairs','property_tasks'];
 const results=await Promise.all(names.map(async table=>{
  const rows=[],seen=new Set();
  for(let start=0;;start+=500){
   if(!current())throw Error('Company session changed');
   const {data,error}=await client.from(table).select('*').eq('company_id',companyId).eq('deal_id',dealId).order('created_at',{ascending:false}).order('id',{ascending:true}).range(start,start+499);
   if(!current())throw Error('Company session changed');
   if(error)throw Error('Could not load '+table+': '+error.message);
   if(!Array.isArray(data))throw Error('Invalid property operations response');
   if(data.some(row=>row.company_id!==companyId||row.deal_id!==dealId))throw Error('Unexpected property scope');
   for(const row of data){if(!row.id||seen.has(row.id))throw Error('Activity history changed while loading. Reopen the Passport.');seen.add(row.id);rows.push(row);}
   if(rows.length>10000)throw Error('Activity history exceeds the display limit. Contact support before editing.');
   if(data.length<500)break;
  }
  return rows;
 }));
 return {ledger:results[0],repairs:results[1],tasks:results[2]};
}
