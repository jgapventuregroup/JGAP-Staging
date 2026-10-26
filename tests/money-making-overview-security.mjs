import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('money overview preserves unknown and zero balances, matched equity and current Pro company access',async()=>{
 const db=new PGlite(),cid='20000000-0000-4000-8000-000000000001';
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));await db.exec(read('supabase/baseline/application-schema.sql'));await db.exec(read('supabase/features/money-making-overview.sql'));
  await db.exec(`insert into auth.users values('10000000-0000-4000-8000-000000000001','overview-test@example.invalid',now());insert into public.companies(id,name) values('${cid}','Local money overview');insert into public.company_members(company_id,user_id,role) values('${cid}','10000000-0000-4000-8000-000000000001','owner');update public.company_subscriptions set plan='pro',billing_status='active';
   insert into public.deals(company_id,name,status,passport_current_value,passport_mortgage_balance) values('${cid}','Paired','closed',200000.01,100000.02),('${cid}','Unknown debt','closed',500000,null),('${cid}','Value unknown','lead',null,100),('${cid}','Paid off','closed',10000,0);
   select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);set role authenticated;`);
  const load=async(company=cid,month='2026-10')=>(await db.query('select public.get_money_making_overview($1,$2) r',[company,month])).rows[0].r;
  const r=await load();assert.equal(r.groups.all_saved.count,4);assert.equal(r.groups.all_saved.value_count,3);assert.equal(r.groups.all_saved.debt_count,3);assert.equal(r.groups.all_saved.equity_count,2);assert.equal(r.groups.all_saved.paired_equity,'109999.99');assert.equal(r.groups.closed_stage.count,3);assert.equal(r.groups.closed_stage.debt_total,'100000.02');assert.equal(r.recorded.totals.count,0);
  await assert.rejects(load('20000000-0000-4000-8000-000000000002'),/Active Pro/);await assert.rejects(load(cid,'2026-13'));
  await db.exec('reset role;update public.company_members set role=\'viewer\';set role authenticated');assert.equal((await load()).groups.all_saved.count,4);
  for(const [plan,status] of [['free','not_connected'],['investor','active'],['pro','past_due'],['pro','canceled']]){await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}';set role authenticated`);await assert.rejects(load(),/Active Pro/);}
  await db.exec('reset role;set role anon');await assert.rejects(load(),/permission denied/);
 }finally{await db.close()}
});
