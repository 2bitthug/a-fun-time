-- Stage 10: Grow the Town.
create table if not exists public.community_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null check (char_length(description) between 2 and 500),
  reason text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','approved','declined','converted')),
  created_at timestamptz not null default now()
);
alter table public.community_suggestions enable row level security;
grant select, insert on public.community_suggestions to authenticated;
drop policy if exists "Users can submit community suggestions" on public.community_suggestions;
create policy "Users can submit community suggestions" on public.community_suggestions for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users can read their own community suggestions" on public.community_suggestions;
create policy "Users can read their own community suggestions" on public.community_suggestions for select to authenticated using (user_id = (select auth.uid()));
create index if not exists community_suggestions_user_created_idx on public.community_suggestions(user_id, created_at desc);
