create table if not exists public.reseller_fee_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  amount numeric(10,2) not null,
  binance_pay_id text not null default '',
  binance_tx_id text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reseller_fee_payments enable row level security;

drop policy if exists "users_select_own_reseller_fee_payments" on public.reseller_fee_payments;
create policy "users_select_own_reseller_fee_payments"
  on public.reseller_fee_payments for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_reseller_fee_payments" on public.reseller_fee_payments;
create policy "users_insert_own_reseller_fee_payments"
  on public.reseller_fee_payments for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner_staff_select_reseller_fee_payments" on public.reseller_fee_payments;
create policy "owner_staff_select_reseller_fee_payments"
  on public.reseller_fee_payments for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = lower(auth.jwt() ->> 'email')
        and ur.role in ('owner', 'admin', 'support')
    )
  );

drop policy if exists "owner_admin_update_reseller_fee_payments" on public.reseller_fee_payments;
create policy "owner_admin_update_reseller_fee_payments"
  on public.reseller_fee_payments for update
  using (
    exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = lower(auth.jwt() ->> 'email')
        and ur.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = lower(auth.jwt() ->> 'email')
        and ur.role in ('owner', 'admin')
    )
  );

create index if not exists reseller_fee_payments_user_id_idx on public.reseller_fee_payments(user_id);
create index if not exists reseller_fee_payments_user_email_idx on public.reseller_fee_payments(lower(user_email));
create index if not exists reseller_fee_payments_status_idx on public.reseller_fee_payments(status);

drop trigger if exists trg_reseller_fee_payments_updated_at on public.reseller_fee_payments;
create trigger trg_reseller_fee_payments_updated_at
before update on public.reseller_fee_payments
for each row execute function public.touch_updated_at();

create or replace function public.get_reseller_fee_due(p_user_id uuid, p_email text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total_fee numeric(10,2) := 0;
  submitted_fee numeric(10,2) := 0;
begin
  select coalesce(sum(rt.fee), 0)::numeric(10,2)
  into total_fee
  from public.reseller_transactions rt
  where rt.user_id = p_user_id
     or lower(rt.user_email) = lower(trim(coalesce(p_email, '')));

  select coalesce(sum(fp.amount), 0)::numeric(10,2)
  into submitted_fee
  from public.reseller_fee_payments fp
  where fp.user_id = p_user_id
    and fp.status in ('pending', 'verified');

  return greatest(round(total_fee - submitted_fee, 2), 0);
end;
$$;

create or replace function public.submit_reseller_fee_payment(
  p_user_id uuid,
  p_email text,
  p_amount numeric,
  p_binance_pay_id text,
  p_binance_tx_id text
)
returns public.reseller_fee_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
  requested_amount numeric(10,2) := round(coalesce(p_amount, 0), 2);
  fee_due numeric(10,2);
  payment_row public.reseller_fee_payments;
begin
  if p_user_id is null or clean_email = '' then
    raise exception 'Unauthorized';
  end if;

  fee_due := public.get_reseller_fee_due(p_user_id, clean_email);

  if fee_due <= 0 then
    raise exception 'No reseller fee due';
  end if;

  if requested_amount <= 0 then
    raise exception 'Fee amount must be greater than 0';
  end if;

  if requested_amount > fee_due then
    requested_amount := fee_due;
  end if;

  if trim(coalesce(p_binance_tx_id, '')) = '' then
    raise exception 'Binance transaction ID is required';
  end if;

  insert into public.reseller_fee_payments (user_id, user_email, amount, binance_pay_id, binance_tx_id, status)
  values (
    p_user_id,
    clean_email,
    requested_amount,
    trim(coalesce(p_binance_pay_id, '')),
    trim(coalesce(p_binance_tx_id, '')),
    'pending'
  )
  returning * into payment_row;

  return payment_row;
end;
$$;

create or replace function public.get_owner_reseller_activity()
returns table (
  user_id uuid,
  user_email text,
  total_earned numeric,
  total_fee numeric,
  total_fee_paid numeric,
  fee_due numeric,
  wallet_balance numeric,
  sales_count bigint,
  latest_fee_payment_status text,
  latest_fee_payment_at timestamptz,
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
  with tx as (
    select
      rt.user_id,
      lower(rt.user_email) as user_email,
      coalesce(sum(rt.net_amount), 0)::numeric(12,2) as total_earned,
      coalesce(sum(rt.fee), 0)::numeric(12,2) as total_fee,
      count(*)::bigint as sales_count,
      max(rt.created_at) as last_sale_at
    from public.reseller_transactions rt
    group by rt.user_id, lower(rt.user_email)
  ),
  fees as (
    select
      fp.user_id,
      lower(fp.user_email) as user_email,
      coalesce(sum(case when fp.status in ('pending', 'verified') then fp.amount else 0 end), 0)::numeric(12,2) as total_fee_paid
    from public.reseller_fee_payments fp
    group by fp.user_id, lower(fp.user_email)
  ),
  latest_fee as (
    select distinct on (fp.user_id)
      fp.user_id,
      fp.status as latest_fee_payment_status,
      fp.created_at as latest_fee_payment_at
    from public.reseller_fee_payments fp
    order by fp.user_id, fp.created_at desc
  )
  select
    coalesce(tx.user_id, rw.user_id, fp.user_id) as user_id,
    coalesce(tx.user_email, lower(rw.email), lower(fp.user_email)) as user_email,
    coalesce(tx.total_earned, rw.total_earned, 0)::numeric(12,2) as total_earned,
    coalesce(tx.total_fee, 0)::numeric(12,2) as total_fee,
    coalesce(fees.total_fee_paid, 0)::numeric(12,2) as total_fee_paid,
    greatest(coalesce(tx.total_fee, 0) - coalesce(fees.total_fee_paid, 0), 0)::numeric(12,2) as fee_due,
    coalesce(rw.balance, 0)::numeric(12,2) as wallet_balance,
    coalesce(tx.sales_count, 0)::bigint as sales_count,
    coalesce(latest_fee.latest_fee_payment_status, 'none')::text as latest_fee_payment_status,
    latest_fee.latest_fee_payment_at,
    tx.last_sale_at
  from public.reseller_wallets rw
  full outer join tx
    on tx.user_id = rw.user_id
  full outer join (
    select user_id, user_email
    from public.reseller_fee_payments
    group by user_id, user_email
  ) fp
    on coalesce(tx.user_id, rw.user_id) = fp.user_id
  left join fees
    on fees.user_id = coalesce(tx.user_id, rw.user_id, fp.user_id)
  left join latest_fee
    on latest_fee.user_id = coalesce(tx.user_id, rw.user_id, fp.user_id)
  where coalesce(tx.user_email, lower(rw.email), lower(fp.user_email)) <> ''
  order by total_earned desc, wallet_balance desc, user_email asc;
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
  fee_due numeric(10,2);
begin
  if requested_amount < 20 then
    raise exception 'Minimum withdrawal is $20';
  end if;

  fee_due := public.get_reseller_fee_due(p_user_id, p_email);
  if fee_due > 0 then
    raise exception '%', format('Pay your reseller fee via Binance before withdrawal. Due: $%s', fee_due);
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
