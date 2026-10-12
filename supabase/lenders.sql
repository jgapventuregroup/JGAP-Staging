-- Original JGAP lender-directory fields, isolated by the current company.
create table public.lenders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  institution_name text not null check(length(btrim(institution_name)) between 2 and 150),
  contact_name text check(length(contact_name)<=150),
  lender_type text not null default 'Bank' check(lender_type in ('Bank','Credit Union','Commercial Lender','Private Lender','Hard Money','Other')),
  status text not null default 'Prospect' check(status in ('Prospect','Contacted','Active Relationship','Past Relationship')),
  phone text check(length(phone)<=50),email text check(length(email)<=254),website text check(length(website)<=500),
  address text check(length(address)<=300),loan_types text check(length(loan_types)<=300),
  minimum_loan_amount numeric check(minimum_loan_amount between 0 and 1e12),
  maximum_loan_amount numeric check(maximum_loan_amount between 0 and 1e12),
  typical_ltv numeric check(typical_ltv between 0 and 100),typical_dscr numeric check(typical_dscr between 0 and 100),
  last_contact_date date,next_follow_up_date date,
  rate_notes text check(length(rate_notes)<=2000),term_notes text check(length(term_notes)<=2000),notes text check(length(notes)<=4000),
  archived boolean not null default false,created_at timestamptz not null default now(),
  check(minimum_loan_amount is null or maximum_loan_amount is null or minimum_loan_amount<=maximum_loan_amount)
);
create index lenders_company_id_idx on public.lenders(company_id);
alter table public.lenders enable row level security;
revoke all on public.lenders from public,anon,authenticated;
grant select,insert,update on public.lenders to authenticated;
grant all on public.lenders to service_role;
create policy lender_read on public.lenders for select to authenticated using(public.is_company_member(company_id));
create policy lender_insert on public.lenders for insert to authenticated with check(
  exists(select 1 from public.company_members m where m.company_id=lenders.company_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','editor'))
);
create policy lender_update on public.lenders for update to authenticated using(
  exists(select 1 from public.company_members m where m.company_id=lenders.company_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','editor'))
) with check(
  exists(select 1 from public.company_members m where m.company_id=lenders.company_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','editor'))
);
create function jgap_private.prevent_lender_company_reassignment() returns trigger language plpgsql set search_path='' as $$
begin
  if new.company_id is distinct from old.company_id then raise exception 'Lender company cannot be changed'; end if;
  return new;
end $$;
revoke all on function jgap_private.prevent_lender_company_reassignment() from public,anon,authenticated;
create trigger prevent_lender_company_reassignment before update of company_id on public.lenders
  for each row execute function jgap_private.prevent_lender_company_reassignment();
