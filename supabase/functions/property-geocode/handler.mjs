const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const lookupAddress=value=>value.replace(/(?:\s+|,\s*)(?:#\s*|(?:apt|unit|suite|ste)\.?\s+)[a-zA-Z0-9-]+(?=\s*,|\s+[a-zA-Z]|$)/i,'').trim();
const roadText=value=>String(value).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).map(word=>({st:'street',rd:'road',ave:'avenue',ln:'lane',dr:'drive',ct:'court',cir:'circle',blvd:'boulevard',hwy:'highway',n:'north',s:'south',e:'east',w:'west'}[word]||word)).join(' ');
// Census coordinates are interpolated along street address ranges, not rooftop/parcel points.
export function matchCensus(data,address){
 const matches=data?.result?.addressMatches;
 if(!Array.isArray(matches))throw Error('Invalid provider response');
 const cleaned=lookupAddress(address),query=roadText(cleaned.split(',')[0]);
 const number=cleaned.match(/^(\d+[a-zA-Z-]*)\b/)?.[1]?.toLowerCase();
 const candidates=matches.filter(item=>{
  if(!item||typeof item.matchedAddress!=='string')return false;
  const street=roadText(item.matchedAddress.split(',')[0]);
  const matchedNumber=item.matchedAddress.match(/^(\d+[a-zA-Z-]*)\b/)?.[1]?.toLowerCase();
  const {x,y}=item.coordinates||{};
  return number&&number===matchedNumber&&(cleaned.includes(',')?query===street:query===street||query.startsWith(street+' '))&&typeof x==='number'&&typeof y==='number'&&Number.isFinite(x)&&Number.isFinite(y)&&y>=-85&&y<=85&&x>=-180&&x<=180;
 });
 if(!candidates.length)return {status:'not_found',latitude:null,longitude:null,matched_address:null};
 const first=candidates[0];
 if(candidates.some(item=>Math.abs(item.coordinates.y-first.coordinates.y)>0.0001||Math.abs(item.coordinates.x-first.coordinates.x)>0.0001))return {status:'ambiguous',latitude:null,longitude:null,matched_address:null};
 return {status:'matched',latitude:first.coordinates.y,longitude:first.coordinates.x,matched_address:first.matchedAddress.slice(0,1000)};
}
export function createPropertyGeocoder({baseUrl,anonKey,serviceKey,providerUrl='https://geocoding.geo.census.gov/geocoder/locations/onelineaddress',origins=['https://jgapventuregroup.github.io'],fetcher=fetch,now=()=>Date.now()}){
 const base=String(baseUrl||'').replace(/\/$/,'');
 return async req=>{
  const origin=req.headers.get('origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(origin&&!origins.includes(origin))return new Response('{}',{status:403,headers});if(origin)headers['Access-Control-Allow-Origin']=origin;
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const auth=req.headers.get('authorization')||'';if(!/^Bearer \S+$/.test(auth)||auth.length>8192)return reply({error:'Sign in required'},401);
  if(!base||!anonKey||!serviceKey)return reply({error:'Lookup is not configured'},503);
  let stage='request';
  try{
   const text=await req.text();if(text.length>1024)return reply({error:'Invalid request'},400);let input;try{input=JSON.parse(text);}catch{return reply({error:'Invalid request'},400);}
   const {companyId,dealId}=input||{};if(!uuid(companyId)||!uuid(dealId))return reply({error:'Invalid property'},400);
   const userHeaders={apikey:anonKey,Authorization:auth,'Content-Type':'application/json'};
   stage='authentication';const user=await fetcher(base+'/auth/v1/user',{headers:userHeaders,signal:AbortSignal.timeout(8000)});if(!user.ok)return reply({error:'Sign in required'},401);const identity=await user.json();if(!uuid(identity?.id))return reply({error:'Sign in required'},401);
   const load=async()=>{const response=await fetcher(base+'/rest/v1/rpc/get_market_map',{method:'POST',headers:userHeaders,body:JSON.stringify({p_company_id:companyId}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Denied');const data=await response.json();if(data?.company_id!==companyId||!Array.isArray(data.rows))throw Error('Denied');const row=data.rows.find(row=>row.id===dealId&&row.company_id===companyId);if(!row)throw Error('Denied');return row;};
   let row;try{row=await load();}catch{return reply({error:'Property map access denied'},403);}
   const address=typeof row.address==='string'?row.address.trim():'';if(!address||address.length>300)return reply({company_id:companyId,deal_id:dealId,address,status:'missing_address'});
   const endpoint=new URL(providerUrl);if(endpoint.protocol!=='https:')return reply({error:'Lookup is not configured'},503);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('census-street-address-v4\n'+endpoint.href+'\n'+address.toLowerCase().replace(/\s+/g,' '))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
   const serviceHeaders={apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'};
   const query=new URLSearchParams({company_id:'eq.'+companyId,deal_id:'eq.'+dealId,address_hash:'eq.'+hash,select:'status,latitude,longitude,matched_address,updated_at'});
   stage='cache_read';const cachedResponse=await fetcher(base+'/rest/v1/property_geocode_cache?'+query,{headers:serviceHeaders,signal:AbortSignal.timeout(8000)});if(!cachedResponse.ok)throw Error('Cache unavailable');const cached=await cachedResponse.json();
   let result=Array.isArray(cached)?cached[0]:null;const age=result?now()-Date.parse(result.updated_at):Infinity;if(!Number.isFinite(age)||age<0||age>(result?.status==='matched'?30:1)*86400000)result=null;
   if(!result){
    stage='throttle_claim';const slot=await fetcher(base+'/rest/v1/rpc/claim_property_geocode_slot',{method:'POST',headers:serviceHeaders,body:'{}',signal:AbortSignal.timeout(8000)});if(!slot.ok)throw Error('Throttle unavailable');const lease=await slot.json();if(!uuid(lease)){headers['Retry-After']='2';return reply({status:'busy',retry_after:2},429);}
    endpoint.searchParams.set('format','json');endpoint.searchParams.set('benchmark','Public_AR_Current');endpoint.searchParams.set('address',lookupAddress(address));
    try{stage='provider_request';const response=await fetcher(endpoint.href,{headers:{Accept:'application/json','User-Agent':'TheKeyAheadInvestorApp/1.0 (+https://jgapventuregroup.github.io/JGAP-Staging/)'},signal:AbortSignal.timeout(8000)});if(!response.ok){stage='provider_http_'+response.status;throw Error('Provider unavailable');}stage='provider_response';result=matchCensus(await response.json(),address);}finally{const priorStage=stage;stage='throttle_release';const released=await fetcher(base+'/rest/v1/rpc/release_property_geocode_slot',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_token:lease}),signal:AbortSignal.timeout(8000)});if(!released.ok)throw Error('Throttle unavailable');stage=priorStage;}
    stage='property_recheck';const latest=await load();if(latest.address?.trim()!==address)return reply({error:'Property address changed; reopen the map'},409);
    stage='cache_write';const saved=await fetcher(base+'/rest/v1/property_geocode_cache?on_conflict=company_id,deal_id,address_hash',{method:'POST',headers:{...serviceHeaders,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({company_id:companyId,deal_id:dealId,address_hash:hash,...result,updated_at:new Date(now()).toISOString()}),signal:AbortSignal.timeout(8000)});if(!saved.ok)throw Error('Cache unavailable');
   }
   stage='property_recheck';const latest=await load();if(latest.address?.trim()!==address)return reply({error:'Property address changed; reopen the map'},409);
   return reply({company_id:companyId,deal_id:dealId,address,status:result.status,latitude:result.latitude===null?null:Number(result.latitude),longitude:result.longitude===null?null:Number(result.longitude),matched_address:result.matched_address,source:'US Census Geocoder',accuracy:'street_range'});
  }catch{console.warn('property-geocode failure stage='+stage);return reply({error:'Address lookup is temporarily unavailable. Use the property map link or try again.',code:'lookup_'+stage},503);}
 };
}
