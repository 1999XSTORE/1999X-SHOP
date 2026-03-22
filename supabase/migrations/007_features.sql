-- ============================================================
--  007 — All new features: announcements, free keys, PayPal auto
--  Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Supabase-backed announcements (replaces Zustand) ─────
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text not null,
  type       text not null default 'update' check (type in ('update','maintenance','feature')),
  created_at timestamptz default now(),
  created_by text
);
alter table public.announcements enable row level security;

drop policy if exists "anyone_read_announcements" on public.announcements;
create policy "anyone_read_announcements"
  on public.announcements for select using (true);

drop policy if exists "admins_write_announcements" on public.announcements;
create policy "admins_write_announcements"
  on public.announcements for insert
  with check (
    exists (select 1 from public.user_roles where email = (auth.jwt() ->> 'email') and role in ('admin','support'))
  );

drop policy if exists "admins_delete_announcements" on public.announcements;
create policy "admins_delete_announcements"
  on public.announcements for delete
  using (
    exists (select 1 from public.user_roles where email = (auth.jwt() ->> 'email') and role in ('admin','support'))
  );

-- Enable realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and tablename='announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;

-- ── 2. Free 1-hour trial keys (one per user per 24h) ────────
create table if not exists public.free_trial_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  user_email   text not null,
  lag_key      text,
  internal_key text,
  claimed_at   timestamptz default now(),
  expires_at   timestamptz not null,
  unique (user_id)  -- overwrite on new claim
);
alter table public.free_trial_keys enable row level security;

drop policy if exists "users_own_trial" on public.free_trial_keys;
create policy "users_own_trial"
  on public.free_trial_keys for select using (auth.uid() = user_id);

drop policy if exists "users_insert_trial" on public.free_trial_keys;
create policy "users_insert_trial"
  on public.free_trial_keys for insert with check (auth.uid() = user_id);

drop policy if exists "users_update_trial" on public.free_trial_keys;
create policy "users_update_trial"
  on public.free_trial_keys for update using (auth.uid() = user_id);

create index if not exists free_trial_keys_user_id on public.free_trial_keys (user_id);

-- ── 3. paypal_auto_credits — track auto-credited PayPal txns ─
create table if not exists public.paypal_auto_credits (
  id             uuid primary key default gen_random_uuid(),
  paypal_txn_id  text not null unique,
  user_id        text not null,
  amount         numeric(10,2) not null,
  credited_at    timestamptz default now()
);
alter table public.paypal_auto_credits enable row level security;

drop policy if exists "users_read_own_credits" on public.paypal_auto_credits;
create policy "users_read_own_credits"
  on public.paypal_auto_credits for select using (user_id = auth.uid()::text);


-- ── Fix chat: allow admins/support to delete any message ─────
drop policy if exists "Delete own messages" on public.chat_messages;
create policy "Delete own or mod messages"
  on public.chat_messages for delete
  using (
    auth.uid()::text = user_id
    OR exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin','support')
    )
  );

-- Fix realtime DELETE events returning full row data (not just id)
-- Without REPLICA IDENTITY FULL, the `old` payload in DELETE events only has primary key
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
