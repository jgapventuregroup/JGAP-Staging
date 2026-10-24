-- Fix the PL/pgSQL record name collision with the existing report table alias.
-- Extend the existing Pro-only invoker report; no new tables or changed entitlements.
begin;
CREATE OR REPLACE FUNCTION public.get_advanced_finance_report(p_company_id uuid, p_month text, p_deal_id uuid DEFAULT NULL::uuid, p_reconciled boolean DEFAULT NULL::boolean, p_tax_treatment text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare period_start date; rows jsonb; totals jsonb; categories jsonb;
 estimate jsonb; saved_deal public.deals; invalid text[]:=array[]::text[]; item record;
 offer numeric; principal numeric; monthly_rate numeric; mortgage numeric; income numeric; expenses numeric; outflows numeric;
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

 -- Compare only one complete filter scope; recorded books are not certified complete.
 if p_deal_id is null then
  estimate:=jsonb_build_object('status','property_required');
 elsif p_reconciled is not null or p_tax_treatment is not null then
  estimate:=jsonb_build_object('status','unfiltered_required');
 else
  select * into saved_deal from public.deals where company_id=p_company_id and id=p_deal_id;
  if not found then raise exception 'Property not found in selected company' using errcode='42501';end if;
  offer:=coalesce(saved_deal.target_offer_price,saved_deal.purchase_price);
  for item in select * from (values
   ('offer',offer),('monthly_rent',saved_deal.monthly_rent),('other_monthly_income',saved_deal.other_monthly_income),
   ('vacancy_rate',saved_deal.vacancy_rate),('monthly_operating_expenses',saved_deal.monthly_operating_expenses),
   ('down_payment',saved_deal.down_payment),('interest_rate',saved_deal.interest_rate),('loan_term_years',saved_deal.loan_term_years)
  ) v(name,amount) loop
   if item.amount is null or item.amount::text in ('NaN','Infinity','-Infinity') or item.amount<0 or item.amount>1000000000000
    or (item.name in ('vacancy_rate','down_payment','interest_rate') and item.amount>100)
    or (item.name='loan_term_years' and (item.amount<=0 or item.amount>100)) then
    invalid:=array_append(invalid,item.name);
   end if;
  end loop;
  if cardinality(invalid)>0 then
   estimate:=jsonb_build_object('status','incomplete','invalid_fields',to_jsonb(invalid));
  else
   principal:=offer*(1-saved_deal.down_payment/100);monthly_rate:=saved_deal.interest_rate/1200;
   if principal=0 then mortgage:=0;
   elsif monthly_rate=0 then mortgage:=principal/(saved_deal.loan_term_years*12);
   elsif 1-power(1+monthly_rate,-saved_deal.loan_term_years*12)=0 then
    invalid:=array_append(invalid,'interest_rate');
   else mortgage:=principal*monthly_rate/(1-power(1+monthly_rate,-saved_deal.loan_term_years*12));end if;
   if cardinality(invalid)>0 then
    estimate:=jsonb_build_object('status','incomplete','invalid_fields',to_jsonb(invalid));
   else
    income:=round(saved_deal.monthly_rent*(1-saved_deal.vacancy_rate/100)+saved_deal.other_monthly_income,2);
    expenses:=round(saved_deal.monthly_operating_expenses,2);mortgage:=round(mortgage,2);outflows:=expenses+mortgage;
    estimate:=jsonb_build_object('status','ready','basis','current_saved_assumptions',
     'monthly_income',income::text,'operating_expenses',expenses::text,'mortgage_payment',mortgage::text,
     'total_outflows',outflows::text,'net',(income-outflows)::text);
   end if;
  end if;
 end if;
 return jsonb_build_object('company_id',p_company_id,'month',p_month,'deal_id',p_deal_id,'reconciled',p_reconciled,'tax_treatment',p_tax_treatment,'entries',rows,'totals',totals,'categories',categories,'estimate',estimate);
end $function$;

revoke all on function public.get_advanced_finance_report(uuid,text,uuid,boolean,text) from public,anon;
grant execute on function public.get_advanced_finance_report(uuid,text,uuid,boolean,text) to authenticated;
commit;
