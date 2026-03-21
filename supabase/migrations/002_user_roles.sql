-- ============================================================
--  User Roles Table
--  Add rows here to grant admin or support role to any email.
--  Regular users don't need a row — they default to 'user'.
-- ============================================================

create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null check (role in ('admin', 'support')),
  created_at timestamptz default now()
);

-- Only service_role can write; anyone authenticated can read their own row
alter table public.user_roles enable row level security;

create policy "Users can read their own role"
  on public.user_roles for select
  using (email = auth.jwt() ->> 'email');

-- Example rows (edit emails before running):
-- insert into public.user_roles (email, role) values
--   ('youremail@gmail.com', 'admin'),
--   ('supportemail@gmail.com', 'support');
