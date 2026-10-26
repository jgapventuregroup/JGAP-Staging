import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('saved-deal radar uses current Pro entitlement and exact scoped saved data',async()=>{
 const db=new PGlite(),cid='20000000-0000-4000-8000-000000000001';
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));await db.exec(read('supabase/baseline/application-schema.sql'));await db.exec(read('supabase/features/saved-deal-radar.sql'));
  await db.exec(`insert into auth.users values('10000000-0000-4000-8000-000000000001','radar-test@example.invalid',now());
   insert into public.companies(id,name) values('${cid}','Local radar A'),('20000000-0000-4000-8000-000000000002','Local radar B');
   insert into public.company_members(company_id,user_id,role) values('${cid}','10000000-0000-4000-8000-000000000001','owner');
   update public.company_subscriptions set plan='pro',billing_status='active';
   insert into public.deals(company_id,name,asking_price,target_offer_price,monthly_rent,monthly_operating_expenses,units,follow_up_date) values('${cid}','Exact cents',100000.01,90000.02,1000,200,2,'2026-10-26'),('${cid}','Unknown and zero',null,null,0,0,null,null),('20000000-0000-4000-8000-000000000002','Foreign property',1,1,1,1,1,null);
   select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);set role authenticated;`);
  const load=async(company=cid,date='2026-10-26')=>(await db.query('select public.get_saved_deal_radar($1,$2) r',[company,date])).rows[0].r;
  let r=await load();assert.equal(r.rows.length,2);assert.ok(r.rows.every(x=>x.company_id===cid));const known=r.rows.find(x=>x.name==='Exact cents'),unknown=r.rows.find(x=>x.name==='Unknown and zero');assert.equal(known.asking_offer_gap,'9999.99');assert.equal(known.follow_up_due,true);assert.deepEqual(known.review_fields,[]);assert.equal(unknown.asking_offer_gap,null);assert.equal(unknown.follow_up_due,false);assert.equal(unknown.review_fields.length,5);
  assert.equal((await load(cid,'2026-10-25')).rows.find(x=>x.name==='Exact cents').follow_up_due,false);
  await assert.rejects(load('20000000-0000-4000-8000-000000000002'),/Active Pro/);await assert.rejects(load(cid,null));
  await db.exec('reset role;update public.company_members set role=\'viewer\';set role authenticated');assert.equal((await load()).rows.length,2);
  for(const [plan,status] of [['free','not_connected'],['investor','active'],['pro','past_due'],['pro','canceled']]){await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}';set role authenticated;`);await assert.rejects(load(),/Active Pro/);}
  await db.exec('reset role;set role anon');await assert.rejects(load(),/permission denied/);
 }finally{await db.close()}
});
