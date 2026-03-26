-- 017_role_access_overhaul.sql
-- Upgrades app roles to: owner, admin, support, reseller, user
-- Owner: full access
-- Admin: chat moderation + payment approvals
-- Support: chat only
-- Reseller: reseller badge / role visibility

update public.user_roles set email = lower(trim(email));

drop index if exists user_roles_email_lower_idx;
create unique index if not exists user_roles_email_lower_idx on public.user_roles ((lower(email)));

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('owner', 'admin', 'support', 'reseller'));

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
  order by case ur.role
    when 'owner' then 1
    when 'admin' then 2
    when 'support' then 3
    when 'reseller' then 4
    else 5
  end
  limit 1;

  if resolved_role is not null then
    return resolved_role;
  end if;

  if exists (
    select 1
    from public.reseller_accounts ra
    where lower(ra.email) = normalized_email
      and coalesce(ra.is_active, true) = true
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

alter table public.chat_messages add column if not exists target_role text;
alter table public.chat_messages drop constraint if exists chat_messages_target_role_check;
alter table public.chat_messages
  add constraint chat_messages_target_role_check
  check (target_role is null or target_role in ('owner', 'admin', 'support', 'reseller'));

drop policy if exists "Read chat messages" on public.chat_messages;
drop policy if exists "Insert own messages" on public.chat_messages;
drop policy if exists "Update own messages" on public.chat_messages;
drop policy if exists "Delete own messages" on public.chat_messages;
drop policy if exists "Mods delete messages" on public.chat_messages;

create policy "Read chat messages"
  on public.chat_messages for select
  using (
    public.current_user_app_role() = 'owner'
    or user_id = auth.uid()::text
    or (
      coalesce(is_private, false) = true
      and private_target_user_id = auth.uid()::text
    )
    or (
      coalesce(is_private, false) = false
      and target_role is null
    )
    or (
      target_role is not null
      and public.current_user_app_role() = target_role
    )
  );

create policy "Insert own messages"
  on public.chat_messages for insert
  with check (
    auth.uid()::text = user_id
    and (
      target_role is null
      or target_role in ('owner', 'admin', 'support', 'reseller')
    )
  );

create policy "Update chat messages"
  on public.chat_messages for update
  using (
    auth.uid()::text = user_id
    or public.current_user_app_role() in ('owner', 'admin', 'support')
  );

create policy "Delete chat messages"
  on public.chat_messages for delete
  using (
    auth.uid()::text = user_id
    or public.current_user_app_role() in ('owner', 'admin', 'support')
  );

drop policy if exists "Users read own transactions" on public.transactions;
drop policy if exists "Admins read all transactions" on public.transactions;
drop policy if exists "Admins update transactions" on public.transactions;
drop policy if exists "Mods update transactions" on public.transactions;
drop policy if exists "Admins delete transactions" on public.transactions;

create policy "Users read own transactions"
  on public.transactions for select
  using (
    user_id = auth.uid()::text
    or public.current_user_app_role() in ('owner', 'admin')
  );

create policy "Staff update transactions"
  on public.transactions for update
  using (public.current_user_app_role() in ('owner', 'admin'));

create policy "Owner delete transactions"
  on public.transactions for delete
  using (public.current_user_app_role() = 'owner');

drop policy if exists "admins_write_announcements" on public.announcements;
drop policy if exists "admins_delete_announcements" on public.announcements;

create policy "owner_write_announcements"
  on public.announcements for insert
  with check (public.current_user_app_role() = 'owner');

create policy "owner_delete_announcements"
  on public.announcements for delete
  using (public.current_user_app_role() = 'owner');

drop policy if exists "admins_read_activity" on public.activity_logs;
drop policy if exists "admins_delete_activity" on public.activity_logs;

create policy "owner_read_activity"
  on public.activity_logs for select
  using (public.current_user_app_role() = 'owner');

create policy "owner_delete_activity"
  on public.activity_logs for delete
  using (public.current_user_app_role() = 'owner');

drop policy if exists "mods_read_settings" on public.settings;
drop policy if exists "admins_write_settings" on public.settings;

create policy "owner_read_settings"
  on public.settings for select
  using (public.current_user_app_role() = 'owner');

create policy "owner_manage_settings"
  on public.settings for all
  using (public.current_user_app_role() = 'owner')
  with check (public.current_user_app_role() = 'owner');

drop policy if exists "mods_read_license_keys" on public.license_keys;
drop policy if exists "admins_manage_license_keys" on public.license_keys;

create policy "owner_read_license_keys"
  on public.license_keys for select
  using (public.current_user_app_role() = 'owner');

create policy "owner_manage_license_keys"
  on public.license_keys for all
  using (public.current_user_app_role() = 'owner')
  with check (public.current_user_app_role() = 'owner');

drop policy if exists "mods_read_all_orders" on public.orders;

create policy "owner_read_all_orders"
  on public.orders for select
  using (public.current_user_app_role() = 'owner');

drop policy if exists "staff_select_reseller_access" on public.reseller_accounts;
drop policy if exists "admins_manage_reseller_access" on public.reseller_accounts;

create policy "owner_select_reseller_access"
  on public.reseller_accounts for select
  using (
    lower(email) = lower(auth.jwt() ->> 'email')
    or public.current_user_app_role() = 'owner'
  );

create policy "owner_manage_reseller_access"
  on public.reseller_accounts for all
  using (public.current_user_app_role() = 'owner')
  with check (public.current_user_app_role() = 'owner');

-- Examples:
-- insert into public.user_roles (email, role) values
--   ('owner@example.com', 'owner'),
--   ('admin@example.com', 'admin'),
--   ('support@example.com', 'support'),
--   ('reseller@example.com', 'reseller')
-- on conflict ((lower(email))) do update set role = excluded.role;
