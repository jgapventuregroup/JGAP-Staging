import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('complete canonical feature stack installs together and preserves team/seat/map security',async()=>{
 const db=new PGlite();
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));
  await db.exec(read('supabase/baseline/application-schema.sql'));
  const files=['seller-financing','saved-deal-radar','money-making-overview','dashboard-customization','in-app-alerts','team-controls','team-seats','market-map','property-identity-preview'];
  for(const feature of files)await db.exec(read('supabase/features/'+feature+'.sql'));
  // Local Storage SQL contract only: no hosted Auth, file bytes or API service.
  await db.exec(`create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
   alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
  await db.exec(read('supabase/storage/passport-documents.sql'));
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
