-- Stage 8: Private / Beta Launch operations.
-- Safe to run after stages 2-7.

create table if not exists public.beta_testers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('invited','active','suspended','completed')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  completed_at timestamptz,
  notes text
);

alter table public.beta_testers enable row level security;
grant select on public.beta_testers to authenticated;

drop policy if exists "Users can read their beta status" on public.beta_testers;
create policy "Users can read their beta status"
on public.beta_testers for select to authenticated
using (user_id = (select auth.uid()));

-- Existing accounts are the initial controlled beta cohort.
insert into public.beta_testers (user_id, status, joined_at)
select id, 'active', now()
from public.profiles
on conflict (user_id) do nothing;

create index if not exists beta_testers_status_idx
on public.beta_testers(status);
