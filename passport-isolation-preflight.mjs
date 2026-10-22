// Read-only authenticated preflight for the Passport isolation release gate.
// The caller must supply a genuinely signed-in Supabase client; no service-role access.
const tables=['property_assets','property_asset_services','property_maintenance','property_improvements'];
export async function preflightPassportIsolation({client,ownCompanyId,ownDealId,otherCompanyId,otherDealId,getCurrentCompany,getCurrentClient}){
 if(!client||!ownCompanyId||!ownDealId||!otherCompanyId||!otherDealId||ownCompanyId===otherCompanyId||typeof getCurrentCompany!=='function'||typeof getCurrentClient!=='function')throw Error('Two distinct companies and an authenticated workspace are required');
 const guard=()=>{if(getCurrentCompany()!==ownCompanyId||getCurrentClient()!==client)throw Error('Passport preflight session changed')};
 guard();
 const {data:auth,error:authError}=await client.auth.getUser();
 guard();
 if(authError||!auth?.user?.id)throw Error('A real signed-in user is required');
 const results=[];
 for(const table of tables){
  guard();
  const own=await client.from(table).select('id,company_id,deal_id').eq('company_id',ownCompanyId).eq('deal_id',ownDealId);
  guard();
  if(own.error||!Array.isArray(own.data)||own.data.some(row=>row.company_id!==ownCompanyId||row.deal_id!==ownDealId))throw Error(table+': own-company read failed');
  // Do not add a company filter here: the RLS policy, not the UI, must hide foreign rows.
  const foreign=await client.from(table).select('id,company_id,deal_id').eq('deal_id',otherDealId);
  guard();
  if(foreign.error||!Array.isArray(foreign.data))throw Error(table+': foreign read failed');
  if(foreign.data.length!==0)throw Error(table+': foreign property returned rows; cannot prove isolation');
  results.push({table,ownRead:'passed',foreignRead:'zero rows visible'});
 }
 return {userId:auth.user.id,results,writeIsolationVerified:false};
}
