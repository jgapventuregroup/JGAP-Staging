import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PGlite} from '@electric-sql/pglite';import {defaultGrid,sameGrid} from '../dashboard-grid.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('grid preferences validate geometry, isolate accounts/workspaces, preserve legacy and reject stale writes',async()=>{
 const db=new PGlite(),a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',c='20000000-0000-4000-8000-000000000001',d='20000000-0000-4000-8000-000000000002';
 try{
  for(const file of ['tests/database-platform-fixture.sql','supabase/baseline/application-schema.sql','supabase/features/dashboard-customization.sql','supabase/features/dashboard-grid.sql'])await db.exec(read(file));
  await db.exec(`insert into auth.users values('${a}','grid-a@example.invalid',now()),('${b}','grid-b@example.invalid',now());insert into public.companies(id,name) values('${c}','Grid A'),('${d}','Grid B');insert into public.company_members(company_id,user_id,role) values('${c}','${a}','owner'),('${c}','${b}','viewer'),('${d}','${b}','owner');update public.company_subscriptions set plan='pro',billing_status='active';`);
  const who=async id=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);
  const get=async company=>(await db.query('select public.get_dashboard_grid($1) r',[company])).rows[0].r;
  const save=async(company,layout=defaultGrid(),stamp=null)=>(await db.query('select public.save_dashboard_grid($1,$2::jsonb,$3::timestamptz) r',[company,JSON.stringify(layout),stamp])).rows[0].r;
  await who(a);assert.equal((await get(c)).layout,null);let saved=await save(c);assert.deepEqual(saved.layout,defaultGrid());assert.equal(sameGrid(saved.layout,defaultGrid()),true,'Real JSONB round trip must pass client verification');assert.equal(saved.user_id,a);assert.equal(saved.version,2);
  await assert.rejects(save(c),/another session/);const priorStamp=saved.updated_at,custom=defaultGrid();custom[0].x=6;custom[1].x=0;saved=await save(c,custom,priorStamp);assert.deepEqual((await get(c)).layout,custom);await assert.rejects(save(c,defaultGrid(),priorStamp),/another session/);
  for(const change of [l=>l.pop(),l=>l[0].id='properties',l=>l[0].x=-1,l=>l[0].x=12,l=>l[0].y=121,l=>l[0].w=0,l=>l[0].h=49,l=>l[0].x=1.5,l=>l[0].content='<script>',l=>l[0].hidden='false',l=>l.forEach(i=>i.hidden=true)]){const invalid=defaultGrid();change(invalid);await assert.rejects(save(c,invalid,saved.updated_at),/Invalid dashboard/);}
  await assert.rejects(save(d),/Active Pro/);await assert.rejects(get(d),/Active Pro/);
  await assert.rejects(db.query('update public.dashboard_preferences set grid_layout=$1::jsonb where company_id=$2',[JSON.stringify([{id:'bad'}]),c]),/check constraint/);
  await assert.rejects(db.query('update public.dashboard_preferences set user_id=$1 where company_id=$2',[b,c]),/permission denied/);
  await who(b);assert.equal((await get(c)).layout,null);await save(c);assert.equal((await db.query('select count(*)::int n from public.dashboard_preferences where user_id=$1',[a])).rows[0].n,0);await who(a);assert.deepEqual((await get(c)).layout,custom);
  await db.query('select public.save_dashboard_preferences($1,$2,$3)',[c,['follow_ups','tools','metrics','recent_properties'],['metrics']]);assert.deepEqual((await get(c)).layout,custom,'Legacy API must not erase grid');await assert.rejects(save(c,custom,saved.updated_at),/another session/);
  await db.exec(`reset role;update public.company_subscriptions set plan='free',billing_status='not_connected' where company_id='${c}';set role authenticated;`);await assert.rejects(get(c),/Active Pro/);await assert.rejects(save(c),/Active Pro/);assert.equal((await db.query('select count(*)::int n from public.dashboard_preferences where company_id=$1',[c])).rows[0].n,0);
  await db.exec(`reset role;update public.company_subscriptions set plan='pro',billing_status='active' where company_id='${c}';set role authenticated;`);assert.deepEqual((await get(c)).layout,custom,'Reactivation retains positions');
  await db.exec('reset role;set role anon');await assert.rejects(get(c),/permission denied/);await assert.rejects(save(c),/permission denied/);
 }finally{await db.close();}
});
