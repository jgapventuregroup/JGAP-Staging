// Controlled browser adapter around the existing real-session security runner.
// Credentials/tokens remain inside the normal Auth clients; evidence contains statuses only.
import {readConfiguration,runLivePassportIsolation} from './passport-live-isolation-core.mjs';
import {createDocumentLiveGate} from './passport-document-live-gate.mjs';
const $=id=>document.getElementById(id);
const origin='https://qfszapteuxuogoselprp.supabase.co';
const key=window.JGAP_STAGING_PUBLISHABLE_KEY;
const allowedHost=['localhost','127.0.0.1'].includes(location.hostname)||(location.hostname==='jgapventuregroup.github.io'&&location.pathname.startsWith('/JGAP-Staging/'));
let clients=[],users=[],busy=false,documentGate=null,documentPropertyRequest=0;
const storageHttpEvidence=[];
const observedFetch=account=>async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 const response=await fetch(input,url.origin===origin&&url.pathname.startsWith('/storage/v1/')?{...init,cache:'no-store'}:init);
 if(url.origin===origin&&url.pathname.startsWith('/storage/v1/'))storageHttpEvidence.push({account,method:init?.method||input.method||'GET',endpoint:url.pathname.split('/').slice(0,5).join('/'),status:response.status,cacheControl:response.headers.get('cache-control'),cacheStatus:response.headers.get('cf-cache-status'),cacheNonce:url.searchParams.has('cacheNonce')});
 return response;
};
const status=message=>{$('gate-status').textContent=message;};
async function endSessions(){await Promise.allSettled(clients.map(client=>client.auth.signOut({scope:'local'})));clients=[];users=[];}
async function refreshCompanies(){
 for(let index=0;index<clients.length;index++){
  const {data,error}=await clients[index].rpc('list_my_companies');if(error||!Array.isArray(data))throw Error('Could not load test company memberships.');
  const picker=$(index===0?'gate-company-a':'gate-company-b'),previous=picker.value;picker.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Select a controlled staging test company';picker.append(empty);
  for(const member of data){
   if(!['owner','admin','editor'].includes(member.member_role))continue;
   const option=document.createElement('option');option.value=member.company_id;option.textContent=member.company_name+' ('+member.member_role+')';picker.append(option);
  }
  picker.value=[...picker.options].some(option=>option.value===previous)?previous:'';
 }
}
if(!allowedHost||!/^sb_publishable_/.test(key||'')||!window.supabase){$('gate-signin').disabled=true;status('This tool requires the existing staging origin and public staging configuration.');}
$('gate-login').onsubmit=async event=>{
 event.preventDefault();if(busy||!allowedHost)return;
 busy=true;$('gate-signin').disabled=true;status('Signing in both accounts through normal staging Auth…');
 try{
  await endSessions();
  clients=[0,1].map(index=>window.supabase.createClient(origin,key,{global:{fetch:observedFetch(index?'B':'A')},auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'tka-isolation-test-'+index}}));
  const attempts=await Promise.allSettled(clients.map(async(client,index)=>{
   const suffix=index===0?'a':'b';
   const {error}=await client.auth.signInWithPassword({email:$('gate-email-'+suffix).value.trim(),password:$('gate-password-'+suffix).value});if(error)throw Error('Account '+suffix.toUpperCase()+' sign-in did not complete. Use a verified staging test account.');
   const {data,error:userError}=await client.auth.getUser();if(userError||!data?.user?.email_confirmed_at||data.user.is_anonymous)throw Error('Both accounts must be verified permanent staging accounts.');users[index]=data.user;
  }));
  const failed=attempts.find(attempt=>attempt.status==='rejected');if(failed)throw failed.reason;
  if(users[0].id===users[1].id)throw Error('Two distinct staging accounts are required.');
  $('gate-account-a').textContent='Account A verified: '+users[0].email;$('gate-account-b').textContent='Account B verified: '+users[1].email;
  await refreshCompanies();$('gate-scope').hidden=false;$('gate-login').hidden=true;status('Both accounts verified. Select separate controlled test companies before running checks.');
 }catch(error){await endSessions();status(error.message||'Staging sign-in did not complete.');}
 finally{$('gate-password-a').value='';$('gate-password-b').value='';busy=false;$('gate-signin').disabled=false;}
};
$('gate-refresh').onclick=async()=>{if(busy||clients.length!==2)return;try{await refreshCompanies();await refreshDocumentProperties();status('Test company lists refreshed.');}catch(error){status(error.message);}};
$('gate-run').onclick=async()=>{
 if(busy||clients.length!==2)return;
 if(!$('gate-consent').checked){status('Confirm controlled staging fixture testing before running.');return;}
 let config;
 try{
  const sessions=await Promise.all(clients.map(client=>client.auth.getSession()));
  config=readConfiguration({TKA_STAGING_PUBLISHABLE_KEY:key,TKA_SESSION_A:sessions[0].data?.session?.access_token,TKA_SESSION_B:sessions[1].data?.session?.access_token,TKA_COMPANY_A:$('gate-company-a').value,TKA_COMPANY_B:$('gate-company-b').value,TKA_RUN_LIVE_PASSPORT_TEST:'staging-fixtures-only'});
 }catch{status('Select two different test companies and keep both verified accounts signed in.');return;}
 busy=true;$('gate-run').disabled=true;$('gate-refresh').disabled=true;$('gate-evidence').textContent='';status('Running normal authenticated two-company requests. Do not close this tab until cleanup finishes…');
 try{const result=await runLivePassportIsolation(config);$('gate-evidence').textContent=JSON.stringify({result:'PASS',...result},null,2);status('PASS: authenticated isolation and fixture cleanup completed. Original editors remain disabled until this evidence is reviewed.');}
 catch(error){status('FAIL: '+(error.message||'Security checks or cleanup did not complete')+'. Original editors remain disabled.');}
 finally{config=null;await endSessions();busy=false;}
};

