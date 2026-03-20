-- Create chat_messages table for real-time chat
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  user_name   text not null,
  user_avatar text default '',
  user_role   text default 'user',
  message     text not null,
  reply_to    uuid references public.chat_messages(id) on delete set null,
  created_at  timestamptz default now()
);

-- Enable Row Level Security
alter table public.chat_messages enable row level security;

-- Allow anyone authenticated to read messages
create policy "Read chat messages" on public.chat_messages
  for select using (true);

-- Allow authenticated users to insert their own messages
create policy "Insert own messages" on public.chat_messages
  for insert with check (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Allow users to update/delete their own messages
create policy "Update own messages" on public.chat_messages
  for update using (auth.uid()::text = user_id);

create policy "Delete own messages" on public.chat_messages
  for delete using (auth.uid()::text = user_id);

-- Enable realtime for this table
alter publication supabase_realtime add table public.chat_messages;
