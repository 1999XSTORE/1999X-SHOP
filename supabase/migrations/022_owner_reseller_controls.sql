create or replace function public.get_owner_reseller_overview()
returns table (
  subscription_id uuid,
  user_id uuid,
  user_email text,
  plan text,
  price numeric,
  fee_rate numeric,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  referral_code text,
  wallet_balance numeric,
  total_earned numeric,
  sales_count bigint,
  last_sale_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.user_roles ur
    where lower(ur.email) = lower(auth.jwt() ->> 'email')
      and ur.role = 'owner'
  ) then
    raise exception 'Owner access required';
  end if;

  return query
  with sales as (
    select
      rt.user_id,
      count(*)::bigint as sales_count,
      max(rt.created_at) as last_sale_at
    from public.reseller_transactions rt
    group by rt.user_id
  )
  select
    rs.id as subscription_id,
    rs.user_id,
    lower(rs.email) as user_email,
    rs.plan,
    rs.price,
    rs.fee_rate,
    rs.status,
    rs.started_at,
    rs.expires_at,
    coalesce(ra.referral_code, '') as referral_code,
    coalesce(rw.balance, 0)::numeric(12,2) as wallet_balance,
    coalesce(rw.total_earned, 0)::numeric(12,2) as total_earned,
    coalesce(sales.sales_count, 0)::bigint as sales_count,
    sales.last_sale_at
  from public.reseller_subscriptions rs
  left join public.reseller_accounts ra
    on lower(ra.email) = lower(rs.email)
  left join public.reseller_wallets rw
    on rw.user_id = rs.user_id
  left join sales
    on sales.user_id = rs.user_id
  order by rs.created_at desc, lower(rs.email) asc;
end;
$$;

create or replace function public.owner_manage_reseller_subscription(
  p_subscription_id uuid,
  p_action text
)
returns public.reseller_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription_row public.reseller_subscriptions%rowtype;
  normalized_action text := lower(trim(coalesce(p_action, '')));
begin
  if not exists (
    select 1
    from public.user_roles ur
    where lower(ur.email) = lower(auth.jwt() ->> 'email')
      and ur.role = 'owner'
  ) then
    raise exception 'Owner access required';
  end if;

  if normalized_action not in ('pause', 'resume', 'delete') then
    raise exception 'Invalid action';
  end if;

  select *
  into subscription_row
  from public.reseller_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Subscription not found';
  end if;

  if normalized_action = 'pause' then
    update public.reseller_subscriptions
    set status = 'paused',
        updated_at = now()
    where id = p_subscription_id
    returning * into subscription_row;

    update public.reseller_accounts
    set is_active = false
    where lower(email) = lower(subscription_row.email);
  elsif normalized_action = 'resume' then
    update public.reseller_subscriptions
    set status = 'active',
        updated_at = now()
    where id = p_subscription_id
    returning * into subscription_row;

    insert into public.reseller_accounts (email, is_active)
    values (lower(subscription_row.email), true)
    on conflict (email) do update
      set is_active = true;
  else
    delete from public.reseller_subscriptions
    where id = p_subscription_id
    returning * into subscription_row;

    update public.reseller_accounts
    set is_active = false
    where lower(email) = lower(subscription_row.email);
  end if;

  return subscription_row;
end;
$$;
