alter table public.transactions
add column if not exists screenshot_url text default '';
