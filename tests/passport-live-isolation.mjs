import test from 'node:test';
import assert from 'node:assert/strict';
import {readConfiguration,assertDenied} from '../scripts/passport-live-isolation.mjs';
test('live gate refuses missing credentials, non-test opt-in and administrative keys',()=>{
 assert.throws(()=>readConfiguration({}),/required/);
 const env={TKA_STAGING_PUBLISHABLE_KEY:'sb_publishable_test',TKA_SESSION_A:'a',TKA_SESSION_B:'b',TKA_COMPANY_A:'11111111-1111-4111-8111-111111111111',TKA_COMPANY_B:'22222222-2222-4222-8222-222222222222',TKA_RUN_LIVE_PASSPORT_TEST:'staging-fixtures-only'};
 assert.equal(readConfiguration(env).accounts.length,2);
 for(const patch of [{TKA_STAGING_PUBLISHABLE_KEY:'sb_secret_fake'},{TKA_RUN_LIVE_PASSPORT_TEST:''},{TKA_COMPANY_B:env.TKA_COMPANY_A},{TKA_SESSION_B:'a'}])assert.throws(()=>readConfiguration({...env,...patch}));
});
test('authorization evidence rejects malformed requests and server errors',()=>{
 for(const status of [401,403])assert.doesNotThrow(()=>assertDenied({status},'deny'));
 assert.doesNotThrow(()=>assertDenied({status:200,data:[]},'hidden'));
 assert.throws(()=>assertDenied({status:200,data:[]},'insert must fail',false));
 for(const status of [400,404,409,500])assert.throws(()=>assertDenied({status,data:[]},'not auth'));
 assert.throws(()=>assertDenied({status:200,data:[{id:'leaked'}]},'leak'));
 assert.throws(()=>assertDenied({status:201,data:[]},'insert succeeded'));
});
