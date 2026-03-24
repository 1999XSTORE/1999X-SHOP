-- Private replies, settings, license pool, and TrueWallet orders

alter table public.chat_messages add column if not exists user_email text default '';
alter table public.chat_messages add column if not exists is_private boolean default false;
alter table public.chat_messages add column if not exists private_target_user_id text;

create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

drop policy if exists "mods_read_settings" on public.settings;
create policy "mods_read_settings"
  on public.settings for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

drop policy if exists "admins_write_settings" on public.settings;
create policy "admins_write_settings"
  on public.settings for all
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role = 'admin'
    )
  );

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  product_name text not null default 'TrueWallet License',
  license_key text not null unique,
  is_used boolean not null default false,
  used_by text,
  order_id uuid,
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.license_keys enable row level security;

drop policy if exists "mods_read_license_keys" on public.license_keys;
create policy "mods_read_license_keys"
  on public.license_keys for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

drop policy if exists "admins_manage_license_keys" on public.license_keys;
create policy "admins_manage_license_keys"
  on public.license_keys for all
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role = 'admin'
    )
  );

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_email text not null default '',
  voucher_hash text not null unique,
  voucher_preview text not null default '',
  wallet_number text not null default '',
  provider text not null default 'truewallet',
  amount numeric(10,2),
  status text not null default 'pending',
  license_key_id uuid references public.license_keys(id) on delete set null,
  license_key text,
  provider_response jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

drop policy if exists "users_read_own_orders" on public.orders;
create policy "users_read_own_orders"
  on public.orders for select
  using (user_id = auth.uid()::text);

drop policy if exists "users_insert_own_orders" on public.orders;
create policy "users_insert_own_orders"
  on public.orders for insert
  with check (user_id = auth.uid()::text);

drop policy if exists "mods_read_all_orders" on public.orders;
create policy "mods_read_all_orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_voucher_hash_idx on public.orders (voucher_hash);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
