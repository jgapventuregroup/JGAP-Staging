// Rebuild the reviewed schema-only baseline from metadata, never application rows.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('supabase/baseline/catalog.json',root),'utf8'));
const quote=value=>'"'+String(value).replaceAll('"','""')+'"';
const role=value=>value==='PUBLIC'?'PUBLIC':quote(value);
const qualified=object=>quote(object.schema)+'.'+quote(object.name);
const statement=value=>value.trim().replace(/;?$/,';');
const output=[`-- The Key Ahead application schema baseline, captured 2026-10-24.
-- EMPTY application schemas only. Never apply over staging/production or replay old migrations after it.
-- Requires an existing Supabase platform/Auth installation; contains no auth/customer rows or secrets.
-- Staging owner preview deliberately returns false. No staging identity whitelist is transferred.
begin;
set local check_function_bodies=off;
do $empty_only$ begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','jgap_private') and c.relkind in ('r','p','S','v','m','f')
  and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')) then
  raise exception 'Baseline requires empty application schemas. Do not apply to an existing environment.';
 end if;
end $empty_only$;`];
const append=value=>output.push(statement(value));
if(catalog.types.length||catalog.relations.some(r=>!['r','S'].includes(r.kind)||r.persistence!=='p')||catalog.functions.some(f=>f.kind!=='f'))throw Error('Unsupported schema object requires explicit baseline support');
if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(JSON.stringify(catalog))||/sb_(?:secret|publishable)_[\w-]+|eyJ[\w-]{30}/.test(JSON.stringify(catalog)))throw Error('Identity/key literal detected in schema metadata');
const grants=(kind,name,acl)=>{
 append(`REVOKE ALL ON ${kind} ${name} FROM PUBLIC, anon, authenticated, service_role`);
 for(const item of acl)append(`GRANT ${item.privilege} ON ${kind} ${name} TO ${role(item.role)}${item.grantable?' WITH GRANT OPTION':''}`);
};
for(const schema of catalog.schemas){append(`CREATE SCHEMA IF NOT EXISTS ${quote(schema.name)}`);append(`ALTER SCHEMA ${quote(schema.name)} OWNER TO ${quote(schema.owner)}`);}
const sequenceOptions=s=>`AS ${s.type} INCREMENT BY ${s.increment} MINVALUE ${s.min} MAXVALUE ${s.max} START WITH ${s.start} CACHE ${s.cache}${s.cycle?' CYCLE':' NO CYCLE'}`;
for(const sequence of catalog.relations.filter(r=>r.kind==='S'&&r.owned_by?.dependency!=='i'))append(`CREATE SEQUENCE ${qualified(sequence)} ${sequenceOptions(sequence.sequence)}`);
for(const table of catalog.relations.filter(r=>r.kind==='r')){
 const fields=table.columns.map(column=>{
  let value=`${quote(column.name)} ${column.type}`;
  if(column.identity){
   const sequence=catalog.relations.find(r=>r.kind==='S'&&r.owned_by?.schema===table.schema&&r.owned_by?.table===table.name&&r.owned_by?.column===column.name);
   if(!sequence)throw Error('Identity sequence metadata missing');
   const s=sequence.sequence;
   value+=` GENERATED ${column.identity==='a'?'ALWAYS':'BY DEFAULT'} AS IDENTITY (SEQUENCE NAME ${qualified(sequence)} INCREMENT BY ${s.increment} MINVALUE ${s.min} MAXVALUE ${s.max} START WITH ${s.start} CACHE ${s.cache}${s.cycle?' CYCLE':' NO CYCLE'})`;
  }else if(column.generated){if(column.generated!=='s')throw Error('Unsupported generated column');value+=` GENERATED ALWAYS AS (${column.default}) STORED`;}
  else if(column.default!==null)value+=' DEFAULT '+column.default;
  if(column.not_null)value+=' NOT NULL';
  return '  '+value;
 });
 append(`CREATE TABLE ${qualified(table)} (\n${fields.join(',\n')}\n)`);
 append(`ALTER TABLE ${qualified(table)} OWNER TO ${quote(table.owner)}`);
}
for(const sequence of catalog.relations.filter(r=>r.kind==='S')){
 append(`ALTER SEQUENCE ${qualified(sequence)} OWNER TO ${quote(sequence.owner)}`);
 if(sequence.owned_by?.dependency==='a'){const owner=sequence.owned_by;append(`ALTER SEQUENCE ${qualified(sequence)} OWNED BY ${quote(owner.schema)}.${quote(owner.table)}.${quote(owner.column)}`);}
}
for(const fn of catalog.functions){append(fn.definition);append(`ALTER FUNCTION ${qualified(fn)}(${fn.args}) OWNER TO ${quote(fn.owner)}`);}
// Unique keys and standalone unique indexes must exist before composite foreign keys.
for(const table of catalog.relations.filter(r=>r.kind==='r')){
 for(const constraint of table.constraints.filter(c=>c.kind!=='f'))append(`ALTER TABLE ${qualified(table)} ADD CONSTRAINT ${quote(constraint.name)} ${constraint.definition}`);
 for(const index of table.indexes)append(index);
}
for(const table of catalog.relations.filter(r=>r.kind==='r')){
 for(const constraint of table.constraints.filter(c=>c.kind==='f'))append(`ALTER TABLE ${qualified(table)} ADD CONSTRAINT ${quote(constraint.name)} ${constraint.definition}`);
 for(const trigger of table.triggers){append(trigger.definition);if(trigger.enabled!=='O')append(`ALTER TABLE ${qualified(table)} ${trigger.enabled==='D'?'DISABLE':trigger.enabled==='A'?'ENABLE ALWAYS':'ENABLE REPLICA'} TRIGGER ${quote(trigger.name)}`);}
 if(table.rls)append(`ALTER TABLE ${qualified(table)} ENABLE ROW LEVEL SECURITY`);
 if(table.force_rls)append(`ALTER TABLE ${qualified(table)} FORCE ROW LEVEL SECURITY`);
 for(const policy of table.policies){
  const command={r:'SELECT',a:'INSERT',w:'UPDATE',d:'DELETE','*':'ALL'}[policy.command];if(!command)throw Error('Unknown policy command');
  append(`CREATE POLICY ${quote(policy.name)} ON ${qualified(table)} AS ${policy.permissive?'PERMISSIVE':'RESTRICTIVE'} FOR ${command} TO ${policy.roles.map(role).join(', ')}${policy.using?' USING ('+policy.using+')':''}${policy.check?' WITH CHECK ('+policy.check+')':''}`);
 }
}
for(const schema of catalog.schemas)grants('SCHEMA',quote(schema.name),schema.acl);
for(const relation of catalog.relations){
 grants(relation.kind==='S'?'SEQUENCE':'TABLE',qualified(relation),relation.acl);
 for(const column of relation.columns)for(const item of column.acl||[])append(`GRANT ${item.privilege} (${quote(column.name)}) ON TABLE ${qualified(relation)} TO ${role(item.role)}${item.grantable?' WITH GRANT OPTION':''}`);
}
for(const fn of catalog.functions)grants('FUNCTION',`${qualified(fn)}(${fn.args})`,fn.acl);
output.push('commit;\n');
const sql=output.join('\n\n');
const target=new URL('supabase/baseline/application-schema.sql',root);
if(process.argv.includes('--check')){
 if(fs.readFileSync(target,'utf8')!==sql)throw Error('Baseline SQL differs from reviewed metadata; run node scripts/build-database-baseline.mjs');
 console.log('Schema-only baseline matches reviewed catalog');
}else{fs.writeFileSync(target,sql);console.log('Wrote '+fileURLToPath(target));}
