alter table public.transactions
add column if not exists referral_email text default '',
add column if not exists reseller_processed boolean not null default false,
add column if not exists reseller_net_amount numeric(10,2) not null default 0,
add column if not exists platform_fee numeric(10,2) not null default 0;

create table if not exists public.reseller_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  balance numeric(12,2) not null default 0,
  total_earned numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reseller_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  customer_email text not null default '',
  amount numeric(10,2) not null,
  fee numeric(10,2) not null,
  net_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (transaction_id)
);

create table if not exists public.platform_earnings (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(10,2) not null,
  source text not null default 'payment',
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reseller_wallets enable row level security;
alter table public.reseller_transactions enable row level security;
alter table public.platform_earnings enable row level security;
alter table public.withdrawal_requests enable row level security;

drop policy if exists "users_select_own_reseller_wallet" on public.reseller_wallets;
create policy "users_select_own_reseller_wallet"
  on public.reseller_wallets for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_reseller_wallet" on public.reseller_wallets;
create policy "users_insert_own_reseller_wallet"
  on public.reseller_wallets for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_update_own_reseller_wallet" on public.reseller_wallets;
create policy "users_update_own_reseller_wallet"
  on public.reseller_wallets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "staff_select_reseller_wallets" on public.reseller_wallets;
create policy "staff_select_reseller_wallets"
  on public.reseller_wallets for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

drop policy if exists "users_select_own_reseller_transactions" on public.reseller_transactions;
create policy "users_select_own_reseller_transactions"
  on public.reseller_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "staff_select_reseller_transactions" on public.reseller_transactions;
create policy "staff_select_reseller_transactions"
  on public.reseller_transactions for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

drop policy if exists "users_select_own_withdrawals" on public.withdrawal_requests;
create policy "users_select_own_withdrawals"
  on public.withdrawal_requests for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_withdrawals" on public.withdrawal_requests;
create policy "users_insert_own_withdrawals"
  on public.withdrawal_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "staff_select_withdrawals" on public.withdrawal_requests;
create policy "staff_select_withdrawals"
  on public.withdrawal_requests for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

drop policy if exists "staff_update_withdrawals" on public.withdrawal_requests;
create policy "staff_update_withdrawals"
  on public.withdrawal_requests for update
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role = 'admin'
    )
  );

drop policy if exists "staff_select_platform_earnings" on public.platform_earnings;
create policy "staff_select_platform_earnings"
  on public.platform_earnings for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

create index if not exists reseller_wallets_email_idx on public.reseller_wallets(email);
create index if not exists reseller_transactions_user_id_idx on public.reseller_transactions(user_id);
create index if not exists withdrawal_requests_user_id_idx on public.withdrawal_requests(user_id);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests(status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reseller_wallets_updated_at on public.reseller_wallets;
create trigger trg_reseller_wallets_updated_at
before update on public.reseller_wallets
for each row execute function public.touch_updated_at();

drop trigger if exists trg_withdrawal_requests_updated_at on public.withdrawal_requests;
create trigger trg_withdrawal_requests_updated_at
before update on public.withdrawal_requests
for each row execute function public.touch_updated_at();

create or replace function public.ensure_reseller_wallet(p_user_id uuid, p_email text)
returns public.reseller_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.reseller_wallets;
begin
  insert into public.reseller_wallets (user_id, email)
  values (p_user_id, lower(trim(p_email)))
  on conflict (user_id)
  do update set email = excluded.email, updated_at = now()
  returning * into wallet_row;

  return wallet_row;
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

  if clean_referral <> '' and clean_referral <> clean_customer_email then
    select * into reseller_row
    from public.reseller_wallets
    where email = clean_referral;

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
      referral_email = clean_referral,
      reseller_net_amount = net_amount,
      platform_fee = platform_amount_local
  where id = tx.id;

  return query select true, clean_referral, net_amount, platform_amount_local;
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
begin
  if extract(isodow from now()) <> 5 then
    raise exception 'Withdrawals are only available on Friday';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be greater than 0';
  end if;

  perform public.ensure_reseller_wallet(p_user_id, p_email);

  select * into wallet_row
  from public.reseller_wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  if wallet_row.balance < p_amount then
    raise exception 'Insufficient reseller balance';
  end if;

  update public.reseller_wallets
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.withdrawal_requests (user_id, user_email, amount, status)
  values (p_user_id, lower(trim(p_email)), round(p_amount, 2), 'pending')
  returning * into request_row;

  return request_row;
end;
$$;

create or replace function public.handle_withdrawal_request(p_request_id uuid, p_status text)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.withdrawal_requests%rowtype;
begin
  if lower(coalesce(p_status, '')) not in ('approved', 'rejected') then
    raise exception 'Invalid withdrawal status';
  end if;

  if not exists (
    select 1 from public.user_roles
    where email = (auth.jwt() ->> 'email')
    and role = 'admin'
  ) then
    raise exception 'Only admins can manage withdrawals';
  end if;

  select * into req
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if req.status <> 'pending' then
    return req;
  end if;

  update public.withdrawal_requests
  set status = lower(p_status),
      updated_at = now()
  where id = p_request_id
  returning * into req;

  if req.status = 'rejected' then
    update public.reseller_wallets
    set balance = balance + req.amount,
        updated_at = now()
    where user_id = req.user_id;
  end if;

  return req;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'reseller_wallets'
  ) then
    alter publication supabase_realtime add table public.reseller_wallets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'reseller_transactions'
  ) then
    alter publication supabase_realtime add table public.reseller_transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'withdrawal_requests'
  ) then
    alter publication supabase_realtime add table public.withdrawal_requests;
  end if;
end $$;
