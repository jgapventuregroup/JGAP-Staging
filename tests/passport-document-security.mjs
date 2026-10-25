import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('private document policies enforce company/property/Pro/role access on restored schema',async()=>{
 const db=new PGlite();
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));await db.exec(read('supabase/baseline/application-schema.sql'));
  // Explicit local Storage SQL contract, not a hosted Storage API or file-upload simulation.
  await db.exec(`create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
   alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to authenticated;
   insert into auth.users values('10000000-0000-4000-8000-000000000001','document-a@example.invalid',now()),('10000000-0000-4000-8000-000000000002','document-b@example.invalid',now());
   insert into public.companies(id,name) values('20000000-0000-4000-8000-000000000001','Local document seed A'),('20000000-0000-4000-8000-000000000002','Local document seed B');
   insert into public.company_members(company_id,user_id,role) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','owner');`);
  await db.exec(read('supabase/storage/passport-documents.sql'));
  const bucket=(await db.query('select * from storage.buckets')).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),10485760);assert.deepEqual(bucket.allowed_mime_types,['application/pdf','image/jpeg','image/png']);
  const results=await db.exec(read('tests/staging-document-security.sql'));
  const checks=results.flatMap(r=>r.rows||[]).filter(r=>r.outcome);assert.equal(checks.length,3);assert.ok(checks.every(r=>r.outcome==='PASS'));
  assert.equal((await db.query('select count(*)::int as n from storage.objects')).rows[0].n,0,'All metadata fixtures roll back');
 }finally{await db.close()}
});
