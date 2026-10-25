alter policy passport_documents_read on storage.objects
using (
 bucket_id='passport-documents'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}--[A-Za-z0-9][A-Za-z0-9._ -]{0,119}\.(pdf|jpg|jpeg|png)$'
 and exists (
  select 1 from public.deals d
  where d.company_id::text=split_part(objects.name,'/',1) and d.id::text=split_part(objects.name,'/',2)
  and public.can_access_advanced_finance(d.company_id)
 )
);

alter policy passport_documents_insert on storage.objects
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
