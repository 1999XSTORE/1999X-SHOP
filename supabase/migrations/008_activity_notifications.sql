-- ============================================================
--  008 — Activity logs + notifications + screenshot storage
--  Run in Supabase SQL Editor after all previous migrations
-- ============================================================

-- ── 1. Activity logs ──────────────────────────────────────────
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  user_email   text not null,
  user_name    text not null,
  action_type  text not null,
  -- action_type values: login, register, bonus_claim, key_generated,
  --   purchase, payment_submit, payment_approved, payment_rejected,
  --   balance_add, balance_deduct, hwid_reset, free_key_claim, logout
  product      text default '',
  amount       numeric(10,2),
  status       text not null default 'success' check (status in ('success','failed')),
  meta         jsonb default '{}',   -- extra data (key value, method, etc.)
  created_at   timestamptz default now()
);

alter table public.activity_logs enable row level security;

drop policy if exists "admins_read_activity" on public.activity_logs;
create policy "admins_read_activity"
  on public.activity_logs for select
  using (
    exists (select 1 from public.user_roles where email = (auth.jwt() ->> 'email') and role = 'admin')
  );

drop policy if exists "service_insert_activity" on public.activity_logs;
create policy "service_insert_activity"
  on public.activity_logs for insert
  with check (true);  -- allow all clients to insert; admin-only read enforces security

drop policy if exists "admins_delete_activity" on public.activity_logs;
create policy "admins_delete_activity"
  on public.activity_logs for delete
  using (
    exists (select 1 from public.user_roles where email = (auth.jwt() ->> 'email') and role = 'admin')
  );

create index if not exists activity_logs_user_email on public.activity_logs (user_email);
create index if not exists activity_logs_action_type on public.activity_logs (action_type);
create index if not exists activity_logs_created_at  on public.activity_logs (created_at desc);

-- Enable realtime for activity feed
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'activity_logs'
  ) then
    alter publication supabase_realtime add table public.activity_logs;
  end if;
end $$;


-- ── 2. Notifications (per-user, read/unread) ─────────────────
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,          -- recipient user_id (or 'all' for broadcast)
  type         text not null,           -- announcement | chat | system | payment
  title        text not null,
  body         text default '',
  link_path    text default '/',        -- which page to navigate to
  is_read      boolean default false,
  created_at   timestamptz default now()
);

alter table public.notifications enable row level security;

drop policy if exists "users_read_own_notifs" on public.notifications;
create policy "users_read_own_notifs"
  on public.notifications for select
  using (user_id = auth.uid()::text or user_id = 'all');

drop policy if exists "users_update_own_notifs" on public.notifications;
create policy "users_update_own_notifs"
  on public.notifications for update
  using (user_id = auth.uid()::text or user_id = 'all');

drop policy if exists "service_insert_notifs" on public.notifications;
create policy "service_insert_notifs"
  on public.notifications for insert
  with check (true);

drop policy if exists "users_delete_own_notifs" on public.notifications;
create policy "users_delete_own_notifs"
  on public.notifications for delete
  using (user_id = auth.uid()::text or user_id = 'all');

create index if not exists notifs_user_id   on public.notifications (user_id);
create index if not exists notifs_is_read   on public.notifications (is_read);
create index if not exists notifs_created   on public.notifications (created_at desc);

-- Enable realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;


-- ── 3. Screenshot storage — add screenshot_url column to transactions ─
alter table public.transactions add column if not exists screenshot_url text default '';


-- ── 4. Role separation: support can only update (approve/reject), not delete ─
-- Tighten transactions: support can approve/reject but admin has full access

drop policy if exists "Admins update transactions" on public.transactions;
create policy "Mods update transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

-- Admin-only: delete transactions
drop policy if exists "Admins delete transactions" on public.transactions;
create policy "Admins delete transactions"
  on public.transactions for delete
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role = 'admin'
    )
  );


-- ── 5. Supabase Storage bucket for payment screenshots ────────
-- Run this separately if you want file uploads (optional):
-- insert into storage.buckets (id, name, public) values ('payment-screenshots', 'payment-screenshots', false)
-- on conflict do nothing;
-- create policy "Admin view screenshots" on storage.objects for select
--   using (bucket_id = 'payment-screenshots' and exists (
--     select 1 from public.user_roles where email = (auth.jwt() ->> 'email') and role in ('admin','support')
--   ));
-- create policy "Users upload screenshots" on storage.objects for insert
--   with check (bucket_id = 'payment-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
