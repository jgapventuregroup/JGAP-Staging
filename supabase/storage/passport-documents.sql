-- Staging/private Storage integration. Requires existing application helpers and Supabase Storage.
-- Additive only: no existing bucket, policy, object or customer record is altered.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('passport-documents','passport-documents',false,10485760,array['application/pdf','image/jpeg','image/png']);

create policy passport_documents_read on storage.objects
for select to authenticated
using (
 bucket_id='passport-documents'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}--[A-Za-z0-9][A-Za-z0-9._ -]{0,119}\.(pdf|jpg|jpeg|png)$'
 and exists (
  select 1 from public.deals d
  where d.company_id::text=split_part(objects.name,'/',1) and d.id::text=split_part(objects.name,'/',2)
  and public.can_access_advanced_finance(d.company_id)
 )
);

create policy passport_documents_insert on storage.objects
for insert to authenticated
with check (
 bucket_id='passport-documents'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}--[A-Za-z0-9][A-Za-z0-9._ -]{0,119}\.(pdf|jpg|jpeg|png)$'
 and exists (
  select 1 from public.deals d
  where d.company_id::text=split_part(objects.name,'/',1) and d.id::text=split_part(objects.name,'/',2)
  and public.can_access_advanced_finance(d.company_id)
  and exists(select 1 from public.company_members cm where cm.company_id=d.company_id and cm.user_id=(select auth.uid()) and cm.role in ('owner','admin','editor'))
 )
);
-- Immutable uploads: no UPDATE/upsert or DELETE policy. Removal is a separate reviewed admin operation.
