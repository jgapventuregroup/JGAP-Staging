// Normal authenticated SDK tests. No service keys, SQL impersonation, or cleanup/deletion.
const bucket='passport-documents';
const origin='https://qfszapteuxuogoselprp.supabase.co';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export async function createDocumentLiveGate({clients,anonymousClient,companies,properties,publicFetch=fetch}){
 const checks=[];const accounts=[];let ownerDone=false,inactiveDone=false,viewerDone=false,started=false;
 const pass=(value,label)=>{if(!value)throw Error(label);checks.push(label)};
 const code=result=>Number(result.error?.statusCode||result.error?.status||0);
 const denied=(result,label,allowed=[401,403])=>pass(!!result.error&&!result.data&&allowed.includes(code(result)),label);
 const bytes=new TextEncoder().encode('%PDF-1.4\n% Fictional The Key Ahead document gate only\n%%EOF\n');
 const payload=()=>new Blob([bytes],{type:'application/pdf'});
 if(!Array.isArray(clients)||clients.length!==2||!anonymousClient||companies?.length!==2||properties?.length!==2||!companies.every(x=>uuid.test(x))||!properties.every(x=>uuid.test(x))||companies[0]===companies[1])throw Error('Two distinct controlled staging companies/properties required');
 for(let i=0;i<2;i++){
  const client=clients[i],alias=i?'B':'A';
  const login=await client.auth.getUser();pass(!login.error&&login.data?.user?.email_confirmed_at&&!login.data.user.is_anonymous,alias+' normal verified authentication');
  const memberships=await client.rpc('list_my_companies');pass(!memberships.error&&Array.isArray(memberships.data),alias+' memberships loaded');
  const member=memberships.data.find(row=>row.company_id===companies[i]);
  pass(member&&['owner','admin','editor'].includes(member.member_role)&&member.company_name?.startsWith('V1 document gate '),alias+' controlled editing company');
  pass(!memberships.data.some(row=>row.company_id===companies[1-i]),alias+' no membership in opposite company');
  const deals=await client.rpc('list_company_deals',{p_company_id:companies[i]});
  pass(!deals.error&&Array.isArray(deals.data)&&deals.data.some(row=>row.id===properties[i]&&row.company_id===companies[i]&&row.name?.startsWith('V1 document gate ')),alias+' controlled saved property');
  const capability=await client.rpc('advanced_finance_access',{p_company_id:companies[i]});pass(!capability.error&&capability.data?.read===true&&capability.data?.write===true,alias+' server Pro editing capability');
  accounts.push({client,alias,userId:login.data.user.id,companyId:companies[i],propertyId:properties[i],prefix:companies[i]+'/'+properties[i],key:null});
 }
 pass(accounts[0].userId!==accounts[1].userId,'Two distinct authenticated users');
 const storage=a=>a.client.storage.from(bucket);
 const ownDownload=async(a,label)=>{
  const result=await storage(a).download(a.key);pass(!result.error&&result.data&&typeof result.data.arrayBuffer==='function',label+' download allowed');
  const actual=new Uint8Array(await result.data.arrayBuffer());pass(actual.length===bytes.length&&actual.every((x,i)=>x===bytes[i]),label+' downloaded bytes persist exactly');
 };
 const upload=(client,key,blob=payload(),extra={})=>client.storage.from(bucket).upload(key,blob,{contentType:'application/pdf',upsert:false,...extra});
 const candidate=(a,label)=>a.prefix+'/'+crypto.randomUUID()+'--TKA-document-gate-'+label+'.pdf';
 const ownList=async(a,label)=>{const r=await storage(a).list(a.prefix,{limit:100});pass(!r.error&&Array.isArray(r.data)&&r.data.length===1&&r.data[0].name===a.key.split('/').at(-1),label+' exact own file listing');};
 return {
  async runOwnerChecks(){
   if(started)throw Error('Owner gate already started; review retained fixture objects before retrying');started=true;
   for(const a of accounts){
    const before=await storage(a).list(a.prefix,{limit:100});pass(!before.error&&Array.isArray(before.data)&&before.data.length===0,a.alias+' fixture starts empty');
    a.key=candidate(a,a.alias);
    const uploaded=await upload(a.client,a.key);pass(!uploaded.error&&uploaded.data?.path===a.key,a.alias+' own immutable upload');
    await ownList(a,a.alias);await ownDownload(a,a.alias);
   }
   for(let i=0;i<2;i++){
    const a=accounts[i],other=accounts[1-i];
    const list=await storage(a).list(other.prefix,{limit:100});pass(!list.error&&Array.isArray(list.data)&&list.data.length===0,a.alias+' foreign listing empty');
    denied(await storage(a).download(other.key),a.alias+' foreign download denied',[400,401,403,404]);
    denied(await upload(a.client,candidate(other,'foreign-denied')),a.alias+' foreign upload denied');
    denied(await upload(a.client,a.companyId+'/'+other.propertyId+'/'+crypto.randomUUID()+'--TKA-document-gate-mismatch.pdf'),a.alias+' mismatched property upload denied');
    denied(await upload(a.client,a.key,new Blob(['modified'],{type:'application/pdf'}),{upsert:true}),a.alias+' upsert denied');
    await ownDownload(a,a.alias+' after rejected upsert');
    const response=await publicFetch(origin+'/storage/v1/object/public/'+bucket+'/'+a.key);pass([400,401,403,404].includes(response.status),a.alias+' public URL unavailable');
   }
   const a=accounts[0];
   const mime=await upload(a.client,candidate(a,'mime-denied'),new Blob(['<svg/>'],{type:'image/svg+xml'}),{contentType:'image/svg+xml'});
   pass(!!mime.error&&[400,403,415,422].includes(code(mime))&&/mime|type|not allowed/i.test(mime.error.message||''),'Bucket rejects disallowed MIME');
   const oversized=await upload(a.client,candidate(a,'size-denied'),new Blob([new Uint8Array(10485761)],{type:'application/pdf'}));
   pass(!!oversized.error&&[400,413,422].includes(code(oversized))&&/size|large|limit|exceed/i.test(oversized.error.message||''),'Bucket rejects oversized file');
   const anonymous=anonymousClient.storage.from(bucket);
   const list=await anonymous.list(a.prefix,{limit:100});pass((!list.error&&Array.isArray(list.data)&&list.data.length===0)||(list.error&&[401,403].includes(code(list))),'Anonymous listing denied or empty');
   denied(await anonymous.download(a.key),'Anonymous download denied',[400,401,403,404]);
   denied(await upload(anonymousClient,candidate(a,'anonymous-denied')),'Anonymous upload denied');
   for(const account of accounts)await ownList(account,account.alias+' final owner');
   ownerDone=true;return this.evidence();
  },
  async runInactiveChecks(){
   if(!ownerDone||inactiveDone)throw Error('Complete the owner gate once before inactive checks');
   const a=accounts[0];const cap=await a.client.rpc('advanced_finance_access',{p_company_id:a.companyId});pass(!cap.error&&cap.data?.read===false&&cap.data?.write===false,'Inactive fixture capability revoked');
   const list=await storage(a).list(a.prefix,{limit:100});pass(!list.error&&Array.isArray(list.data)&&list.data.length===0,'Inactive document listing empty');
   denied(await storage(a).download(a.key),'Inactive download denied',[400,401,403,404]);
   denied(await upload(a.client,candidate(a,'inactive-denied')),'Inactive upload denied');
   await ownDownload(accounts[1],'Active B during inactive A');inactiveDone=true;return this.evidence();
  },
  async runViewerChecks(){
   if(!inactiveDone||viewerDone)throw Error('Complete inactive checks once before viewer checks');
   const a=accounts[0];const members=await a.client.rpc('list_my_companies');pass(!members.error&&members.data?.some(row=>row.company_id===a.companyId&&row.member_role==='viewer'),'Viewer fixture role confirmed');
   const cap=await a.client.rpc('advanced_finance_access',{p_company_id:a.companyId});pass(!cap.error&&cap.data?.read===true&&cap.data?.write===false,'Reactivated viewer read-only capability');
   await ownList(a,'Reactivated viewer A');await ownDownload(a,'Reactivated viewer A');
   denied(await upload(a.client,candidate(a,'viewer-denied')),'Viewer upload denied');
   await ownDownload(accounts[1],'Active B during viewer A');viewerDone=true;return this.evidence();
  },
  evidence(){return {result:ownerDone&&inactiveDone&&viewerDone?'PASS':'INCOMPLETE',passed:checks.length,checks:[...checks],stages:{owner:ownerDone,inactive:inactiveDone,viewer:viewerDone},retainedFixtures:{properties:2,documentFiles:accounts.filter(a=>a.key).length},cleanupPerformed:false}}
 };
}
