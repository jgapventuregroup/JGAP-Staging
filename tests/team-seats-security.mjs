import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('named seat capacity, reservations and expiring server-only entitlements enforce paid team access',async()=>{
 const db=new PGlite(),a='83000000-0000-4000-8000-000000000001',b='83000000-0000-4000-8000-000000000002',x='83000000-0000-4000-8000-000000000003',c='83000000-0000-4000-8000-000000000011';
 try{
  for(const p of ['tests/database-platform-fixture.sql','supabase/baseline/application-schema.sql','supabase/features/team-controls.sql','supabase/features/team-seats.sql'])await db.exec(read(p));
  await db.exec(`insert into auth.users values('${a}','owner@example.invalid',now()),('${b}','viewer@example.invalid',now()),('${x}','third@example.invalid',now());insert into public.companies(id,name) values('${c}','Local seats');insert into public.company_members(company_id,user_id,role) values('${c}','${a}','owner');update public.company_subscriptions set plan='pro',billing_status='active';insert into public.deals(company_id,name) values('${c}','Shared property');`);
  const identity=async user=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);set role authenticated;`);
  const call=async(action,target=null,email=null,role=null)=>(await db.query('select public.manage_workspace_team($1,$2,$3,$4,$5) r',[action,c,target,email,role])).rows[0].r;
  const member=async()=>(await db.query('select public.is_company_member($1) r',[c])).rows[0].r;
  await identity(a);assert.equal((await call('list')).seats.total,1);await assert.rejects(call('invite',null,'viewer@example.invalid','viewer'),/paid team seat/);
  await assert.rejects(db.query('insert into public.company_team_seats(company_id,additional_seats,valid_until) values($1,100,now()+interval \'1 day\')',[c]),/permission denied/);
  await db.exec(`reset role;insert into public.company_team_seats(company_id,additional_seats,valid_until) values('${c}',1,now()+interval '1 day');set role authenticated;`);
  const inv=await call('invite',null,'viewer@example.invalid','viewer');let usage=(await call('list')).seats;assert.equal(usage.available,0);assert.equal(usage.reserved,1);await assert.rejects(call('invite',null,'third@example.invalid','editor'),/paid team seat/);
  await db.exec(`reset role;update public.company_team_seats set additional_seats=0 where company_id='${c}';set role authenticated;`);await identity(b);await assert.rejects(call('accept',inv.id),/paid team seat/);
  await db.exec(`reset role;update public.company_team_seats set additional_seats=1 where company_id='${c}';set role authenticated;`);await call('accept',inv.id);assert.equal(await member(),true);assert.equal((await db.query('select count(*)::int n from public.deals where company_id=$1',[c])).rows[0].n,1);
  await db.exec(`reset role;update public.company_team_seats set valid_until=now()-interval '1 second' where company_id='${c}';set role authenticated;`);assert.equal(await member(),false);assert.equal((await db.query('select count(*)::int n from public.deals where company_id=$1',[c])).rows[0].n,0);assert.equal((await db.query('select public.can_access_passport($1) r',[c])).rows[0].r,false);
  await assert.rejects(db.query('insert into public.deals(company_id,name) values($1,$2)',[c,'Unlicensed insert']),/row-level security/);
  await identity(a);assert.equal(await member(),true);assert.equal((await call('list')).seats.over_limit,true,'Owner can still manage an over-capacity team');
  await db.exec(`reset role;update public.company_team_seats set valid_until=now()+interval '1 day' where company_id='${c}';set role authenticated;`);await identity(b);assert.equal(await member(),true,'Paid reactivation restores retained membership without recreating records');
  await identity(a);await call('remove',b);const pending=await call('invite',null,'third@example.invalid','editor');await db.exec(`reset role;update public.company_invitations set expires_at=now()-interval '1 second' where id='${pending.id}';set role authenticated;`);assert.equal((await call('list')).seats.available,1);const next=await call('invite',null,'viewer@example.invalid','viewer');await call('revoke',next.id);assert.equal((await call('list')).seats.available,1);
  for(const plan of ['investor','free']){await db.exec(`reset role;update public.company_subscriptions set plan='${plan}' where company_id='${c}';set role authenticated;`);await assert.rejects(call('invite',null,'third@example.invalid','viewer'),/Pro workspace owner/);}
  await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from public.company_team_seats'),/permission denied/);
  await db.exec(`reset role;update auth.users set email='jgap-test-a@example.com' where id='${a}';update auth.users set email='jgap-test-b@example.com' where id='${b}';`);await db.exec(read('tests/staging-team-seats.sql'));assert.equal((await db.query("select count(*)::int n from public.companies where name='V1 rollback named seats'")).rows[0].n,0);
 }finally{await db.close()}
});
