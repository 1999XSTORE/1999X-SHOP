-- ============================================================
--  Migration 005: User Licenses + Purchase History
--  Run in Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── 1. user_licenses table ───────────────────────────────────
create table if not exists public.user_licenses (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  user_email       text not null,
  key              text not null unique,
  product_id       text not null,
  product_name     text not null,
  product_type     text not null check (product_type in ('weekly','monthly','combo','reward','trial','lifetime','admin-gen')),
  hwid             text default '',
  bound_email      text not null,
  status           text not null default 'active' check (status in ('active','expired','banned')),
  expires_at       timestamptz not null,
  last_login       timestamptz,
  last_hwid_reset  timestamptz,
  hwid_resets_used int default 0,
  hwid_reset_month int default 0,
  ip               text default '',
  device           text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.user_licenses enable row level security;

drop policy if exists "Users read own licenses"   on public.user_licenses;
drop policy if exists "Users insert own licenses" on public.user_licenses;
drop policy if exists "Users update own licenses" on public.user_licenses;
drop policy if exists "Admins read all licenses"  on public.user_licenses;
drop policy if exists "Admins update licenses"    on public.user_licenses;

-- Users can read their own licenses
create policy "Users read own licenses"
  on public.user_licenses for select
  using (user_id = auth.uid()::text);

-- Users can insert their own licenses
create policy "Users insert own licenses"
  on public.user_licenses for insert
  with check (user_id = auth.uid()::text);

-- Users can update their own licenses (for HWID binding on first login)
create policy "Users update own licenses"
  on public.user_licenses for update
  using (user_id = auth.uid()::text);

-- Admins can see all licenses
create policy "Admins read all licenses"
  on public.user_licenses for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

-- Admins can update (ban/unban/reset)
create policy "Admins update licenses"
  on public.user_licenses for update
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role = 'admin'
    )
  );

-- ── 2. purchase_history table ────────────────────────────────
create table if not exists public.purchase_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  user_email   text not null,
  product_id   text not null,
  product_name text not null,
  product_type text not null,
  amount       numeric(10,2) not null,
  key          text not null,
  expires_at   timestamptz not null,
  purchased_at timestamptz default now()
);

alter table public.purchase_history enable row level security;

drop policy if exists "Users read own purchases"   on public.purchase_history;
drop policy if exists "Users insert own purchases" on public.purchase_history;
drop policy if exists "Admins read all purchases"  on public.purchase_history;

create policy "Users read own purchases"
  on public.purchase_history for select
  using (user_id = auth.uid()::text);

create policy "Users insert own purchases"
  on public.purchase_history for insert
  with check (user_id = auth.uid()::text);

create policy "Admins read all purchases"
  on public.purchase_history for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

-- ── 3. user_balances table (optional: sync balance to DB) ───
create table if not exists public.user_balances (
  user_id    text primary key,
  user_email text not null,
  balance    numeric(10,2) default 0,
  bonus_pts  int default 0,
  claim_streak int default 0,
  last_claim timestamptz,
  updated_at timestamptz default now()
);

alter table public.user_balances enable row level security;

drop policy if exists "Users read own balance"   on public.user_balances;
drop policy if exists "Users upsert own balance" on public.user_balances;
drop policy if exists "Admins read all balances" on public.user_balances;

create policy "Users read own balance"
  on public.user_balances for select
  using (user_id = auth.uid()::text);

create policy "Users upsert own balance"
  on public.user_balances for all
  using (user_id = auth.uid()::text);

create policy "Admins read all balances"
  on public.user_balances for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

-- ── 4. Enable realtime on new tables ────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'user_licenses'
  ) then
    alter publication supabase_realtime add table public.user_licenses;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'purchase_history'
  ) then
    alter publication supabase_realtime add table public.purchase_history;
  end if;
end $$;
