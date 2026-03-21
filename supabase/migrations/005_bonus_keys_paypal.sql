-- ============================================================
--  Run in Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Bonus redemptions table ────────────────────────────
create table if not exists public.bonus_redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  user_email   text not null,
  reward_type  text not null check (reward_type in ('balance','key')),
  amount       numeric(10,2),          -- for balance reward
  key_value    text,                   -- for key reward
  key_expiry   timestamptz,
  panel_type   text,
  created_at   timestamptz default now()
);

alter table public.bonus_redemptions enable row level security;

create policy "Users read own redemptions"
  on public.bonus_redemptions for select
  using (user_id = auth.uid()::text);

create policy "Users insert own redemptions"
  on public.bonus_redemptions for insert
  with check (user_id = auth.uid()::text);

create policy "Admins read all redemptions"
  on public.bonus_redemptions for select
  using (
    exists (select 1 from public.user_roles where email = (auth.jwt()->>'email') and role in ('admin','support'))
  );

-- ── 2. PayPal orders table ────────────────────────────────
-- Stores PayPal order IDs so we can verify payment server-side
create table if not exists public.paypal_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  user_email   text not null,
  user_name    text not null,
  order_id     text not null unique,   -- PayPal order ID
  amount       numeric(10,2) not null,
  status       text not null default 'created' check (status in ('created','approved','captured','failed')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.paypal_orders enable row level security;

create policy "Users read own paypal orders"
  on public.paypal_orders for select
  using (user_id = auth.uid()::text);

create policy "Users insert own paypal orders"
  on public.paypal_orders for insert
  with check (user_id = auth.uid()::text);

create policy "Users update own paypal orders"
  on public.paypal_orders for update
  using (user_id = auth.uid()::text);

-- ── 3. Enable realtime on new tables ─────────────────────
do $$
begin
  begin alter publication supabase_realtime add table public.paypal_orders; exception when others then null; end;
end $$;
