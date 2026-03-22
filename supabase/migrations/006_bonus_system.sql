-- ============================================================
--  Bonus System — persistent per-user bonus data
--  Run in Supabase SQL Editor
-- ============================================================

create table if not exists public.user_bonus (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  user_email      text not null,
  bonus_points    integer not null default 0,
  last_claim_time timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id)
);

alter table public.user_bonus enable row level security;

-- Users can only read/write their own bonus row
drop policy if exists "users_own_bonus_select" on public.user_bonus;
create policy "users_own_bonus_select"
  on public.user_bonus for select
  using (auth.uid() = user_id);

drop policy if exists "users_own_bonus_insert" on public.user_bonus;
create policy "users_own_bonus_insert"
  on public.user_bonus for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_own_bonus_update" on public.user_bonus;
create policy "users_own_bonus_update"
  on public.user_bonus for update
  using (auth.uid() = user_id);

-- Index for fast lookup
create index if not exists user_bonus_user_id on public.user_bonus (user_id);
