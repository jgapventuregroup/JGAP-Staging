-- Staging billing schema. Deployment is gated off until test Stripe is connected.
alter table public.company_subscriptions add column if not exists last_billing_event_created bigint not null default 0;
create table if not exists public.billing_webhook_events (
  event_id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_created bigint not null,
  processed_at timestamptz not null default now()
);
alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from public,anon,authenticated;
grant select,insert on public.billing_webhook_events to service_role;
create or replace function public.apply_verified_billing_event(
  p_event_id text,p_event_created bigint,p_customer_id text,p_subscription_id text,p_plan text,p_billing_status text
) returns text language plpgsql security invoker set search_path='' as $$
declare current_billing public.company_subscriptions; inserted_event text;
begin
  if (select auth.role()) is distinct from 'service_role' then raise exception 'Trusted billing service required'; end if;
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$' or p_event_created is null or p_event_created<0
    or p_customer_id is null or p_customer_id !~ '^cus_[A-Za-z0-9]+$'
    or p_subscription_id is null or p_subscription_id !~ '^sub_[A-Za-z0-9]+$'
    or p_plan is null or p_plan not in ('free','investor','pro')
    or p_billing_status is null or p_billing_status not in ('not_connected','active','past_due','canceled')
    or (p_plan='free' and p_billing_status='active') then raise exception 'Invalid verified billing state'; end if;
  select * into current_billing from public.company_subscriptions where stripe_customer_id=p_customer_id for update;
  if not found then return 'unmapped_customer'; end if;
  insert into public.billing_webhook_events(event_id,company_id,event_created)
    values(p_event_id,current_billing.company_id,p_event_created)
    on conflict(event_id) do nothing returning event_id into inserted_event;
  if inserted_event is null then return 'duplicate'; end if;
  if p_event_created<current_billing.last_billing_event_created then return 'older_event'; end if;
  if current_billing.stripe_subscription_id is not null
    and current_billing.stripe_subscription_id<>p_subscription_id
    and current_billing.billing_status not in ('not_connected','canceled') then return 'different_subscription'; end if;
  update public.company_subscriptions set plan=p_plan,billing_status=p_billing_status,
    stripe_subscription_id=p_subscription_id,last_billing_event_created=p_event_created,updated_at=now()
    where company_id=current_billing.company_id;
  return 'applied';
end $$;
revoke all on function public.apply_verified_billing_event(text,bigint,text,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_verified_billing_event(text,bigint,text,text,text,text) to service_role;
