-- Operator-only, after both approved logins exist in the authorized production project.
-- Use a privileged SQL session. Never run this in staging or through a browser RPC.
begin;

lock table auth.users, public.company_members in share mode;
lock table public.company_subscriptions in share row exclusive mode;

do $grant$
declare
  founder_email text;
  portfolio_id uuid;
begin
  foreach founder_email in array array['sean@thekeyahead.com', 'lesleigh@thekeyahead.com']
  loop
    select m.company_id into strict portfolio_id
    from auth.users u
    join public.company_members m on m.user_id = u.id
    where lower(u.email) = founder_email
      and u.email_confirmed_at is not null
      and m.role = 'owner'
      and (select count(*) from public.company_members where user_id = u.id) = 1
      and (select count(*) from public.company_members where company_id = m.company_id) = 1;

    update public.company_subscriptions
    set plan = 'pro', billing_status = 'active', updated_at = now()
    where company_id = portfolio_id
      and stripe_customer_id is null
      and stripe_subscription_id is null
      and last_billing_event_created = 0
      and ((plan = 'free' and billing_status = 'not_connected')
        or (plan = 'pro' and billing_status = 'active'));

    if not found then
      raise exception 'Founder portfolio has billing history or lacks an eligible membership: %', founder_email;
    end if;
  end loop;
exception
  when no_data_found or too_many_rows then
    raise exception 'Expected one verified founder with one private owned portfolio: %', founder_email;
end
$grant$;

commit;
