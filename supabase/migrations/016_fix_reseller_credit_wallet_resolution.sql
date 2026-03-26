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
  resolved_referral_email text;
  reseller_user_id uuid;
  net_amount numeric(10,2);
  fee_amount numeric(10,2);
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
  resolved_referral_email := '';

  if clean_referral <> '' and clean_referral <> clean_customer_email then
    select lower(email)
    into resolved_referral_email
    from public.reseller_accounts
    where is_active = true
      and (
        lower(email) = clean_referral
        or lower(coalesce(referral_code, '')) = clean_referral
      )
    limit 1;

    if coalesce(resolved_referral_email, '') <> '' and resolved_referral_email <> clean_customer_email then
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
          tx.id, reseller_row.user_id, reseller_row.email, coalesce(tx.user_email, ''), coalesce(tx.amount, 0), fee_amount, net_amount
        )
        on conflict (transaction_id) do nothing;
      else
        resolved_referral_email := '';
        net_amount := 0;
        platform_amount_local := coalesce(tx.amount, 0);
      end if;
    else
      resolved_referral_email := '';
      net_amount := 0;
      platform_amount_local := coalesce(tx.amount, 0);
    end if;
  else
    net_amount := 0;
    platform_amount_local := coalesce(tx.amount, 0);
  end if;

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
