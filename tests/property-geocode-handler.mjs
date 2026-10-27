import test from 'node:test';import assert from 'node:assert/strict';import {createPropertyGeocoder,matchNominatim,lookupAddress} from '../supabase/functions/property-geocode/handler.mjs';
const c='86000000-0000-4000-8000-000000000011',p='86000000-0000-4000-8000-000000000021',u='86000000-0000-4000-8000-000000000001',address='90 Example Grove Cir #20, Bristol TN';
const match={lat:'36.5',lon:'-82.2',place_rank:30,display_name:'90 Example Grove Circle, Bristol, Tennessee',address:{house_number:'90',road:'Example Grove Circle'}};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
function fixture({denied=false,cached=null,busy=false,provider=[match],changed=false,revoked=false}={}){
 const calls=[];let reads=0;const row={id:p,company_id:c,address,name:'Private property name',notes:'Private notes'};
 const handler=createPropertyGeocoder({baseUrl:'https://staging.invalid',anonKey:'public-test-key',serviceKey:'private-test-key',fetcher:async(url,options={})=>{url=String(url);calls.push({url,options});if(url.endsWith('/auth/v1/user'))return json({id:u});if(url.endsWith('/rpc/get_market_map')){reads++;if(denied||revoked&&reads>1)return json({},403);return json({company_id:c,rows:[{...row,...(changed&&reads>1?{address:'91 Different Lane'}:{})}]});}if(url.includes('property_geocode_cache?')&&options.method==='POST')return new Response(null,{status:201});if(url.includes('property_geocode_cache?'))return json(cached?[cached]:[]);if(url.endsWith('/rpc/claim_property_geocode_slot'))return json(busy?null:u);if(url.endsWith('/rpc/release_property_geocode_slot'))return json(true);if(url.startsWith('https://nominatim.openstreetmap.org/search'))return json(provider);throw Error('Unexpected URL');}});
 const request=(body={companyId:c,dealId:p},headers={Authorization:'Bearer user-test-token',Origin:'https://jgapventuregroup.github.io'})=>handler(new Request('https://staging.invalid/functions/v1/property-geocode',{method:'POST',headers,body:JSON.stringify(body)}));return {calls,request};
}
test('provider matching rejects city/street fallback, wrong houses/roads and ambiguous buildings',()=>{
 assert.equal(lookupAddress(address),'90 Example Grove Cir, Bristol TN');assert.equal(matchNominatim([match],address).status,'matched');for(const value of [{...match,lat:null},{...match,lon:''},{...match,place_rank:16},{...match,address:{house_number:'91',road:'Example Grove Circle'}},{...match,address:{house_number:'90',road:'Other Circle'}}])assert.equal(matchNominatim([value],address).status,'not_found');assert.equal(matchNominatim([match,{...match,lat:'37'}],address).status,'ambiguous');assert.equal(matchNominatim([],address).status,'not_found');
});
test('handler authenticates and authorizes exact saved property before any provider request',async()=>{
 for(const options of [{denied:true},{}]){const f=fixture(options);const response=await f.request(undefined,options.denied?undefined:{});assert.equal(response.status,options.denied?403:401);assert.ok(!f.calls.some(call=>call.url.includes('nominatim')));}
 const f=fixture();assert.equal((await f.request({companyId:c,dealId:'foreign'})).status,400);assert.equal((await f.request(undefined,{Authorization:'Bearer token',Origin:'https://foreign.invalid'})).status,403);
});
test('successful lookup strips unit for building search, never sends secrets/names and caches exact scope',async()=>{
 const f=fixture(),response=await f.request(),data=await response.json();assert.equal(response.status,200);assert.equal(data.address,address);assert.equal(data.deal_id,p);assert.equal(data.company_id,c);assert.equal(data.latitude,36.5);const provider=f.calls.find(call=>call.url.includes('nominatim'));assert.equal(new URL(provider.url).searchParams.get('q'),'90 Example Grove Cir, Bristol TN');assert.ok(provider.options.headers['User-Agent'].includes('TheKeyAhead'));assert.ok(!JSON.stringify(provider).includes('private-test-key'));assert.ok(!JSON.stringify(provider).includes('user-test-token'));assert.ok(!provider.url.includes('Private'));const write=f.calls.find(call=>call.options.method==='POST'&&call.url.includes('property_geocode_cache?'));const saved=JSON.parse(write.options.body);assert.equal(saved.company_id,c);assert.equal(saved.deal_id,p);assert.equal(saved.address_hash.length,64);assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('fresh cache avoids provider and throttle; busy slot prevents request; address/revocation races do not cache',async()=>{
 const f=fixture({cached:{status:'matched',latitude:'36.5',longitude:'-82.2',matched_address:'Match',updated_at:new Date().toISOString()}});assert.equal((await f.request()).status,200);assert.ok(!f.calls.some(call=>/nominatim|claim_property/.test(call.url)));
 const busy=fixture({busy:true}),r=await busy.request();assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'2');assert.ok(!busy.calls.some(call=>call.url.includes('nominatim')));
 for(const options of [{changed:true},{revoked:true}]){const failure=fixture(options);assert.ok((await failure.request()).status>=400);assert.ok(!failure.calls.some(call=>call.options.method==='POST'&&call.url.includes('property_geocode_cache?')));}
});


test('unit cleanup preserves street-name substrings and strips only separate unit labels',()=>{
 for(const address of ['123 Captain Jones Road, Bristol TN','124 Stevens Lane, Bristol TN','125 Aptos Avenue, Bristol TN','126 Suitewater Circle, Bristol TN','127 Unity Drive, Bristol TN'])assert.equal(lookupAddress(address),address);
 for(const unit of [' #20',' Apt 20',' Apt. 20',' Unit A',' Suite 3-B',' Ste. 4',', Apt 20'])assert.equal(lookupAddress('90 Example Grove Cir'+unit+', Bristol TN'),'90 Example Grove Cir, Bristol TN');
 const captain={...match,display_name:'123 Captain Jones Road, Bristol TN',address:{house_number:'123',road:'Captain Jones Road'}};assert.equal(matchNominatim([captain],'123 Captain Jones Rd Apt 2, Bristol TN').status,'matched');
});


test('building matches require the requested street rather than a street-name substring',()=>{
 const building=road=>({...match,address:{house_number:'90',road}});
 for(const [requested,returned] of [['Old Main Street','Main Street'],['North Main Street','Main Street'],['Main Street Extension','Main Street'],['Main Street','Main Street Extension'],['Stone Road','One Road']])assert.equal(matchNominatim([building(returned)],'90 '+requested+', Bristol TN').status,'not_found');
 for(const requested of ['90 Example Grove Cir, Bristol TN','90 Example Grove Circle Bristol TN'])assert.equal(matchNominatim([building('Example Grove Circle')],requested).status,'matched');
 assert.equal(matchNominatim([building('North Main Street')],'90 N Main St, Bristol TN').status,'matched');
 assert.equal(matchNominatim([building('Main Street')],'90 Old Main Street Bristol TN').status,'not_found');
});
