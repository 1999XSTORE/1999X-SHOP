-- ============================================================
--  Transactions Table — stores all payment requests
--  Admin can see all rows; users see only their own
-- ============================================================

create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  user_email     text not null,
  user_name      text not null,
  amount         numeric(10,2) not null,
  method         text not null,
  transaction_id text not null,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  note           text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.transactions enable row level security;

-- Users can read their own transactions
create policy "Users read own transactions"
  on public.transactions for select
  using (user_id = auth.uid()::text);

-- Users can insert their own transactions
create policy "Users insert own transactions"
  on public.transactions for insert
  with check (user_id = auth.uid()::text);

-- Service role (admin edge function) can do everything — handled via service key
-- For admin UI reads we use a permissive policy gated on user_roles
create policy "Admins read all transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.user_roles
      where email = auth.jwt() ->> 'email'
      and role in ('admin', 'support')
    )
  );

create policy "Admins update transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.user_roles
      where email = auth.jwt() ->> 'email'
      and role = 'admin'
    )
  );
