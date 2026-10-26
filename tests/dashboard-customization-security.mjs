import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('dashboard preferences isolate user and company, retain paid layouts and enforce direct-table rules',async()=>{
 const db=new PGlite(),a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',c='20000000-0000-4000-8000-000000000001',d='20000000-0000-4000-8000-000000000002';
 const order=['tools','metrics','recent_properties','follow_ups'],custom=['follow_ups','tools','metrics','recent_properties'];
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));await db.exec(read('supabase/baseline/application-schema.sql'));await db.exec(read('supabase/features/dashboard-customization.sql'));
  await db.exec(`insert into auth.users values('${a}','dashboard-a@example.invalid',now()),('${b}','dashboard-b@example.invalid',now());insert into public.companies(id,name) values('${c}','Local dashboard A'),('${d}','Local dashboard B');insert into public.company_members(company_id,user_id,role) values('${c}','${a}','owner'),('${c}','${b}','viewer'),('${d}','${b}','owner');update public.company_subscriptions set plan='pro',billing_status='active';`);
  const identity=async user=>{await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);set role authenticated;`)};
  const get=async company=>(await db.query('select public.get_dashboard_preferences($1) r',[company])).rows[0].r;
  const save=async(company,o=custom,h=['metrics'])=>(await db.query('select public.save_dashboard_preferences($1,$2,$3) r',[company,o,h])).rows[0].r;
  await identity(a);assert.deepEqual((await get(c)).widget_order,order);assert.equal((await get(c)).updated_at,null);
  await save(c);assert.deepEqual((await get(c)).widget_order,custom);assert.deepEqual((await get(c)).hidden_widgets,['metrics']);assert.ok((await get(c)).updated_at);
  await assert.rejects(get(d),/Active Pro/);await assert.rejects(save(d),/Active Pro/);
  for(const [o,h] of [[order,order],[['tools','tools','metrics','recent_properties'],[]],[order,['metrics','metrics']],[order,['billing']],[null,[]],[order,[null]]])await assert.rejects(save(c,o,h));
  await assert.rejects(db.query('update public.dashboard_preferences set company_id=$1 where company_id=$2',[d,c]),/permission denied/);
  await assert.rejects(db.query('insert into public.dashboard_preferences(company_id,user_id) values($1,$2)',[c,b]),/row-level security/);
  await assert.rejects(db.query('delete from public.dashboard_preferences where company_id=$1',[c]),/permission denied/);
  await identity(b);assert.deepEqual((await get(c)).widget_order,order,'A viewer gets their own defaults, not the owner layout');await save(c,order,['tools']);assert.deepEqual((await get(c)).hidden_widgets,['tools']);await save(d,custom,['follow_ups']);
  assert.equal((await db.query('select count(*)::int n from public.dashboard_preferences where user_id=$1',[a])).rows[0].n,0,'Even another member cannot select the owner preferences');
  await identity(a);assert.deepEqual((await get(c)).hidden_widgets,['metrics'],'Viewer changes do not overwrite owner preferences');
  for(const [plan,status] of [['free','not_connected'],['investor','active'],['pro','past_due'],['pro','canceled']]){await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}' where company_id='${c}';set role authenticated;`);await assert.rejects(get(c),/Active Pro/);await assert.rejects(save(c),/Active Pro/);assert.equal((await db.query('select count(*)::int n from public.dashboard_preferences where company_id=$1',[c])).rows[0].n,0);}
  await db.exec(`reset role;update public.company_subscriptions set plan='pro',billing_status='active' where company_id='${c}';set role authenticated;`);assert.deepEqual((await get(c)).widget_order,custom,'Paid reactivation retains layout');await save(c,order,[]);assert.deepEqual((await get(c)).hidden_widgets,[],'Reset saves defaults without deleting a row');
  await db.exec('reset role;set role anon');await assert.rejects(get(c),/permission denied/);
 }finally{await db.close()}
});
