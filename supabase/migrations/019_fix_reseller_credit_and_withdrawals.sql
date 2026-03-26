create index if not exists reseller_subscriptions_active_email_idx
on public.reseller_subscriptions (lower(email), expires_at desc)
where status = 'active';

create or replace function public.has_active_reseller_subscription(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reseller_subscriptions rs
    where lower(rs.email) = lower(trim(coalesce(p_email, '')))
      and rs.status = 'active'
      and rs.expires_at > now()
  );
$$;

create or replace function public.resolve_referral(p_ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_ref text := lower(trim(coalesce(p_ref, '')));
  resolved_email text;
begin
  if clean_ref = '' then
    return '';
  end if;

  select lower(ra.email)
  into resolved_email
  from public.reseller_accounts ra
  where (
    lower(ra.email) = clean_ref
    or lower(coalesce(ra.referral_code, '')) = clean_ref
  )
    and public.has_active_reseller_subscription(ra.email)
  limit 1;

  return coalesce(resolved_email, '');
end;
$$;

create or replace function public.set_reseller_referral_code(p_code text)
returns public.reseller_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  clean_code text;
  target_row public.reseller_accounts;
begin
  if jwt_email = '' then
    raise exception 'Unauthorized';
  end if;

  if not public.has_active_reseller_subscription(jwt_email) then
    raise exception 'Active reseller subscription required';
  end if;

  clean_code := lower(trim(coalesce(p_code, '')));
  clean_code := regexp_replace(clean_code, '[^a-z0-9_-]', '', 'g');

  if length(clean_code) < 3 then
    raise exception 'Referral code must be at least 3 characters';
  end if;

  if length(clean_code) > 32 then
    raise exception 'Referral code must be 32 characters or less';
  end if;

  insert into public.reseller_accounts (email, is_active, referral_code)
  values (jwt_email, true, clean_code)
  on conflict (email) do update
    set is_active = true,
        referral_code = excluded.referral_code
  returning * into target_row;

  return target_row;
exception
  when unique_violation then
    raise exception 'Referral code is already taken';
end;
$$;

create or replace function public.apply_reseller_credit(p_transaction_id uuid)
returns table (
  processed boolean,
  referral_email text,
  reseller_amount numeric,
  platform_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  tx public.transactions%rowtype;
  reseller_row public.reseller_wallets%rowtype;
  clean_referral text;
  clean_customer_email text;
  resolved_referral_email text := '';
  reseller_user_id uuid;
  net_amount numeric(10,2) := 0;
  fee_amount numeric(10,2) := 0;
  platform_amount_local numeric(10,2);
begin
  select * into tx
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found then
    return query select false, ''::text, 0::numeric, 0::numeric;
    return;
  end if;

  if tx.reseller_processed then
    return query select true, coalesce(tx.referral_email, ''), coalesce(tx.reseller_net_amount, 0), coalesce(tx.platform_fee, 0);
    return;
  end if;

  if tx.status <> 'approved' then
    return query select false, coalesce(tx.referral_email, ''), 0::numeric, 0::numeric;
    return;
  end if;

  clean_referral := lower(trim(coalesce(tx.referral_email, '')));
  clean_customer_email := lower(trim(coalesce(tx.user_email, '')));
  platform_amount_local := coalesce(tx.amount, 0);

  if clean_referral <> '' and clean_referral <> clean_customer_email then
    resolved_referral_email := public.resolve_referral(clean_referral);

    if resolved_referral_email <> '' and resolved_referral_email <> clean_customer_email then
      select *
      into reseller_row
      from public.reseller_wallets
      where lower(email) = resolved_referral_email
      for update;

      if not found then
        select id
        into reseller_user_id
        from auth.users
        where lower(email) = resolved_referral_email
        limit 1;

        if reseller_user_id is not null then
          perform public.ensure_reseller_wallet(reseller_user_id, resolved_referral_email);

          select *
          into reseller_row
          from public.reseller_wallets
          where user_id = reseller_user_id
          for update;
        end if;
      end if;

      if found then
        fee_amount := round((coalesce(tx.amount, 0) * 0.01)::numeric, 2);
        net_amount := round((coalesce(tx.amount, 0) - fee_amount)::numeric, 2);
        platform_amount_local := fee_amount;

        update public.reseller_wallets
        set balance = balance + net_amount,
            total_earned = total_earned + net_amount,
            updated_at = now()
        where user_id = reseller_row.user_id;

        insert into public.reseller_transactions (
          transaction_id, user_id, user_email, customer_email, amount, fee, net_amount
        )
        values (
          tx.id,
          reseller_row.user_id,
          reseller_row.email,
          clean_customer_email,
          coalesce(tx.amount, 0),
          fee_amount,
          net_amount
        )
        on conflict (transaction_id) do nothing;
      else
        resolved_referral_email := '';
        net_amount := 0;
      end if;
    end if;
  end if;

  delete from public.platform_earnings
  where transaction_id = tx.id;

  insert into public.platform_earnings (transaction_id, amount, source)
  values (tx.id, platform_amount_local, case when net_amount > 0 then 'referral_fee' else 'direct_sale' end);

  update public.transactions
  set reseller_processed = true,
      referral_email = coalesce(resolved_referral_email, ''),
      reseller_net_amount = net_amount,
      platform_fee = platform_amount_local
  where id = tx.id;

  return query select true, coalesce(resolved_referral_email, ''), net_amount, platform_amount_local;
end;
$$;

create or replace function public.request_reseller_withdrawal(p_user_id uuid, p_email text, p_amount numeric)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.reseller_wallets%rowtype;
  request_row public.withdrawal_requests;
  requested_amount numeric(10,2) := round(coalesce(p_amount, 0), 2);
begin
  if requested_amount < 20 then
    raise exception 'Minimum withdrawal is $20';
  end if;

  perform public.ensure_reseller_wallet(p_user_id, p_email);

  select * into wallet_row
  from public.reseller_wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  if wallet_row.balance < requested_amount then
    raise exception 'Insufficient reseller balance';
  end if;

  update public.reseller_wallets
  set balance = balance - requested_amount,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.withdrawal_requests (user_id, user_email, amount, status)
  values (p_user_id, lower(trim(p_email)), requested_amount, 'pending')
  returning * into request_row;

  return request_row;
end;
$$;
