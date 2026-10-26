import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('seller calculator restores after baseline and enforces current company Pro entitlement',async()=>{
 const db=new PGlite();
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));await db.exec(read('supabase/baseline/application-schema.sql'));await db.exec(read('supabase/features/seller-financing.sql'));
  await db.exec(`insert into auth.users values('10000000-0000-4000-8000-000000000001','seller-test@example.invalid',now());
   insert into public.companies(id,name) values('20000000-0000-4000-8000-000000000001','Local seller test');
   insert into public.company_members(company_id,user_id,role) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner');
   update public.company_subscriptions set plan='pro',billing_status='active';
   select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);set role authenticated;`);
  const cid='20000000-0000-4000-8000-000000000001',inputs={price:300000,noi:3000,closing:10000,other_costs:0,rate:6,years:30,balloon_months:60};
  const calc=async(input=inputs,company=cid)=>(await db.query('select public.calculate_seller_financing($1,$2) as r',[company,JSON.stringify(input)])).rows[0].r;
  const r=await calc();assert.deepEqual(r.scenarios.map(x=>x.down_percent),[10,15,20]);assert.equal(r.scenarios[0].monthly_payment,'1618.79');assert.equal(r.scenarios[0].monthly_cash_flow,'1381.21');assert.equal(r.scenarios[0].cash_required,'40000.00');assert.equal(r.scenarios[0].balloon_balance,'251246.76');
  const zero=await calc({...inputs,rate:0});assert.equal(zero.scenarios[0].monthly_payment,'750.00');assert.equal(zero.scenarios[0].balloon_balance,'225000.00');
  assert.equal((await calc({...inputs,balloon_months:360})).scenarios[0].balloon_balance,'0.00');
  assert.equal((await calc({...inputs,noi:-100})).scenarios[0].monthly_cash_flow,'-1718.79');
  for(const patch of [{price:0},{rate:101},{years:0},{years:1.5},{balloon_months:361},{balloon_months:0},{closing:-1},{price:'300000'},{noi:null}])await assert.rejects(calc({...inputs,...patch}));
  await assert.rejects(calc(inputs,'20000000-0000-4000-8000-000000000002'),/Active Pro/);
  await db.exec(`reset role;update public.company_members set role='viewer';set role authenticated;`);assert.equal((await calc()).scenarios.length,3,'Read-only Pro viewers can calculate without writes');
  for(const [plan,status] of [['free','not_connected'],['investor','active'],['pro','past_due'],['pro','canceled']]){
   await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}';set role authenticated;`);await assert.rejects(calc(),/Active Pro/);
  }
  await db.exec('reset role;set role anon');await assert.rejects(calc(),/permission denied/);
 }finally{await db.close()}
});
