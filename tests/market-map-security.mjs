import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('saved-property map enforces Pro/seat/company/editing boundaries and coordinate integrity',async()=>{
 const db=new PGlite(),a='84000000-0000-4000-8000-000000000001',b='84000000-0000-4000-8000-000000000002',c='84000000-0000-4000-8000-000000000011',d='84000000-0000-4000-8000-000000000012',p='84000000-0000-4000-8000-000000000021',q='84000000-0000-4000-8000-000000000022';
 try{
  for(const file of ['tests/database-platform-fixture.sql','supabase/baseline/application-schema.sql','supabase/features/team-controls.sql','supabase/features/team-seats.sql','supabase/features/market-map.sql'])await db.exec(read(file));
  await db.exec(`insert into auth.users values('${a}','map-owner@example.invalid',now()),('${b}','map-viewer@example.invalid',now());insert into public.companies(id,name) values('${c}','Local map A'),('${d}','Local map B');insert into public.company_members(company_id,user_id,role) values('${c}','${a}','owner'),('${c}','${b}','viewer'),('${d}','${b}','owner');update public.company_subscriptions set plan='pro',billing_status='active';insert into public.company_team_seats(company_id,additional_seats,valid_until) values('${c}',1,now()+interval '1 day');insert into public.deals(id,company_id,name) values('${p}','${c}','Zero position'),('${q}','${d}','Foreign property');`);
  const identity=async id=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);
  const load=async company=>(await db.query('select public.get_market_map($1) r',[company])).rows[0].r;
  const save=async(company=c,deal=p,lat=0,lng=0)=>(await db.query('select public.save_market_map_location($1,$2,$3,$4) r',[company,deal,lat,lng])).rows[0].r;
  await identity(a);let data=await load(c);assert.equal(data.rows.length,1);assert.equal(data.rows[0].latitude,null);let r=await save();assert.equal(r.latitude,0);assert.equal(r.longitude,0);assert.equal(r.verified_by,a);assert.ok(r.updated_at);assert.equal((await load(c)).rows[0].latitude,0);
  await assert.rejects(load(d),/Active Pro/);await assert.rejects(save(d,q),/Active Pro/);await assert.rejects(save(c,q),/unavailable/);
  for(const [lat,lng] of [[null,1],[1,null],[86,0],[0,181],['NaN',0],['Infinity',0]])await assert.rejects(save(c,p,lat,lng));
  await assert.rejects(db.query('update public.property_map_locations set company_id=$1 where deal_id=$2',[d,p]),/permission denied/);await assert.rejects(db.query('delete from public.property_map_locations'),/permission denied/);
  await identity(b);assert.equal((await load(c)).rows[0].latitude,0);await assert.rejects(save(),/editing role/);
  await db.exec(`reset role;update public.company_members set role='editor' where company_id='${c}' and user_id='${b}';set role authenticated;`);assert.equal((await save(c,p,36.595,-82.188)).verified_by,b);
  await db.exec(`reset role;update public.company_team_seats set valid_until=now()-interval '1 second' where company_id='${c}';set role authenticated;`);await assert.rejects(load(c),/Active Pro/);await assert.rejects(save(),/editing role/);
  await identity(a);for(const [plan,status] of [['free','not_connected'],['investor','active'],['pro','past_due'],['pro','canceled']]){await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}' where company_id='${c}';set role authenticated;`);await assert.rejects(load(c),/Active Pro/);await assert.rejects(save(),/editing role/);}
  await db.exec(`reset role;update public.company_subscriptions set plan='pro',billing_status='active' where company_id='${c}';set role authenticated;`);assert.equal((await load(c)).rows[0].latitude,36.595);await save(c,p,null,null);assert.equal((await load(c)).rows[0].latitude,null,'Clear pin retains property record');
  await db.exec('reset role;set role anon');await assert.rejects(load(c),/permission denied/);
  await db.exec(`reset role;update auth.users set email='jgap-test-a@example.com' where id='${a}';update auth.users set email='jgap-test-b@example.com' where id='${b}';`);await db.exec(read('tests/staging-market-map.sql'));assert.equal((await db.query("select count(*)::int n from public.companies where name like 'V1 rollback map %'")).rows[0].n,0);
 }finally{await db.close()}
});
