-- A Fun Time: Supabase schema
-- Run this in Supabase SQL Editor.
-- IMPORTANT: Supabase Auth stores/verifies passwords. Do NOT create a password column.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique(sender_id, receiver_id),
  check(sender_id <> receiver_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  delivery_status text not null default 'sent' check (delivery_status in ('sent','delivered','read')),
  delivered_at timestamptz,
  read_at timestamptz,
  edited_at timestamptz,
  reply_to_id uuid references public.messages(id) on delete set null,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  check (char_length(body) <= 2000),
  check (char_length(body) > 0 or attachment_url is not null)
);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','😮','😢')),
  created_at timestamptz not null default now(),
  unique(message_id, user_id)
);

alter table public.messages add column if not exists delivery_status text not null default 'sent';
alter table public.messages add column if not exists delivered_at timestamptz;
alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_type text;

alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles from anon;
revoke all on public.connections from anon;
revoke all on public.messages from anon;
grant select on public.profiles to authenticated;
grant select, insert, update on public.connections to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.message_reactions to authenticated;

create policy "Authenticated users can search profiles"
on public.profiles for select to authenticated using (true);

create policy "Users can send connection requests"
on public.connections for insert to authenticated
with check ((select auth.uid()) = sender_id);

create policy "Users can view their connections"
on public.connections for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

create policy "Receivers can accept or reject requests"
on public.connections for update to authenticated
using ((select auth.uid()) = receiver_id)
with check ((select auth.uid()) = receiver_id);

create policy "Connected users can read messages"
on public.messages for select to authenticated
using (
  ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id)
  and exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.sender_id = messages.sender_id and c.receiver_id = messages.receiver_id)
        or (c.sender_id = messages.receiver_id and c.receiver_id = messages.sender_id))
  )
);

create policy "Connected users can send messages"
on public.messages for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.sender_id = messages.sender_id and c.receiver_id = messages.receiver_id)
        or (c.sender_id = messages.receiver_id and c.receiver_id = messages.sender_id))
  )
);

create policy "Message owners can edit or update delivery"
on public.messages for update to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id)
with check ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

create policy "Message owners can delete messages"
on public.messages for delete to authenticated
using ((select auth.uid()) = sender_id);

create policy "Users can read message reactions"
on public.message_reactions for select to authenticated
using (exists (select 1 from public.messages m where m.id = message_reactions.message_id and ((select auth.uid()) = m.sender_id or (select auth.uid()) = m.receiver_id)));

create policy "Users can add their own reactions"
on public.message_reactions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own reactions"
on public.message_reactions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own reactions"
on public.message_reactions for delete to authenticated
using ((select auth.uid()) = user_id);

-- Enable realtime for messages and connections.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.connections;
alter publication supabase_realtime add table public.message_reactions;

insert into storage.buckets (id, name, public) values ('chat-media', 'chat-media', true) on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload chat media" on storage.objects;
create policy "Authenticated users can upload chat media" on storage.objects for insert to authenticated with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Users can delete their chat media" on storage.objects;
create policy "Users can delete their chat media" on storage.objects for delete to authenticated using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Automatically create a profile when an Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data->>'username'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Profile details for discovery and the settings page.
alter table public.profiles add column if not exists bio text not null default '' check (char_length(bio) <= 240);
alter table public.profiles add column if not exists interests text not null default '' check (char_length(interests) <= 300);
alter table public.profiles add column if not exists avatar_url text;
grant update on public.profiles to authenticated;

-- Message pinning.
alter table public.messages add column if not exists is_pinned boolean not null default false;
