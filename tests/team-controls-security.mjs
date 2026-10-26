import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('team invitations and roles enforce identity, Pro ownership, isolation and last-owner safety',async()=>{
 const db=new PGlite();const a='82000000-0000-4000-8000-000000000001',b='82000000-0000-4000-8000-000000000002',x='82000000-0000-4000-8000-000000000003',c='82000000-0000-4000-8000-000000000011',d='82000000-0000-4000-8000-000000000012';
 try{
  for(const p of ['tests/database-platform-fixture.sql','supabase/baseline/application-schema.sql','supabase/features/team-controls.sql'])await db.exec(read(p));
  await db.exec(`insert into auth.users values('${a}','owner@example.invalid',now()),('${b}','recipient@example.invalid',now()),('${x}','foreign@example.invalid',now());insert into public.companies(id,name) values('${c}','Team A'),('${d}','Team B');insert into public.company_members(company_id,user_id,role) values('${c}','${a}','owner'),('${d}','${x}','owner');update public.company_subscriptions set plan='pro',billing_status='active';`);
  const identity=async id=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);
  const call=async(action,company=c,target=null,email=null,role=null)=>(await db.query('select public.manage_workspace_team($1,$2,$3,$4,$5) r',[action,company,target,email,role])).rows[0].r;
  await identity(a);assert.equal((await call('list')).members.length,1);await assert.rejects(call('role',c,a,null,'viewer'),/at least one/);await assert.rejects(call('list',d),/owner required/);await assert.rejects(call('invite',c,null,'bad','viewer'),/Valid email/);await assert.rejects(call('invite',c,null,'recipient@example.invalid','owner'),/invitation role/);
  const inv=await call('invite',c,null,' Recipient@example.invalid ','viewer');await assert.rejects(call('invite',c,null,'recipient@example.invalid','editor'),/already exists/);
  await identity(x);await assert.rejects(call('accept',c,inv.id),/unavailable/);assert.deepEqual(await call('inbox',null),[]);
  await identity(b);assert.equal((await call('inbox',null))[0].id,inv.id);await assert.rejects(call('list'),/owner required/);
  await db.exec(`reset role;update auth.users set email_confirmed_at=null where id='${b}';set role authenticated;`);await assert.rejects(call('accept',c,inv.id),/Verified/);await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${b}';update public.company_subscriptions set billing_status='past_due' where company_id='${c}';set role authenticated;`);await assert.rejects(call('accept',c,inv.id),/Active Pro/);
  await db.exec(`reset role;update public.company_subscriptions set billing_status='active' where company_id='${c}';set role authenticated;`);assert.equal((await call('accept',c,inv.id)).role,'viewer');await assert.rejects(call('accept',c,inv.id),/unavailable/);await assert.rejects(call('role',c,b,null,'owner'),/owner required/);await assert.rejects(db.query('update public.company_members set role=$1 where user_id=$2',['owner',b]),/permission denied/);
  await identity(a);for(const role of ['admin','editor']){await call('role',c,b,null,role);await identity(b);await assert.rejects(call('role',c,b,null,'owner'),/owner required/);await assert.rejects(call('invite',c,null,'someone@example.invalid','viewer'),/owner required/);await identity(a);}await call('role',c,b,null,'owner');await call('role',c,a,null,'viewer');await assert.rejects(call('list'),/owner required/);
  await identity(b);await assert.rejects(call('role',c,b,null,'admin'),/at least one/);assert.equal((await call('list')).members.find(m=>m.user_id===a).role,'viewer');
  const revoked=await call('invite',c,null,'foreign@example.invalid','editor');await call('revoke',c,revoked.id);await identity(x);await assert.rejects(call('accept',c,revoked.id),/unavailable/);
  await identity(b);const expired=await call('invite',c,null,'foreign@example.invalid','admin');await db.exec(`reset role;update public.company_invitations set expires_at=now()-interval '1 second' where id='${expired.id}';set role authenticated;`);await identity(x);await assert.rejects(call('accept',c,expired.id),/unavailable/);
  await identity(b);for(const [plan,status] of [['free','not_connected'],['investor','active'],['pro','canceled']]){await db.exec(`reset role;update public.company_subscriptions set plan='${plan}',billing_status='${status}' where company_id='${c}';set role authenticated;`);await assert.rejects(call('list'),/owner required/);await assert.rejects(call('invite',c,null,'new@example.invalid','viewer'),/owner required/);}
  await db.exec('reset role;set role anon');await assert.rejects(call('inbox',null),/permission denied/);
 }finally{await db.close()}
});
