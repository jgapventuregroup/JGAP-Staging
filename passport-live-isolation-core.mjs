// Shared real-session gate for the existing CLI and controlled staging browser tool.
// Never prints tokens, server bodies or customer rows. No production origin is accepted.
const fail=(condition,message)=>{if(!condition)throw Error(message||'Security check failed')};
const assert={ok:fail,equal:(actual,expected,message)=>fail(actual===expected,message),notEqual:(actual,expected,message)=>fail(actual!==expected,message),match:(value,pattern,message)=>fail(pattern.test(value),message)};
const origin='https://qfszapteuxuogoselprp.supabase.co';
const tables=['property_assets','property_asset_services','property_maintenance','property_improvements'];
export function assertDenied(result,label,allowEmpty=true){
  // A malformed request (400), missing endpoint (404), or server failure does
  // not prove authorization. Hidden rows may legitimately return 200 + [].
  assert.ok([401,403].includes(result.status)||(allowEmpty&&result.status===200&&Array.isArray(result.data)&&result.data.length===0),label+' was not denied by authorization');
}
export function readConfiguration(env){
  const required=['TKA_STAGING_PUBLISHABLE_KEY','TKA_SESSION_A','TKA_SESSION_B','TKA_COMPANY_A','TKA_COMPANY_B'];
  for(const key of required)assert.ok(env[key],key+' is required; supply credentials privately through the environment');
  assert.equal(env.TKA_RUN_LIVE_PASSPORT_TEST,'staging-fixtures-only','Explicit staging test opt-in required');
  assert.match(env.TKA_STAGING_PUBLISHABLE_KEY,/^sb_publishable_/,'Use a publishable key, never an administrative key');
  assert.notEqual(env.TKA_SESSION_A,env.TKA_SESSION_B,'Two distinct normally authenticated sessions required');
  assert.notEqual(env.TKA_COMPANY_A,env.TKA_COMPANY_B,'Two distinct companies required');
  for(const key of ['TKA_COMPANY_A','TKA_COMPANY_B'])assert.match(env[key],/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,'Company ID must be a UUID');
  return {key:env.TKA_STAGING_PUBLISHABLE_KEY,accounts:[{token:env.TKA_SESSION_A,company:env.TKA_COMPANY_A},{token:env.TKA_SESSION_B,company:env.TKA_COMPANY_B}]};
}
export async function runLivePassportIsolation(config){
  let passed=0;
  const evidence=[];
  const fixtures=[];
  const marker='V1 security fixture '+crypto.randomUUID();
  const request=async(account,path,{method='GET',body}={})=>{
    const response=await fetch(origin+path,{method,signal:AbortSignal.timeout(20000),headers:{apikey:config.key,...(account?.token?{Authorization:'Bearer '+account.token}:{}),'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>null);
    evidence.push({account:account?String(config.accounts.indexOf(account)===0?'A':'B'):'anonymous',endpoint:path.split('?')[0],method,status:response.status});
    // Do not print server bodies: they may contain private records or tokens.
    return {status:response.status,data};
  };
  const rpc=(account,name,body)=>request(account,'/rest/v1/rpc/'+name,{method:'POST',body});
  const success=(response,label)=>{assert.ok(response.status>=200&&response.status<300,label+' failed (HTTP '+response.status+')');return response.data;};
  const row=(response,label)=>{const data=success(response,label);assert.ok(Array.isArray(data)&&data.length===1&&data[0].id,label+' must return exactly one saved record');return data[0];};
  const check=(condition,label)=>{assert.ok(condition,label);passed++;};
  const scoped=(table,scope)=>'/rest/v1/'+table+'?company_id=eq.'+scope.company+'&deal_id=eq.'+scope.deal;
  const byId=(table,id)=>'/rest/v1/'+table+'?id=eq.'+id;
  const verify=(actual,expected)=>check(actual.id===expected.id&&actual.company_id===expected.company_id&&actual.deal_id===expected.deal_id,'Saved record identity/persistence');
  try{
    // Preflight both sessions before any writes. No SQL/JWT impersonation.
    for(const account of config.accounts){
      const user=success(await request(account,'/auth/v1/user'),'Validate real signed-in session');
      assert.ok(user?.id&&user.email_confirmed_at&&!user.is_anonymous,'Verified permanent account required');account.user=user.id;
      const members=success(await request(account,'/rest/v1/company_members?user_id=eq.'+user.id+'&select=company_id,role'),'Read own memberships');
      assert.ok(members.some(m=>m.company_id===account.company&&['owner','admin','editor'].includes(m.role)),'Editing membership required');
      assert.ok(!members.some(m=>m.company_id===config.accounts.find(other=>other!==account).company),'Accounts must not be members of the opposite company');
      assert.equal(success(await rpc(account,'can_access_passport',{p_company_id:account.company}),'Passport entitlement'),true,'Active Passport entitlement required; runner never changes membership');
    }
    assert.notEqual(config.accounts[0].user,config.accounts[1].user,'Two distinct users required');
    for(const account of config.accounts){
      for(let i=0;i<2;i++){
        const deal=success(await rpc(account,'create_company_deal',{p_company_id:account.company,p_name:marker+' '+i,p_purchase_price:100000,p_monthly_rent:1000}),'Create fictional test property');
        const saved=Array.isArray(deal)?deal[0]:deal;
        assert.ok(saved?.id,'Test property ID missing');
        fixtures.push({account,id:saved.id});
        if(i===0){account.deal=saved.id;account.records={};}else account.secondDeal=saved.id;
      }
      const values=[{name:marker},{service_name:marker,frequency_value:1,frequency_unit:'year'},{title:marker,maintenance_date:'2026-01-01'},{title:marker,improvement_date:'2026-01-01'}];
      for(let i=0;i<tables.length;i++){
        const table=tables[i];
        const payload={...values[i],company_id:account.company,deal_id:account.deal,...(i===1?{asset_id:account.records.property_assets.id}:{})};
        const saved=row(await request(account,'/rest/v1/'+table,{method:'POST',body:payload}),'Own-company insert');
        account.records[table]=saved;account.records[table].payload=payload;
        check(saved.company_id===account.company&&saved.deal_id===account.deal,'Own insert scope');
        const field=i<2?(i===0?'name':'service_name'):'title';
        const edited=marker+' updated';
        const updated=row(await request(account,byId(table,saved.id),{method:'PATCH',body:{[field]:edited}}),'Own-company update');
        verify(updated,saved);check(updated[field]===edited,'Own update persisted');saved[field]=edited;
        verify(row(await request(account,byId(table,saved.id)),'Own read after update'),saved);
      }
    }
    for(const account of config.accounts){
      const foreign=config.accounts.find(other=>other!==account);
      for(const table of tables){
        const target=foreign.records[table],own=account.records[table];
        for(const path of [byId(table,target.id),scoped(table,foreign)]){assertDenied(await request(account,path),'Foreign read');passed++;}
        assertDenied(await request(account,'/rest/v1/'+table,{method:'POST',body:target.payload}),'Foreign insert',false);passed++;
        for(const body of [{company_id:account.company,deal_id:account.deal},{company_id:foreign.company,deal_id:foreign.deal}]){assertDenied(await request(account,byId(table,target.id),{method:'PATCH',body}),'Foreign update');passed++;}
        assertDenied(await request(account,byId(table,own.id),{method:'PATCH',body:{company_id:foreign.company,deal_id:foreign.deal}}),'Own record transfer');passed++;
        verify(row(await request(foreign,byId(table,target.id)),'Foreign owner persistence after attack'),target);
        verify(row(await request(account,byId(table,own.id)),'Own persistence after denied transfer'),own);
        assertDenied(await request(null,byId(table,own.id)),'Anonymous read');passed++;
        assertDenied(await request(null,'/rest/v1/'+table,{method:'POST',body:own.payload}),'Anonymous insert',false);passed++;
        assertDenied(await request(null,byId(table,own.id),{method:'PATCH',body:{deal_id:account.deal}}),'Anonymous update');passed++;
      }
      // Deliberately invalid equipment relations must hit the composite FK,
      // not succeed or merely be rejected for malformed input.
      for(const asset of [foreign.records.property_assets,account.records.property_assets]){
        const result=await request(account,'/rest/v1/property_asset_services',{method:'POST',body:{company_id:account.company,deal_id:account.secondDeal,asset_id:asset.id,service_name:marker,frequency_value:1,frequency_unit:'year'}});
        check(result.status===409&&result.data?.code==='23503','Service equipment cross-company/property relation denied');
      }
      for(const name of ['can_access_passport','has_owner_preview_access']){
        const result=await rpc(null,name,{p_company_id:account.company});
        check([401,403].includes(result.status),'Anonymous helper RPC execution denied');
      }
    }
    return {passed,originalWritersEnabled:false,evidence};
  }finally{
    // Only delete exact properties created by this invocation. Composite FKs
    // cascade our record fixtures. Never delete a pre-existing property.
    const errors=[];
    for(const {account,id} of fixtures.reverse()){
      try{
        const result=await request(account,'/rest/v1/deals?id=eq.'+id+'&company_id=eq.'+account.company+'&name=like.'+encodeURIComponent(marker+'*'),{method:'DELETE'});
        const deleted=success(result,'Fixture cleanup');
        if(!Array.isArray(deleted)||deleted.length!==1)errors.push('Fixture cleanup affected no property');
      }catch{errors.push('Fixture cleanup failed; inspect only the V1 security fixture properties');}
    }
    assert.equal(errors.length,0,'Cleanup incomplete: '+errors.join('; '));
  }
}
