import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {spawnSync} from 'node:child_process';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('clean app baseline restores with RLS/grants and passes SQL security regressions',async()=>{
 const check=spawnSync(process.execPath,['scripts/build-database-baseline.mjs','--check'],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
 const db=new PGlite();
 try{
  await db.exec(read('tests/database-platform-fixture.sql'));
  await db.exec(read('supabase/baseline/application-schema.sql'));
  const expected=JSON.parse(read('supabase/baseline/catalog.json'));
  const actual=(await db.query(read('scripts/schema-catalog-query.sql'))).rows[0].catalog;
  assert.deepEqual(actual.schemas.sort((a,b)=>a.name.localeCompare(b.name)),expected.schemas.sort((a,b)=>a.name.localeCompare(b.name)),'Schema owners and grants match');
  assert.deepEqual(actual.relations.map(r=>[r.schema,r.name,r.kind]),expected.relations.map(r=>[r.schema,r.name,r.kind]));
  // PostgreSQL 17/18 deparse equivalent CHECK parentheses differently. Parse the
  // captured constraints in an isolated local probe schema, then compare canonical definitions.
  await db.exec('create schema baseline_probe');
  for(const relation of expected.relations.filter(r=>r.kind==='r')){
   await db.exec(`create table baseline_probe."${relation.name}" (like "${relation.schema}"."${relation.name}" including defaults)`);
   for(const constraint of relation.constraints)await db.exec(`alter table baseline_probe."${relation.name}" add constraint "${constraint.name}" ${constraint.definition}`);
   relation.constraints=(await db.query(`select conname as name,contype as kind,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid=$1::regclass and contype<>'n' order by conname`,['baseline_probe.'+relation.name])).rows;
  }
  for(const relation of expected.relations){
   const restored=actual.relations.find(r=>r.schema===relation.schema&&r.name===relation.name);
   for(const field of ['columns','constraints','policies','acl','rls','force_rls','sequence','owned_by'])assert.deepEqual(restored[field],relation[field],relation.name+' '+field);
   assert.deepEqual(restored.triggers,relation.triggers,relation.name+' triggers');
   assert.deepEqual(restored.indexes,relation.indexes,relation.name+' indexes');
  }
  await db.exec('drop schema baseline_probe cascade');
  assert.deepEqual(actual.functions.map(f=>[f.schema,f.name,f.args,f.owner,/SECURITY DEFINER/.test(f.definition),f.acl]),expected.functions.map(f=>[f.schema,f.name,f.args,f.owner,/SECURITY DEFINER/.test(f.definition),f.acl]));
  assert.equal((await db.query('select public.has_owner_preview_access(gen_random_uuid()) as allowed')).rows[0].allowed,false,'Staging owner preview is disabled in new baseline');
  assert.ok(!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(read('supabase/baseline/application-schema.sql')),'Baseline contains no email whitelist');
  for(const table of expected.relations.filter(r=>r.kind==='r'))assert.equal((await db.query(`select count(*)::int as count from "${table.schema}"."${table.name}"`)).rows[0].count,0,'Baseline contains no '+table.name+' rows');
  await assert.rejects(db.exec(read('supabase/baseline/application-schema.sql')),/Baseline requires empty application schemas/);await db.exec('rollback');
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000001','schema-a@example.invalid',now()),('10000000-0000-4000-8000-000000000002','schema-b@example.invalid',now());
   insert into public.companies(id,name) values('20000000-0000-4000-8000-000000000001','Local seed A'),('20000000-0000-4000-8000-000000000002','Local seed B');
   insert into public.company_members(company_id,user_id,role) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','owner');`);
  for(const file of ['staging-membership-security.sql','staging-operations-security.sql','staging-advanced-finance-security.sql','staging-secondary-financing-security.sql','staging-passport-notes-security.sql','staging-passport-details-security.sql','staging-saved-finance-comparison.sql']){
   const results=await db.exec(read('tests/'+file));
   const checks=results.flatMap(result=>result.rows||[]).filter(row=>row.outcome);
   assert.ok(checks.length>0,file+' must report checks');assert.ok(checks.every(row=>row.outcome==='PASS'),file);
   console.log(file+': '+checks.length+' grouped SQL checks passed on restored local schema');
  }
  assert.equal((await db.query('select count(*)::int as count from public.companies')).rows[0].count,2,'Rollback tests leave only local seed companies');
 }catch(error){throw new Error(error.message+(error.detail?' · '+error.detail:''));}finally{await db.close();}
});
