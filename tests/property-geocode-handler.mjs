import test from 'node:test';import assert from 'node:assert/strict';import {createPropertyGeocoder,matchCensus,lookupAddress} from '../supabase/functions/property-geocode/handler.mjs';
const c='86000000-0000-4000-8000-000000000011',p='86000000-0000-4000-8000-000000000021',u='86000000-0000-4000-8000-000000000001',address='90 Example Grove Cir #20, Bristol TN';
const match={coordinates:{y:36.5,x:-82.2},matchedAddress:'90 EXAMPLE GROVE CIR, BRISTOL, TN, 37620'};
const census=matches=>({result:{addressMatches:matches}});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
function fixture({denied=false,cached=null,busy=false,provider=census([match]),providerStatus=200,changed=false,revoked=false}={}){
 const calls=[];let reads=0;const row={id:p,company_id:c,address,name:'Private property name',notes:'Private notes'};
 const handler=createPropertyGeocoder({baseUrl:'https://staging.invalid',anonKey:'public-test-key',serviceKey:'private-test-key',fetcher:async(url,options={})=>{url=String(url);calls.push({url,options});if(url.endsWith('/auth/v1/user'))return json({id:u});if(url.endsWith('/rpc/get_market_map')){reads++;if(denied||revoked&&reads>1)return json({},403);return json({company_id:c,rows:[{...row,...(changed&&reads>1?{address:'91 Different Lane'}:{})}]});}if(url.includes('property_geocode_cache?')&&options.method==='POST')return new Response(null,{status:201});if(url.includes('property_geocode_cache?'))return json(cached?[cached]:[]);if(url.endsWith('/rpc/claim_property_geocode_slot'))return json(busy?null:u);if(url.endsWith('/rpc/release_property_geocode_slot'))return json(true);if(url.startsWith('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress'))return json(provider,providerStatus);throw Error('Unexpected URL');}});
 const request=(body={companyId:c,dealId:p},headers={Authorization:'Bearer user-test-token',Origin:'https://jgapventuregroup.github.io'})=>handler(new Request('https://staging.invalid/functions/v1/property-geocode',{method:'POST',headers,body:JSON.stringify(body)}));return {calls,request};
}
test('Census matching rejects malformed coordinates, wrong streets/houses and conflicting matches',()=>{
 assert.equal(lookupAddress(address),'90 Example Grove Cir, Bristol TN');assert.equal(matchCensus(census([match]),address).status,'matched');
 for(const value of [{...match,coordinates:{y:null,x:-82}},{...match,coordinates:{y:36,x:''}},{...match,coordinates:{y:90,x:-82}},{...match,matchedAddress:'91 EXAMPLE GROVE CIR, BRISTOL, TN'},{...match,matchedAddress:'90 OTHER CIR, BRISTOL, TN'},{...match,matchedAddress:'BRISTOL, TN'}])assert.equal(matchCensus(census([value]),address).status,'not_found');
 assert.equal(matchCensus(census([match,{...match,coordinates:{y:37,x:-82}}]),address).status,'ambiguous');assert.equal(matchCensus(census([]),address).status,'not_found');
 assert.throws(()=>matchCensus({},address),/Invalid provider/);assert.throws(()=>matchCensus({result:{addressMatches:null}},address),/Invalid provider/);
});
test('handler authenticates and authorizes exact saved property before any provider request',async()=>{
 for(const options of [{denied:true},{}]){const f=fixture(options);const response=await f.request(undefined,options.denied?undefined:{});assert.equal(response.status,options.denied?403:401);assert.ok(!f.calls.some(call=>call.url.includes('geocoding.geo.census.gov')));}
 const f=fixture();assert.equal((await f.request({companyId:c,dealId:'foreign'})).status,400);assert.equal((await f.request(undefined,{Authorization:'Bearer token',Origin:'https://foreign.invalid'})).status,403);
});
test('successful Census lookup strips unit for street search, never sends secrets/names and caches exact scope',async()=>{
 const f=fixture(),response=await f.request(),data=await response.json();assert.equal(response.status,200);assert.equal(data.address,address);assert.equal(data.deal_id,p);assert.equal(data.company_id,c);assert.equal(data.latitude,36.5);assert.equal(data.source,'US Census Geocoder');assert.equal(data.accuracy,'street_range');const provider=f.calls.find(call=>call.url.includes('geocoding.geo.census.gov'));assert.equal(new URL(provider.url).searchParams.get('address'),'90 Example Grove Cir, Bristol TN');assert.equal(new URL(provider.url).searchParams.get('benchmark'),'Public_AR_Current');assert.equal(new URL(provider.url).searchParams.get('format'),'json');assert.ok(provider.options.headers['User-Agent'].includes('TheKeyAhead'));assert.ok(!JSON.stringify(provider).includes('private-test-key'));assert.ok(!JSON.stringify(provider).includes('user-test-token'));assert.ok(!provider.url.includes('Private'));const write=f.calls.find(call=>call.options.method==='POST'&&call.url.includes('property_geocode_cache?'));const saved=JSON.parse(write.options.body);assert.equal(saved.company_id,c);assert.equal(saved.deal_id,p);assert.equal(saved.address_hash.length,64);assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('fresh cache avoids provider and throttle; busy slot prevents request; address/revocation races do not cache',async()=>{
 const f=fixture({cached:{status:'matched',latitude:'36.5',longitude:'-82.2',matched_address:'Match',updated_at:new Date().toISOString()}});assert.equal((await f.request()).status,200);assert.ok(!f.calls.some(call=>/geocoding.geo.census.gov|claim_property/.test(call.url)));
 const busy=fixture({busy:true}),r=await busy.request();assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'2');assert.ok(!busy.calls.some(call=>call.url.includes('geocoding.geo.census.gov')));
 for(const options of [{changed:true},{revoked:true}]){const failure=fixture(options);assert.ok((await failure.request()).status>=400);assert.ok(!failure.calls.some(call=>call.options.method==='POST'&&call.url.includes('property_geocode_cache?')));}
});


test('unit cleanup preserves street-name substrings and strips only separate unit labels',()=>{
 for(const address of ['123 Captain Jones Road, Bristol TN','124 Stevens Lane, Bristol TN','125 Aptos Avenue, Bristol TN','126 Suitewater Circle, Bristol TN','127 Unity Drive, Bristol TN'])assert.equal(lookupAddress(address),address);
 for(const unit of [' #20',' Apt 20',' Apt. 20',' Unit A',' Suite 3-B',' Ste. 4',', Apt 20'])assert.equal(lookupAddress('90 Example Grove Cir'+unit+', Bristol TN'),'90 Example Grove Cir, Bristol TN');
 const captain={...match,matchedAddress:'123 CAPTAIN JONES RD, BRISTOL, TN'};assert.equal(matchCensus(census([captain]),'123 Captain Jones Rd Apt 2, Bristol TN').status,'matched');
});


test('street matches require the requested street rather than a street-name substring',()=>{
 const building=road=>({...match,matchedAddress:'90 '+road+', BRISTOL, TN'});
 for(const [requested,returned] of [['Old Main Street','Main Street'],['North Main Street','Main Street'],['Main Street Extension','Main Street'],['Main Street','Main Street Extension'],['Stone Road','One Road']])assert.equal(matchCensus(census([building(returned)]),'90 '+requested+', Bristol TN').status,'not_found');
 for(const requested of ['90 Example Grove Cir, Bristol TN','90 Example Grove Circle Bristol TN'])assert.equal(matchCensus(census([building('Example Grove Circle')]),requested).status,'matched');
 assert.equal(matchCensus(census([building('North Main Street')]),'90 N Main St, Bristol TN').status,'matched');
 assert.equal(matchCensus(census([building('Main Street')]),'90 Old Main Street Bristol TN').status,'not_found');
});


test('provider denial produces a safe diagnostic without recording the address or credentials',async()=>{
 const previous=console.warn,logs=[];console.warn=value=>logs.push(String(value));try{const f=fixture({providerStatus:403}),response=await f.request(),data=await response.json();assert.equal(response.status,503);assert.equal(data.code,'lookup_provider_http_403');assert.deepEqual(logs,['property-geocode failure stage=provider_http_403']);assert.ok(!logs.join('').includes(address));assert.ok(!logs.join('').includes('private-test-key'));assert.ok(!f.calls.some(call=>call.options.method==='POST'&&call.url.includes('property_geocode_cache?')));}finally{console.warn=previous;}
});
