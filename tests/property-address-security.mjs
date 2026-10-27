import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('paid property identity updates retain records and enforce role, company and Free locks',async()=>{
 const db=new PGlite(),a='85000000-0000-4000-8000-000000000001',b='85000000-0000-4000-8000-000000000002',c='85000000-0000-4000-8000-000000000011',d='85000000-0000-4000-8000-000000000012',p='85000000-0000-4000-8000-000000000021',q='85000000-0000-4000-8000-000000000022';
 try{
  for(const file of ['tests/database-platform-fixture.sql','supabase/baseline/application-schema.sql','supabase/features/team-controls.sql','supabase/features/team-seats.sql','supabase/features/market-map.sql','supabase/features/property-identity-preview.sql'])await db.exec(read(file));
  await db.exec(`insert into auth.users values('${a}','address-a@example.invalid',now()),('${b}','address-b@example.invalid',now());insert into public.companies(id,name) values('${c}','Address fixture'),('${d}','Foreign address fixture');insert into public.company_members(company_id,user_id,role) values('${c}','${a}','owner'),('${d}','${b}','owner');update public.company_subscriptions set plan='pro',billing_status='active';insert into public.deals(id,company_id,name,property_address,notes) values('${p}','${c}','Original property','1 Fictional Lane','Preserve notes'),('${q}','${d}','Foreign property','2 Fictional Lane','Foreign notes');select set_config('request.jwt.claim.sub','${a}',false);insert into public.property_tasks(company_id,deal_id,title) values('${c}','${p}','Preserve task');insert into public.property_map_locations(company_id,deal_id,latitude,longitude,verified_by) values('${c}','${p}',0,0,'${a}');`);
  const setRole=role=>db.exec(`reset role;update public.company_members set role='${role}' where company_id='${c}' and user_id='${a}';select set_config('request.jwt.claim.sub','${a}',false);set role authenticated;`);
  const update=(company=c,deal=p,patch={name:'Updated property',property_address:'3 Fictional Lane'})=>db.query('select public.update_company_deal($1,$2,$3) r',[company,deal,patch]);
  for(const plan of ['investor','pro'])for(const role of ['owner','admin','editor']){
   await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='active' where company_id='${c}';`);await setRole(role);const desired={name:plan+' '+role+' property',property_address:role+' Fictional Lane'};await update(c,p,desired);const fresh=(await db.query('select * from public.get_company_deal($1,$2)',[c,p])).rows[0];assert.equal(fresh.id,p);assert.equal(fresh.name,desired.name);assert.equal(fresh.property_address,desired.property_address);assert.equal(fresh.notes,'Preserve notes');
  }
  await setRole('viewer');await assert.rejects(update(),/cannot edit/);await setRole('owner');await assert.rejects(update(d,q),/Not authorized/);await assert.rejects(update(c,q),/not found/);
  for(const [plan,status] of [['free','not_connected'],['pro','past_due']]){
   await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}' where company_id='${c}';set role authenticated;`);await assert.rejects(update(c,p,{name:'Replacement property',property_address:'4 Fictional Lane'}),/FREE_PROPERTY_IDENTITY_LOCKED/);
  }
  // Local-only preview contract; the real hosted helper is never replaced by this test.
  await db.exec(`reset role;create or replace function public.has_owner_preview_access(p_company_id uuid) returns boolean language sql stable security invoker set search_path='' as $preview$ select p_company_id='${c}'::uuid and (select auth.uid())='${a}'::uuid and exists(select 1 from auth.users where id='${a}' and email_confirmed_at is not null) $preview$;grant select on auth.users to authenticated;update public.company_subscriptions set plan='free',billing_status='not_connected' where company_id='${c}';set role authenticated;`);
  await update(c,p,{name:'Preview correction',property_address:'5 Fictional Lane'});
  await setRole('viewer');await assert.rejects(update(),/cannot edit/);await setRole('owner');
  await db.exec(`reset role;update auth.users set email_confirmed_at=null where id='${a}';set role authenticated;`);await assert.rejects(update(),/FREE_PROPERTY_IDENTITY_LOCKED/);
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.property_tasks where company_id=$1 and deal_id=$2',[c,p])).rows[0].n,1);assert.equal((await db.query('select latitude,longitude from public.property_map_locations where company_id=$1 and deal_id=$2',[c,p])).rows[0].latitude,'0.000000');assert.equal((await db.query('select count(*)::int n from public.deals where id=$1',[p])).rows[0].n,1);
  await db.exec('set role anon');await assert.rejects(update(),/permission denied/);
 }finally{await db.close();}
});
