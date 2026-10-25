import test from 'node:test';
import assert from 'node:assert/strict';
import {createDocumentLiveGate} from '../passport-document-live-gate.mjs';
const companies=['20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'];
const properties=['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'];
function fixture({foreignLeak=false,wrongBytes=false,unverified=false}={}){
 const objects=new Map();const users=['user-a','user-b'];const calls=[];const state={inactive:false,viewer:false};
 const denied=()=>({data:null,error:{statusCode:'403',message:'row-level security denied'}});
 const clientFor=index=>({
  auth:{getUser:async()=>({data:{user:{id:users[index],email_confirmed_at:unverified?null:'2026-10-25',is_anonymous:false}},error:null})},
  rpc:async(name)=>({data:name==='list_my_companies'?[{company_id:companies[index],company_name:'V1 document gate fixture '+index,member_role:state.viewer&&index===0?'viewer':'owner'}]:name==='list_company_deals'?[{id:properties[index],company_id:companies[index],name:'V1 document gate property '+index}]:{read:index!==0||!state.inactive,write:index!==0||(!state.inactive&&!state.viewer)},error:null}),
  storage:{from(){return {
   list:async prefix=>{const own=index>=0&&prefix===companies[index]+'/'+properties[index]&&!(index===0&&state.inactive);return {data:[...objects.keys()].filter(k=>(own||foreignLeak)&&k.startsWith(prefix+'/')).map(k=>({name:k.split('/').at(-1),id:'object'})),error:null}},
   upload:async(key,blob,options)=>{
    calls.push({op:'upload',index,key});
    if(blob.type!=='application/pdf')return {data:null,error:{statusCode:415,message:'Mime type is not supported'}};
    if(blob.size>10485760)return {data:null,error:{statusCode:413,message:'File size exceeds maximum'}};
    if(index<0||!key.startsWith(companies[index]+'/'+properties[index]+'/')||(index===0&&(state.inactive||state.viewer))||options.upsert)return denied();
    objects.set(key,blob);return {data:{path:key},error:null};
   },
   download:async key=>{
    if(index<0||(!foreignLeak&&!key.startsWith(companies[index]+'/'+properties[index]+'/'))||(index===0&&state.inactive)||!objects.has(key))return denied();
    return {data:wrongBytes?new Blob(['wrong']):objects.get(key),error:null};
   },
   remove(){throw Error('Deletion must never be called')}
  }}}
 });
 return {objects,state,calls,options:{clients:[clientFor(0),clientFor(1)],anonymousClient:clientFor(-1),companies,properties,publicFetch:async()=>({status:404})}};
}
test('normal-session document gate checks real-file stages separately and retains only its two positive fixtures',async()=>{
 const f=fixture(),gate=await createDocumentLiveGate(f.options);
 await assert.rejects(gate.runInactiveChecks(),/owner gate/);
 const owner=await gate.runOwnerChecks();assert.equal(owner.result,'INCOMPLETE');assert.equal(f.objects.size,2);
 f.state.inactive=true;await gate.runInactiveChecks();f.state.inactive=false;f.state.viewer=true;
 const result=await gate.runViewerChecks();assert.equal(result.result,'PASS');assert.equal(result.cleanupPerformed,false);assert.deepEqual(result.retainedFixtures,{properties:2,documentFiles:2});assert.ok(result.passed>40);
 const json=JSON.stringify(result);for(const privateValue of [...companies,...properties,'user-a','user-b'])assert.ok(!json.includes(privateValue));
 await assert.rejects(gate.runOwnerChecks(),/already started/);assert.equal(f.objects.size,2);
});
test('document gate refuses foreign leakage, corrupt bytes, unverified users and reused company scope',async()=>{
 for(const options of [{foreignLeak:true},{wrongBytes:true}]){const f=fixture(options),gate=await createDocumentLiveGate(f.options);await assert.rejects(gate.runOwnerChecks())}
 const unverified=fixture({unverified:true});await assert.rejects(createDocumentLiveGate(unverified.options),/normal verified/);
 const repeated=fixture();await assert.rejects(createDocumentLiveGate({...repeated.options,companies:[companies[0],companies[0]]}),/distinct controlled/);
});
