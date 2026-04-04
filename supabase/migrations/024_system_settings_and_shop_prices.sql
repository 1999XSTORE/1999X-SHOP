create table if not exists public.system_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

drop policy if exists "public_read_system_settings" on public.system_settings;
create policy "public_read_system_settings"
  on public.system_settings for select
  using (true);

drop policy if exists "owner_insert_system_settings" on public.system_settings;
create policy "owner_insert_system_settings"
  on public.system_settings for insert
  with check (
    exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = lower(auth.jwt() ->> 'email')
        and ur.role = 'owner'
    )
  );

drop policy if exists "owner_update_system_settings" on public.system_settings;
create policy "owner_update_system_settings"
  on public.system_settings for update
  using (
    exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = lower(auth.jwt() ->> 'email')
        and ur.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = lower(auth.jwt() ->> 'email')
        and ur.role = 'owner'
    )
  );

insert into public.system_settings (key, value)
values ('shop_price_overrides_v1', '{}')
on conflict (key) do nothing;
