-- Stage 7: Beta readiness feedback and test-reporting.
-- Safe to run after stages 2-6.
create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('bug','usability','suggestion','content')),
  severity text not null default 'normal' check (severity in ('low','normal','high','blocking')),
  title text not null check (char_length(trim(title)) between 3 and 120),
  details text not null check (char_length(trim(details)) between 5 and 4000),
  page_path text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.beta_feedback enable row level security;
grant select, insert on public.beta_feedback to authenticated;

drop policy if exists "Users can submit beta feedback" on public.beta_feedback;
create policy "Users can submit beta feedback"
on public.beta_feedback for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can read their beta feedback" on public.beta_feedback;
create policy "Users can read their beta feedback"
on public.beta_feedback for select to authenticated
using (user_id = (select auth.uid()));

create index if not exists beta_feedback_user_created_idx
on public.beta_feedback(user_id, created_at desc);

create index if not exists beta_feedback_status_idx
on public.beta_feedback(status, created_at desc);
