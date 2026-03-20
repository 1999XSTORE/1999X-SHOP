-- ============================================================
--  Fix admin RLS — drop and recreate policies cleanly
--  Run this in Supabase SQL Editor
-- ============================================================

-- Drop old policies that may conflict
drop policy if exists "Admins read all transactions"  on public.transactions;
drop policy if exists "Admins update transactions"    on public.transactions;
drop policy if exists "Users read own transactions"   on public.transactions;
drop policy if exists "Users insert own transactions" on public.transactions;

-- Users: read own transactions
create policy "Users read own transactions"
  on public.transactions for select
  using (
    user_id = auth.uid()::text
    OR
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );

-- Users: insert own transactions
create policy "Users insert own transactions"
  on public.transactions for insert
  with check (user_id = auth.uid()::text);

-- Admins: update (approve/reject) any transaction
create policy "Admins update transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.user_roles
      where email = (auth.jwt() ->> 'email')
      and role in ('admin', 'support')
    )
  );
