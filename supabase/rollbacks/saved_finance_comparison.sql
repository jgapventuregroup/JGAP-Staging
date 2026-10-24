-- Manual staging rollback only: restore the pre-comparison report without touching data.
begin;
CREATE OR REPLACE FUNCTION public.get_advanced_finance_report(p_company_id uuid, p_month text, p_deal_id uuid DEFAULT NULL::uuid, p_reconciled boolean DEFAULT NULL::boolean, p_tax_treatment text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare period_start date; rows jsonb; totals jsonb; categories jsonb;
begin
 if not public.can_access_advanced_finance(p_company_id) then raise exception 'Active Pro report access required' using errcode='42501'; end if;
 if p_month is null or p_month !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then raise exception 'Select a valid report month' using errcode='22023'; end if;
 if p_tax_treatment is not null and p_tax_treatment not in ('review','deductible','capital','personal') then raise exception 'Invalid tax filter' using errcode='22023'; end if;
 period_start:=(p_month||'-01')::date;
 if p_deal_id is not null and not exists(select 1 from public.deals where id=p_deal_id and company_id=p_company_id) then raise exception 'Property not found in selected company' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.entry_date desc,r.entry_id),'[]'::jsonb) into rows from (
  select l.id as entry_id,l.company_id,l.deal_id,d.name as property_name,l.entry_date,l.entry_type,l.category,l.description,l.amount::text as amount,
   coalesce(b.vendor_name,'') as vendor_name,coalesce(b.payment_method,'') as payment_method,coalesce(b.account_name,'') as account_name,
   coalesce(b.tax_treatment,'review') as tax_treatment,coalesce(b.receipt_reference,'') as receipt_reference,coalesce(b.reconciled,false) as reconciled,
   coalesce(b.bookkeeping_notes,'') as bookkeeping_notes
  from public.property_ledger_entries l join public.deals d on d.company_id=l.company_id and d.id=l.deal_id
  left join public.property_ledger_bookkeeping b on b.company_id=l.company_id and b.deal_id=l.deal_id and b.ledger_entry_id=l.id
  where l.company_id=p_company_id and l.entry_date>=period_start and l.entry_date<(period_start+interval '1 month')::date
   and (p_deal_id is null or l.deal_id=p_deal_id)
   and (p_reconciled is null or coalesce(b.reconciled,false)=p_reconciled)
   and (p_tax_treatment is null or coalesce(b.tax_treatment,'review')=p_tax_treatment)
  order by l.entry_date desc,l.id limit 10001
 ) r;
 if jsonb_array_length(rows)>10000 then raise exception 'Report exceeds 10000 transactions; select a single property' using errcode='54000'; end if;
 select jsonb_build_object('income',coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='income'),0)::text,
  'expenses',coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='expense'),0)::text,
  'net',coalesce(sum(case when v->>'entry_type'='income' then (v->>'amount')::numeric else -(v->>'amount')::numeric end),0)::text,
  'unreconciled',count(*) filter(where (v->>'reconciled')::boolean=false),'count',count(*)) into totals from jsonb_array_elements(rows) v;
 select coalesce(jsonb_agg(to_jsonb(c) order by c.category),'[]'::jsonb) into categories from (
  select v->>'category' as category,
   coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='income'),0)::text as income,
   coalesce(sum((v->>'amount')::numeric) filter(where v->>'entry_type'='expense'),0)::text as expenses,
   sum(case when v->>'entry_type'='income' then (v->>'amount')::numeric else -(v->>'amount')::numeric end)::text as net
  from jsonb_array_elements(rows) v group by v->>'category'
 ) c;
 return jsonb_build_object('company_id',p_company_id,'month',p_month,'deal_id',p_deal_id,'reconciled',p_reconciled,'tax_treatment',p_tax_treatment,'entries',rows,'totals',totals,'categories',categories);
end $function$;

revoke all on function public.get_advanced_finance_report(uuid,text,uuid,boolean,text) from public,anon;
grant execute on function public.get_advanced_finance_report(uuid,text,uuid,boolean,text) to authenticated;
commit;
