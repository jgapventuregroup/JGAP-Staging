-- LOCAL TEST CONTRACT ONLY. This is not a Supabase installation or an Auth migration.
-- It models only the existing auth.users foreign key and auth.uid/auth.role SQL inputs.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$$;
create function auth.role() returns text language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role');
$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
