create table if not exists public.reseller_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.reseller_accounts enable row level security;

drop policy if exists "users_select_own_reseller_access" on public.reseller_accounts;
create policy "users_select_own_reseller_access"
  on public.reseller_accounts for select
  using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "staff_select_reseller_access" on public.reseller_accounts;
create policy "staff_select_reseller_access"
  on public.reseller_accounts for select
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

drop policy if exists "admins_manage_reseller_access" on public.reseller_accounts;
create policy "admins_manage_reseller_access"
  on public.reseller_accounts for all
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

create index if not exists reseller_accounts_email_idx on public.reseller_accounts(email);
