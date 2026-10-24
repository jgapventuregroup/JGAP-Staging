// Controlled browser adapter around the existing real-session security runner.
// Credentials/tokens remain inside the normal Auth clients; evidence contains statuses only.
import {readConfiguration,runLivePassportIsolation} from './passport-live-isolation-core.mjs';
const $=id=>document.getElementById(id);
const origin='https://qfszapteuxuogoselprp.supabase.co';
const key=window.JGAP_STAGING_PUBLISHABLE_KEY;
const allowedHost=['localhost','127.0.0.1'].includes(location.hostname)||(location.hostname==='jgapventuregroup.github.io'&&location.pathname.startsWith('/JGAP-Staging/'));
let clients=[],users=[],busy=false;
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
  clients=[0,1].map(index=>window.supabase.createClient(origin,key,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'tka-isolation-test-'+index}}));
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
$('gate-refresh').onclick=async()=>{if(busy||clients.length!==2)return;try{await refreshCompanies();status('Test company lists refreshed.');}catch(error){status(error.message);}};
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
