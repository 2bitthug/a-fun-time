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
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles from anon;
revoke all on public.connections from anon;
revoke all on public.messages from anon;
grant select on public.profiles to authenticated;
grant select, insert, update on public.connections to authenticated;
grant select, insert on public.messages to authenticated;

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

-- Enable realtime for messages and connections.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.connections;

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
