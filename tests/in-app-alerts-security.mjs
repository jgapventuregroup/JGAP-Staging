import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('in-app alerts derive only active due records, isolate personal reviews and reject forged/obsolete sources',async()=>{
 const db=new PGlite(),a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',c='20000000-0000-4000-8000-000000000001',d='20000000-0000-4000-8000-000000000002';
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));await db.exec(read('supabase/baseline/application-schema.sql'));await db.exec(read('supabase/features/in-app-alerts.sql'));
  await db.exec(`insert into auth.users values('${a}','alerts-a@example.invalid',now()),('${b}','alerts-b@example.invalid',now());insert into public.companies(id,name) values('${c}','Local alerts A'),('${d}','Local alerts B');insert into public.company_members(company_id,user_id,role) values('${c}','${a}','owner'),('${c}','${b}','viewer'),('${d}','${b}','owner');update public.company_subscriptions set plan='pro',billing_status='active';`);
  const deal=(await db.query(`insert into public.deals(company_id,name,follow_up_date) values($1,'Due property',current_date) returning id`,[c])).rows[0].id;
  const future=(await db.query(`insert into public.deals(company_id,name,follow_up_date) values($1,'Future property',current_date+5) returning id`,[c])).rows[0].id;
  const asset=(await db.query('insert into public.property_assets(company_id,deal_id,name,next_service_date) values($1,$2,\'Equipment with linked schedule\',current_date) returning id',[c,deal])).rows[0].id;
  await db.query('insert into public.property_asset_services(company_id,deal_id,asset_id,service_name,frequency_value,frequency_unit,next_service_date) values($1,$2,$3,\'Filter service\',1,\'year\',current_date)',[c,deal,asset]);
  await db.query('insert into public.property_assets(company_id,deal_id,name,next_service_date) values($1,$2,\'Standalone equipment due\',current_date)',[c,deal]);
  await db.query('insert into public.property_maintenance(company_id,deal_id,title,maintenance_date,status,due_date) values($1,$2,\'Due work\',current_date,\'planned\',current_date),($1,$2,\'Completed work\',current_date,\'completed\',current_date),($1,$2,\'Cancelled work\',current_date,\'cancelled\',current_date)',[c,deal]);
  const identity=async user=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);set role authenticated;`);
  await identity(a);const task=(await db.query('insert into public.property_tasks(company_id,deal_id,title,due_on) values($1,$2,\'Due task\',current_date) returning id',[c,deal])).rows[0].id;
  await db.query('insert into public.property_tasks(company_id,deal_id,title,due_on,status) values($1,$2,\'Done task\',current_date,\'done\'),($1,$2,\'Future task\',current_date+5,\'open\')',[c,deal]);
  const get=async(company=c)=>(await db.query('select public.get_in_app_alerts($1,current_date) r',[company])).rows[0].r;
  const mark=async(row,reviewed=true)=>(await db.query('select public.set_in_app_alert_review($1,$2,$3,$4,$5,$6) r',[row.company_id,row.source_type,row.source_id,row.deal_id,row.due_date,reviewed])).rows[0].r;
  let r=await get();assert.equal(r.total_count,5);assert.equal(r.unreviewed_count,5);assert.deepEqual([...new Set(r.items.map(x=>x.source_type))].sort(),['equipment','follow_up','maintenance','service','task']);assert.ok(!r.items.some(x=>x.deal_id===future));
  const entry=r.items.find(x=>x.source_type==='task');await mark(entry);r=await get();assert.equal(r.unreviewed_count,4);assert.ok(r.items.find(x=>x.source_type==='task').reviewed_at);
  await identity(b);assert.equal((await get()).unreviewed_count,5,'A viewer has their own review state');await mark(entry);assert.equal((await get()).unreviewed_count,4);assert.equal((await db.query('select count(*)::int n from public.in_app_alert_reviews where user_id=$1',[a])).rows[0].n,0,'Another member cannot read personal review rows');
  await identity(a);await mark(entry,false);assert.equal((await get()).unreviewed_count,5);await assert.rejects(get(d),/Active Pro/);await assert.rejects(mark({...entry,company_id:d}),/Active Pro/);await assert.rejects(mark({...entry,deal_id:future}),/changed or is no longer/);
  await assert.rejects(db.query('insert into public.in_app_alert_reviews(company_id,user_id,source_type,source_id,deal_id,due_date) values($1,$2,$3,$4,$5,$6)',[c,b,'task',task,deal,entry.due_date]),/row-level security/);
  await db.query('update public.property_tasks set status=\'done\' where id=$1',[task]);await assert.rejects(mark(entry),/changed or is no longer/);assert.equal((await get()).total_count,4);
  await db.exec('reset role');await db.query('update public.deals set follow_up_date=current_date+7 where id=$1',[deal]);await identity(a);assert.equal((await get()).total_count,3,'Source rescheduling removes the prior alert');
  for(const [plan,status] of [['free','not_connected'],['investor','active'],['pro','past_due'],['pro','canceled']]){await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}' where company_id='${c}';set role authenticated;`);await assert.rejects(get(),/Active Pro/);assert.equal((await db.query('select count(*)::int n from public.in_app_alert_reviews where company_id=$1',[c])).rows[0].n,0);}
  await db.exec(`reset role;update public.company_subscriptions set plan='pro',billing_status='active' where company_id='${c}';set role authenticated;`);assert.equal((await db.query('select count(*)::int n from public.in_app_alert_reviews where company_id=$1',[c])).rows[0].n,1,'Reactivation retains personal state');
  await db.exec('reset role;set role anon');await assert.rejects(get(),/permission denied/);
 }finally{await db.close()}
});