async function refreshDocumentProperties(){
 if(documentGate)return;
 const request=++documentPropertyRequest;
 for(let i=0;i<clients.length;i++){
  if(request!==documentPropertyRequest)return;
  const picker=$(i?'gate-document-property-b':'gate-document-property-a');picker.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Select the disposable document test property';picker.append(empty);
  const company=$(i?'gate-company-b':'gate-company-a').value;if(!company)continue;
  const result=await clients[i].rpc('list_company_deals',{p_company_id:company});if(request!==documentPropertyRequest)return;if(result.error||!Array.isArray(result.data))throw Error('Could not load document fixture properties');
  for(const row of result.data){if(row.company_id!==company||!row.name?.startsWith('V1 document gate '))continue;const option=document.createElement('option');option.value=row.id;option.textContent=row.name;picker.append(option);}
 }
}
for(const id of ['gate-company-a','gate-company-b'])$(id).onchange=async()=>{if(busy||documentGate)return;try{await refreshDocumentProperties();}catch(error){status(error.message)}};
function showDocumentEvidence(){
 $('gate-evidence').textContent=JSON.stringify({source:'normal authenticated Storage API gate',captured_on:new Date().toISOString().slice(0,10),...documentGate.evidence(),http:[...storageHttpEvidence]},null,2);
}
async function runDocumentStage(stage){
 if(busy||clients.length!==2)return;
 if(!$('gate-document-consent').checked){status('Confirm the fictional upload-only document test scope first.');return;}
 busy=true;const button=$('gate-document-'+stage);button.disabled=true;
 try{
  if(stage==='owner'){
   if(documentGate)throw Error('A document gate has already started; review retained files before restarting');
   storageHttpEvidence.length=0;
   const anonymousClient=window.supabase.createClient(origin,key,{global:{fetch:observedFetch('anonymous')},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'tka-document-anonymous'}});
   documentGate=await createDocumentLiveGate({clients,anonymousClient,companies:[$('gate-company-a').value,$('gate-company-b').value],properties:[$('gate-document-property-a').value,$('gate-document-property-b').value],publicFetch:observedFetch('public'),reuseRetained:$('gate-document-reuse').checked});
   for(const id of ['gate-company-a','gate-company-b','gate-document-property-a','gate-document-property-b','gate-run','gate-refresh'])$(id).disabled=true;
   status('Testing actual document upload/list/download and cross-company denial. Fictional files will remain; no cleanup is performed.');
   await documentGate.runOwnerChecks();$('gate-document-inactive').disabled=false;status('Owner document checks passed. Next: only the disposable Company A must be made inactive for the next check.');
  }else if(stage==='inactive'){
   if(!documentGate)throw Error('Run owner document checks first');await documentGate.runInactiveChecks();$('gate-document-viewer').disabled=false;status('Inactive document access checks passed. Next: reactivate only disposable Company A and change its test member to viewer.');
  }else{
   if(!documentGate)throw Error('Run earlier document checks first');await documentGate.runViewerChecks();status('PASS: real Storage owner/inactive/viewer checks completed. Fictional files and test companies remain; this test does not change customer control enablement.');
  }
  showDocumentEvidence();
 }catch(error){status('Document gate stopped: '+(error.message||'Unknown test error')+'. Do not remove or retry fixtures without review.');if(documentGate)showDocumentEvidence();if(stage!=='owner')button.disabled=false;}
 finally{busy=false;}
}
for(const stage of ['owner','inactive','viewer'])$('gate-document-'+stage).onclick=()=>runDocumentStage(stage);
