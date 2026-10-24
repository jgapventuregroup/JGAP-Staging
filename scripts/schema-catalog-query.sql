-- Metadata only: never select application rows, auth users, secrets or sequence values.
with app_relations as (
 select c.*,n.nspname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','jgap_private') and c.relkind in ('r','p','S','v','m','f')
 and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
), app_functions as (
 select p.*,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','jgap_private') and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
)
select jsonb_build_object(
 'server_version',current_setting('server_version'),
 'schemas',(select jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',(select coalesce(jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,'privilege',x.privilege_type,'grantable',x.is_grantable)),'[]'::jsonb) from aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x))) from pg_namespace n where n.nspname in ('public','jgap_private')),
 'types',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',t.typname,'kind',t.typtype)),'[]'::jsonb) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','jgap_private') and t.typtype in ('d','e')),
 'relations',(select jsonb_agg(jsonb_build_object('schema',c.nspname,'name',c.relname,'kind',c.relkind,'persistence',c.relpersistence,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'columns',(select coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),'has_column_acl',a.attacl is not null,'acl',(select coalesce(jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,'privilege',x.privilege_type,'grantable',x.is_grantable)),'[]'::jsonb) from aclexplode(a.attacl) x)) order by a.attnum),'[]'::jsonb) from pg_attribute a left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
  'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'kind',co.contype,'definition',pg_get_constraintdef(co.oid)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid and co.contype<>'n'),
  'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by i.indexrelid),'[]'::jsonb) from pg_index i where i.indrelid=c.oid and not exists(select 1 from pg_constraint co where co.conindid=i.indexrelid and co.contype in ('p','u','x'))),
  'triggers',(select coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) order by t.tgname),'[]'::jsonb) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal),
  'policies',(select coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'roles',(select jsonb_agg(case when role=0 then 'PUBLIC' else pg_get_userbyid(role) end) from unnest(p.polroles) role),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname),'[]'::jsonb) from pg_policy p where p.polrelid=c.oid),
  'acl',(select coalesce(jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,'privilege',x.privilege_type,'grantable',x.is_grantable)),'[]'::jsonb) from aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) x),
  'sequence',(select jsonb_build_object('type',format_type(s.seqtypid,null),'start',s.seqstart::text,'increment',s.seqincrement::text,'min',s.seqmin::text,'max',s.seqmax::text,'cache',s.seqcache::text,'cycle',s.seqcycle) from pg_sequence s where s.seqrelid=c.oid),
  'owned_by',(select jsonb_build_object('schema',nt.nspname,'table',ct.relname,'column',a.attname,'dependency',d.deptype) from pg_depend d join pg_class ct on ct.oid=d.refobjid join pg_namespace nt on nt.oid=ct.relnamespace join pg_attribute a on a.attrelid=ct.oid and a.attnum=d.refobjsubid where d.classid='pg_class'::regclass and d.objid=c.oid and c.relkind='S' and d.deptype in ('a','i') limit 1)
 ) order by c.nspname,c.relname) from app_relations c),
 'functions',(select jsonb_agg(jsonb_build_object('schema',p.nspname,'name',p.proname,'kind',p.prokind,'args',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),
  'definition',case when p.nspname='public' and p.proname='has_owner_preview_access' then 'CREATE OR REPLACE FUNCTION public.has_owner_preview_access(p_company_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='''' AS $no_preview$ SELECT false $no_preview$;' else pg_get_functiondef(p.oid) end,
  'acl',(select coalesce(jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,'privilege',x.privilege_type,'grantable',x.is_grantable)),'[]'::jsonb) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)
 ) order by p.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from app_functions p)
) as catalog;
