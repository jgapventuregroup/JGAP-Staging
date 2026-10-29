import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

async function installStack(db){
  await db.exec(read('tests/database-platform-fixture.sql'));
  await db.exec(read('supabase/baseline/application-schema.sql'));
  const files=['seller-financing','saved-deal-radar','money-making-overview','dashboard-customization','dashboard-grid','in-app-alerts','team-controls','team-seats','market-map','property-identity-preview','property-geocoding'];
  for(const feature of files)await db.exec(read('supabase/features/'+feature+'.sql'));
  // Local Storage SQL contract only: no hosted Auth, file bytes or API service.
  await db.exec(`create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
   alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
  await db.exec(read('supabase/storage/passport-documents.sql'));
}

test('complete canonical feature stack installs together and preserves team/seat/map security',async()=>{
 const db=new PGlite();
 try{
  await installStack(db);
  assert.equal((await db.query("select public from storage.buckets where id='passport-documents'")).rows[0].public,false);
  assert.equal((await db.query('select public.has_owner_preview_access(gen_random_uuid()) allowed')).rows[0].allowed,false);
  await db.exec(`insert into auth.users values('10000000-0000-4000-8000-000000000001','jgap-test-a@example.com',now()),('10000000-0000-4000-8000-000000000002','jgap-test-b@example.com',now());`);
  for(const suite of ['team-controls','team-seats','market-map']){
   const results=await db.exec(read('tests/staging-'+suite+'.sql'));
   const checks=results.flatMap(result=>result.rows||[]).filter(row=>row.outcome);
   assert.equal(checks.length,suite==='team-controls'?5:4,suite+' expected security groups');
   assert.ok(checks.every(row=>row.outcome==='PASS'),suite);
  }
  for(const table of ['companies','company_members','deals','dashboard_preferences','in_app_alert_reviews','company_team_seats','property_map_locations']){
   assert.equal((await db.query(`select count(*)::int n from public.${table}`)).rows[0].n,0,'Rollback leaves no '+table+' rows');
  }
 }finally{await db.close();}
});


test('removed editor keeps the same identity but loses property, document and Pro API access',async()=>{
 const db=new PGlite();
 const owner='84000000-0000-4000-8000-000000000001',editor='84000000-0000-4000-8000-000000000002',company='84000000-0000-4000-8000-000000000011',deal='84000000-0000-4000-8000-000000000021';
 const identity=async user=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);set role authenticated;`);
 const query=async(sql,args=[])=>db.query(sql,args);
 const objectName=`${company}/${deal}/84000000-0000-4000-8000-000000000031--fixture.pdf`;
 const layout=['analyzer','properties','metrics','recent_properties','follow_ups'].map((id,i)=>({id,x:0,y:i*4,w:12,h:4,hidden:false}));
 try{
  await installStack(db);
  await db.exec(`insert into auth.users values('${owner}','owner@example.invalid',now()),('${editor}','editor@example.invalid',now());
   insert into public.companies(id,name) values('${company}','Local revoked session');
   insert into public.company_members(company_id,user_id,role) values('${company}','${owner}','owner'),('${company}','${editor}','editor');
   update public.company_subscriptions set plan='pro',billing_status='active' where company_id='${company}';
   insert into public.company_team_seats(company_id,additional_seats,valid_until) values('${company}',1,now()+interval '1 day');
   insert into public.deals(id,company_id,name) values('${deal}','${company}','Retained fictional property');`);
  await identity(editor);
  assert.equal((await query('select auth.uid() id')).rows[0].id,editor);
  assert.equal((await query('select * from public.get_company_deal($1,$2)',[company,deal])).rows.length,1);
  await query('select public.update_company_deal($1,$2,$3::jsonb)',[company,deal,JSON.stringify({notes:'Verified before removal'})]);
  await query('insert into public.property_tasks(company_id,deal_id,title,due_on) values($1,$2,$3,current_date)',[company,deal,'Retained task']);
  await query('insert into storage.objects(bucket_id,name) values($1,$2)',['passport-documents',objectName]);
  assert.equal((await query('select * from storage.objects')).rows.length,1);
  await query('select public.save_dashboard_grid($1,$2::jsonb,null)',[company,JSON.stringify(layout)]);
  await query('select public.save_market_map_location($1,$2,36,-82)',[company,deal]);
  for(const sql of ['select public.get_dashboard_grid($1)','select public.get_market_map($1)','select public.get_in_app_alerts($1,current_date)',"select public.get_advanced_finance_report($1,to_char(current_date,'YYYY-MM'))"]){await query(sql,[company]);}
  // Owner removal is the only access change. The editor identity is deliberately
  // reused without refreshing its claims; this is a database-role simulation,
  // not a real JWT, Auth logout, browser cache or signed-download expiry test.
  await identity(owner);
  await query("select public.manage_workspace_team('remove',$1,$2,null,null)",[company,editor]);
  await identity(editor);
  assert.equal((await query('select auth.uid() id')).rows[0].id,editor);
  assert.equal((await query('select public.is_company_member($1) allowed',[company])).rows[0].allowed,false);
  for(const sql of ['select * from public.deals where company_id=$1','select * from public.list_company_deals($1)','select * from public.get_company_deal($1,$2)']){
   assert.equal((await query(sql,sql.includes('$2')?[company,deal]:[company])).rows.length,0,sql);
  }
  for(const table of ['property_tasks','dashboard_preferences','property_map_locations'])assert.equal((await query(`select * from public.${table} where company_id=$1`,[company])).rows.length,0,table);
  assert.equal((await query('select * from storage.objects')).rows.length,0);
  assert.equal((await query('update public.deals set notes=$1 where id=$2 returning id',['Unauthorized',deal])).rows.length,0);
  assert.equal((await query('update public.property_tasks set title=$1 where company_id=$2 returning id',['Unauthorized',company])).rows.length,0);
  await assert.rejects(query('select public.update_company_deal($1,$2,$3::jsonb)',[company,deal,JSON.stringify({notes:'Unauthorized'})]),/Not authorized/);
  await assert.rejects(query('insert into public.property_tasks(company_id,deal_id,title) values($1,$2,$3)',[company,deal,'Unauthorized']),/row-level security|access|authorized/i);
  await assert.rejects(query('insert into storage.objects(bucket_id,name) values($1,$2)',['passport-documents',objectName.replace('fixture','second')]),/row-level security/);
  for(const sql of ['select public.get_dashboard_grid($1)','select public.save_dashboard_grid($1,null,null)','select public.get_market_map($1)','select public.save_market_map_location($1,$2,37,-82)','select public.get_in_app_alerts($1,current_date)',"select public.get_advanced_finance_report($1,to_char(current_date,'YYYY-MM'))"]){
   await assert.rejects(query(sql,sql.includes('$2')?[company,deal]:[company]),/access|authorized|Pro/i,sql);
  }
  await identity(owner);
  assert.equal((await query('select * from public.get_company_deal($1,$2)',[company,deal])).rows[0].notes,'Verified before removal');
  assert.equal((await query('select title from public.property_tasks where company_id=$1',[company])).rows[0].title,'Retained task');
  assert.equal((await query('select * from storage.objects')).rows.length,1,'Removal preserves file metadata for authorized members');
  await db.exec('reset role');
  assert.equal((await query('select count(*)::int n from public.dashboard_preferences where company_id=$1',[company])).rows[0].n,0,'Membership removal cascades only the removed member’s personal preferences');
 }finally{await db.close();}
});
