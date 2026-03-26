-- 018_reseller_subscription_access.sql
-- Makes active reseller subscriptions the source of truth for reseller access.

create table if not exists public.reseller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  plan text not null,
  price numeric(10,2) not null default 0,
  fee_rate numeric(10,4) not null default 0,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reseller_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.reseller_subscriptions add column if not exists email text;
alter table public.reseller_subscriptions add column if not exists plan text;
alter table public.reseller_subscriptions add column if not exists price numeric(10,2) not null default 0;
alter table public.reseller_subscriptions add column if not exists fee_rate numeric(10,4) not null default 0;
alter table public.reseller_subscriptions add column if not exists status text not null default 'active';
alter table public.reseller_subscriptions add column if not exists started_at timestamptz not null default now();
alter table public.reseller_subscriptions add column if not exists expires_at timestamptz;
alter table public.reseller_subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.reseller_subscriptions add column if not exists updated_at timestamptz not null default now();

update public.reseller_subscriptions rs
set email = lower(trim(coalesce(au.email, rs.email, '')))
from auth.users au
where rs.user_id = au.id
  and (rs.email is null or trim(rs.email) = '');

create index if not exists reseller_subscriptions_user_id_idx on public.reseller_subscriptions(user_id);
create index if not exists reseller_subscriptions_email_idx on public.reseller_subscriptions(lower(email));
create index if not exists reseller_subscriptions_active_idx on public.reseller_subscriptions(user_id, status, expires_at desc);

alter table public.reseller_subscriptions enable row level security;

drop policy if exists "Users read own reseller subscriptions" on public.reseller_subscriptions;
drop policy if exists "Owner reads all reseller subscriptions" on public.reseller_subscriptions;
drop policy if exists "staff_select_subs" on public.reseller_subscriptions;
drop policy if exists "staff_manage_subs" on public.reseller_subscriptions;

create policy "Users read own reseller subscriptions"
  on public.reseller_subscriptions for select
  using (
    user_id = auth.uid()
    or lower(email) = lower(auth.jwt() ->> 'email')
    or exists (
      select 1
      from public.user_roles ur
      where lower(ur.email) = lower(auth.jwt() ->> 'email')
        and ur.role = 'owner'
    )
  );

create or replace function public.get_user_app_role(p_email text)
returns text
language plpgsql
stable
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  resolved_role text;
begin
  if normalized_email = '' then
    return 'user';
  end if;

  select ur.role
    into resolved_role
  from public.user_roles ur
  where lower(ur.email) = normalized_email
    and ur.role in ('owner', 'admin', 'support')
  order by case ur.role
    when 'owner' then 1
    when 'admin' then 2
    when 'support' then 3
    else 4
  end
  limit 1;

  if resolved_role is not null then
    return resolved_role;
  end if;

  if exists (
    select 1
    from public.reseller_subscriptions rs
    where lower(rs.email) = normalized_email
      and rs.status = 'active'
      and rs.expires_at > now()
  ) then
    return 'reseller';
  end if;

  return 'user';
end;
$$;

create or replace function public.current_user_app_role()
returns text
language sql
stable
as $$
  select public.get_user_app_role(auth.jwt() ->> 'email');
$$;

create or replace function public.subscribe_as_reseller(
  p_user_id uuid,
  p_email text,
  p_plan text,
  p_price numeric,
  p_fee_rate numeric,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  new_subscription_id uuid;
begin
  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if normalized_email = '' then
    raise exception 'Missing email';
  end if;

  if p_expires_at <= now() then
    raise exception 'Expiry must be in the future';
  end if;

  update public.reseller_subscriptions
  set status = 'expired',
      updated_at = now()
  where user_id = p_user_id
    and status = 'active';

  insert into public.reseller_subscriptions (
    user_id, email, plan, price, fee_rate, status, started_at, expires_at, updated_at
  ) values (
    p_user_id, normalized_email, p_plan, coalesce(p_price, 0), coalesce(p_fee_rate, 0), 'active', now(), p_expires_at, now()
  )
  returning id into new_subscription_id;

  insert into public.reseller_accounts (email, is_active)
  values (normalized_email, true)
  on conflict (email) do update
    set is_active = true;

  insert into public.reseller_wallets (user_id, email)
  values (p_user_id, normalized_email)
  on conflict (user_id) do update
    set email = excluded.email,
        updated_at = now();

  return new_subscription_id;
end;
$$;
