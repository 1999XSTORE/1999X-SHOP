create table if not exists public.user_licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  product_id text not null,
  product_name text not null,
  license_key text not null,
  keyauth_username text default '',
  hwid text default '',
  last_login timestamptz,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired')),
  ip text default '',
  device text default '',
  hwid_resets_used integer not null default 0,
  hwid_reset_month integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, license_key)
);

alter table public.user_licenses enable row level security;

drop policy if exists "users_select_own_user_licenses" on public.user_licenses;
create policy "users_select_own_user_licenses"
  on public.user_licenses for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_user_licenses" on public.user_licenses;
create policy "users_insert_own_user_licenses"
  on public.user_licenses for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_update_own_user_licenses" on public.user_licenses;
create policy "users_update_own_user_licenses"
  on public.user_licenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admins_read_all_user_licenses" on public.user_licenses;
create policy "admins_read_all_user_licenses"
  on public.user_licenses for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

create index if not exists user_licenses_user_id_idx on public.user_licenses(user_id);
create index if not exists user_licenses_license_key_idx on public.user_licenses(license_key);
create index if not exists user_licenses_expires_at_idx on public.user_licenses(expires_at);

create or replace function public.set_user_licenses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_licenses_updated_at on public.user_licenses;
create trigger trg_user_licenses_updated_at
before update on public.user_licenses
for each row execute function public.set_user_licenses_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'user_licenses'
  ) then
    alter publication supabase_realtime add table public.user_licenses;
  end if;
end $$;
