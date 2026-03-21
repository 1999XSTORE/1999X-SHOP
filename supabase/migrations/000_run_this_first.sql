-- ============================================================
--  RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
--  Dashboard → SQL Editor → New Query → paste → Run
--  This creates ALL tables and fixes ALL permissions.
-- ============================================================

-- ── 1. user_roles table ─────────────────────────────────────
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null check (role in ('admin', 'support')),
  created_at timestamptz default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can read their own role" on public.user_roles;
create policy "Users can read their own role"
  on public.user_roles for select
  using (email = (auth.jwt() ->> 'email'));

-- ── 2. transactions table ────────────────────────────────────
create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  user_email     text not null,
  user_name      text not null,
  amount         numeric(10,2) not null,
  method         text not null,
  transaction_id text not null,
  status         text not null default 'pending'
                   check (status in ('pending','approved','rejected')),
  note           text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.transactions enable row level security;

-- Drop all old policies first to avoid conflicts
drop policy if exists "Users read own transactions"   on public.transactions;
drop policy if exists "Users insert own transactions" on public.transactions;
drop policy if exists "Admins read all transactions"  on public.transactions;
drop policy if exists "Admins update transactions"    on public.transactions;

-- Users and admins can read: users see their own, admins see all
create policy "Users read own transactions"
  on public.transactions for select
  using (
    user_id = auth.uid()::text
    OR
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

-- Any authenticated user can insert their own transaction
create policy "Users insert own transactions"
  on public.transactions for insert
  with check (user_id = auth.uid()::text);

-- Admins and support can approve/reject
create policy "Admins update transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

-- ── 3. Enable realtime for transactions ─────────────────────
-- Allows instant balance credit when admin approves
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;

-- ── 4. Add your admin email here ────────────────────────────
-- Replace with your actual Google email then run:
-- insert into public.user_roles (email, role)
-- values ('youremail@gmail.com', 'admin')
-- on conflict (email) do update set role = excluded.role;


-- ── Enable realtime on transactions (required for instant balance updates) ──
alter publication supabase_realtime add table public.transactions;
